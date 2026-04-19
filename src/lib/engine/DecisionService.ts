import {
  ReadinessOutput, RiskOutput, ConfidenceOutput, DecisionOutput, UncertaintyOutput,
  CreedaDecision, DecisionVerdict, DominantFactor, RehabOutput, VisionFault, AdherenceData, AthleteInput, TrustSummary
} from './types';

/**
 * CREEDA V5: DECISION SERVICE
 * The FINAL AUTHORITY — No other service outputs directly to UI.
 * 
 * PRIORITY HIERARCHY (strict override order):
 *   1. INJURY_RISK  — Risk & pain ALWAYS override readiness
 *   2. PAIN         — Pain ALWAYS overrides readiness
 *   3. DATA         — Insufficient data → GUIDED BASELINE DAY (never inactive)
 *   4. READINESS    — Readiness state
 *   5. LOAD         — Training load context
 * 
 * RULE: NO_DATA state is REMOVED. Replaced with GUIDED_BASELINE_DAY.
 * RULE: System must NEVER feel inactive.
 */

import { WorkoutPlan, workoutGenerator } from './Prescription/WorkoutGenerator';
import { RecommendedMeal, nutritionGenerator } from './Prescription/NutritionGenerator';
import { buildAthleteScientificContext } from './Prescription/AthleteScienceContext';

// ─── V5: UNIFIED CREEDA DECISION GENERATOR ──────────────────────────────

