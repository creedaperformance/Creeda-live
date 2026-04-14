import type {
  AthleteDashboardSnapshot,
  AthleteHealthSummary,
  CoachWeeklyReviewSnapshot,
  IndividualDashboardSnapshot,
} from '@/lib/dashboard_decisions'

function asNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function roundNumber(value: number | null) {
  return value === null ? null : Math.round(value)
}

function summarizeHealth(health: AthleteHealthSummary | null) {
  if (!health) {
    return {
      connected: false,
      available: false,
      source: 'none' as const,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastError: null,
      latestMetricDate: null,
      latestSteps: null,
      avgSleepHours: null,
      avgHeartRate: null,
      avgHrv: null,
      sampleDays: 0,
    }
  }

  return {
    connected: health.connected,
    available: health.available,
    source: health.source,
    lastSyncAt: health.lastSyncAt,
    lastSyncStatus: health.lastSyncStatus,
    lastError: health.lastError,
    latestMetricDate: health.latestMetricDate,
    latestSteps: health.latestSteps,
    avgSleepHours: health.avgSleepHours,
    avgHeartRate: health.avgHeartRate,
    avgHrv: health.avgHrv,
    sampleDays: health.sampleDays,
  }
}

export function buildMobileAthleteDashboard(snapshot: AthleteDashboardSnapshot) {
  const result = snapshot.decisionResult
  const decision = result?.creedaDecision || null
  const readinessScore =
    roundNumber(asNumber(result?.metrics?.readiness?.score)) ??
    roundNumber(asNumber(snapshot.latestIntelligence?.readiness_score)) ??
    roundNumber(asNumber(snapshot.latestLog?.readiness_score))
  const riskScore =
    roundNumber(asNumber(result?.metrics?.risk?.score)) ??
    roundNumber(asNumber(snapshot.latestIntelligence?.risk_score))
  const primaryReason =
    decision?.explanation?.primaryDrivers?.[0]?.reason ||
    result?.decision?.message ||
    'Complete today’s check-in to let CREEDA generate your next decision.'
  const actionInstruction =
    decision?.components?.training?.focus ||
    decision?.sessionType ||
    'Refresh your dashboard after your next check-in.'

  return {
    type: 'athlete' as const,
    readinessScore,
    decision: decision?.decision || null,
    primaryReason,
    actionInstruction,
    riskScore,
    objective: {
      summary: snapshot.objectiveTest?.summary || 'Objective testing is optional until you want a sharper performance anchor.',
      headline: snapshot.objectiveTest?.primarySignal?.formattedHeadline || null,
      trustStatus: snapshot.objectiveTest?.trustStatus || 'missing',
      freshness: snapshot.objectiveTest?.freshness || 'missing',
    },
    health: summarizeHealth(snapshot.healthSummary),
    context: snapshot.contextSummary
      ? {
          summary: snapshot.contextSummary.summary,
          nextAction: snapshot.contextSummary.nextAction,
          loadLabel: snapshot.contextSummary.loadLabel,
        }
      : null,
    nutrition: {
      statusLabel: snapshot.nutritionSafety.statusLabel,
      gateTitle: snapshot.nutritionSafety.gateTitle,
      summary: snapshot.nutritionSafety.summary,
      nextAction: snapshot.nutritionSafety.nextAction,
      blocksDetailedAdvice: snapshot.nutritionSafety.blocksDetailedAdvice,
    },
    latestVideoReport: snapshot.latestVideoReport
      ? {
          status: 'available' as const,
        }
      : null,
  }
}

export function buildMobileCoachDashboard(review: CoachWeeklyReviewSnapshot) {
  return {
    type: 'coach' as const,
    periodLabel: review.periodLabel,
    athleteCount: review.athleteCount,
    teamCount: review.teamCount,
    averageReadiness: review.averageReadiness,
    readinessDelta: review.readinessDelta,
    squadCompliancePct: review.squadCompliancePct,
    activeInterventions: review.activeInterventions,
    lowDataCount: review.lowDataCount,
    resolvedThisWeek: review.resolvedThisWeek,
    objectiveCoveragePct: review.objectiveCoveragePct,
    objectiveDecliningCount: review.objectiveDecliningCount,
    bottleneck: review.bottleneck,
    biggestWin: review.biggestWin,
    highestRiskCluster: review.highestRiskCluster,
    nextWeekFocus: review.nextWeekFocus,
    topPriorityAthletes: review.topPriorityAthletes.slice(0, 5).map((athlete) => ({
      athleteId: athlete.athleteId,
      athleteName: athlete.athleteName,
      teamName: athlete.teamName,
      queueType: athlete.queueType,
      priority: athlete.priority,
      reasons: athlete.reasons,
      recommendation: athlete.recommendation,
      updatedAt: athlete.updatedAt,
    })),
    groupSuggestions: review.groupSuggestions.slice(0, 3),
    teamSummaries: review.teamSummaries.slice(0, 4),
  }
}

export function buildMobileIndividualDashboard(snapshot: IndividualDashboardSnapshot) {
  const decision = snapshot.decision

  return {
    type: 'individual' as const,
    readinessScore: snapshot.readinessScore,
    sport: snapshot.sport,
    primaryGoal: snapshot.primaryGoal,
    directionLabel: decision?.directionLabel || 'Complete FitStart',
    directionSummary:
      decision?.directionSummary ||
      'CREEDA will start producing daily direction once your individual profile is complete.',
    explanation: decision?.explanation || 'Your daily decision will show up here once the profile is ready.',
    today: decision
      ? {
          todayFocus: decision.today.todayFocus,
          intensity: decision.today.intensity,
          sessionDurationMinutes: decision.today.sessionDurationMinutes,
          whatToDo: decision.today.whatToDo.slice(0, 3),
          recoveryActions: decision.today.recoveryActions.slice(0, 3),
          adaptationNote: decision.today.adaptationNote,
        }
      : null,
    pathway: decision?.pathway || null,
    health: decision
      ? {
          usedInDecision: decision.health.usedInDecision,
          influencePct: decision.health.influencePct,
          latestMetricDate: decision.health.latestMetricDate,
          connectedMetricDays: decision.health.connectedMetricDays,
          summary: summarizeHealth(decision.health.summary),
        }
      : {
          usedInDecision: false,
          influencePct: 0,
          latestMetricDate: null,
          connectedMetricDays: 0,
          summary: summarizeHealth(null),
        },
    objective: {
      summary: snapshot.objectiveTest?.summary || 'Objective testing is optional and can stay off until you want extra measurement.',
      headline: snapshot.objectiveTest?.primarySignal?.formattedHeadline || null,
      freshness: snapshot.objectiveTest?.freshness || 'missing',
    },
    context: snapshot.contextSummary
      ? {
          summary: snapshot.contextSummary.summary,
          nextAction: snapshot.contextSummary.nextAction,
          loadLabel: snapshot.contextSummary.loadLabel,
        }
      : null,
    nutrition: {
      statusLabel: snapshot.nutritionSafety.statusLabel,
      gateTitle: snapshot.nutritionSafety.gateTitle,
      summary: snapshot.nutritionSafety.summary,
      nextAction: snapshot.nutritionSafety.nextAction,
      blocksDetailedAdvice: snapshot.nutritionSafety.blocksDetailedAdvice,
    },
  }
}
