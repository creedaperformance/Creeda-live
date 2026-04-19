import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getPublicSupabaseEnv } from '@/lib/env';
import { getOptionalSupabaseServiceRoleKey } from '@/lib/env.server';
import { dosageEngine, DosageInput } from './DosageEngine';
import { safetyEngine, GeneratedExercise } from '../SafetyEngine';
import { buildTrainingFramework } from './SportsScienceKnowledge';
import type {
  AthleteSportPositionProfile,
  ConditioningGuidance,
} from './AthleteScienceContext';
import { getPositionData, getSportData, type PhysiologicalDemand } from '../../sport_intelligence';

export type { GeneratedExercise };

export interface BuildWorkoutParams {
  userId: string;
  sessionType: 'TRAIN' | 'MODIFY' | 'RECOVER';
  readinessScore: number;
  injuryRiskScore: number;
  activeInjuries: string[];
  experienceLevel: number;
  sport?: string;
  position?: string;
  goal?: string;
  pathwayType?: 'sport' | 'training' | 'lifestyle';
  calibration?: { active: boolean; sessionCount: number };
  visionFaults?: Array<{ fault?: string }>;
  sportProfile?: AthleteSportPositionProfile | null;
  conditioningContext?: ConditioningGuidance | null;
}

export interface WorkoutPlan {
  warmup: GeneratedExercise[];
  main: GeneratedExercise[];
  accessory: GeneratedExercise[];
  conditioning: GeneratedExercise[];
  sportDrills?: GeneratedExercise[];
  protocols?: {
    preSession: string[];
    focus: string | null;
    nutrition: string | null;
    recoveryPriority: string | null;
    recoveryTargets: string[];
  } | null;
  isCalibrationSession?: boolean;
  athleteFocus?: {
    sport: string;
    position: string;
    readinessState: 'fatigued' | 'recovering' | 'primed';
    progressionSummary: string;
  } | null;
}

const VALID_PATTERNS = new Set([
  'mobility',
  'activation',
  'squat',
  'hinge',
  'horizontal_push',
  'vertical_pull',
  'single_leg',
  'core',
  'iso',
  'rotation',
  'carry',
  'aerobic_base',
  'sprint',
]);

type ExerciseRecord = {
  id: string;
  name: string;
  movement_pattern: string;
  contraindications?: string[];
  coaching_note?: string;
};

