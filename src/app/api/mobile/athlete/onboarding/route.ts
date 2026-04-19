import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import {
  athleteOnboardingSchema,
  submitAthleteOnboardingForUser,
} from '@/lib/athlete-onboarding'
import { authenticateMobileApiRequest } from '@/lib/mobile/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete') {
    return NextResponse.json(
      { error: 'Only athlete accounts can complete this onboarding flow.' },
      { status: 403 }
    )
  }

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const parsed = athleteOnboardingSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid athlete onboarding payload.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const adminLookupSupabase = createAdminClient()
  const result = await submitAthleteOnboardingForUser({
    supabase: auth.supabase,
    adminLookupSupabase,
    userId: auth.user.userId,
    payload: parsed.data,
    auditMeta: {
      userAgent: request.headers.get('user-agent'),
      requestIp: request.headers.get('x-forwarded-for'),
    },
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath('/athlete')
  revalidatePath('/athlete/dashboard')
  revalidatePath('/athlete/onboarding')

  return NextResponse.json(result)
}
