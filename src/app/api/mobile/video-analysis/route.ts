import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { handleApiError } from '@/lib/security/http'
import { listVideoAnalysisSports } from '@/lib/video-analysis/catalog'
import { getUserVideoReports } from '@/lib/video-analysis/service'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete' && auth.user.profile.role !== 'individual') {
    return NextResponse.json(
      { error: 'The scan hub is currently available for athlete and individual accounts only.' },
      { status: 403 }
    )
  }

  try {
    let preferredSport =
      auth.user.profile.role === 'athlete' ? auth.user.profile.primarySport : null

    if (auth.user.profile.role === 'individual') {
      const { data: individualProfile, error: individualProfileError } = await auth.supabase
        .from('individual_profiles')
        .select('sport_profile')
        .eq('id', auth.user.userId)
        .maybeSingle()

      if (individualProfileError) {
        throw new Error(individualProfileError.message)
      }

      const sportProfile = (individualProfile?.sport_profile || {}) as Record<string, unknown>
      preferredSport =
        typeof sportProfile.selectedSport === 'string' ? sportProfile.selectedSport : null
    }

    const [recentReports, sports] = await Promise.all([
      getUserVideoReports(auth.supabase, auth.user.userId, 8),
      Promise.resolve(listVideoAnalysisSports(preferredSport)),
    ])

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      hub: {
        role: auth.user.profile.role,
        preferredSport,
        sports,
        recentReports,
      },
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/video-analysis] failed',
      publicMessage: 'Failed to load the mobile scan hub.',
    })
  }
}
