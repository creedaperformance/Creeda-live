import { NextRequest, NextResponse } from 'next/server'

import {
  type UpdateCoachAcademyTeamPayload,
  updateCoachAcademyTeamSettingsForCoach,
} from '@/lib/coach-academy'
import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'coach') {
    return NextResponse.json(
      { error: 'Only coach accounts can update academy team settings.' },
      { status: 403 }
    )
  }

  let payload: UpdateCoachAcademyTeamPayload

  try {
    payload = (await request.json()) as UpdateCoachAcademyTeamPayload
  } catch {
    return NextResponse.json(
      { error: 'A valid academy team settings payload is required.' },
      { status: 400 }
    )
  }

  const result = await updateCoachAcademyTeamSettingsForCoach(
    auth.supabase,
    auth.user.userId,
    payload
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    success: true,
    user: serializeMobileUser(auth.user),
  })
}