const FALLBACK_EXERCISE_LIBRARY: ExerciseRecord[] = [
  { id: 'mobility-worlds-greatest-stretch', name: "World's Greatest Stretch", movement_pattern: 'mobility', contraindications: [], coaching_note: 'Open hips and thoracic rotation before loading.' },
  { id: 'mobility-cat-camel', name: 'Cat-Camel Mobility', movement_pattern: 'mobility', contraindications: [], coaching_note: 'Useful for desk stiffness and spinal mobility.' },
  { id: 'mobility-ankle-rock', name: 'Ankle Rock Mobility', movement_pattern: 'mobility', contraindications: [], coaching_note: 'Improves ankle range before walking, squats, or running.' },
  { id: 'activation-glute-bridge', name: 'Glute Bridge Activation', movement_pattern: 'activation', contraindications: ['lower_back'], coaching_note: 'Wake up glutes before squats, hinges, or running.' },
  { id: 'activation-bird-dog', name: 'Bird Dog', movement_pattern: 'activation', contraindications: [], coaching_note: 'Build trunk control before harder work.' },
  { id: 'activation-wall-slide', name: 'Wall Slide', movement_pattern: 'activation', contraindications: ['shoulder'], coaching_note: 'Useful for posture and shoulder blade control after long desk hours.' },
  { id: 'squat-chair', name: 'Chair Sit-to-Stand', movement_pattern: 'squat', contraindications: ['knee'], coaching_note: 'Accessible lower-body strength pattern for new or sedentary users.' },
  { id: 'squat-goblet', name: 'Goblet Squat', movement_pattern: 'squat', contraindications: ['knee'], coaching_note: 'Controlled squat pattern for strength and posture.' },
  { id: 'squat-box', name: 'Box Squat', movement_pattern: 'squat', contraindications: ['knee'], coaching_note: 'Safer squat variation when range control matters.' },
  { id: 'hinge-rdl', name: 'Romanian Deadlift', movement_pattern: 'hinge', contraindications: ['lower_back'], coaching_note: 'Build posterior-chain strength without maximal loading.' },
  { id: 'hinge-kettlebell', name: 'Kettlebell Deadlift', movement_pattern: 'hinge', contraindications: ['lower_back'], coaching_note: 'Simple hinge for newer users or modification days.' },
  { id: 'push-wall', name: 'Wall Push-Up', movement_pattern: 'horizontal_push', contraindications: ['shoulder'], coaching_note: 'Entry-level press that scales well for new lifters.' },
  { id: 'push-elevated', name: 'Elevated Push-Up', movement_pattern: 'horizontal_push', contraindications: ['shoulder'], coaching_note: 'Pressing option that scales well with readiness.' },
  { id: 'push-dumbbell-floor', name: 'Dumbbell Floor Press', movement_pattern: 'horizontal_push', contraindications: ['shoulder'], coaching_note: 'Keeps pressing range controlled when shoulders are sensitive.' },
  { id: 'pull-band-row', name: 'Band Row', movement_pattern: 'vertical_pull', contraindications: ['shoulder'], coaching_note: 'Simple pulling pattern for posture and shoulder balance.' },
  { id: 'pull-band-lat', name: 'Band Lat Pulldown', movement_pattern: 'vertical_pull', contraindications: ['shoulder'], coaching_note: 'Upper-body pull for posture and shoulder balance.' },
  { id: 'pull-inverted-row', name: 'Inverted Row', movement_pattern: 'vertical_pull', contraindications: ['shoulder'], coaching_note: 'Bodyweight pull that scales better than heavy rows on lower-readiness days.' },
  { id: 'single-leg-step-up', name: 'Step-Up', movement_pattern: 'single_leg', contraindications: ['knee'], coaching_note: 'Useful for runners and court-sport athletes without extreme impact.' },
  { id: 'single-leg-reverse-lunge', name: 'Reverse Lunge', movement_pattern: 'single_leg', contraindications: ['knee'], coaching_note: 'Good for balance, force control, and lower-body symmetry.' },
  { id: 'core-dead-bug', name: 'Dead Bug', movement_pattern: 'core', contraindications: [], coaching_note: 'Low-risk trunk control exercise for most users.' },
  { id: 'core-side-plank', name: 'Side Plank', movement_pattern: 'core', contraindications: [], coaching_note: 'Targets lateral trunk stability and posture.' },
  { id: 'iso-split-squat', name: 'Split Squat Hold', movement_pattern: 'iso', contraindications: ['knee'], coaching_note: 'Isometric loading is useful when speed is not appropriate.' },
  { id: 'rotation-med-ball', name: 'Med Ball Rotation', movement_pattern: 'rotation', contraindications: ['lower_back'], coaching_note: 'Rotational power work for field and court sports.' },
  { id: 'carry-farmer', name: 'Farmer Carry', movement_pattern: 'carry', contraindications: ['shoulder'], coaching_note: 'Great for grip, bracing, and simple conditioning.' },
  { id: 'carry-suitcase', name: 'Suitcase Carry', movement_pattern: 'carry', contraindications: ['shoulder'], coaching_note: 'Single-side carry that teaches trunk stability and gait control.' },
  { id: 'conditioning-zone-2', name: 'Zone 2 Brisk Walk', movement_pattern: 'aerobic_base', contraindications: [], coaching_note: 'Reliable low-risk aerobic base builder.' },
  { id: 'conditioning-bike', name: 'Easy Bike Intervals', movement_pattern: 'aerobic_base', contraindications: [], coaching_note: 'Lower-impact conditioning for modify days.' },
  { id: 'conditioning-march', name: 'March Walk Intervals', movement_pattern: 'aerobic_base', contraindications: [], coaching_note: 'Useful for daily-life users who need a simple entry-level cardio option.' },
  { id: 'conditioning-hill-strides', name: 'Short Hill Strides', movement_pattern: 'sprint', contraindications: ['hamstring', 'calf'], coaching_note: 'Use only on high-readiness days with low hamstring risk.' },
];

