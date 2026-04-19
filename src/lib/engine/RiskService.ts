import { AthleteInput, RiskOutput, LoadOutput, ReadinessOutput, InjuryType, VisionFault } from './types';

/**
 * CREEDA V5: RISK SERVICE
 * Enhanced Injury Prediction & Biomechanical Integration
 * 
 * UPGRADES:
 * - Biomechanical weighting (minimum 25% influence when faults present)
 * - Predicted injury type mapping
 * - 3-5 day trend direction
 * - Vision fault integration into risk scoring
 * - AI Behavioral Prediction (Burnout/Adherence Risk)
 * - Chronic-to-Acute Workload Ratio (CAWR) refinement
 */

export function calculateRisk(
  input: AthleteInput,
  load: LoadOutput,
  readiness: ReadinessOutput
): RiskOutput {
  const { adaptation_profile, visionFaults = [] } = input;
  const { fatigue_sensitivity } = adaptation_profile;
  const pain = input.wellness.current_pain_level || 0;
  const motivation = input.wellness.motivation || 50; // Behavioral signal
  const clampInteractionImpact = (impact: number) => Math.max(0, Math.min(100, Math.round(impact)));

  let riskBase = 0;
  const interactions: RiskOutput['interactions'] = [];

  // 1. Sigmoid Helper
  const sigmoid = (x: number, k = 1.0) => {
    if (isNaN(x)) return 0.5;
    return 1 / (1 + Math.exp(-k * x));
  };

  // 2. Continuous Interaction Model (NM Load x Readiness)
  const nmInteraction = sigmoid((load.neuromuscular * 10 - readiness.domains.neuromuscular) / 10, 0.5);
  const nmImpact = nmInteraction * 40;
  riskBase += nmImpact;
  interactions.push({ name: 'Neuromuscular Interaction', impact: clampInteractionImpact(nmImpact) });

  // 3. Cross-Domain Interactions (Fully Continuous)
  const metInteraction = sigmoid((40 - readiness.domains.metabolic) / 10) * sigmoid(load.neuromuscular / 5);
  const metImpact = metInteraction * 30;
  
  const menInteraction = sigmoid((40 - readiness.domains.mental) / 10) * sigmoid(load.total / 10);
  const menImpact = menInteraction * 20;

  riskBase += metImpact + menImpact;
  interactions.push({ name: 'Cross-Domain Synergy (MET/NM)', impact: clampInteractionImpact(metImpact) });
  interactions.push({ name: 'Mental/Stress Resilience', impact: clampInteractionImpact(menImpact) });

  // 4. Monotony & Strain Dynamics
  const monotonyFactor = sigmoid(load.monotony - 1.5, 4.0);
  const monotonyImpact = monotonyFactor * 30;
  riskBase += monotonyImpact;
  interactions.push({ name: 'Monotony Loading', impact: clampInteractionImpact(monotonyImpact) });

  // 5. ACWR Spike Detection (V5 Enhancement)
  let acwrImpact = 0;
  if (load.acwr > 1.5) {
    acwrImpact = (load.acwr - 1.0) * 40; // Exponential penalty above 1.5
    interactions.push({ name: 'ACWR Spike', impact: clampInteractionImpact(acwrImpact) });
  } else if (load.acwr > 1.3) {
    acwrImpact = (load.acwr - 1.0) * 20;
    interactions.push({ name: 'ACWR Caution', impact: clampInteractionImpact(acwrImpact) });
  }
  riskBase += acwrImpact;

  // 6. Sleep Trend Analysis (V5 Enhancement)
  const history = input.history || [];
  const last5Sleep = history.slice(0, 5).map(h => {
    const sq = h.sleep_quality;
    if (typeof sq === 'number') return sq;
    const map: Record<string, number> = { 'Excellent': 5, 'Good': 4, 'Okay': 3, 'Poor': 2, 'Bad': 1 };
    return typeof sq === 'string' ? map[sq] || 3 : 3;
  });
  if (last5Sleep.length >= 3) {
    const avgSleep = last5Sleep.reduce((a, b) => a + b, 0) / last5Sleep.length;
    if (avgSleep < 2.5) {
      const sleepImpact = (3 - avgSleep) * 15;
      riskBase += sleepImpact;
      interactions.push({ name: 'Chronic Sleep Deficit', impact: clampInteractionImpact(sleepImpact) });
    }
  }

  // 7. Pain Penalty
  const painImpact = pain * 10;
  riskBase += painImpact;

  // 8. BIOMECHANICAL RISK (V5 — minimum 25% influence when high-confidence faults present)
  let biomechanicalRiskScore = 0;
  const significantFaults = visionFaults.filter(f => (f.confidence || 0.5) >= 0.7);
  if (visionFaults.length > 0) {
    const faultScores = visionFaults.map(f => {
      const base = f.severity === 'high' ? 30 : f.severity === 'moderate' ? 15 : 5;
      // Fix #4: Show but downgrade low-confidence detections
      return (f.confidence || 0.5) < 0.7 ? base * 0.3 : base;
    });
    
    biomechanicalRiskScore = Math.min(100, faultScores.reduce((a, b) => a + b, 0));
    
    // Weighting logic: High confidence faults drive the weight up
    const bioWeight = significantFaults.length > 0 ? 0.4 : 0.25;
    const bioImpact = biomechanicalRiskScore * bioWeight;
    riskBase = (riskBase * (1 - bioWeight)) + bioImpact;
    
    interactions.push({ 
      name: significantFaults.length > 0 ? 'Biomechanical Faults' : 'Possible Biomechanical Issues', 
      impact: clampInteractionImpact(bioImpact)
    });
  }

  // 9. Low Data Sensitivity Control
  if (history.length < 7) {
    riskBase *= 0.5;
    interactions.forEach(i => i.impact = clampInteractionImpact(i.impact * 0.5));
  }

  // 10. Fatigue Memory (5-day EWMA)
  const last5Risks = history.slice(0, 5).map(h => h.intelligence_meta?.risk?.score || 40);
  let currentFatigueMemory = 40;
  if (last5Risks.length > 0) {
    currentFatigueMemory = last5Risks.reduce((acc, val) => (0.33 * val) + (0.67 * acc), last5Risks[0]);
  }
  
  const riskMemoryImpact = currentFatigueMemory * 0.2;

  // 11. Trajectory Logic
  const lastReadiness = history[0]?.readinessScore || 70;
  const trajectorySign = readiness.score - lastReadiness;
  let trajectory: RiskOutput['trajectory'] = 'stable';
  if (trajectorySign > 5) trajectory = 'improving';
  else if (trajectorySign < -5) trajectory = 'declining';

  // 12. TREND DIRECTION (V5 — 3-5 day risk trajectory)
  let trendDirection: RiskOutput['trendDirection'] = 'stable';
  if (last5Risks.length >= 3) {
    const recentAvg = last5Risks.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    const olderAvg = last5Risks.slice(2).reduce((a, b) => a + b, 0) / Math.max(1, last5Risks.slice(2).length);
    if (recentAvg > olderAvg + 10) trendDirection = 'rising';
    else if (recentAvg < olderAvg - 10) trendDirection = 'falling';
  }

  // 13. AI BEHAVIORAL PREDICTION (V5)
  // Predicting burnout or performance drop-off based on motivation vs load
  let behavioralRiskScore = 0;
  if (motivation < 30 && load.total > 7) {
    behavioralRiskScore = 40; // High load + Low motivation = Burnout risk
    interactions.push({ name: 'Burnout Warning', impact: 40 });
  }

  // 14. PREDICTED INJURY TYPE (V5)
  const predictedInjuryType = predictInjuryType(input, load, readiness, visionFaults);

  // Final Risk Score
  const safeSens = isNaN(Number(fatigue_sensitivity)) ? 0.5 : fatigue_sensitivity;
  const safeMem = isNaN(Number(riskMemoryImpact)) ? 0 : riskMemoryImpact;
  
  let finalScore = Math.round(riskBase * (1 + (safeSens - 0.5)));
  finalScore = Math.max(0, Math.min(100, (isNaN(finalScore) ? 0 : finalScore) + safeMem + (behavioralRiskScore * 0.5)));

  let label = 'Low Risk';
  let priority: RiskOutput['priority'] = 'low';

  if (finalScore >= 80 || pain >= 7) {
    label = 'Critical Risk';
    priority = 'critical';
  } else if (finalScore >= 60 || pain >= 4) {
    label = 'High Warning';
    priority = 'high';
  } else if (finalScore >= 40) {
    label = 'Moderate Caution';
    priority = 'moderate';
  }

  return {
    score: Math.round(finalScore),
    label,
    priority,
    multiplier: 1.0,
    interactions,
    trajectory,
    cross_domain_impact: Math.round(metImpact + menImpact),
    fatigue_memory: Math.round(currentFatigueMemory),
    // V5 additions
    predictedInjuryType,
    trendDirection,
    visionFaults,
    biomechanicalRiskScore: Math.round(biomechanicalRiskScore),
  };
}

