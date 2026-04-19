import { NextRequest, NextResponse } from 'next/server'

import { getAthleteWeeklyReviewSnapshot } from '@/lib/dashboard_decisions'
import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { handleApiError } from '@/lib/security/http'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete') {
    return NextResponse.json(
      { error: 'Only athlete accounts can open the athlete weekly review.' },
      { status: 403 }
    )
  }

  try {
    const review = await getAthleteWeeklyReviewSnapshot(auth.supabase, auth.user.userId)

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      review,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/athlete/review] failed',
      publicMessage: 'Failed to load athlete weekly review.',
    })
  }
}