export class WorkoutGenerator {
  async generateDailyWorkout(params: BuildWorkoutParams): Promise<WorkoutPlan | null> {
    const allExercises = await this.fetchExerciseCatalog();
    if (!allExercises.length) return null;
    const readinessState = this.resolveReadinessState(params.readinessScore);

    if (params.sessionType === 'RECOVER') {
      return this.buildRecoverySession(allExercises, params, readinessState);
    }

    const patterns = this.resolvePatterns(params);
    const isCalibration =
      params.sessionType === 'TRAIN' &&
      (params.calibration?.active || (params.calibration?.sessionCount || 0) < 5);
    const sportDrills = this.buildSportDrillBlocks(params, readinessState);
    const dedicatedSportDrills = this.collectSportDrills(sportDrills);

    const warmup = this.mergeWithSportDrills(
      this.pickSafeExercises(allExercises, patterns.warmupPatterns, 3, params),
      sportDrills.warmup,
      3
    );
    const main = this.mergeWithSportDrills(
      this.pickSafeExercises(allExercises, patterns.mainPatterns, params.sessionType === 'TRAIN' ? 3 : 2, params),
      sportDrills.main,
      params.sessionType === 'TRAIN' ? 3 : 2
    );
    const accessory = this.mergeWithSportDrills(
      this.pickSafeExercises(allExercises, patterns.accessoryPatterns, 2, params),
      sportDrills.accessory,
      2
    );
    const conditioning = this.mergeWithSportDrills(
      patterns.conditioningPatterns.length > 0
        ? this.pickSafeExercises(allExercises, patterns.conditioningPatterns, 1, params)
        : [],
      sportDrills.conditioning,
      1
    );

    return {
      warmup,
      main,
      accessory,
      conditioning,
      sportDrills: dedicatedSportDrills,
      protocols: this.buildAthleteProtocols(params),
      isCalibrationSession: isCalibration,
      athleteFocus: params.sportProfile
        ? {
            sport: params.sportProfile.sportName,
            position: params.sportProfile.positionName,
            readinessState,
            progressionSummary: this.buildProgressionSummary(params, readinessState),
          }
        : null,
    };
  }

  private buildRecoverySession(
    database: ExerciseRecord[],
    params: BuildWorkoutParams,
    readinessState: 'fatigued' | 'recovering' | 'primed'
  ): WorkoutPlan {
    const sportDrills = this.buildSportDrillBlocks(params, readinessState);
    const dedicatedSportDrills = this.collectSportDrills(sportDrills);
    return {
      warmup: this.buildManualRecoveryBlock([
        { id: 'recovery-breathing', name: '90/90 Breathing', movement_pattern: 'mobility', coaching_note: 'Reset breathing and downshift stress before movement.' },
        { id: 'recovery-cat-camel', name: 'Cat-Camel Mobility', movement_pattern: 'mobility', coaching_note: 'Move gently through the spine to reduce stiffness.' },
      ]),
      main: this.mergeWithSportDrills(
        this.pickSafeExercises(database, ['mobility', 'activation', 'aerobic_base'], 2, {
          ...params,
          sessionType: 'MODIFY',
        }),
        sportDrills.main,
        2
      ),
      accessory: this.mergeWithSportDrills(
        this.buildManualRecoveryBlock([
          { id: 'recovery-walk', name: 'Easy Walk', movement_pattern: 'aerobic_base', coaching_note: 'Keep the effort conversational and use it as active recovery.' },
          { id: 'recovery-side-lying', name: 'Gentle Hip Reset', movement_pattern: 'mobility', coaching_note: 'Use controlled range only and stop before pain.' },
        ]),
        sportDrills.accessory,
        2
      ),
      conditioning: [],
      sportDrills: dedicatedSportDrills,
      protocols: this.buildAthleteProtocols(params),
      athleteFocus: params.sportProfile
        ? {
            sport: params.sportProfile.sportName,
            position: params.sportProfile.positionName,
            readinessState,
            progressionSummary: this.buildProgressionSummary(params, readinessState),
          }
        : null,
    };
  }

