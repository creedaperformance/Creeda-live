import { NextRequest, NextResponse } from 'next/server'

import { markGuardianHandoffSentForCoach } from '@/lib/coach-academy'
import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'coach') {
    return NextResponse.json(
      { error: 'Only coach accounts can update guardian handoff status.' },
      { status: 403 }
    )
  }

  let athleteId = ''

  try {
    const payload = (await request.json()) as { athleteId?: string }
    athleteId = String(payload.athleteId || '').trim()
  } catch {
    return NextResponse.json(
      { error: 'A valid guardian handoff payload is required.' },
      { status: 400 }
    )
  }

  if (!athleteId) {
    return NextResponse.json(
      { error: 'Athlete id is required to mark guardian handoff as sent.' },
      { status: 400 }
    )
  }

  const result = await markGuardianHandoffSentForCoach(
    auth.supabase,
    auth.user.userId,
    athleteId
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    success: true,
    user: serializeMobileUser(auth.user),
    athleteId,
  })
}
