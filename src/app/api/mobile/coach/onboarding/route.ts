import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import {
  coachOnboardingSchema,
  submitCoachOnboardingForUser,
} from '@/lib/coach-onboarding'
import { authenticateMobileApiRequest } from '@/lib/mobile/auth'

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'coach') {
    return NextResponse.json(
      { error: 'Only coach accounts can complete this onboarding flow.' },
      { status: 403 }
    )
  }

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const parsed = coachOnboardingSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid coach onboarding payload.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const result = await submitCoachOnboardingForUser({
    supabase: auth.supabase,
    userId: auth.user.userId,
    payload: parsed.data,
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath('/coach')
  revalidatePath('/coach/dashboard')
  revalidatePath('/coach/onboarding')

  return NextResponse.json(result)
}