export async function generateCreedaDecision(params: {
  readiness: ReadinessOutput;
  risk: RiskOutput;
  confidence: ConfidenceOutput;
  history: any[];
  uncertainty: UncertaintyOutput;
  painLevel: number;
  adaptation: any;
  rehab: RehabOutput | null;
  visionFaults: VisionFault[];
  sport: string;
  position: string;
  profile?: AthleteInput['profile'];
  adherence: AdherenceData;
  userId: string;
  dailyContext?: AthleteInput['context'];
}): Promise<CreedaDecision> {
  const {
    readiness, risk, confidence, history, uncertainty,
    painLevel, adaptation, rehab, visionFaults, sport, position, profile, adherence, userId, dailyContext
  } = params;
  void adaptation;

  const timestamp = new Date().toISOString();
  const priorityChain: string[] = [];

  // ─── 1. DATA COMPLETENESS ──────────────────────────────────────────────
  const dataCompleteness = calculateDataCompleteness(params);

  // ─── 2. DECISION PRIORITY HIERARCHY ────────────────────────────────────
  let decision: DecisionVerdict = 'TRAIN';
  let dominantFactor: DominantFactor = 'READINESS';
  let intensity = 75;
  let sessionType = 'Performance Training';
  let duration = 60;

  // PRIORITY 1: INJURY RISK (highest priority — always overrides)
  const riskNormalized = risk.score / 100;
  if (riskNormalized > 0.75 || risk.priority === 'critical') {
    decision = 'RECOVER';
    dominantFactor = 'RISK';
    intensity = 15;
    sessionType = 'Active Recovery & Protection';
    duration = 30;
    priorityChain.push('RISK: Critical injury risk detected → RECOVER');
  }
  // PRIORITY 2: PAIN (overrides readiness)
  else if (painLevel >= 6) {
    decision = 'RECOVER';
    dominantFactor = 'PAIN';
    intensity = 10;
    sessionType = 'Pain Management & Active Recovery';
    duration = 25;
    priorityChain.push('PAIN: High pain level → RECOVER');
  } else if (painLevel >= 4) {
    decision = 'MODIFY';
    dominantFactor = 'PAIN';
    intensity = 35;
    sessionType = 'Modified Low-Impact Session';
    duration = 40;
    priorityChain.push('PAIN: Moderate pain → MODIFY');
  }
  // PRIORITY 3: DATA COMPLETENESS (GUIDED_BASELINE_DAY — never inactive)
  else if (dataCompleteness < 30) {
    decision = 'MODIFY';
    dominantFactor = 'DATA';
    intensity = 40;
    sessionType = 'Baseline Calibration';
    duration = 45;
    priorityChain.push('DATA: Low completeness → GUIDED BASELINE DAY');
  }
  // PRIORITY 4: READINESS
  else if (readiness.score < 45 || risk.priority === 'high') {
    decision = 'RECOVER';
    dominantFactor = 'READINESS';
    intensity = 25;
    sessionType = 'Recovery & Restoration';
    duration = 35;
    priorityChain.push('READINESS: Low readiness or high risk → RECOVER');
  } else if (readiness.score < 65 || risk.priority === 'moderate') {
    decision = 'MODIFY';
    dominantFactor = 'READINESS';
    intensity = 50;
    sessionType = 'Technical & Skill Focus';
    duration = 50;
    priorityChain.push('READINESS: Moderate readiness → MODIFY');
  }
  // PRIORITY 5: LOAD (refine intensity for TRAIN)
  else {
    decision = 'TRAIN';
    dominantFactor = readiness.score >= 80 ? 'READINESS' : 'LOAD';
    
    if (readiness.score >= 85 && risk.priority === 'low') {
      intensity = 90;
      sessionType = 'Peak Performance Push';
      duration = 75;
      priorityChain.push('LOAD: Elite readiness + low risk → MAX TRAIN');
    } else {
      intensity = 70;
      sessionType = 'Standard Training Session';
      duration = 60;
      priorityChain.push('LOAD: Good readiness → TRAIN');
    }
  }

  // ─── 3. ADHERENCE ADJUSTMENTS (Fix #5) ──────────────────────────────────
  if (adherence.adherenceScore < 0.5) {
    intensity = Math.round(intensity * 0.85); // Conservative prescription for low adherence
    priorityChain.push(`ADHERENCE: Low (${(adherence.adherenceScore * 100).toFixed(0)}%) → Reduced intensity`);
  } else if (adherence.yesterdayPlanFollowed && adherence.adherenceScore > 0.9) {
    intensity = Math.min(100, Math.round(intensity * 1.05)); // Reward consistency
    priorityChain.push(`ADHERENCE: High consistency → Scaled load (+5%)`);
  }

  // ─── 4. PSYCHOLOGY NUDGES (Fix #2 & #6) ──────────────────────────────────
  const stressReadiness = params.readiness.factors.stress; // 100 means low stress / mentally ready.
  if (stressReadiness < 20) {
    duration = Math.max(20, Math.round(duration * 0.7)); // Level 2: Abbreviate session
    intensity = Math.min(intensity, 40);
    priorityChain.push('PSYCHOLOGY: Critical stress readiness drop → Abbreviated session');
  } else if (stressReadiness < 40) {
    // Level 1: Handled in buildConstraints/buildComponents by simplifying
    priorityChain.push('PSYCHOLOGY: Low stress readiness detected → Simplified complexity');
  }

  // ─── 4. REHAB OVERRIDE ────────────────────────────────────────────────
  if (rehab && rehab.stage.phase <= 3) {
    // Active rehab phases override normal training
    if (decision === 'TRAIN') {
      decision = 'MODIFY';
      sessionType = `Rehab: ${rehab.stage.label} Phase`;
      intensity = Math.min(intensity, 50);
      priorityChain.push(`REHAB: Active ${rehab.stage.label} phase → MODIFY`);
    }
  }

  // ─── 5. GENERATE PRESCRIPTIONS (ASYNC) ─────────────────────────────────
  const activeInjuries = rehab?.stage.injuryContext.type ? [rehab.stage.injuryContext.type] : [];
  const scientificContext = buildAthleteScientificContext({
    sport,
    position,
    primaryGoal: profile?.primaryGoal,
    sessionType,
    decision,
    readinessScore: readiness.score,
    painLevel,
    age: typeof profile?.age === 'number' ? profile.age : undefined,
    rehab: rehab
      ? {
          phase: rehab.stage.phase,
          label: rehab.stage.label,
          injuryType: rehab.stage.injuryContext.type,
          progressionReadiness: rehab.stage.progressionReadiness,
        }
      : null,
  });

  const [workoutPlan, mealPlan] = await Promise.all([
    workoutGenerator.generateDailyWorkout({
      userId,
      sessionType: decision,
      readinessScore: readiness.score,
      injuryRiskScore: risk.score,
      activeInjuries,
      sport,
      position,
      goal: normalizeNutritionGoal(profile?.primaryGoal),
      experienceLevel: normalizeExperienceLevel(profile?.activityLevel, sport, history.length),
      calibration: {
        active: confidence.mode === 'cold_start' || dataCompleteness < 45,
        sessionCount: history.length,
      },
      visionFaults,
      sportProfile: scientificContext.sportProfile,
      conditioningContext: scientificContext.conditioning,
    }),
    nutritionGenerator.buildDailyNutrition(
      userId,
      normalizeNutritionGoal(profile?.primaryGoal),
      sanitizePositiveMetric(profile?.weightKg, 75, 30, 250),
      sanitizePositiveMetric(profile?.heightCm, 175, 120, 230),
      sanitizePositiveMetric(profile?.age, 28, 8, 90),
      inferAthleteTimingPreference(profile?.wakeTime),
      normalizeActivityLevel(profile?.activityLevel, sport),
      profile?.biologicalSex || profile?.gender || 'unknown',
      undefined,
      {
        sessionType: decision,
        sport,
        position,
        sportProfile: scientificContext.sportProfile,
        nutritionGuidance: scientificContext.nutrition,
      }
    ),
  ]);

  // ─── 6. BUILD MULTI-DOMAIN COMPONENTS ──────────────────────────────────
  const components = buildComponents(
    decision,
    intensity,
    readiness,
    risk,
    rehab,
    workoutPlan,
    mealPlan,
    painLevel,
    dataCompleteness,
    scientificContext
  );

  // ─── 7. BUILD CONSTRAINTS ─────────────────────────────────────────────
  const constraints = buildConstraints(readiness, risk, painLevel, rehab, visionFaults);

  // ─── 8. BUILD EXPLANATION ─────────────────────────────────────────────
  const explanation = buildExplanation(readiness, risk, painLevel, confidence, uncertainty, rehab, dominantFactor);

  // ─── 9. BUILD PREDICTIONS ─────────────────────────────────────────────
  const predictions = buildPredictions(history, risk, readiness);

  // ─── 10. BUILD FEEDBACK ────────────────────────────────────────────────
  const feedback = buildFeedback(history, readiness);

  // ─── 11. BUILD PROGRESSION ────────────────────────────────────────────
  const progression = {
    rehabStage: rehab?.stage || null,
    progressionReadiness: rehab?.shouldProgress || false,
  };

  const confidenceScore = Math.round(confidence.total_confidence * 100);
  const confidenceLevel =
    confidence.total_confidence < 0.4 ? 'LOW' : confidence.total_confidence < 0.7 ? 'MEDIUM' : 'HIGH';
  const trustSummary = buildTrustSummary({
    confidence,
    confidenceScore,
    confidenceLevel,
    dataCompleteness,
    historyLength: history.length,
    dominantFactor,
    painLevel,
    rehab,
    visionFaults: params.visionFaults || [],
    feedbackInsight: feedback.insight,
    dailyContext,
  });

  return {
    decision,
    intensity,
    sessionType,
    duration,
    decisionContext: {
      dominantFactor,
      priorityChain,
    },
    components,
    constraints,
    explanation,
    predictions,
    progression,
    feedback,
    adherence,
    dataCompleteness,
    confidenceScore,
    confidenceLevel,
    confidenceReasons: confidence.reasons,
    trustSummary,
    visionFaults: params.visionFaults || [],
    scientificContext,
    timestamp,
  };
}

