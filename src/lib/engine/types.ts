/**
 * CREEDA V5: ENGINE TYPE CONTRACTS
 * Decision-First Architecture — Digital Sports Scientist
 * 
 * PRINCIPLE: Every type serves ONE purpose — producing a single CreedaDecision.
 */

import type { WorkoutPlan } from './Prescription/WorkoutGenerator';
import type { RecommendedMeal } from './Prescription/NutritionGenerator';
import type { AthleteScientificContext } from './Prescription/AthleteScienceContext';
import type { AQIBand, FastingState, HeatLevel, HumidityLevel } from '@/lib/context-signals/storage';

export type EngineVersion = "v3" | "v4" | "v5";

// ─── DECISION PRIORITY HIERARCHY ─────────────────────────────────────────
// Strict override order: Risk > Pain > Data > Readiness > Load

export type DecisionVerdict = 'TRAIN' | 'MODIFY' | 'RECOVER';
export type DominantFactor = 'RISK' | 'PAIN' | 'READINESS' | 'LOAD' | 'DATA';

export const DECISION_PRIORITY: DominantFactor[] = [
  'RISK',       // 1. Injury risk ALWAYS overrides everything
  'PAIN',       // 2. Pain ALWAYS overrides readiness
  'DATA',       // 3. Insufficient data triggers baseline calibration
  'READINESS',  // 4. Readiness state
  'LOAD',       // 5. Training load context
];

// ─── INJURY CONTEXT ──────────────────────────────────────────────────────

export type InjuryType = 'HAMSTRING' | 'ACL' | 'ANKLE' | 'SHOULDER' | 'KNEE' | 'LOWER_BACK' | 'GROIN' | 'CALF' | null;

export interface InjuryContext {
  type: InjuryType;
  confidence: number; // 0-1
}

// ─── REHAB STAGE ─────────────────────────────────────────────────────────

export interface RehabStage {
  phase: 1 | 2 | 3 | 4 | 5;
  label: 'Acute' | 'Isometric' | 'Strength' | 'Dynamic' | 'Return to Sport';
  exercises: {
    mobility: string[];
    strength: string[];
    control: string[];
  };
  progressionReadiness: boolean;
  daysInPhase: number;
  injuryContext: InjuryContext;
}

// ─── VISION FAULT ────────────────────────────────────────────────────────

export interface VisionFault {
  fault: string;
  riskMapping: string;
  correctiveDrills: string[];
  severity: 'low' | 'moderate' | 'high';
  confidence: number; // 0.1 - 1.0 (Fix #4: Vision Confidence)
  timestamp?: string;
}

// ─── ADHERENCE ───────────────────────────────────────────────────────────

export interface AdherenceData {
  yesterdayPlanFollowed: boolean;
  adherenceScore: number; // 0-1
  lastMealSkipped?: boolean;
}

// ─── CALIBRATION ─────────────────────────────────────────────────────────

export interface CalibrationStatus {
  active: boolean;
  sessionCount: number;
  completionThreshold: number; // usually 5
}

// ─── PERFORMANCE PROFILE ─────────────────────────────────────────────────

export interface PerformanceProfile {
  estimated1RM: Record<string, number>; // Exercise ID -> Weight
  strengthLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ELITE';
  mobilityScore: number; // 0-100
  isCalibrated: boolean;
}

// ─── PSYCHOLOGY ──────────────────────────────────────────────────────────

export interface PsychologyStatus {
  motivation: number; // 0-100
  stress: number; // 0-100
  burnoutRisk: number; // 0-100
  cognitiveLoad: number; // 0-100
}

export interface AthleteSessionProtocol {
  preSession: string[];
  focus: string | null;
  nutrition: string | null;
  recoveryPriority: string | null;
  recoveryTargets: string[];
}

export interface AthleteFuelingGuidance {
  sport: string | null;
  position: string | null;
  summary: string;
  preSession: string[];
  duringSession: string[];
  recoveryWindow: string[];
  hydrationPriority: boolean;
}

export interface LegacyHistoryDomains {
  neuromuscular?: number;
  metabolic?: number;
  mental?: number;
}

export interface LegacyHistoryIntelligenceMeta {
  loadMetrics?: {
    ewma_7?: number;
    ewma_28?: number;
    classification?: string;
  };
  risk?: {
    score?: number;
  };
  uncertainty?: {
    smoothed_variance?: number;
  };
}

export interface LegacyHistoryLog {
  readinessScore?: number;
  readiness_score?: number;
  load_score?: number;
  load?: number;
  sleep_quality?: string | number;
  session_type?: string;
  session?: {
    type?: string;
  };
  session_rpe?: number;
  rpe?: number;
  duration_minutes?: number;
  session_duration?: number;
  domains?: LegacyHistoryDomains;
  intelligence_meta?: LegacyHistoryIntelligenceMeta;
}

