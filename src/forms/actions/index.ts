'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { verifyRole } from '@/lib/auth_utils'
import { submitAthleteDailyCheckInForUser } from '@/lib/athlete-checkin'
import { submitAthleteOnboardingForUser } from '@/lib/athlete-onboarding'
import { submitCoachOnboardingForUser } from '@/lib/coach-onboarding'
import { saveFitStartProfileForUser } from '@/lib/fitstart'
import { logIndividualSignalForUser } from '@/lib/individual-logging'
import { rateLimit } from '@/lib/rate_limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ADAPTIVE_FORM_EVENT_NAMES } from '@/forms/analytics'
import { athleteDailyQuickSchema } from '@/forms/schemas/athleteDaily'
import { athleteOnboardingFastStartSchema } from '@/forms/schemas/athleteOnboarding'
import { coachOnboardingFastStartSchema } from '@/forms/schemas/coachOnboarding'
import { individualDailyQuickSchema } from '@/forms/schemas/individualDaily'
import { individualOnboardingFastStartSchema } from '@/forms/schemas/individualOnboarding'
import { athleteDailyFlow, athleteOnboardingFlow } from '@/forms/flows/athleteFlow'
import { coachOnboardingFlow } from '@/forms/flows/coachFlow'
import { individualDailyFlow, individualOnboardingFlow } from '@/forms/flows/individualFlow'
import { mapAdaptiveAthleteDailyToLegacy, mapAdaptiveAthleteOnboardingToLegacy } from '@/forms/mappers/athleteMapper'
import { mapAdaptiveCoachOnboardingToLegacy } from '@/forms/mappers/coachMapper'
import { mapAdaptiveIndividualDailyToLegacy, mapAdaptiveIndividualOnboardingToLegacy } from '@/forms/mappers/individualMapper'
import { upsertAdaptiveDailyLog, upsertAdaptiveProfile } from '@/forms/storage'
import type { AdaptiveFormEventInput } from '@/forms/analytics'

const ADAPTIVE_FORM_EVENTS_TABLE = 'adaptive_form_events'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export async function trackAdaptiveFormEvent(rawEvent: AdaptiveFormEventInput) {
  if (!ADAPTIVE_FORM_EVENT_NAMES.includes(rawEvent.eventName)) {
    return { success: false, error: 'Unsupported adaptive form event.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Authentication required.' }
  }

  const payload = {
    user_id: user.id,
    role: rawEvent.role,
    flow_id: rawEvent.flowId,
    flow_version: rawEvent.flowVersion ?? null,
    flow_kind: rawEvent.flowKind ?? null,
    session_id: rawEvent.sessionId,
    step_id: rawEvent.stepId ?? null,
    question_id: rawEvent.questionId ?? null,
    entry_source: rawEvent.entrySource ?? null,
    entry_mode: rawEvent.entryMode ?? null,
    event_name: rawEvent.eventName,
    event_properties: isPlainObject(rawEvent.eventProperties) ? rawEvent.eventProperties : {},
  }

  const { error } = await supabase.from(ADAPTIVE_FORM_EVENTS_TABLE).insert(payload)

  if (error) {
    console.warn('[adaptive-forms] failed to track adaptive form event', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function submitAdaptiveAthleteOnboarding(rawData: unknown) {
  const parsed = athleteOnboardingFastStartSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please finish the required athlete setup questions before continuing.',
    }
  }

  const { user } = await verifyRole('athlete')
  const supabase = await createClient()
  const admin = createAdminClient()
  const requestHeaders = await headers()

  const result = await submitAthleteOnboardingForUser({
    supabase,
    adminLookupSupabase: admin,
    userId: user.id,
    payload: mapAdaptiveAthleteOnboardingToLegacy(parsed.data),
    auditMeta: {
      userAgent: requestHeaders.get('user-agent'),
      requestIp: requestHeaders.get('x-forwarded-for'),
    },
  })

  if (result.success) {
    await upsertAdaptiveProfile({
      supabase,
      userId: user.id,
      role: 'athlete',
      flow: athleteOnboardingFlow,
      answers: parsed.data,
    })

    revalidatePath('/athlete')
    revalidatePath('/athlete/dashboard')
    revalidatePath('/athlete/onboarding')
  }

  return result
}

export async function submitAdaptiveAthleteDaily(rawData: unknown) {
  try {
    const parsed = athleteDailyQuickSchema.parse(rawData)
    const { user } = await verifyRole('athlete')
    const supabase = await createClient()

    const limiter = await rateLimit(`athlete_daily_checkin:${user.id}`, 6, 3600, {
      failOpen: false,
    })
    if (!limiter.success) return { error: limiter.error }

    const response = await submitAthleteDailyCheckInForUser({
      supabase,
      userId: user.id,
      parsed: mapAdaptiveAthleteDailyToLegacy(parsed),
    })

    if (!('error' in response)) {
      await upsertAdaptiveDailyLog({
        supabase,
        userId: user.id,
        role: 'athlete',
        flow: athleteDailyFlow,
        answers: parsed,
      })

      revalidatePath('/athlete')
      revalidatePath('/athlete/dashboard')
      revalidatePath('/athlete/checkin')
    }

    return response
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to save your athlete check-in.',
    }
  }
}

export async function submitAdaptiveIndividualOnboarding(rawData: unknown) {
  try {
    const parsed = individualOnboardingFastStartSchema.parse(rawData)
    const { user } = await verifyRole('individual')
    const supabase = await createClient()

    const response = await saveFitStartProfileForUser({
      supabase,
      userId: user.id,
      payload: mapAdaptiveIndividualOnboardingToLegacy(parsed),
    })

    if (response.success) {
      await upsertAdaptiveProfile({
        supabase,
        userId: user.id,
        role: 'individual',
        flow: individualOnboardingFlow,
        answers: parsed,
      })

      revalidatePath('/fitstart')
      revalidatePath('/individual')
      revalidatePath('/individual/dashboard')
    }

    return response
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save your FitStart setup.',
    }
  }
}

export async function submitAdaptiveIndividualDaily(rawData: unknown) {
  try {
    const parsed = individualDailyQuickSchema.parse(rawData)
    const { user } = await verifyRole('individual')
    const supabase = await createClient()

    const response = await logIndividualSignalForUser({
      supabase,
      userId: user.id,
      payload: mapAdaptiveIndividualDailyToLegacy(parsed),
    })

    if (!('error' in response)) {
      await upsertAdaptiveDailyLog({
        supabase,
        userId: user.id,
        role: 'individual',
        flow: individualDailyFlow,
        answers: parsed,
      })

      revalidatePath('/individual')
      revalidatePath('/individual/dashboard')
      revalidatePath('/individual/logging')
    }

    return response
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to save your daily pulse.',
    }
  }
}

export async function submitAdaptiveCoachOnboarding(rawData: unknown) {
  const parsed = coachOnboardingFastStartSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      error: 'Please finish the required coach setup questions before continuing.',
    }
  }

  const { user } = await verifyRole('coach')
  const supabase = await createClient()

  const result = await submitCoachOnboardingForUser({
    supabase,
    userId: user.id,
    payload: mapAdaptiveCoachOnboardingToLegacy(parsed.data),
  })

  if (!('error' in result)) {
    await upsertAdaptiveProfile({
      supabase,
      userId: user.id,
      role: 'coach',
      flow: coachOnboardingFlow,
      answers: parsed.data,
    })

    revalidatePath('/coach')
    revalidatePath('/coach/dashboard')
    revalidatePath('/coach/onboarding')
  }

  return result
}
