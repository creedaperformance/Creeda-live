import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { computeObjectiveBaselines } from '@/lib/objective-tests/baselines'
import { getObjectiveCadenceDecision } from '@/lib/objective-tests/cadence'
import { getProtocolsForRole } from '@/lib/objective-tests/protocols'
import {
  groupSessionsByProtocol,
  normalizeObjectiveTestSession,
  summarizeObjectiveSignals,
} from '@/lib/objective-tests/store'
import type { ObjectiveTestSession } from '@/lib/objective-tests/types'
import { handleApiError } from '@/lib/security/http'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete' && auth.user.profile.role !== 'individual') {
    return NextResponse.json(
      { error: 'Objective tests are currently available for athlete and individual accounts only.' },
      { status: 403 }
    )
  }

  try {
    const { data: sessionsData, error: sessionsError } = await auth.supabase
      .from('objective_test_sessions')
      .select('*')
      .eq('user_id', auth.user.userId)
      .order('completed_at', { ascending: false })
      .limit(48)

    if (sessionsError) {
      throw new Error(sessionsError.message)
    }

    const sessions = (Array.isArray(sessionsData) ? sessionsData : [])
      .map(normalizeObjectiveTestSession)
      .filter((session): session is ObjectiveTestSession => Boolean(session))

    const protocols = getProtocolsForRole(auth.user.profile.role)
    const baselines = computeObjectiveBaselines(sessions)
    const signals = summarizeObjectiveSignals(sessions, baselines)
    const groupedSessions = groupSessionsByProtocol(sessions)
    const cadence = protocols.map((protocol) => ({
      protocolId: protocol.id,
      ...getObjectiveCadenceDecision({
        protocolId: protocol.id,
        recentSessions: groupedSessions[protocol.id] || [],
        alternativeProtocolId: protocol.alternativesWhenUnsafe?.[0],
      }),
    }))

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      lab: {
        role: auth.user.profile.role,
        protocols,
        sessions,
        signals,
        baselines,
        cadence,
      },
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/objective-tests] failed',
      publicMessage: 'Failed to load objective tests.',
    })
  }
}
