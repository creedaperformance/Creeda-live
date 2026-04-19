import { NextRequest, NextResponse } from 'next/server'

import { getCoachWeeklyReviewSnapshot } from '@/lib/dashboard_decisions'
import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { handleApiError } from '@/lib/security/http'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'coach') {
    return NextResponse.json(
      { error: 'Only coach accounts can open coach analytics.' },
      { status: 403 }
    )
  }

  try {
    const analytics = await getCoachWeeklyReviewSnapshot(auth.supabase, auth.user.userId)

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      analytics,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/coach/analytics] failed',
      publicMessage: 'Failed to load coach analytics.',
    })
  }
}