function inferAthleteTimingPreference(wakeTime?: string): 'EARLY' | 'LATE' | 'IF' {
  const normalized = String(wakeTime || '').trim()
  if (!normalized) return 'EARLY'

  const [hourRaw, minuteRaw] = normalized.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw || 0)
  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return 'EARLY'
  }

  const totalMinutes = hour * 60 + minute
  if (totalMinutes >= 9 * 60 + 30) return 'LATE'
  if (totalMinutes <= 6 * 60) return 'EARLY'
  return 'EARLY'
}

function sanitizePositiveMetric(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeNutritionGoal(goal?: string) {
  const normalized = String(goal || '').trim().toLowerCase();

  if (normalized.includes('fat')) return 'fat_loss';
  if (normalized.includes('muscle')) return 'muscle_gain';
  if (normalized.includes('endurance')) return 'endurance';
  if (normalized.includes('sport')) return 'sport_specific';

  return 'general_fitness';
}

function normalizeActivityLevel(activityLevel?: string, sport?: string) {
  const normalized = String(activityLevel || '').trim().toLowerCase();

  if (['sedentary', 'moderate', 'active', 'athlete'].includes(normalized)) {
    return normalized;
  }

  const sportKey = String(sport || '').trim().toLowerCase();
  if (/(football|soccer|rugby|basketball|tennis|sprint|athlet)/.test(sportKey)) return 'athlete';
  if (/(running|cycling|swimming|hypertrophy|gym|strength)/.test(sportKey)) return 'active';

  return 'moderate';
}

function normalizeExperienceLevel(activityLevel?: string, sport?: string, historyLength: number = 0) {
  if (historyLength < 5) return 1;

  const normalized = String(activityLevel || '').trim().toLowerCase();
  if (normalized === 'athlete' || normalized === 'active') return 3;
  if (normalized === 'moderate') return 2;

  const sportKey = String(sport || '').trim().toLowerCase();
  if (/(football|soccer|rugby|basketball|tennis|hockey|athlet)/.test(sportKey)) return 3;
  if (/(running|cycling|swimming|gym|strength|hypertrophy)/.test(sportKey)) return 2;

  return 1;
}

// ─── COMPONENT BUILDERS ──────────────────────────────────────────────────

function buildComponents(
  decision: DecisionVerdict,
  intensity: number,
  readiness: ReadinessOutput,
  risk: RiskOutput,
  rehab: RehabOutput | null,
  workoutPlan: WorkoutPlan | null,
  mealPlan: RecommendedMeal[] | null,
  painLevel: number,
  dataCompleteness: number,
  scientificContext: CreedaDecision['scientificContext'],
): CreedaDecision['components'] {
  // Training component
  let trainingFocus = 'General Fitness';
  let intensityCap = intensity;

  if (decision === 'TRAIN') {
    if (readiness.score >= 85) {
      trainingFocus = `Peak Performance Push`;
      intensityCap = 100;
    } else {
      trainingFocus = `Technical & Conditioning`;
      intensityCap = 85;
    }
  } else if (decision === 'MODIFY') {
    if (dataCompleteness < 30) {
      trainingFocus = 'Baseline Calibration';
      intensityCap = 50;
    } else {
      trainingFocus = 'Movement Quality Focus';
      intensityCap = 60;
    }
  } else {
    trainingFocus = 'Active Recovery';
    intensityCap = 30;
  }

  // Recovery component
  const recoveryMethods: string[] = [];
  let recoveryPriority = 'Standard';
  if (decision === 'RECOVER') {
    recoveryMethods.push('Sleep optimization (8+ hours)', 'Contrast water therapy', 'Foam rolling (15 min)', 'Gentle mobility work');
    recoveryPriority = 'Critical';
  } else if (decision === 'MODIFY') {
    recoveryMethods.push('Extended warm-up', 'Post-session stretching', 'Sleep quality focus');
    recoveryPriority = 'Elevated';
  } else {
    recoveryMethods.push('Standard cool-down', 'Hydration focus');
    recoveryPriority = 'Standard';
  }

  // Psychology component
  const mentalReadiness = readiness.domains.mental;
  let psychAdvice = 'Mental state is optimal. Focus on process goals during training.';
  if (mentalReadiness < 50) {
    psychAdvice = 'Mental fatigue detected. Use visualization and breathing exercises. We have simplified your session to focus on the wins.';
  } else if (mentalReadiness < 70) {
    psychAdvice = 'Moderate mental load. Focus on routine and consistency. Session complexity reduced for better adherence.';
  }
  if (readiness.factors.stress < 20) {
    psychAdvice = 'Critical stress/motivation levels. We have shortened today\'s session to 20-30 minutes. Just get the work done and recover.';
  } else if (readiness.factors.stress < 40) {
    psychAdvice = 'Motivation dip detected. Prioritizing primary movements and removing complex accessories to simplify your day.';
  }

  // Nutrition component
  let hydrationPriority = false;
  if (decision === 'RECOVER') {
    hydrationPriority = true;
  } else if (decision === 'TRAIN' && intensity >= 80) {
    hydrationPriority = true;
  } else if (painLevel >= 3) {
    hydrationPriority = true;
  }

  const totalPortionGrams = mealPlan?.reduce((acc, m) => acc + (m.portionSizeGrams || 0), 0) || 0;
  const fueling = buildFuelingGuidance(
    decision,
    hydrationPriority,
    workoutPlan?.protocols || null,
    scientificContext
  );

  return {
    training: {
      focus: trainingFocus,
      plan: workoutPlan,
      intensityCap,
      athleteFocus: workoutPlan?.athleteFocus || null,
      sessionProtocol: workoutPlan?.protocols || null,
    },
    rehab: rehab?.stage || null,
    recovery: {
      methods: recoveryMethods,
      priority: recoveryPriority,
    },
    psychology: {
      mentalReadiness,
      advice: psychAdvice,
    },
    nutrition: {
      meals: mealPlan,
      hydrationPriority,
      totalPortionGrams,
      fueling,
    },
  };
}

function buildFuelingGuidance(
  decision: DecisionVerdict,
  hydrationPriority: boolean,
  protocol: WorkoutPlan['protocols'] | null,
  scientificContext: CreedaDecision['scientificContext']
): CreedaDecision['components']['nutrition']['fueling'] {
  const sport = scientificContext.sportProfile?.sportName || null;
  const position = scientificContext.sportProfile?.positionName || null;

  const preSession = uniqueStrings([
    scientificContext.nutrition.timing[0],
    ...(protocol?.preSession || []),
  ]);

  const duringSession = uniqueStrings([
    protocol?.nutrition,
    hydrationPriority ? 'Hydration is a live priority today. Keep fluids and sodium aligned with the session demand.' : null,
    decision === 'TRAIN'
      ? scientificContext.nutrition.timing[1] || scientificContext.nutrition.priorities[0]
      : null,
  ]);

  const recoveryWindow = uniqueStrings([
    scientificContext.nutrition.timing[2],
    scientificContext.nutrition.priorities[0],
    protocol?.recoveryPriority,
    ...(protocol?.recoveryTargets || []),
  ]);

  return {
    sport,
    position,
    summary: scientificContext.nutrition.summary,
    preSession,
    duringSession,
    recoveryWindow,
    hydrationPriority,
  };
}

function uniqueStrings(items: Array<string | null | undefined>) {
  return [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))];
}