export type TrustSignalType = 'measured' | 'estimated' | 'self_reported';
export type TrustSignalStatus = 'active' | 'limited' | 'missing' | 'building';
export type DataQualityLevel = 'COMPLETE' | 'PARTIAL' | 'WEAK';

export interface TrustSignalSummary {
  label: string;
  type: TrustSignalType;
  status: TrustSignalStatus;
  detail?: string;
}

export interface TrustSummary {
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceScore: number;
  dataCompleteness: number;
  dataQuality: DataQualityLevel;
  signals: TrustSignalSummary[];
  whyTodayChanged: string[];
  nextBestInputs: string[];
}

// ─── CREEDA DECISION (UNIFIED OUTPUT) ────────────────────────────────────
// This is the SINGLE object that drives ALL UI rendering.
// DecisionService is the FINAL AUTHORITY. No other service outputs to UI.

export interface CreedaDecision {
  decision: DecisionVerdict;
  intensity: number; // 0-100
  sessionType: string;
  duration: number; // minutes

  decisionContext: {
    dominantFactor: DominantFactor;
    priorityChain: string[]; // Audit trail of which priorities fired
  };

  components: {
    training: {
      focus: string;
      plan: WorkoutPlan | null; // Expanded workout prescription
      intensityCap: number;
      athleteFocus: WorkoutPlan['athleteFocus'] | null;
      sessionProtocol: AthleteSessionProtocol | null;
    };
    rehab: RehabStage | null;
    recovery: {
      methods: string[];
      priority: string;
    };
    psychology: {
      mentalReadiness: number; // 0-100
      advice: string;
    };
    nutrition: {
      meals: RecommendedMeal[] | null; 
      hydrationPriority: boolean;
      totalPortionGrams: number;
      fueling: AthleteFuelingGuidance | null;
    };
  };

  constraints: {
    avoid: string[];
    flags: string[];
    mealTimingPreference?: 'EARLY' | 'LATE' | 'IF'; // Fix #3: Nutrition Timing
  };

  explanation: {
    primaryDrivers: { factor: string; reason: string }[];
    secondaryDrivers: { factor: string; reason: string }[];
  };

  predictions: {
    injuryRiskTrend: 'rising' | 'stable' | 'falling';
    readinessForecast: number[]; // next 3-5 days
    predictedInjuryType: string | null;
    riskLevel: 'low' | 'moderate' | 'high';
  };

  progression: {
    rehabStage: RehabStage | null;
    progressionReadiness: boolean;
  };

  feedback: {
    yesterdayComparison: 'improved' | 'declined' | 'stable' | 'no_data';
    readinessDelta: number;
    insight: string;
  };

  adherence: AdherenceData;

  dataCompleteness: number; // 0-100
  confidenceScore: number; // 0-100 based on adherence & completeness
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH'; // Fix #1: Qualitative level
  confidenceReasons: string[]; // Fix #1: Multi-factor reasons
  trustSummary: TrustSummary;
  visionFaults: VisionFault[]; // Fix #4: Propagate vision faults to UI
  scientificContext: AthleteScientificContext;
  timestamp: string;
}

// ─── EXISTING V4 TYPES (BACKWARD COMPAT) ─────────────────────────────────

export interface AthleteInput {
  userId?: string;
  wellness: {
    sleep_quality: string | number;
    sleep_latency?: string | number;
    energy_level: number;
    muscle_soreness: string | number;
    stress_level: number;
    motivation?: number;
    health_status?: string;
    current_pain_level: number;
    pain_location?: string[];
    reaction_time_ms?: number;
  };
  session?: {
    rpe: number;
    duration_minutes: number;
    type?: "speed" | "strength" | "endurance" | "skill";
    tags?: string[];
  };
  health_metrics?: {
    steps: number;
    sleep_hours: number;
    heart_rate_avg: number;
    hrv: number;
  };
  profile?: {
    age?: number;
    biologicalSex?: string;
    gender?: string;
    heightCm?: number;
    weightKg?: number;
    primaryGoal?: string;
    activityLevel?: string;
    wakeTime?: string;
  };
  baseline_injuries?: string[];
  context: {
    sport: string;
    position?: string;
    is_match_day: boolean;
    travel_day: boolean;
    heat_level?: HeatLevel | null;
    humidity_level?: HumidityLevel | null;
    aqi_band?: AQIBand | null;
    commute_minutes?: number;
    exam_stress_score?: number;
    fasting_state?: FastingState | null;
    shift_work?: boolean;
  };
  history: LegacyHistoryLog[]; // Legacy history logs
  adaptation_profile: AdaptationProfile;
  performance_profile?: PerformanceProfile;
  calibration?: CalibrationStatus;
  psychology?: PsychologyStatus;
  cns_baseline?: CNSBaseline;
  // V5 additions
  visionFaults?: VisionFault[];
  rehabHistory?: RehabHistoryEntry[];
  adherence?: AdherenceData;
}

