import { NextRequest, NextResponse } from 'next/server'

import {
  getAthleteDashboardSnapshot,
  getCoachWeeklyReviewSnapshot,
  getIndividualDashboardSnapshot,
} from '@/lib/dashboard_decisions'
import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import {
  buildMobileAthleteDashboard,
  buildMobileCoachDashboard,
  buildMobileIndividualDashboard,
} from '@/lib/mobile/presenters'
import { handleApiError } from '@/lib/security/http'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  try {
    if (auth.user.profile.role === 'athlete') {
      const snapshot = await getAthleteDashboardSnapshot(auth.supabase, auth.user.userId)
      return NextResponse.json({
        success: true,
        user: serializeMobileUser(auth.user),
        dashboard: buildMobileAthleteDashboard(snapshot),
      })
    }

    if (auth.user.profile.role === 'coach') {
      const review = await getCoachWeeklyReviewSnapshot(auth.supabase, auth.user.userId)
      return NextResponse.json({
        success: true,
        user: serializeMobileUser(auth.user),
        dashboard: buildMobileCoachDashboard(review),
      })
    }

    const snapshot = await getIndividualDashboardSnapshot(auth.supabase, auth.user.userId)
    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      dashboard: buildMobileIndividualDashboard(snapshot),
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/dashboard] failed',
      publicMessage: 'Failed to load mobile dashboard.',
    })
  }
}
