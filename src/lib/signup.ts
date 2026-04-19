import type { Session, SupabaseClient } from '@supabase/supabase-js'
import * as z from 'zod'

import { LEGAL_POLICY_VERSION } from '@/lib/legal/constants'
import { persistLegalConsentBundle } from '@/lib/legal/compliance'
import { isAppRole, type AppRole } from '@/lib/role_routes'

const signupRoleSchema = z.enum(['athlete', 'coach', 'individual'])
export const strongPasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long.')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter.')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
  .regex(/[0-9]/, 'Password must include at least one number.')
  .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character.')

export const signupPayloadSchema = z.object({
  fullName: z.string().min(1, 'Full name is required.'),
  email: z.string().email('A valid email is required.'),
  password: strongPasswordSchema,
  role: signupRoleSchema,
  coachLockerCode: z.string().optional().default(''),
  inviteToken: z.string().optional().default(''),
  termsPrivacyConsent: z.boolean(),
  medicalDisclaimerConsent: z.boolean(),
  dataProcessingConsent: z.boolean(),
  aiAcknowledgementConsent: z.boolean(),
  marketingConsent: z.boolean().optional().default(false),
})

export type SignupPayload = z.infer<typeof signupPayloadSchema>

export type SignupResult =
  | {
      success: true
      needsEmailVerification: boolean
      session: {
        access_token: string
        refresh_token: string
      } | null
    }
  | {
      success: false
      error: string
    }

type LockerCoachProfile = {
  id: string
  role: string
  full_name: string
  primary_sport?: string
}

function getSerializableSession(session: Session | null) {
  if (!session) return null

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  }
}

export async function findCoachByLockerCodeWithClient(args: {
  supabase: SupabaseClient
  adminSupabase?: SupabaseClient
  code: string
}): Promise<LockerCoachProfile | null> {
  const normalizedCode = args.code.trim().toUpperCase()
  if (!normalizedCode) return null

  const { data: rpcCoach } = await args.supabase
    .rpc('find_profile_by_locker_code', { code: normalizedCode })
    .maybeSingle()

  const rpcCoachRecord = rpcCoach as LockerCoachProfile | null
  if (rpcCoachRecord?.id) return rpcCoachRecord

  const { data: scopedCoach } = await args.supabase
    .from('profiles')
    .select('id, role, full_name, primary_sport')
    .eq('locker_code', normalizedCode)
    .eq('role', 'coach')
    .maybeSingle()

  if (scopedCoach?.id) return scopedCoach as LockerCoachProfile

  if (args.adminSupabase) {
    const { data: adminCoach } = await args.adminSupabase
      .from('profiles')
      .select('id, role, full_name, primary_sport')
      .eq('locker_code', normalizedCode)
      .eq('role', 'coach')
      .maybeSingle()

    if (adminCoach?.id) return adminCoach as LockerCoachProfile
  }

  return null
}

export async function performCreedaSignup(args: {
  supabase: SupabaseClient
  adminSupabase?: SupabaseClient
  payload: SignupPayload
  origin: string
  auditMeta?: {
    userAgent?: string | null
    requestIp?: string | null
  }
}): Promise<SignupResult> {
  const { supabase, adminSupabase, payload, origin, auditMeta } = args

  if (!payload.fullName || !payload.email || !payload.password || !payload.role) {
    return { success: false, error: 'All fields are required.' }
  }

  if (
    !payload.termsPrivacyConsent ||
    !payload.medicalDisclaimerConsent ||
    !payload.dataProcessingConsent ||
    !payload.aiAcknowledgementConsent
  ) {
    return {
      success: false,
      error: 'Please complete all required legal acknowledgements to continue.',
    }
  }

  if (payload.role === 'athlete' && payload.coachLockerCode) {
    const coach = await findCoachByLockerCodeWithClient({
      supabase,
      adminSupabase,
      code: payload.coachLockerCode,
    })
    if (!coach) {
      return { success: false, error: 'Invalid coach code. Please verify with your coach.' }
    }
  }

  const consentTimestamp = new Date().toISOString()
  const legacyTier = payload.role === 'coach' ? 'Coach-Pro' : 'Athlete-Pro'

  const { data: authData, error } = await supabase.auth.signUp({
    email: payload.email.trim(),
    password: payload.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/verification-success`,
      data: {
        full_name: payload.fullName.trim(),
        role: payload.role,
        subscription_tier: legacyTier,
        coach_locker_code: payload.coachLockerCode || undefined,
        invite_token: payload.inviteToken || undefined,
        legal_consent_at: consentTimestamp,
        medical_disclaimer_accepted_at: consentTimestamp,
        data_processing_consent_at: consentTimestamp,
        ai_acknowledgement_at: consentTimestamp,
        marketing_consent: Boolean(payload.marketingConsent),
        legal_policy_version: LEGAL_POLICY_VERSION,
        privacy_policy_version: LEGAL_POLICY_VERSION,
        consent_policy_version: LEGAL_POLICY_VERSION,
        consent_updated_at: consentTimestamp,
      },
    },
  })

  if (error) {
    const normalizedMessage = error.message.toLowerCase()
    if (
      normalizedMessage.includes('already registered') ||
      normalizedMessage.includes('already been registered') ||
      normalizedMessage.includes('already exists')
    ) {
      return {
        success: false,
        error: 'We could not create your account with the provided details.',
      }
    }

    return {
      success: false,
      error: 'We could not create your account right now. Please try again later.',
    }
  }

  if (authData.user?.id && adminSupabase && isAppRole(payload.role)) {
    await persistLegalConsentBundle({
      supabase: adminSupabase,
      userId: authData.user.id,
      role: payload.role as AppRole,
      acceptedAt: consentTimestamp,
      policyVersion: LEGAL_POLICY_VERSION,
      source: 'signup',
      userAgent: auditMeta?.userAgent,
      requestIp: auditMeta?.requestIp,
      termsAccepted: payload.termsPrivacyConsent,
      privacyAccepted: payload.termsPrivacyConsent,
      medicalDisclaimerAccepted: payload.medicalDisclaimerConsent,
      dataProcessingAccepted: payload.dataProcessingConsent,
      aiDecisionSupportAccepted: payload.aiAcknowledgementConsent,
      marketingAccepted: Boolean(payload.marketingConsent),
      metadata: {
        flow: 'signup',
      },
    })
  }

  return {
    success: true,
    needsEmailVerification: !authData.session,
    session: getSerializableSession(authData.session),
  }
}
