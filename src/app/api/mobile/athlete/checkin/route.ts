import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import {
  athleteDailyCheckInSchema,
  submitAthleteDailyCheckInForUser,
} from '@/lib/athlete-checkin'
import { authenticateMobileApiRequest } from '@/lib/mobile/auth'
import { rateLimit } from '@/lib/rate_limit'

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete') {
    return NextResponse.json(
      { error: 'Only athlete accounts can submit this daily check-in.' },
      { status: 403 }
    )
  }

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const parsed = athleteDailyCheckInSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const limiter = await rateLimit(`athlete_daily_checkin:${auth.user.userId}`, 6, 3600, {
    failOpen: false,
  })
  if (!limiter.success) {
    return NextResponse.json({ error: limiter.error }, { status: 429 })
  }

  const response = await submitAthleteDailyCheckInForUser({
    supabase: auth.supabase,
    userId: auth.user.userId,
    parsed: parsed.data,
  })

  if ('error' in response) {
    const status = /invalid|missing|required|complete onboarding/i.test(response.error) ? 422 : 500
    return NextResponse.json({ error: response.error }, { status })
  }

  revalidatePath('/athlete')
  revalidatePath('/athlete/dashboard')
  revalidatePath('/athlete/checkin')

  return NextResponse.json(response)
}
