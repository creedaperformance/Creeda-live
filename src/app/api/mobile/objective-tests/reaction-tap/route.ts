import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest } from '@/lib/mobile/auth'
import { getObjectiveProtocol } from '@/lib/objective-tests/protocols'
import {
  buildObjectiveMeasurementRows,
  normalizeObjectiveTestSession,
} from '@/lib/objective-tests/store'
import type { ObjectiveTestMeasurement, ObjectiveTestSession } from '@/lib/objective-tests/types'
import {
  calculateReactionTapSummary,
  REACTION_TAP_ACCEPTED_TRIALS,
  REACTION_TAP_PROTOCOL_VERSION,
} from '@/lib/objective-tests/reaction'
import { rateLimit } from '@/lib/rate_limit'
import { handleApiError } from '@/lib/security/http'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function parseInteger(value: unknown, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.round(numeric) : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseAcceptedTrials(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= 1)
    .map((item) => Math.round(item))
}

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete' && auth.user.profile.role !== 'individual') {
    return NextResponse.json(
      { error: 'Reaction tap is currently available for athlete and individual accounts only.' },
      { status: 403 }
    )
  }

  const limiter = await rateLimit(`objective_reaction_tap:${auth.user.userId}`, 12, 3600, {
    failOpen: false,
  })
  if (!limiter.success) {
    return NextResponse.json({ error: limiter.error }, { status: 429 })
  }

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const record = isRecord(rawPayload) ? rawPayload : null
  const acceptedTrials = parseAcceptedTrials(record?.acceptedTrials)
  const falseStartCount = Math.max(0, parseInteger(record?.falseStartCount))
  const metadata = isRecord(record?.metadata) ? record.metadata : {}
  const captureContext = isRecord(record?.captureContext) ? record.captureContext : {}
  const sport = typeof record?.sport === 'string' && record.sport.trim() ? record.sport.trim() : null

  if (acceptedTrials.length < REACTION_TAP_ACCEPTED_TRIALS) {
    return NextResponse.json(
      {
        error: `Reaction tap requires at least ${REACTION_TAP_ACCEPTED_TRIALS} accepted trials.`,
      },
      { status: 400 }
    )
  }

  const protocol = getObjectiveProtocol('reaction_tap')
  if (!protocol) {
    return NextResponse.json(
      { error: 'Reaction tap protocol is not configured.' },
      { status: 500 }
    )
  }

  try {
    const summary = calculateReactionTapSummary(acceptedTrials)
    const confidenceScore = clamp(
      0.88 - falseStartCount * 0.05 - Math.max(summary.consistencyMs - 30, 0) / 120,
      0.35,
      0.95
    )
    const captureQualityScore = clamp(0.9 - falseStartCount * 0.05, 0.45, 0.95)
    const validityStatus =
      summary.consistencyMs > 60 || falseStartCount > 3 ? 'low_confidence' : 'accepted'

    const measurements: ObjectiveTestMeasurement[] = [
      {
        key: protocol.headlineMetric.key,
        label: protocol.headlineMetric.label,
        value: summary.validatedScoreMs,
        unit: 'ms',
        direction: 'lower_better',
        isHeadline: true,
      },
      {
        key: 'average_reaction_ms',
        label: 'Average reaction',
        value: summary.averageScoreMs,
        unit: 'ms',
        direction: 'lower_better',
      },
      {
        key: 'best_reaction_ms',
        label: 'Best tap',
        value: summary.bestScoreMs,
        unit: 'ms',
        direction: 'lower_better',
      },
      {
        key: 'consistency_ms',
        label: 'Consistency',
        value: summary.consistencyMs,
        unit: 'ms',
        direction: 'lower_better',
      },
    ]

    const { data: insertedSession, error: insertError } = await auth.supabase
      .from('objective_test_sessions')
      .insert({
        user_id: auth.user.userId,
        role: auth.user.profile.role,
        test_type: 'reaction_tap',
        family: protocol.family,
        protocol_version: REACTION_TAP_PROTOCOL_VERSION,
        source: 'mobile_native',
        capture_mode: protocol.captureMode,
        sport,
        capture_context: captureContext,
        side_scope: 'none',
        sample_count: acceptedTrials.length,
        false_start_count: falseStartCount,
        average_score_ms: summary.averageScoreMs,
        validated_score_ms: summary.validatedScoreMs,
        best_score_ms: summary.bestScoreMs,
        consistency_ms: summary.consistencyMs,
        classification: summary.classification.label,
        headline_metric_key: protocol.headlineMetric.key,
        headline_metric_value: summary.validatedScoreMs,
        headline_metric_unit: 'ms',
        headline_metric_direction: 'lower_better',
        confidence_score: confidenceScore,
        capture_quality_score: captureQualityScore,
        validity_status: validityStatus,
        baseline_status: 'building',
        quality_flags:
          validityStatus === 'low_confidence'
            ? ['Consistency or false starts were higher than ideal.']
            : [],
        safety_flags: [],
        trial_results: acceptedTrials,
        results_json: {
          accepted_trials: acceptedTrials,
          false_starts: falseStartCount,
        },
        metadata,
      })
      .select('*')
      .single()

    if (insertError || !insertedSession) {
      throw new Error(insertError?.message || 'Reaction session insert failed.')
    }

    const normalized = normalizeObjectiveTestSession(insertedSession)
    if (!normalized) {
      throw new Error('The saved reaction session could not be normalized.')
    }

    const measurementRows = buildObjectiveMeasurementRows(
      normalized.id,
      auth.user.userId,
      auth.user.profile.role,
      normalized.testType,
      measurements
    )

    const { error: measurementError } = await auth.supabase
      .from('objective_test_measurements')
      .insert(measurementRows)

    if (measurementError) {
      console.warn(
        '[api/mobile/objective-tests/reaction-tap] measurement insert failed',
        measurementError
      )
    }

    return NextResponse.json({
      success: true,
      session: normalized as ObjectiveTestSession,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/objective-tests/reaction-tap] failed',
      publicMessage: 'Failed to save reaction tap session.',
    })
  }
}
