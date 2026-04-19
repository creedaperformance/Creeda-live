import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { handleApiError } from '@/lib/security/http'
import { normalizeVideoAnalysisReport } from '@/lib/video-analysis/reporting'
import { getCoachVideoReportById } from '@/lib/video-analysis/service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params

  try {
    if (auth.user.profile.role === 'coach') {
      const report = await getCoachVideoReportById(auth.supabase, auth.user.userId, id)
      if (!report) {
        return NextResponse.json({ error: 'Report not found.' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        user: serializeMobileUser(auth.user),
        report,
      })
    }

    const { data: rawReport, error: reportError } = await auth.supabase
      .from('video_analysis_reports')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (reportError) {
      throw new Error(reportError.message)
    }

    const report = normalizeVideoAnalysisReport(rawReport)

    if (!report || report.userId !== auth.user.userId) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      report,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/video-analysis/[id]] failed',
      publicMessage: 'Failed to load video analysis report.',
    })
  }
}
