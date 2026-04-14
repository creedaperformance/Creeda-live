'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { verifyRole } from '@/lib/auth_utils'
import {
  createDailyContextSignalRecord,
  saveDailyContextSignal,
  summarizeDailyContextSignals,
} from '@/lib/context-signals/storage'
import {
  buildAthleteDecisionTrace,
  computeAthleteDecisionFromLog,
  getAthleteDecisionContext,
  getTodayInIndia,
} from '@/lib/dashboard_decisions'
import { rateLimit } from '@/lib/rate_limit'
import { createClient } from '@/lib/supabase/server'

const athleteDailyCheckInSchema = z.object({
  sleepQuality: z.enum(['Poor', 'Okay', 'Good', 'Excellent']),
  sleepDuration: z.enum(['<6', '6-7', '7-8', '8-9', '9+']),
  sleepLatency: z.enum(['<15 min', '15-30 min', '30-60 min', '>60 min']),
  energyLevel: z.enum(['Drained', 'Low', 'Moderate', 'High', 'Peak']),
  muscleSoreness: z.enum(['None', 'Low', 'Moderate', 'High']),
  lifeStress: z.enum(['Low', 'Moderate', 'High', 'Very High']),
  motivation: z.enum(['Low', 'Moderate', 'High']),
  sessionCompletion: z.enum(['completed', 'competition', 'rest', 'missed']),
  sessionType: z
    .union([z.enum(['Skill', 'Strength', 'Speed', 'Endurance', 'Recovery']), z.literal('')])
    .optional()
    .default(''),
  yesterdayDemand: z.number().min(0).max(10),
  yesterdayDuration: z.number().min(0).max(300),
  painStatus: z.enum(['none', 'mild', 'moderate', 'severe']),
  painLocation: z.array(z.string()).max(6).default([]),
  competitionToday: z.boolean().default(false),
  competitionTomorrow: z.boolean().default(false),
  competitionYesterday: z.boolean().default(false),
  heatLevel: z.union([z.enum(['normal', 'warm', 'hot', 'extreme']), z.literal('')]).optional().default(''),
  humidityLevel: z.union([z.enum(['low', 'moderate', 'high']), z.literal('')]).optional().default(''),
  aqiBand: z.union([z.enum(['good', 'moderate', 'poor', 'very_poor']), z.literal('')]).optional().default(''),
  commuteMinutes: z.number().min(0).max(240).default(0),
  examStressScore: z.number().min(0).max(5).default(0),
  fastingState: z.union([z.enum(['none', 'light', 'strict']), z.literal('')]).optional().default(''),
  shiftWork: z.boolean().default(false),
  sessionNotes: z.string().max(300).optional().default(''),
})

type AthleteDailyCheckInInput = z.infer<typeof athleteDailyCheckInSchema>

// Some older databases still use an adaptation_profiles schema without the
// newer EWMA/progression columns. Cache missing columns once so repeat
// submissions skip them without noisy retry logs.
const unsupportedAdaptationProfileColumns = new Set<string>()