export interface LoadOutput {
  neuromuscular: number;
  metabolic: number;
  mechanical: number;
  total: number;
  ewma_7: number;
  ewma_28: number;
  acwr: number;
  monotony: number;
  strain: number;
  classification: "speed" | "strength" | "endurance" | "skill" | "mixed";
  inferred: boolean;
}

export interface ReadinessOutput {
  score: number;
  domains: {
    neuromuscular: number;
    metabolic: number;
    mental: number;
  };
  factors: {
    sleep: number;
    energy: number;
    soreness: number;
    stress: number;
    pain: number;
  };
  cns_fatigue: number;
  confidence: number;
  felt_reality_gap?: number;
  reality_bridge?: string;
}

export interface RiskOutput {
  score: number;
  label: string;
  priority: "low" | "moderate" | "high" | "critical";
  multiplier: number;
  interactions: {
    name: string;
    impact: number;
  }[];
  trajectory: "stable" | "improving" | "declining";
  cross_domain_impact: number;
  fatigue_memory: number;
  // V5 additions
  predictedInjuryType: InjuryType;
  trendDirection: 'rising' | 'stable' | 'falling';
  visionFaults: VisionFault[];
  biomechanicalRiskScore: number;
}

export interface UncertaintyOutput {
  score: number;
  smoothed_variance: number;
  trend_variability: number;
  density_impact: number;
  alpha_smoothing: number;
  stability_waveform: "stable" | "slight_waveform" | "jagged_waveform";
}

export interface ConfidenceOutput {
  trust_score: number;
  data_density: number;
  baseline_stability: number;
  total_confidence: number;
  mode: "normal" | "cold_start" | "low_data" | "missing_data";
  reasons: string[]; // Fix #1: Multi-factor reasons
}

export interface DecisionOutput {
  intensity: "Rest" | "Low" | "Moderate" | "High" | "Maximal";
  training_intensity_cap: number;
  volume_cap: string;
  focus_area: string;
  blocked_movements: string[];
  message: string;
  priority_focus: "Recovery" | "Technical" | "Performance" | "Protection";
  trend_bias: number;
  uncertainty_bias: number;
  safety_overrides_triggered: string[];
  primary_action: "Train" | "Recover" | "Modify" | "Rest";
  structured_explanation: {
    factor: string;
    reason: string;
    priority: number;
  }[];
  logs: string[];
}

export interface AdaptationProfile {
  fatigue_sensitivity: number;
  recovery_speed: number;
  load_tolerance: number;
  neuromuscular_bias: number;
  learning_rate: number;
  // EWMA Metrics (Alpha 0.7/0.3)
  ewma_readiness_avg: number;
  ewma_fatigue_avg: number;
  strength_progression_rate: number;
  last_updated: string;
}

export interface CNSBaseline {
  mean: number;
  std_dev: number;
  rolling_window: number[];
}

export interface EngineLogs {
  version: EngineVersion;
  timestamp: string;
  input_snapshot: Partial<AthleteInput>;
  intermediate_outputs: {
    load?: LoadOutput;
    readiness?: ReadinessOutput;
    adaptation?: AdaptationProfile;
    risk?: RiskOutput;
    confidence?: ConfidenceOutput;
  };
  final_decision: DecisionOutput;
}

export interface OrchestratorOutput {
  engine_version: EngineVersion;
  decision: DecisionOutput;
  metrics: {
    readiness: ReadinessOutput;
    load: LoadOutput;
    risk: RiskOutput;
    confidence: ConfidenceOutput;
    uncertainty: UncertaintyOutput;
    trend: number;
    trend_signal: number;
    projected_readiness?: number;
    priority_score: number;
  };
  adaptation_update?: AdaptationProfile;
  logs: EngineLogs;
}

// V5 Output — extends V4 with the unified CreedaDecision
export interface OrchestratorOutputV5 extends OrchestratorOutput {
  creedaDecision: CreedaDecision;
}

// ─── REHAB ENGINE TYPES ──────────────────────────────────────────────────

export interface RehabInput {
  painScore: number;
  soreness: number;
  movementQuality: number; // 0-100 from vision or self-report
  loadTolerance: number;   // 0-1 from AdaptationProfile
  injuryContext: InjuryContext;
  rehabHistory: RehabHistoryEntry[];
  visionFaults: VisionFault[];
}

export interface RehabHistoryEntry {
  date: string;
  injury_type: InjuryType;
  stage: number;
  pain_score: number;
  load_tolerance: number;
  progression_flag: 'progressed' | 'regressed' | 'held' | 'started';
}

export interface RehabOutput {
  stage: RehabStage;
  shouldProgress: boolean;
  shouldRegress: boolean;
  shouldHold: boolean;
  reasoning: string;
}
