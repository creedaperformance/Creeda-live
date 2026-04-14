import { NextRequest, NextResponse } from 'next/server'

import {
  getAthleteDashboardSnapshot,
  getCoachWeeklyReviewSnapshot,
  getIndividualDashboardSnapshot,
} from '@/lib/dashboard_decisions'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import {
  buildMobileAthleteDashboard,
  buildMobileCoachDashboard,
  buildMobileIndividualDashboard,
} from '@/lib/mobile/presenters'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  const supabase = createAdminClient()

  try {
    if (auth.user.profile.role === 'athlete') {
      const snapshot = await getAthleteDashboardSnapshot(supabase, auth.user.userId)
      return NextResponse.json({
        success: true,
        user: serializeMobileUser(auth.user),
        dashboard: buildMobileAthleteDashboard(snapshot),
      })
    }

    if (auth.user.profile.role === 'coach') {
      const review = await getCoachWeeklyReviewSnapshot(supabase, auth.user.userId)
      return NextResponse.json({
        success: true,
        user: serializeMobileUser(auth.user),
        dashboard: buildMobileCoachDashboard(review),
      })
    }

    const snapshot = await getIndividualDashboardSnapshot(supabase, auth.user.userId)
    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      dashboard: buildMobileIndividualDashboard(snapshot),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown mobile dashboard error.'
    console.error('[api/mobile/dashboard] failed', error)

    return NextResponse.json(
      {
        error: 'Failed to load mobile dashboard.',
        details: message,
      },
      { status: 500 }
    )
  }
}