export async function submitAthleteDailyCheckIn(rawData: unknown) {
  try {
    const parsed = athleteDailyCheckInSchema.parse(rawData)
    const { user } = await verifyRole('athlete')
    const supabase = await createClient()

    const limiter = await rateLimit(`athlete_daily_checkin:${user.id}`, 6, 3600)
    if (!limiter.success) return { error: limiter.error }

    const logDate = getTodayInIndia()
    const context = await getAthleteDecisionContext(supabase, user.id, { beforeDate: logDate })
    const contextSignal = createDailyContextSignalRecord({
      userId: user.id,
      role: 'athlete',
      logDate,
      heatLevel: parsed.heatLevel,
      humidityLevel: parsed.humidityLevel,
      aqiBand: parsed.aqiBand,
      commuteMinutes: parsed.commuteMinutes,
      examStressScore: parsed.examStressScore,
      fastingState: parsed.fastingState,
      shiftWork: parsed.shiftWork,
      contextNotes: parsed.sessionNotes,
    })
    const decisionContext =
      contextSignal
        ? {
            ...context,
            contextSignals: [contextSignal, ...context.contextSignals.filter((entry) => entry.logDate !== logDate)],
            contextSummary: summarizeDailyContextSignals([
              contextSignal,
              ...context.contextSignals.filter((entry) => entry.logDate !== logDate),
            ]),
          }
        : context

    const currentLog = buildCurrentLog(user.id, logDate, parsed)
    const result = await computeAthleteDecisionFromLog(decisionContext, currentLog)
    const trace = buildAthleteDecisionTrace(
      result,
      decisionContext.healthSummary,
      'athlete_daily_checkin_v1',
      decisionContext.contextSummary
    )

    const readinessScore = Math.round(result.metrics.readiness.score)
    const dbStatus = mapDecisionToDbStatus(result.creedaDecision.decision)
    const actionInstruction =
      result.creedaDecision.components.training.focus || result.creedaDecision.sessionType || 'Follow today’s protocol.'
    const primaryReason =
      result.creedaDecision.explanation.primaryDrivers[0]?.reason || result.decision.message || 'Daily decision generated.'
    const alertPriority =
      result.creedaDecision.decision === 'RECOVER'
        ? 'Critical'
        : result.creedaDecision.decision === 'MODIFY'
          ? 'Warning'
          : 'Informational'

    const intelligenceMeta = {
      readinessScore,
      status: result.creedaDecision.decision,
      reason: primaryReason,
      action: actionInstruction,
      generatedAt: new Date().toISOString(),
      decision: result.creedaDecision,
      readiness: result.metrics.readiness,
      loadMetrics: result.metrics.load,
      risk: result.metrics.risk,
      confidence: result.metrics.confidence,
      uncertainty: result.metrics.uncertainty,
      adherenceScore: result.creedaDecision.adherence.adherenceScore,
      sessionCompletion: parsed.sessionCompletion,
      source: trace.source,
      contextSummary: decisionContext.contextSummary,
    }

    const logPayload = {
      athlete_id: user.id,
      log_date: logDate,
      sleep: mapWellnessToTen(parsed.sleepQuality, 'sleep'),
      energy: mapWellnessToTen(parsed.energyLevel, 'energy'),
      soreness: mapWellnessToTen(parsed.muscleSoreness, 'soreness'),
      stress: mapWellnessToTen(parsed.lifeStress, 'stress'),
      sleep_quality: parsed.sleepQuality,
      energy_level: parsed.energyLevel,
      muscle_soreness: parsed.muscleSoreness,
      stress_level: parsed.lifeStress,
      sleep_hours: parsed.sleepDuration,
      mental_readiness: deriveMentalReadiness(parsed.motivation, parsed.lifeStress),
      motivation: parsed.motivation,
      life_stress: parsed.lifeStress,
      current_pain_level: painLevelFromStatus(parsed.painStatus),
      pain_location: parsed.painStatus === 'none' ? [] : parsed.painLocation,
      health_status: parsed.painStatus === 'severe' ? 'Needs attention' : 'Normal',
      day_type: deriveDayType(parsed),
      session_importance: deriveSessionImportance(parsed),
      competition_today: parsed.competitionToday,
      competition_tomorrow: parsed.competitionTomorrow,
      competition_yesterday:
        parsed.sessionCompletion === 'competition' ? true : parsed.competitionYesterday,
      is_match_day: parsed.competitionToday,
      session_rpe: currentLog.session_rpe,
      duration_minutes: currentLog.duration_minutes,
      load_score: result.metrics.load.total,
      acute_load_7d: result.metrics.load.ewma_7,
      chronic_load_28d: result.metrics.load.ewma_28,
      acwr_ratio: result.metrics.load.acwr,
      engine_version: 'v5',
      trace_logs: result.decision.logs,
      stability_waveform: result.metrics.uncertainty.stability_waveform,
      priority_score: result.metrics.priority_score,
      readiness_score: readinessScore,
      trust_score: result.metrics.confidence.total_confidence,
      intelligence_meta: intelligenceMeta,
      urine_color: null,
      thirst_level: null,
    }

    const { error: logError } = await supabase
      .from('daily_load_logs')
      .upsert(logPayload, { onConflict: 'athlete_id,log_date' })

    if (logError) {
      return { error: logError.message }
    }

    const contextError = await saveDailyContextSignal(supabase, contextSignal, {
      userId: user.id,
      role: 'athlete',
      logDate,
    })

    if (contextError?.error) {
      return { error: contextError.error.message || 'Failed to save daily context.' }
    }

    if (result.adaptation_update) {
      const adaptationError = await upsertAdaptationProfileCompat(supabase, {
        user_id: user.id,
        ...result.adaptation_update,
      })

      if (adaptationError) {
        return { error: adaptationError.message }
      }
    }

    const { error: intelligenceError } = await supabase.from('computed_intelligence').upsert(
      {
        user_id: user.id,
        log_date: logDate,
        readiness_score: readinessScore,
        recovery_capacity: Math.round(
          (result.metrics.readiness.domains.metabolic + result.metrics.readiness.domains.mental) / 2
        ),
        load_tolerance: Math.round((result.adaptation_update?.load_tolerance || 0.5) * 100),
        risk_score: result.metrics.risk.score,
        status: dbStatus,
        reason: primaryReason,
        action_instruction: actionInstruction,
        alert_priority: alertPriority,
        intelligence_trace: trace,
      },
      { onConflict: 'user_id,log_date' }
    )

    if (intelligenceError) {
      return { error: intelligenceError.message }
    }

    revalidatePath('/athlete')
    revalidatePath('/athlete/dashboard')
    revalidatePath('/athlete/checkin')

    return {
      success: true,
      readinessScore,
      decision: result.creedaDecision.decision,
      action: actionInstruction,
      reason: primaryReason,
    }
  } catch (error: unknown) {
    console.error('[athlete/checkin] submission failed', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to save your daily check-in.',
    }
  }
}

export async function submitHabitCheckIn(rawData: unknown) {
  return submitAthleteDailyCheckIn(rawData)
}