// ─── INJURY TYPE PREDICTION ──────────────────────────────────────────────

function predictInjuryType(
  input: AthleteInput,
  load: LoadOutput,
  readiness: ReadinessOutput,
  visionFaults: VisionFault[]
): InjuryType {
  const sport = (input.context.sport || '').toLowerCase();
  const pain = input.wellness.current_pain_level || 0;
  const painLocations = Array.isArray(input.wellness.pain_location)
    ? input.wellness.pain_location.map((item) => String(item).toLowerCase())
    : [];

  // Vision fault-based prediction (highest confidence)
  for (const fault of visionFaults) {
    const risk = fault.riskMapping.toLowerCase();
    if (risk.includes('acl') || risk.includes('knee valgus')) return 'ACL';
    if (risk.includes('hamstring')) return 'HAMSTRING';
    if (risk.includes('ankle')) return 'ANKLE';
    if (risk.includes('shoulder')) return 'SHOULDER';
    if (risk.includes('lower back') || risk.includes('lumbar')) return 'LOWER_BACK';
  }

  // If pain is low, no prediction needed
  if (pain < 3) return null;

  if (painLocations.some((location) => location.includes('knee'))) return 'KNEE';
  if (painLocations.some((location) => location.includes('ankle'))) return 'ANKLE';
  if (painLocations.some((location) => location.includes('shoulder'))) return 'SHOULDER';
  if (painLocations.some((location) => location.includes('back'))) return 'LOWER_BACK';
  if (painLocations.some((location) => location.includes('hip'))) return 'HAMSTRING';

  // Sport-based prediction when pain is present
  if (load.neuromuscular > 7 && readiness.domains.neuromuscular < 40) {
    if (sport.includes('football') || sport.includes('sprint') || sport.includes('athletics')) return 'HAMSTRING';
    if (sport.includes('basketball') || sport.includes('volleyball')) return 'ANKLE';
    if (sport.includes('cricket')) return 'SHOULDER';
  }

  if (load.acwr > 1.5 && readiness.score < 50) {
    if (sport.includes('running') || sport.includes('football')) return 'HAMSTRING';
    return 'KNEE';
  }

  return null;
}