function getDailyContextDrivers(context?: AthleteInput['context']) {
  if (!context) return [];

  const drivers: string[] = [];

  if (context.heat_level === 'extreme') drivers.push('extreme heat');
  else if (context.heat_level === 'hot') drivers.push('high heat');

  if (context.humidity_level === 'high') drivers.push('high humidity');
  if (context.aqi_band === 'very_poor') drivers.push('very poor air quality');
  else if (context.aqi_band === 'poor') drivers.push('poor air quality');

  if ((context.commute_minutes || 0) >= 90) drivers.push('a long commute');
  else if ((context.commute_minutes || 0) >= 45) drivers.push('a moderate commute');

  if ((context.exam_stress_score || 0) >= 4) drivers.push('heavy schedule stress');
  else if ((context.exam_stress_score || 0) >= 2) drivers.push('extra schedule stress');

  if (context.fasting_state === 'strict') drivers.push('strict fasting');
  else if (context.fasting_state === 'light') drivers.push('light fasting');

  if (context.shift_work) drivers.push('shift-work fatigue');

  return drivers;
}

function hasDailyContextSignal(context?: AthleteInput['context']) {
  if (!context) return false;

  return Boolean(
    context.heat_level ||
    context.humidity_level ||
    context.aqi_band ||
    (context.commute_minutes || 0) > 0 ||
    (context.exam_stress_score || 0) > 0 ||
    context.fasting_state ||
    context.shift_work
  );
}

