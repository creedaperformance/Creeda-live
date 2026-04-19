import { NextRequest, NextResponse } from 'next/server'

import { getIndividualWeeklyReviewSnapshot } from '@/lib/dashboard_decisions'
import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { handleApiError } from '@/lib/security/http'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'individual') {
    return NextResponse.json(
      { error: 'Only individual accounts can open the individual weekly review.' },
      { status: 403 }
    )
  }

  try {
    const review = await getIndividualWeeklyReviewSnapshot(auth.supabase, auth.user.userId)

    if (!review) {
      return NextResponse.json(
        {
          error: 'No individual weekly review is available yet.',
          guidance: 'Complete FitStart and log enough signal for CREEDA to build a weekly review.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      review,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/individual/review] failed',
      publicMessage: 'Failed to load individual weekly review.',
    })
  }
}