async function upsertAdaptationProfileCompat(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: Record<string, unknown>
) {
  const candidatePayload = { ...payload }

  for (const missingColumn of unsupportedAdaptationProfileColumns) {
    delete candidatePayload[missingColumn]
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await supabase
      .from('adaptation_profiles')
      .upsert(candidatePayload, { onConflict: 'user_id' })

    if (!result.error) return null

    const missingColumn = getMissingColumnError(result.error, 'adaptation_profiles')
    if (!missingColumn || !(missingColumn in candidatePayload)) {
      return result.error
    }

    unsupportedAdaptationProfileColumns.add(missingColumn)
    delete candidatePayload[missingColumn]
  }

  return { message: 'Failed to persist adaptation profile against legacy schema.' }
}

function getMissingColumnError(error: { message?: string } | null, relation: string) {
  const message = String(error?.message || '')
  const match = message.match(/Could not find the '([^']+)' column of '([^']+)'/i)
  if (!match) return null
  if (match[2] !== relation) return null
  return match[1]
}

function buildCurrentLog(userId: string, logDate: string, parsed: AthleteDailyCheckInInput) {
  const sessionCompleted = parsed.sessionCompletion === 'completed' || parsed.sessionCompletion === 'competition'

  return {
    athlete_id: userId,
    log_date: logDate,
    sleep_quality: parsed.sleepQuality,
    sleep: mapWellnessToTen(parsed.sleepQuality, 'sleep'),
    sleep_hours: parsed.sleepDuration,
    sleep_latency: parsed.sleepLatency,
    energy_level: parsed.energyLevel,
    energy: mapWellnessToTen(parsed.energyLevel, 'energy'),
    muscle_soreness: parsed.muscleSoreness,
    soreness: mapWellnessToTen(parsed.muscleSoreness, 'soreness'),
    stress_level: parsed.lifeStress,
    stress: mapWellnessToTen(parsed.lifeStress, 'stress'),
    motivation: parsed.motivation,
    life_stress: parsed.lifeStress,
    current_pain_level: painLevelFromStatus(parsed.painStatus),
    pain_location: parsed.painStatus === 'none' ? [] : parsed.painLocation,
    day_type: deriveDayType(parsed),
    session_importance: deriveSessionImportance(parsed),
    competition_today: parsed.competitionToday,
    competition_tomorrow: parsed.competitionTomorrow,
    competition_yesterday:
      parsed.sessionCompletion === 'competition' ? true : parsed.competitionYesterday,
    is_match_day: parsed.competitionToday,
    session_rpe: sessionCompleted ? parsed.yesterdayDemand : 0,
    duration_minutes: sessionCompleted ? parsed.yesterdayDuration : 0,
    session_type: sessionCompleted ? parsed.sessionType || 'Recovery' : 'Recovery',
    session_notes: parsed.sessionNotes.trim(),
  }
}

function mapWellnessToTen(
  value: AthleteDailyCheckInInput['sleepQuality'] | AthleteDailyCheckInInput['energyLevel'] | AthleteDailyCheckInInput['muscleSoreness'] | AthleteDailyCheckInInput['lifeStress'],
  type: 'sleep' | 'energy' | 'soreness' | 'stress'
) {
  const maps = {
    sleep: { Poor: 2, Okay: 5, Good: 8, Excellent: 10 },
    energy: { Drained: 1, Low: 3, Moderate: 5, High: 8, Peak: 10 },
    soreness: { None: 0, Low: 3, Moderate: 6, High: 9 },
    stress: { Low: 2, Moderate: 5, High: 8, 'Very High': 10 },
  } as const

  return maps[type][value as keyof (typeof maps)[typeof type]] ?? 5
}

function painLevelFromStatus(value: AthleteDailyCheckInInput['painStatus']) {
  if (value === 'mild') return 2
  if (value === 'moderate') return 5
  if (value === 'severe') return 8
  return 0
}

function deriveMentalReadiness(
  motivation: AthleteDailyCheckInInput['motivation'],
  lifeStress: AthleteDailyCheckInInput['lifeStress']
) {
  if (motivation === 'High' && lifeStress === 'Low') return 'High'
  if (motivation === 'Low' || lifeStress === 'Very High' || lifeStress === 'High') return 'Low'
  return 'Moderate'
}

function deriveDayType(parsed: AthleteDailyCheckInInput) {
  if (parsed.sessionCompletion === 'competition') return 'competition'
  if (parsed.sessionCompletion === 'rest') return 'rest'
  if (parsed.sessionCompletion === 'missed') return 'missed'
  return parsed.sessionType.toLowerCase()
}

function deriveSessionImportance(parsed: AthleteDailyCheckInInput) {
  if (parsed.sessionCompletion === 'competition' || parsed.competitionToday) return 'match'
  if (parsed.sessionCompletion === 'missed') return 'missed'
  if (parsed.sessionType === 'Speed' || parsed.sessionType === 'Strength') return 'high'
  return 'normal'
}

function mapDecisionToDbStatus(decision: 'TRAIN' | 'MODIFY' | 'RECOVER') {
  return decision === 'RECOVER' ? 'REST' : decision
}
