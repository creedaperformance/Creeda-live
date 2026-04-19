import { NextRequest, NextResponse } from 'next/server'

import { getCoachAcademySnapshot } from '@/lib/coach-academy'
import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { handleApiError } from '@/lib/security/http'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'coach') {
    return NextResponse.json(
      { error: 'Only coach accounts can open academy operations.' },
      { status: 403 }
    )
  }

  try {
    const academy = await getCoachAcademySnapshot(auth.supabase, auth.user.userId)

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      academy,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/coach/academy] failed',
      publicMessage: 'Failed to load coach academy operations.',
    })
  }
}
