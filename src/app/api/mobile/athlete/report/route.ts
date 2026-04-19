import { NextRequest, NextResponse } from 'next/server'

import { getAthleteMonthlyReportSnapshot } from '@/lib/athlete-monthly-report'
import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { handleApiError } from '@/lib/security/http'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete') {
    return NextResponse.json(
      { error: 'The athlete monthly report is only available for athlete accounts.' },
      { status: 403 }
    )
  }

  try {
    const report = await getAthleteMonthlyReportSnapshot(auth.supabase, auth.user.userId)

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      report,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/athlete/report] failed',
      publicMessage: 'Failed to load athlete monthly report.',
    })
  }
}
