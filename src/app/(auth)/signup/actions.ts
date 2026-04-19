'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasAdminSupabaseEnv } from '@/lib/env.server'
import { rateLimit } from '@/lib/rate_limit'
import { resolveTrustedOriginFromHeaders } from '@/lib/security/request'
import {
  findCoachByLockerCodeWithClient,
  performCreedaSignup,
} from '@/lib/signup'
import { getRoleOnboardingRoute, isAppRole } from '@/lib/role_routes'

export async function signup(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')
  const fullName = String(formData.get('full_name') || '').trim()
  const role = String(formData.get('role') || '').trim() // 'athlete', 'coach', or 'individual'

  if (!email || !password || !fullName || !role) {
    return { error: 'All fields are required' }
  }

  // Rate Limit: Max 3 signup attempts per hour per email
  const limiter = await rateLimit(`signup:${email.toLowerCase()}`, 3, 3600, {
    failOpen: false,
  })
  if (!limiter.success) return { error: limiter.error }
  const coachLockerCode = formData.get('coach_locker_code') as string | null
  const legacyConsent = formData.get('consent') === 'on'
  const termsPrivacyConsent =
    formData.get('terms_privacy_consent') === 'on' ||
    (legacyConsent && !formData.has('terms_privacy_consent'))
  const medicalDisclaimerConsent = formData.get('medical_disclaimer_consent') === 'on'
  const dataProcessingConsent = formData.get('data_processing_consent') === 'on'
  const aiAcknowledgementConsent = formData.get('ai_acknowledgement_consent') === 'on'
  const marketingConsent = formData.get('marketing_consent') === 'on'

  if (!termsPrivacyConsent || !medicalDisclaimerConsent || !dataProcessingConsent || !aiAcknowledgementConsent) {
    return { error: 'Please complete all required legal acknowledgements to continue.' }
  }

  const supabase = await createClient()
  const admin = hasAdminSupabaseEnv() ? createAdminClient() : undefined
  const headersList = await headers()
  const origin = resolveTrustedOriginFromHeaders(headersList)
  const result = await performCreedaSignup({
    supabase,
    adminSupabase: admin,
    payload: {
      fullName,
      email,
      password,
      role: role as 'athlete' | 'coach' | 'individual',
      coachLockerCode: coachLockerCode || '',
      inviteToken: '',
      termsPrivacyConsent,
      medicalDisclaimerConsent,
      dataProcessingConsent,
      aiAcknowledgementConsent,
      marketingConsent,
    },
    origin,
    auditMeta: {
      userAgent: headersList.get('user-agent'),
      requestIp: headersList.get('x-forwarded-for'),
    },
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/', 'layout')
  
  if (result.session) {
    if (isAppRole(role)) {
      redirect(getRoleOnboardingRoute(role))
    } else {
      redirect('/athlete/onboarding') // Fallback
    }
  } else {
    redirect('/verify-email')
  }
}

export async function verifyLockerCode(code: string) {
  const normalizedCode = code.trim().toUpperCase()
  const headersList = await headers()
  const requestIp =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'anonymous'

  if (!/^\d{6}$/.test(normalizedCode)) {
    return { success: false, error: 'Invalid coach code format' }
  }

  const limiter = await rateLimit(`verify-locker:${requestIp}`, 20, 3600, {
    failOpen: false,
  })
  if (!limiter.success) {
    return { success: false, error: limiter.error }
  }

  const supabase = await createClient()
  const admin = hasAdminSupabaseEnv() ? createAdminClient() : undefined

  const coach = await findCoachByLockerCodeWithClient({
    supabase,
    adminSupabase: admin,
    code: normalizedCode,
  })
  if (!coach) {
    return { success: false, error: 'Invalid coach code' }
  }

  return { 
    success: true, 
    coach: {
      id: coach.id,
      name: coach.full_name,
    }
  }
}
