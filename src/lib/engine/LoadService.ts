import { AthleteInput, LoadOutput, LegacyHistoryLog } from './types';

/**
 * CREEDA V4: LOAD SERVICE
 * Multi-dimensional Load Inference & ACWR Analysis
 */

export function calculateLoad(input: AthleteInput): LoadOutput {
  const { session, history } = input;
  const rpe = session?.rpe || 0;
  const duration = session?.duration_minutes || 0;
  const tags = session?.tags || [];
  const sessionType = session?.type || "skill";

  let nm = 0;   // Neuromuscular
  let met = 0;  // Metabolic
  let mech = 0; // Mechanical
  let inferred = !session?.type;

  // 1. Session Classification & Load Distribution (World-Class Fix 3)
  let inferredType = sessionType;

  if (!session?.type || sessionType === 'skill') {
    // A. Pattern Matching (Historical Lookback)
    const recentTypes = history
      .slice(0, 7)
      .map(extractSessionType)
      .filter((type): type is string => Boolean(type));
    const typeFreq: Record<string, number> = {};
    recentTypes.forEach(t => typeFreq[t] = (typeFreq[t] || 0) + 1);
    
    const sortedTypes = Object.keys(typeFreq).sort((a, b) => typeFreq[b] - typeFreq[a]);
    const dominantType = sortedTypes[0];
    
    if (dominantType && typeFreq[dominantType] >= 3) {
      inferredType = normalizeSessionType(dominantType) || inferredType;
    } else {
      // B. Heuristic Fallback (RPE/Duration)
      if (rpe >= 8 && duration < 60) inferredType = "speed";
      else if (rpe >= 7 && duration >= 60) inferredType = "strength";
      else if (duration > 60 && rpe <= 6) inferredType = "endurance";
      else inferredType = "skill";
    }
    inferred = true;
  }

  const type = inferredType.toLowerCase();
  if (type === 'speed' || tags.includes('sprint') || tags.includes('explosive')) {
    nm = rpe * 1.2;
    met = rpe * 0.4;
    mech = rpe * 0.4;
  } else if (type === 'endurance' || tags.includes('cardio') || tags.includes('long_run')) {
    met = rpe * 1.5;
    nm = rpe * 0.2;
    mech = rpe * 0.3;
  } else if (type === 'strength' || tags.includes('heavy') || tags.includes('power')) {
    mech = rpe * 1.3;
    nm = rpe * 0.8;
    met = rpe * 0.1;
  } else {
    // Skill / Tactical / Mixed
    nm = rpe * 0.6;
    met = rpe * 0.6;
    mech = rpe * 0.4;
  }

  const dailyTotal = (rpe * duration);

  // 2. Rolling Metrics (EWMA 7/28)
  const last7Days = history.slice(0, 7);

  const prevEWMA7 = history[0]?.intelligence_meta?.loadMetrics?.ewma_7 || dailyTotal;
  const prevEWMA28 = history[0]?.intelligence_meta?.loadMetrics?.ewma_28 || dailyTotal;

  const ewma_7 = Number((dailyTotal * 0.25 + prevEWMA7 * 0.75).toFixed(2));
  const ewma_28 = Number((dailyTotal * 0.07 + prevEWMA28 * 0.93).toFixed(2));

  // 3. ACWR (Acute:Chronic Workload Ratio)
  const acwr = ewma_28 > 0 ? Number((ewma_7 / ewma_28).toFixed(2)) : 1.0;

  // 4. Monotony & Strain
  const avgLoad = last7Days.length > 0
    ? (last7Days.reduce((acc, h) => acc + extractHistoricalLoad(h), 0) + dailyTotal) / (last7Days.length + 1)
    : dailyTotal;

  const stdDev = last7Days.length > 0
    ? Math.sqrt(
        [...last7Days.map(extractHistoricalLoad), dailyTotal]
          .map(x => Math.pow(x - avgLoad, 2))
          .reduce((a, b) => a + b) / (last7Days.length + 1)
      )
    : 1.0;

  const safeAvg = isNaN(avgLoad) ? dailyTotal : avgLoad;
  const monotony = stdDev > 0 ? Number((safeAvg / stdDev).toFixed(2)) : 1.0;
  const strain = dailyTotal * monotony;

  return {
    neuromuscular: Math.round(nm),
    metabolic: Math.round(met),
    mechanical: Math.round(mech),
    total: dailyTotal,
    ewma_7,
    ewma_28,
    acwr,
    monotony,
    strain,
    classification: (type as LoadOutput['classification']),
    inferred
  };
}

function normalizeSessionType(value: string | null | undefined): NonNullable<AthleteInput['session']>['type'] | null {
  if (value === 'speed' || value === 'strength' || value === 'endurance' || value === 'skill') return value;
  return null;
}

function extractSessionType(log: LegacyHistoryLog): string | null {
  return (
    log?.session_type ||
    log?.session?.type ||
    log?.intelligence_meta?.loadMetrics?.classification ||
    null
  )
}

function extractHistoricalLoad(log: LegacyHistoryLog): number {
  const direct = Number(log?.load_score ?? log?.load)
  if (Number.isFinite(direct) && direct > 0) return direct

  const rpe = Number(log?.session_rpe ?? log?.rpe ?? 0)
  const duration = Number(log?.duration_minutes ?? log?.session_duration ?? 0)

  if (Number.isFinite(rpe) && Number.isFinite(duration) && rpe > 0 && duration > 0) {
    return rpe * duration
  }

  return 0
}