function formatHumanList(items: string[]) {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function buildTrustSummary(params: {
  confidence: ConfidenceOutput;
  confidenceScore: number;
  confidenceLevel: TrustSummary['confidenceLevel'];
  dataCompleteness: number;
  historyLength: number;
  dominantFactor: DominantFactor;
  painLevel: number;
  rehab: RehabOutput | null;
  visionFaults: VisionFault[];
  feedbackInsight: string;
  dailyContext?: AthleteInput['context'];
}): TrustSummary {
  const dataQuality: TrustSummary['dataQuality'] =
    params.dataCompleteness >= 80 ? 'COMPLETE' : params.dataCompleteness >= 50 ? 'PARTIAL' : 'WEAK';
  const contextDrivers = getDailyContextDrivers(params.dailyContext);
  const hasContextSignal = hasDailyContextSignal(params.dailyContext);

  const signals: TrustSummary['signals'] = [
    {
      label: 'Daily check-in',
      type: 'self_reported',
      status: 'active',
      detail: 'Sleep, soreness, stress, pain, and prior session load are included.',
    },
    {
      label: 'Recent training history',
      type: 'estimated',
      status: params.historyLength >= 7 ? 'active' : params.historyLength >= 3 ? 'limited' : 'building',
      detail:
        params.historyLength >= 7
          ? `${params.historyLength} recent sessions are stabilizing trend context.`
          : params.historyLength > 0
            ? `${params.historyLength} recent sessions are available, but the trend is still building.`
            : 'No recent history is available yet.',
    },
    {
      label: 'Pain and rehab context',
      type: 'self_reported',
      status: params.painLevel > 0 || Boolean(params.rehab) ? 'active' : 'limited',
      detail:
        params.painLevel > 0 || params.rehab
          ? 'Pain protection and rehab state are actively influencing the call.'
          : 'No active pain or rehab override is shaping the session today.',
    },
    {
      label: 'Daily context',
      type: 'self_reported',
      status: contextDrivers.length > 0 ? 'active' : hasContextSignal ? 'limited' : 'building',
      detail:
        contextDrivers.length > 0
          ? `Extra day load is coming from ${formatHumanList(contextDrivers.slice(0, 3))}.`
          : hasContextSignal
            ? 'Optional context was logged, but it is not adding much friction to the session today.'
            : 'No optional heat, commute, air-quality, or fasting context was logged today.',
    },
    {
      label: 'Movement scan',
      type: 'measured',
      status: params.visionFaults.length > 0 ? 'active' : 'missing',
      detail:
        params.visionFaults.length > 0
          ? `${params.visionFaults.length} recent movement faults are informing biomechanical safeguards.`
          : 'No recent objective movement scan is attached to today’s decision.',
    },
    {
      label: 'Baseline calibration',
      type: 'estimated',
      status: params.confidence.mode === 'normal' ? 'active' : 'building',
      detail:
        params.confidence.mode === 'normal'
          ? 'The model has enough stable history to trust deeper prescription logic.'
          : 'The model is still stabilizing around this athlete’s baseline.',
    },
  ];

  const whyTodayChanged = uniqueStrings([
    params.feedbackInsight,
    `Dominant factor today: ${params.dominantFactor.toLowerCase()}.`,
    params.confidence.reasons[0],
    contextDrivers.length > 0 ? `Daily context added extra friction through ${formatHumanList(contextDrivers.slice(0, 2))}.` : null,
  ]).slice(0, 3);

  const nextBestInputs = uniqueStrings([
    params.dataCompleteness < 80 ? 'Complete a full daily check-in tomorrow to strengthen the recommendation.' : null,
    params.historyLength < 7 ? 'Keep logging consistently for a full week to stabilize trend confidence.' : null,
    params.visionFaults.length === 0 ? 'Add a movement scan when you want objective technique context in the plan.' : null,
    params.confidence.mode !== 'normal' ? 'Finish the current calibration block before trusting maximal progression.' : null,
    !hasContextSignal ? 'Optional: log heat, commute, air quality, or fasting only when the day is unusual so CREEDA can explain the call more precisely.' : null,
  ]).slice(0, 3);

  return {
    confidenceLevel: params.confidenceLevel,
    confidenceScore: params.confidenceScore,
    dataCompleteness: params.dataCompleteness,
    dataQuality,
    signals,
    whyTodayChanged,
    nextBestInputs,
  };
}

function buildConstraints(
  readiness: ReadinessOutput,
  risk: RiskOutput,
  painLevel: number,
  rehab: RehabOutput | null,
  visionFaults: VisionFault[],
): CreedaDecision['constraints'] {
  const avoid: string[] = [];
  const flags: string[] = [];

  // Pain-based constraints
  if (painLevel >= 6) {
    avoid.push('All high-impact activities', 'Running', 'Jumping', 'Heavy resistance training');
    flags.push('PAIN PROTOCOL ACTIVE');
  } else if (painLevel >= 4) {
    avoid.push('Explosive movements', 'Heavy Olympic lifts', 'Maximal sprints');
    flags.push('MODIFIED LOAD');
  }

  // Neuromuscular constraints
  if (readiness.domains.neuromuscular < 50) {
    avoid.push('Plyometric jumps', 'Maximal sprints', 'Heavy eccentric loading');
    flags.push('NEUROMUSCULAR FATIGUE');
  }

  // Risk-based constraints
  if (risk.priority === 'critical' || risk.priority === 'high') {
    flags.push('INJURY RISK ELEVATED');
    if (risk.predictedInjuryType === 'HAMSTRING') {
      avoid.push('Full-speed sprinting', 'Nordic hamstring curls (heavy)', 'Rapid acceleration');
    } else if (risk.predictedInjuryType === 'ACL') {
      avoid.push('Cutting drills', 'Unplanned direction changes', 'Deep lunges');
    } else if (risk.predictedInjuryType === 'ANKLE') {
      avoid.push('Jump landings on hard surface', 'Lateral shuffles on uneven ground');
    } else if (risk.predictedInjuryType === 'SHOULDER') {
      avoid.push('Overhead pressing', 'High-volume throwing/serving', 'Behind-neck movements');
    }
  }

  // Rehab constraints
  if (rehab && rehab.stage.phase <= 2) {
    avoid.push('Any activity causing pain above 3/10', 'Loaded movements through injured area');
    flags.push('REHAB PROTOCOL ACTIVE');
  }

  // Vision fault constraints
  for (const fault of visionFaults.filter(f => f.severity === 'high')) {
    flags.push(`MOVEMENT FAULT: ${fault.fault}`);
  }

  return {
    avoid: [...new Set(avoid)], // Deduplicate
    flags: [...new Set(flags)],
  };
}

function buildExplanation(
  readiness: ReadinessOutput,
  risk: RiskOutput,
  painLevel: number,
  confidence: ConfidenceOutput,
  uncertainty: UncertaintyOutput,
  rehab: RehabOutput | null,
  dominantFactor: DominantFactor,
): CreedaDecision['explanation'] {
  const primary: { factor: string; reason: string }[] = [];
  const secondary: { factor: string; reason: string }[] = [];

  // Build based on dominant factor
  switch (dominantFactor) {
    case 'RISK':
      primary.push({ factor: 'Injury Risk', reason: `Risk score ${risk.score}/100 (${risk.label}). ${risk.predictedInjuryType ? `Predicted: ${risk.predictedInjuryType} injury` : 'General elevated risk'}.` });
      break;
    case 'PAIN':
      primary.push({ factor: 'Pain Level', reason: `Current pain ${painLevel}/10. Activity modification required to prevent further tissue damage.` });
      break;
    case 'DATA':
      primary.push({ factor: 'Data Building', reason: 'System needs more data for accurate prescription. Today is a guided baseline session to calibrate your profile.' });
      break;
    case 'READINESS':
      primary.push({ factor: 'Readiness', reason: `Readiness ${readiness.score}/100 — ${readiness.score >= 80 ? 'optimal for high-intensity work' : readiness.score >= 60 ? 'adequate for modified training' : 'recovery is the priority'}.` });
      break;
    case 'LOAD':
      primary.push({ factor: 'Training Load', reason: 'Load management is the primary driver. Training cleared with load-appropriate intensity.' });
      break;
  }

  // Additional primary drivers (top 3 max)
  if (painLevel >= 3 && dominantFactor !== 'PAIN') {
    primary.push({ factor: 'Pain', reason: `Pain level ${painLevel}/10 is affecting movement capacity.` });
  }
  if (risk.score >= 60 && dominantFactor !== 'RISK') {
    primary.push({ factor: 'Injury Risk', reason: `Elevated risk score (${risk.score}/100) detected.` });
  }
  if (readiness.score < 55 && dominantFactor !== 'READINESS') {
    primary.push({ factor: 'Readiness', reason: `Below optimal readiness (${readiness.score}/100).` });
  }

  // Secondary drivers
  if (uncertainty.score > 0.5) {
    secondary.push({ factor: 'Data Stability', reason: 'Recent performance data shows high variability — conservative approach applied.' });
  }
  if (risk.fatigue_memory > 60) {
    secondary.push({ factor: 'Accumulated Fatigue', reason: 'Historical fatigue load remains elevated across multiple days.' });
  }
  if (confidence.total_confidence < 0.6) {
    secondary.push({ factor: 'Confidence', reason: 'Engine confidence is still building. Prescription is conservative until data stabilizes.' });
  }
  if (readiness.domains.mental < 50) {
    secondary.push({ factor: 'Mental Fatigue', reason: 'Psychological readiness is below optimal — may affect decision-making during training.' });
  }
  if (rehab) {
    secondary.push({ factor: 'Rehab Status', reason: `${rehab.stage.label} phase — ${rehab.reasoning}` });
  }

  return {
    primaryDrivers: primary.slice(0, 3),
    secondaryDrivers: secondary.slice(0, 3),
  };
}

function buildPredictions(
  history: any[],
  risk: RiskOutput,
  readiness: ReadinessOutput,
): CreedaDecision['predictions'] {
  // Readiness forecast: project next 3-5 days based on trend
  const recentReadiness = history.slice(0, 5).map(h => h.readinessScore || h.readiness_score || 70);
  const forecast: number[] = [];

  if (recentReadiness.length >= 2) {
    const slope = (recentReadiness[0] - recentReadiness[recentReadiness.length - 1]) / recentReadiness.length;
    const current = readiness.score;
    for (let day = 1; day <= 5; day++) {
      const projected = Math.max(20, Math.min(100, Math.round(current + (slope * day * 0.7))));
      forecast.push(projected);
    }
  } else {
    // Insufficient data — flat forecast
    for (let day = 0; day < 5; day++) forecast.push(readiness.score);
  }

  return {
    injuryRiskTrend: risk.trendDirection,
    readinessForecast: forecast,
    predictedInjuryType: risk.predictedInjuryType,
    riskLevel: risk.priority === 'critical' ? 'high' : risk.priority === 'high' ? 'high' : risk.priority === 'moderate' ? 'moderate' : 'low',
  };
}

function buildFeedback(
  history: any[],
  readiness: ReadinessOutput,
): CreedaDecision['feedback'] {
  if (history.length === 0) {
    return {
      yesterdayComparison: 'no_data',
      readinessDelta: 0,
      insight: 'Welcome to Creeda. Complete today\'s session to begin tracking your trajectory.',
    };
  }

  const yesterdayReadiness = history[0]?.readinessScore || history[0]?.readiness_score || 70;
  const delta = readiness.score - yesterdayReadiness;

  let comparison: CreedaDecision['feedback']['yesterdayComparison'] = 'stable';
  let insight = '';

  if (delta > 5) {
    comparison = 'improved';
    insight = `Readiness up ${delta} points from yesterday. Your recovery is working — capitalize on this window.`;
  } else if (delta < -5) {
    comparison = 'declined';
    insight = `Readiness down ${Math.abs(delta)} points from yesterday. Prioritize recovery inputs to reverse this trend.`;
  } else {
    comparison = 'stable';
    insight = 'Readiness holding steady. Maintain current habits and monitor for changes.';
  }

  // Persistence Focus: Calibration (Fix #4)
  if (history.length < 5) {
    insight = `Calibration in Progress: Our engine is learning your unique physiology. Strength estimates and prescriptions will improve daily.`;
  }

  // Adherence Insight (Fix #5)
  if (delta > 0 && history[0]?.adherenceScore > 0.9) {
    insight += ` Great work following yesterday's plan (90%+ adherence) — we've safely scaled today's load to match your consistency.`;
  }

  return {
    yesterdayComparison: comparison,
    readinessDelta: delta,
    insight,
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────

function calculateDataCompleteness(params: any): number {
  let fields = 0;
  let filled = 0;

  const checks = [
    ['wellness.sleep_quality', params.readiness.factors.sleep > 0],
    ['wellness.energy', params.readiness.factors.energy > 0],
    ['wellness.soreness', params.readiness.factors.soreness > 0],
    ['wellness.stress', params.readiness.factors.stress > 0],
    ['wellness.pain', true], // Pain level always present (default 0)
    ['history.length >= 3', params.history.length >= 3],
    ['history.length >= 7', params.history.length >= 7],
    ['health_metrics', !!params.readiness.felt_reality_gap !== undefined],
    ['confidence > cold_start', params.confidence.mode !== 'cold_start'],
    ['adaptation_profile', !!params.adaptation],
  ];

  for (const [, check] of checks) {
    fields++;
    if (check) filled++;
  }

  return Math.round((filled / fields) * 100);
}

// ─── LEGACY V4 DECISION (BACKWARD COMPAT) ────────────────────────────────

export function generateDecision(
  readiness: ReadinessOutput,
  risk: RiskOutput,
  confidence: ConfidenceOutput,
  history: any[],
  uncertainty: UncertaintyOutput,
  painLevel: number,
  adaptation: any
): DecisionOutput {
  const { score: rScore, domains: rDomains } = readiness;
  const { score: riskScore, priority: riskPriority } = risk;
  const { total_confidence: confScore } = confidence;

  const safety_overrides_triggered: string[] = [];
  const structured_explanation: DecisionOutput['structured_explanation'] = [];

  const getSlope = (days: number) => {
    const subset = history.slice(0, days).map(h => h.readinessScore || 70);
    if (subset.length < 2) return 0;
    return (subset[0] - subset[subset.length - 1]) / (subset.length - 1);
  };
  const slope3 = isNaN(getSlope(3)) ? 0 : getSlope(3);
  const slope5 = isNaN(getSlope(5)) ? 0 : getSlope(5);
  const hybridTrend = (0.7 * slope3) + (0.3 * slope5);
  const momentum = isNaN(getSlope(2)) ? 0 : getSlope(2);
  const trendSignal = isNaN((0.7 * hybridTrend) + (0.3 * momentum)) ? 0 : (0.7 * hybridTrend) + (0.3 * momentum);

  const safeTol = isNaN(Number(adaptation.load_tolerance)) ? 0.5 : adaptation.load_tolerance;
  const safeSens = isNaN(Number(adaptation.fatigue_sensitivity)) ? 0.5 : adaptation.fatigue_sensitivity;
  const toleranceBuffer = (safeTol - 0.5) * 10;
  const painThreshold = 7 + (safeSens < 0.3 ? 1 : 0);
  const riskThreshold = 85 + toleranceBuffer;

  let intensity: DecisionOutput['intensity'] = 'Moderate';
  let primary_action: DecisionOutput['primary_action'] = 'Train';
  let cap = 100;
  let focus = 'Performance';
  let message = "System baseline stable. Trajectory-aligned training cleared.";

  if (rScore >= 85 && riskPriority === 'low' && trendSignal >= 0) {
    intensity = 'Maximal'; cap = 110;
    message = "Athlete is in an elite window with positive trajectory. Cleared for maximal stimulus.";
  } else if (rScore >= 70 && riskPriority !== 'high' && trendSignal > -5) {
    intensity = 'High'; cap = 100;
  } else if (rScore < 55 || riskPriority === 'high' || trendSignal < -8) {
    intensity = 'Low'; primary_action = 'Recover'; cap = 60; focus = 'Recovery';
    message = "Physiological recovery focus due to declining performance momentum.";
  }

  const logs: string[] = [];
  logs.push(`Readiness: ${rScore} | Risk: ${riskScore} | Confidence: ${Math.round(confScore * 100)}%`);

  const trendBias = trendSignal > 2 ? 10 : (trendSignal < -2 ? -15 : 0);
  const uncertaintyBias = uncertainty.score > 0.6 ? -25 : (uncertainty.score > 0.4 ? -10 : 0);
  cap = Math.max(20, Math.min(110, cap + trendBias + uncertaintyBias));

  if (confScore < 0.6) {
    const reduction = (1.0 - confScore) * 40;
    cap = Math.round(cap * (1 - reduction / 100));
    if (intensity === 'High' || intensity === 'Maximal') {
      intensity = 'Moderate';
      if (primary_action === 'Train') primary_action = 'Modify';
      focus = focus === 'Performance' ? 'Technical' : focus;
      message = "Early data phase detected. Keep load controlled while the engine confirms your trend."
    }
  }

  if (painLevel >= painThreshold) {
    intensity = 'Rest'; primary_action = 'Rest'; cap = 0; focus = 'Protection';
    message = "[CRITICAL] Pain levels exceed personalized threshold. All activity suspended.";
    safety_overrides_triggered.push("pain_threshold_breach");
  } else if (rScore < 30) {
    intensity = 'Rest'; primary_action = 'Recover'; cap = 20;
    safety_overrides_triggered.push("readiness_floor");
  } else if (riskScore > riskThreshold) {
    intensity = 'Rest'; primary_action = 'Rest'; cap = 10;
    safety_overrides_triggered.push("extreme_risk_threshold");
  }

  if (uncertainty.score > 0.5) structured_explanation.push({ factor: "Data Stability", reason: "High variability detected", priority: 1 });
  if (trendSignal < -3) structured_explanation.push({ factor: "Performance Trend", reason: "Readiness declining", priority: 2 });
  if (risk.fatigue_memory > 60) structured_explanation.push({ factor: "Fatigue Accumulation", reason: "Accumulated fatigue elevated", priority: 3 });

  const blocked: string[] = [];
  if (rDomains.neuromuscular < 50 || painLevel >= 4) {
    blocked.push('Maximal Sprints', 'Plyometric Jumps', 'Heavy Olympic Lifts');
    if (primary_action === 'Train') primary_action = 'Modify';
  }

  return {
    intensity, training_intensity_cap: cap, volume_cap: `${cap}%`, focus_area: focus,
    blocked_movements: blocked, message, priority_focus: focus as DecisionOutput['priority_focus'],
    trend_bias: trendBias, uncertainty_bias: uncertaintyBias, safety_overrides_triggered,
    primary_action, structured_explanation: structured_explanation.sort((a, b) => a.priority - b.priority).slice(0, 3), logs
  };
}