  private buildManualRecoveryBlock(exercises: Array<Pick<ExerciseRecord, 'id' | 'name' | 'movement_pattern' | 'coaching_note'>>): GeneratedExercise[] {
    return exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      movement_pattern: exercise.movement_pattern,
      contraindications: [],
      coachingNote: exercise.coaching_note,
      source: 'recovery_protocol',
      dosage: {
        targetRPE: 3,
        sets: 2,
        reps: '5-10',
        restTimeSeconds: 45,
        isCapped: false,
      },
    }));
  }

  private async fetchExerciseCatalog(): Promise<ExerciseRecord[]> {
    try {
      const supabase = await this.getSupabaseClient();
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .order('progression_level', { ascending: true });

      if (Array.isArray(data) && data.length) {
        return data as ExerciseRecord[];
      }
    } catch (error) {
      console.warn('[WorkoutGenerator] Falling back to local exercise library:', error);
    }

    return FALLBACK_EXERCISE_LIBRARY;
  }

  private async getSupabaseClient() {
    if (typeof window === 'undefined') {
      const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicSupabaseEnv();
      const key = getOptionalSupabaseServiceRoleKey() || NEXT_PUBLIC_SUPABASE_ANON_KEY;

      return createSupabaseClient(NEXT_PUBLIC_SUPABASE_URL, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }

    const { createClient } = await import('@/lib/supabase/client');
    return createClient();
  }

  private resolvePatterns(params: BuildWorkoutParams) {
    const sport = String(params.sport || '').toLowerCase();
    const sessionType = params.sessionType;
    const pathwayType = params.pathwayType || 'training';

    if (sessionType === 'MODIFY') {
      if (params.sportProfile) {
        return this.resolveAthletePatterns(params, true);
      }
      return {
        warmupPatterns: ['mobility', 'activation'],
        mainPatterns: ['single_leg', 'core', 'horizontal_push', 'vertical_pull'],
        accessoryPatterns: ['iso', 'carry', 'mobility'],
        conditioningPatterns: ['aerobic_base'],
      };
    }

    if (params.sportProfile) {
      return this.resolveAthletePatterns(params, false);
    }

    if (pathwayType === 'lifestyle') {
      return {
        warmupPatterns: ['mobility', 'activation'],
        mainPatterns: ['squat', 'single_leg', 'horizontal_push', 'core'],
        accessoryPatterns: ['carry', 'mobility', 'activation'],
        conditioningPatterns: ['aerobic_base'],
      };
    }

    if (pathwayType === 'training') {
      return {
        warmupPatterns: ['mobility', 'activation'],
        mainPatterns: ['squat', 'hinge', 'horizontal_push', 'vertical_pull'],
        accessoryPatterns: ['core', 'carry', 'single_leg'],
        conditioningPatterns: ['aerobic_base'],
      };
    }

    if (/(football|soccer|rugby|basketball|tennis|hockey)/.test(sport)) {
      return {
        warmupPatterns: ['mobility', 'activation'],
        mainPatterns: ['single_leg', 'hinge', 'horizontal_push', 'rotation'],
        accessoryPatterns: ['core', 'iso'],
        conditioningPatterns: ['sprint', 'aerobic_base'],
      };
    }

    if (/(running|marathon|cycling|swimming|triathlon|endurance)/.test(sport)) {
      return {
        warmupPatterns: ['mobility', 'activation'],
        mainPatterns: ['single_leg', 'hinge', 'core'],
        accessoryPatterns: ['iso', 'carry'],
        conditioningPatterns: ['aerobic_base'],
      };
    }

    if (/(strength|gym|hypertrophy|powerlifting|weightlifting)/.test(sport)) {
      return {
        warmupPatterns: ['mobility', 'activation'],
        mainPatterns: ['squat', 'hinge', 'horizontal_push', 'vertical_pull'],
        accessoryPatterns: ['core', 'carry'],
        conditioningPatterns: ['aerobic_base'],
      };
    }

    return {
      warmupPatterns: ['mobility', 'activation'],
      mainPatterns: ['squat', 'hinge', 'horizontal_push', 'vertical_pull'],
      accessoryPatterns: ['core', 'iso'],
      conditioningPatterns: ['aerobic_base'],
    };
  }

  private resolveReadinessState(score: number): 'fatigued' | 'recovering' | 'primed' {
    if (score >= 80) return 'primed';
    if (score < 55) return 'fatigued';
    return 'recovering';
  }

  private buildSportDrillBlocks(
    params: BuildWorkoutParams,
    readinessState: 'fatigued' | 'recovering' | 'primed'
  ) {
    const sportProfile = params.sportProfile;
    if (!sportProfile) {
      return { warmup: [], main: [], accessory: [], conditioning: [] };
    }

    const sportData = getSportData(sportProfile.sportKey);
    const positionData = getPositionData(sportProfile.sportKey, sportProfile.positionName);
    if (!sportData || !positionData?.drills) {
      return { warmup: [], main: [], accessory: [], conditioning: [] };
    }

    const drillTexts = positionData.drills[readinessState] || [];
    const baseContext = `${sportProfile.sportName} - ${sportProfile.positionName}`;

    const drillExercises = drillTexts.slice(0, 2).map((drillText, index) =>
      this.buildSportDrillExercise({
        drillText,
        index,
        readinessState,
        baseContext,
        sportProfile,
        sessionType: params.sessionType,
      })
    );

    const recoveryTarget = sportData.recoveryProtocol?.targets?.[0];
    const warmupDrill =
      readinessState === 'fatigued' || readinessState === 'recovering'
        ? this.buildManualSportBlock({
            id: `${sportProfile.sportKey}-${readinessState}-prep`,
            name: `${sportProfile.positionName} Prep`,
            movementPattern: this.mapDemandToPattern(sportProfile.demandKeys[0]),
            context: baseContext,
            focus: readinessState === 'fatigued' ? 'low-cost activation' : 'technical prep',
            coachingNote: `${sportData.precisionTemplates[readinessState].how}${recoveryTarget ? ` Recovery target: ${recoveryTarget}.` : ''}`,
            dosage: {
              targetRPE: readinessState === 'fatigued' ? 4 : 5,
              sets: 2,
              reps: readinessState === 'fatigued' ? '5-8 min' : '6-10 min',
              restTimeSeconds: 60,
              isCapped: false,
            },
          })
        : null;

    return {
      warmup: warmupDrill ? [warmupDrill] : [],
      main: drillExercises.slice(0, 1),
      accessory: readinessState === 'recovering' ? drillExercises.slice(1, 2) : [],
      conditioning: readinessState === 'primed' ? drillExercises.slice(1, 2) : [],
    };
  }

  private buildSportDrillExercise({
    drillText,
    index,
    readinessState,
    baseContext,
    sportProfile,
    sessionType,
  }: {
    drillText: string;
    index: number;
    readinessState: 'fatigued' | 'recovering' | 'primed';
    baseContext: string;
    sportProfile: AthleteSportPositionProfile;
    sessionType: BuildWorkoutParams['sessionType'];
  }): GeneratedExercise {
    const [rawName, ...restParts] = drillText.split(':');
    const detail = restParts.join(':').trim();
    const demandKey = sportProfile.demandKeys[index] || sportProfile.demandKeys[0];
    const rawPattern = this.mapDemandToPattern(demandKey);
    const movementPattern = readinessState === 'fatigued' && rawPattern === 'sprint' ? 'single_leg' : rawPattern;

    const baseRPE =
      readinessState === 'primed'
        ? movementPattern === 'sprint' ? 8 : 7
        : readinessState === 'recovering'
          ? 5.5
          : 4.5;

    const dosage = dosageEngine.calculateDosage({
      baseLoadRPE: sessionType === 'MODIFY' ? Math.max(4, baseRPE - 1) : baseRPE,
      readinessScore: readinessState === 'primed' ? 82 : readinessState === 'recovering' ? 67 : 48,
      injuryRiskScore: readinessState === 'fatigued' ? 42 : 24,
      experienceLevel: 2,
    });

    const progressionCue =
      readinessState === 'primed'
        ? 'Use this as the highest-value sport block of the day and preserve quality on every rep.'
        : readinessState === 'recovering'
          ? 'Keep the rhythm of the role without forcing maximal speed or contact.'
          : 'Use this drill to keep feel and timing while reducing tissue cost.';

    return this.buildManualSportBlock({
      id: `${sportProfile.sportKey}-${sportProfile.positionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${readinessState}-${index}`,
      name: rawName.trim() || `${sportProfile.positionName} Sport Drill`,
      movementPattern,
      context: baseContext,
      focus: `${sportProfile.positionName} sport drill`,
      coachingNote: `${detail || drillText}. ${progressionCue}`,
      dosage: {
        ...dosage,
        reps: this.translateDrillDose(detail || drillText, readinessState, dosage.reps),
      },
    });
  }

  private buildManualSportBlock({
    id,
    name,
    movementPattern,
    context,
    focus,
    coachingNote,
    dosage,
  }: {
    id: string;
    name: string;
    movementPattern: string;
    context: string;
    focus: string;
    coachingNote: string;
    dosage: GeneratedExercise['dosage'];
  }): GeneratedExercise {
    return {
      id,
      name,
      movement_pattern: movementPattern,
      contraindications: [],
      coachingNote,
      source: 'sport_drill',
      sportContext: context,
      blockFocus: focus,
      dosage,
    };
  }

  private translateDrillDose(
    drillText: string,
    readinessState: 'fatigued' | 'recovering' | 'primed',
    fallback: string
  ) {
    const minutesMatch = drillText.match(/(\d+)\s*(?:mins?|minutes?)/i);
    if (minutesMatch) return `${minutesMatch[1]} min`;

    const oversMatch = drillText.match(/(\d+)\s*overs?/i);
    if (oversMatch) return `${oversMatch[1]} overs`;

    const repsMatch = drillText.match(/(\d+)\s*reps?/i);
    if (repsMatch) return `${repsMatch[1]} reps`;

    if (readinessState === 'primed') return '3-5 blocks';
    if (readinessState === 'recovering') return '2-3 blocks';
    return fallback;
  }

  private mapDemandToPattern(demand?: PhysiologicalDemand) {
    switch (demand) {
      case 'Explosive Power':
        return 'sprint';
      case 'Aerobic Endurance':
      case 'Fatigue Resistance':
        return 'aerobic_base';
      case 'Anaerobic Capacity':
      case 'Agility':
        return 'single_leg';
      case 'Reaction Time':
      case 'Mental Focus':
      case 'Skill Precision':
        return 'core';
      case 'Strength':
        return 'hinge';
      default:
        return 'core';
    }
  }

  private mergeWithSportDrills(
    generated: GeneratedExercise[],
    sportDrills: GeneratedExercise[],
    limit: number
  ) {
    const merged = [...sportDrills, ...generated].filter(
      (exercise, index, list) => list.findIndex((item) => item.id === exercise.id) === index
    );

    return merged.slice(0, limit);
  }

  private buildProgressionSummary(
    params: BuildWorkoutParams,
    readinessState: 'fatigued' | 'recovering' | 'primed'
  ) {
    if (!params.sportProfile) return 'General physical preparation.';

    if (readinessState === 'primed') {
      return `${params.sportProfile.positionName} is in a high-readiness window, so CREEDA places one true role drill near the top of the session before general physical work dilutes quality.`;
    }

    if (readinessState === 'recovering') {
      return `${params.sportProfile.positionName} keeps sport rhythm today, but volume and chaos are reduced so recovery can continue while technical feel stays alive.`;
    }

    return `${params.sportProfile.positionName} stays connected to the sport with low-cost drill exposure while CREEDA protects structural freshness and rebuilds session quality.`;
  }

  private collectSportDrills(sportDrills: {
    warmup: GeneratedExercise[];
    main: GeneratedExercise[];
    accessory: GeneratedExercise[];
    conditioning: GeneratedExercise[];
  }) {
    return [...sportDrills.warmup, ...sportDrills.main, ...sportDrills.accessory, ...sportDrills.conditioning].filter(
      (exercise, index, list) => list.findIndex((item) => item.id === exercise.id) === index
    );
  }

  private buildAthleteProtocols(params: BuildWorkoutParams) {
    const sportProfile = params.sportProfile;
    if (!sportProfile) return null;

    const sportData = getSportData(sportProfile.sportKey);
    if (!sportData) return null;

    return {
      preSession: sportData.competitionProtocol?.pre || [],
      focus: sportData.competitionProtocol?.focus || null,
      nutrition: sportData.competitionProtocol?.nutrition || null,
      recoveryPriority: sportData.recoveryProtocol?.priority || null,
      recoveryTargets: sportData.recoveryProtocol?.targets || [],
    };
  }

  private resolveAthletePatterns(params: BuildWorkoutParams, isModifyDay: boolean) {
    const demandKeys = params.sportProfile?.demandKeys || [];
    const riskHotspots = (params.sportProfile?.riskHotspots || []).map((item) => item.toLowerCase());
    const sportKey = String(params.sportProfile?.sportKey || params.sport || '').toLowerCase();

    const mainPatterns = this.pickPatternsFromDemands(demandKeys, [
      'single_leg',
      'hinge',
      'rotation',
      'squat',
      'horizontal_push',
      'vertical_pull',
      'core',
      'carry',
      'iso',
    ]);

    const accessoryPatterns = this.pickPatternsFromDemands(demandKeys, [
      'core',
      'carry',
      'iso',
      'mobility',
      'activation',
      'vertical_pull',
      'rotation',
    ]);

    const warmupPatterns = this.uniquePatterns([
      'mobility',
      'activation',
      riskHotspots.some((item) => /(ankle|knee|hamstring|groin|calf)/.test(item)) ? 'single_leg' : null,
      riskHotspots.some((item) => /(shoulder|upper back)/.test(item)) ? 'vertical_pull' : null,
      riskHotspots.some((item) => /(lower back|lumbar)/.test(item)) ? 'core' : null,
    ]);

    const conditioningPatterns =
      isModifyDay
        ? ['aerobic_base']
        : this.uniquePatterns([
            demandKeys.some((item) => ['Explosive Power', 'Agility', 'Reaction Time', 'Anaerobic Capacity'].includes(item)) ? 'sprint' : null,
            demandKeys.some((item) => ['Aerobic Endurance', 'Fatigue Resistance'].includes(item)) ? 'aerobic_base' : null,
            /(cricket|shooting|archery|golf|weightlifting|powerlifting)/.test(sportKey) ? null : 'aerobic_base',
          ]);

    return {
      warmupPatterns,
      mainPatterns: isModifyDay ? this.uniquePatterns(['single_leg', 'core', ...mainPatterns]).slice(0, 4) : mainPatterns.slice(0, 4),
      accessoryPatterns: isModifyDay ? this.uniquePatterns(['iso', 'carry', 'mobility', ...accessoryPatterns]).slice(0, 3) : accessoryPatterns.slice(0, 3),
      conditioningPatterns: conditioningPatterns.slice(0, 2),
    };
  }

  private pickPatternsFromDemands(
    demandKeys: string[],
    fallback: string[]
  ) {
    const demandToPatterns: Record<string, string[]> = {
      'Explosive Power': ['hinge', 'single_leg', 'rotation'],
      'Aerobic Endurance': ['single_leg', 'core', 'aerobic_base'],
      'Anaerobic Capacity': ['single_leg', 'rotation', 'sprint'],
      Agility: ['single_leg', 'core', 'rotation'],
      'Reaction Time': ['single_leg', 'core', 'carry'],
      Strength: ['squat', 'hinge', 'horizontal_push', 'vertical_pull'],
      'Skill Precision': ['core', 'carry', 'iso'],
      'Mental Focus': ['core', 'carry', 'mobility'],
      'Fatigue Resistance': ['single_leg', 'hinge', 'core', 'aerobic_base'],
    };

    const derived = demandKeys.flatMap((item) => demandToPatterns[item] || []);
    return this.uniquePatterns(derived.length ? derived : fallback);
  }

  private uniquePatterns(patterns: Array<string | null | undefined>) {
    return [...new Set(patterns.filter((pattern): pattern is string => Boolean(pattern) && VALID_PATTERNS.has(String(pattern))))];
  }

  private pickSafeExercises(
    database: ExerciseRecord[],
    patterns: string[],
    count: number,
    params: BuildWorkoutParams
  ): GeneratedExercise[] {
    const preferred = database.filter((exercise) => patterns.includes(exercise.movement_pattern));
    const fallback = database.filter((exercise) => ['mobility', 'activation', 'core', 'aerobic_base'].includes(exercise.movement_pattern));
    const pool = this.rotateUniquePool([...preferred, ...fallback], params);

    const selectedRecords = pool.slice(0, count);
    const generated = selectedRecords.map((exercise) => this.buildExercise(exercise, params));
    const sanitized = safetyEngine.sanitizeWorkout(generated, params.activeInjuries, params.readinessScore);

    if (sanitized.length >= count) return sanitized.slice(0, count);

    const safeFill = pool
      .filter((exercise) => ['mobility', 'activation', 'core', 'aerobic_base'].includes(exercise.movement_pattern))
      .map((exercise) => this.buildExercise(exercise, params))
      .filter((exercise) => !sanitized.some((existing) => existing.id === exercise.id));

    return [...sanitized, ...safeFill].slice(0, count);
  }

  private rotateUniquePool(database: ExerciseRecord[], params: BuildWorkoutParams) {
    const unique = database.filter((exercise, index, list) => list.findIndex((item) => item.id === exercise.id) === index);
    if (!unique.length) return [];

    const seed =
      String(params.sport || '')
        .split('')
        .reduce((sum, char) => sum + char.charCodeAt(0), 0) +
      params.readinessScore +
      params.sessionType.length;
    const offset = seed % unique.length;

    return [...unique.slice(offset), ...unique.slice(0, offset)];
  }

  private buildExercise(exercise: ExerciseRecord, params: BuildWorkoutParams): GeneratedExercise {
    let baseRPE = this.mapBaseLoad(exercise.movement_pattern);
    const demandKeys = params.sportProfile?.demandKeys || [];

    if (params.sessionType === 'MODIFY') {
      baseRPE = Math.max(4.5, baseRPE - 1.5);
    }

    if (params.sessionType === 'TRAIN') {
      if (
        ['sprint', 'single_leg', 'rotation'].includes(exercise.movement_pattern) &&
        demandKeys.some((item) => ['Explosive Power', 'Agility', 'Reaction Time', 'Anaerobic Capacity'].includes(item))
      ) {
        baseRPE += 0.4;
      }

      if (
        ['squat', 'hinge', 'horizontal_push', 'vertical_pull'].includes(exercise.movement_pattern) &&
        demandKeys.includes('Strength')
      ) {
        baseRPE += 0.25;
      }
    }

    if (params.calibration?.active || (params.calibration?.sessionCount || 0) < 5) {
      baseRPE = Math.min(7.5, baseRPE);
    }

    const dosageInput: DosageInput = {
      baseLoadRPE: baseRPE,
      readinessScore: params.readinessScore,
      injuryRiskScore: params.injuryRiskScore,
      experienceLevel: params.experienceLevel,
    };

    const dosage = dosageEngine.calculateDosage(dosageInput);

    return {
      id: exercise.id,
      name: exercise.name,
      movement_pattern: exercise.movement_pattern,
      contraindications: exercise.contraindications || [],
      coachingNote: this.applyCoachingAdjustments(exercise, params),
      source: 'catalog',
      dosage,
    };
  }

  private applyCoachingAdjustments(exercise: ExerciseRecord, params: BuildWorkoutParams) {
    const trainingFramework = buildTrainingFramework({
      goal: params.goal || 'general_fitness',
      activityLevel: params.pathwayType === 'sport' ? 'active' : 'moderate',
      pathwayType: params.pathwayType || 'training',
      readinessScore: params.readinessScore,
      trainingExperience:
        params.experienceLevel >= 85 ? 'experienced' :
        params.experienceLevel >= 70 ? 'advanced' :
        params.experienceLevel >= 55 ? 'intermediate' :
        params.experienceLevel >= 40 ? 'novice' : 'beginner',
    });

    const visionNotes =
      params.visionFaults?.some((fault) => String(fault?.fault || '').toLowerCase().includes('valgus')) &&
      exercise.movement_pattern === 'squat'
        ? ' Keep knee tracking controlled and reduce speed.'
        : '';

    const sessionNote =
      params.sessionType === 'MODIFY'
        ? ' Keep the effort smooth and stop 2-3 reps before failure.'
        : params.readinessScore >= 80
          ? ' Strong day: prioritize quality and crisp execution.'
          : '';

    const progressionNote =
      params.sessionType === 'TRAIN' && ['squat', 'hinge', 'horizontal_push', 'vertical_pull', 'single_leg'].includes(exercise.movement_pattern)
        ? ` Progress load gradually and keep weekly jumps near ${trainingFramework.progressionCapPct}% or less.`
        : '';

    const sportNote = this.buildSportSpecificNote(exercise.movement_pattern, params);

    return `${exercise.coaching_note || 'Move with clean form and control.'}${sessionNote}${progressionNote}${visionNotes}${sportNote}`;
  }

  private buildSportSpecificNote(pattern: string, params: BuildWorkoutParams) {
    const sportProfile = params.sportProfile;
    if (!sportProfile) return '';

    const positionCue =
      ['sprint', 'single_leg', 'rotation', 'carry'].includes(pattern)
        ? sportProfile.positionRecommendations[0]
        : ['squat', 'hinge', 'horizontal_push', 'vertical_pull'].includes(pattern)
          ? sportProfile.physiologyPriorities[0]
          : sportProfile.generalRecommendations[0];

    const conditioningCue = params.conditioningContext?.todayFit;
    const cue = positionCue || conditioningCue;

    if (!cue) return '';

    const cleanCue = cue.endsWith('.') ? cue.slice(0, -1) : cue;
    return ` ${sportProfile.positionName} cue: ${cleanCue}.`;
  }

  private mapBaseLoad(pattern: string): number {
    if (['squat', 'hinge'].includes(pattern)) return 8;
    if (['single_leg', 'horizontal_push', 'vertical_pull'].includes(pattern)) return 7;
    if (['rotation', 'carry', 'core'].includes(pattern)) return 6;
    if (['aerobic_base'].includes(pattern)) return 5;
    if (['mobility', 'activation', 'iso'].includes(pattern)) return 4.5;
    return 6;
  }

  public infer1RM(weight: number, reps: number, rpe: number): number {
    const repsToFailure = 10 - rpe;
    const effectiveReps = reps + repsToFailure;
    return Math.round(weight * (1 + 0.0333 * effectiveReps));
  }
}

export const workoutGenerator = new WorkoutGenerator();
