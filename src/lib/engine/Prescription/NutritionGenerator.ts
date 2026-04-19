import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getPublicSupabaseEnv } from '@/lib/env';
import { getOptionalSupabaseServiceRoleKey } from '@/lib/env.server';
import { buildNutritionFramework } from './SportsScienceKnowledge';
import type {
  AthleteSportPositionProfile,
  PerformanceNutritionGuidance,
} from './AthleteScienceContext';

export interface MacroTarget {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface RecommendedMeal {
  mealType: string;
  name: string;
  macros: MacroTarget;
  foods: string[];
  portionSizeGrams: number;
  isSwapCandidate?: boolean;
  coachingNote?: string;
  mealWindow?: string;
}

export interface Constraints {
  isVeg: boolean;
  isVegan: boolean;
  isJain: boolean;
  allergies: string[];
  dislikes: string[];
  preferredCuisines: string[];
  budgetTier: 'budget' | 'standard' | 'performance' | null;
  foodSetup: 'home_kitchen' | 'hostel_canteen' | 'mixed' | 'travel_heavy' | null;
  cookingAccess: 'full_kitchen' | 'basic_reheat' | 'minimal' | null;
  indiaRegion: 'north' | 'south' | 'west' | 'east' | 'central' | 'north_east' | null;
}

type DietProfile = 'omni' | 'veg' | 'vegan' | 'jain';
type MealSlot = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';
type MealDistribution = Record<MealSlot, number>;

interface MealTemplate {
  name: string;
  foods: string[];
  diets: DietProfile[];
  goals: string[];
  activityBias?: string[];
  sportTags?: string[];
  portableFriendly?: boolean;
  canteenFriendly?: boolean;
  budgetFriendly?: boolean;
  cuisineTags?: string[];
  regionTags?: Array<'north' | 'south' | 'west' | 'east' | 'central' | 'north_east'>;
  coachingNote: string;
}

interface AthleteMealContext {
  sessionType?: 'TRAIN' | 'MODIFY' | 'RECOVER';
  sport?: string;
  position?: string;
  sportProfile?: AthleteSportPositionProfile | null;
  nutritionGuidance?: PerformanceNutritionGuidance | null;
}

interface ContextualMealOverride {
  name: string;
  foods: string[];
  note: string;
}

const DEFAULT_CONSTRAINTS: Constraints = {
  isVeg: false,
  isVegan: false,
  isJain: false,
  allergies: [],
  dislikes: [],
  preferredCuisines: [],
  budgetTier: null,
  foodSetup: null,
  cookingAccess: null,
  indiaRegion: null,
};

const BLOCKED_TERM_ALIASES: Record<string, string[]> = {
  peanut: ['groundnut'],
  'tree nut': ['tree nuts', 'nuts', 'almond', 'cashew', 'walnut', 'pistachio', 'hazelnut'],
  nuts: ['almond', 'cashew', 'walnut', 'pistachio', 'hazelnut'],
  dairy: ['milk', 'curd', 'yogurt', 'yoghurt', 'paneer', 'cheese', 'ghee', 'butter', 'lactose'],
  'milk / dairy': ['milk', 'dairy', 'curd', 'yogurt', 'paneer', 'cheese', 'lactose'],
  shellfish: ['prawn', 'shrimp', 'crab', 'lobster'],
  wheat: ['atta', 'maida'],
  chickpea: ['chana', 'besan'],
};

const CUISINE_TAG_KEYWORDS: Record<string, string[]> = {
  mediterranean: ['hummus', 'olive', 'feta', 'pita', 'mediterranean'],
  middle_eastern: ['hummus', 'falafel', 'tahini', 'pita', 'shawarma', 'middle eastern'],
  continental_european: ['pasta', 'grilled', 'soup', 'salad', 'continental'],
  italian: ['pasta', 'italian', 'tomato basil', 'arrabbiata'],
  latin_american: ['mexican', 'salsa', 'tortilla', 'bean rice', 'burrito'],
  american: ['sandwich', 'grilled', 'mashed', 'american'],
  asian_global: ['stir-fry', 'noodle', 'rice bowl', 'soy', 'asian'],
  chinese: ['chinese', 'stir-fry', 'soy'],
  japanese: ['japanese', 'miso', 'teriyaki'],
  korean: ['korean', 'gochujang', 'kimchi'],
  thai: ['thai', 'lemongrass', 'curry'],
  vietnamese: ['vietnamese', 'pho', 'rice paper'],
  african: ['african', 'millet stew', 'injera', 'ethiopian'],
  indo_chinese: ['indo-chinese', 'manchurian', 'hakka'],
};

const MEAL_LIBRARY: Record<MealSlot, MealTemplate[]> = {
  Breakfast: [
    {
      name: 'Egg Bhurji and Multigrain Toast',
      foods: ['Egg bhurji', 'Multigrain toast', 'Fruit'],
      diets: ['omni'],
      goals: ['muscle_gain', 'general_fitness', 'fat_loss'],
      coachingNote: 'High-protein breakfast to steady energy and reduce mid-morning crashes.',
    },
    {
      name: 'Moong Dal Chilla with Curd',
      foods: ['Moong dal chilla', 'Curd', 'Mint chutney'],
      diets: ['veg', 'jain'],
      goals: ['fat_loss', 'general_fitness', 'muscle_gain'],
      canteenFriendly: true,
      budgetFriendly: true,
      regionTags: ['north', 'central'],
      coachingNote: 'Easy Indian protein breakfast that works well for office and college schedules.',
    },
    {
      name: 'Tofu Poha Bowl',
      foods: ['Poha', 'Tofu', 'Peanuts', 'Lime'],
      diets: ['vegan'],
      goals: ['general_fitness', 'endurance', 'fat_loss'],
      portableFriendly: true,
      budgetFriendly: true,
      regionTags: ['west', 'central'],
      coachingNote: 'Balanced breakfast with easy carbs and enough protein for a busy day.',
    },
    {
      name: 'Oats and Banana Recovery Bowl',
      foods: ['Oats', 'Milk', 'Banana', 'Seeds'],
      diets: ['omni', 'veg'],
      goals: ['endurance', 'sport_specific', 'general_fitness'],
      activityBias: ['active', 'athlete'],
      sportTags: ['endurance', 'team_field', 'court', 'aquatic'],
      coachingNote: 'Higher-carb breakfast to support heavier training or more active routines.',
    },
    {
      name: 'Mediterranean Hummus Breakfast Plate',
      foods: ['Whole-grain toast', 'Hummus', 'Eggs or tofu', 'Tomato cucumber salad'],
      diets: ['omni', 'veg', 'vegan'],
      goals: ['general_fitness', 'muscle_gain', 'fat_loss'],
      cuisineTags: ['mediterranean', 'middle_eastern', 'global'],
      coachingNote: 'Global cuisine lens with balanced protein, fibre, and steady morning energy.',
    },
    {
      name: 'Asian Savory Rice Breakfast Bowl',
      foods: ['Rice', 'Tofu or egg', 'Stir-fried vegetables', 'Sesame'],
      diets: ['omni', 'veg', 'vegan'],
      goals: ['general_fitness', 'endurance', 'sport_specific'],
      cuisineTags: ['asian_global', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese', 'global'],
      coachingNote: 'Asian-style savory breakfast for athletes who prefer warm meals over sweet options.',
    },
  ],
  Lunch: [
    {
      name: 'Chicken Rice and Sabzi Plate',
      foods: ['Chicken breast', 'Rice', 'Seasonal sabzi', 'Salad'],
      diets: ['omni'],
      goals: ['muscle_gain', 'sport_specific', 'general_fitness'],
      sportTags: ['team_field', 'court', 'strength_power', 'combat'],
      coachingNote: 'Simple protein-plus-carb lunch that supports performance without feeling too heavy.',
    },
    {
      name: 'Rajma Rice and Curd Bowl',
      foods: ['Rajma', 'Rice', 'Curd', 'Salad'],
      diets: ['veg'],
      goals: ['general_fitness', 'endurance', 'muscle_gain'],
      sportTags: ['endurance', 'team_field', 'court'],
      canteenFriendly: true,
      budgetFriendly: true,
      regionTags: ['north'],
      coachingNote: 'Indian staple meal with good satiety, fibre, and recovery support.',
    },
    {
      name: 'Tofu Millet Khichdi Bowl',
      foods: ['Millet khichdi', 'Tofu', 'Vegetables', 'Coconut chutney'],
      diets: ['vegan'],
      goals: ['fat_loss', 'general_fitness', 'endurance'],
      sportTags: ['precision', 'mixed', 'recovery'],
      coachingNote: 'Lighter lunch that keeps energy stable through long work blocks.',
    },
    {
      name: 'Lauki Moong Comfort Plate',
      foods: ['Moong dal', 'Rice', 'Lauki sabzi', 'Curd'],
      diets: ['jain'],
      goals: ['fat_loss', 'general_fitness', 'recovery'],
      sportTags: ['precision', 'recovery'],
      canteenFriendly: true,
      budgetFriendly: true,
      coachingNote: 'Digestive-friendly lunch for lower-stress recovery days.',
    },
    {
      name: 'Mediterranean Protein Grain Bowl',
      foods: ['Chickpeas or grilled chicken', 'Rice or couscous', 'Salad', 'Olive-lemon dressing'],
      diets: ['omni', 'veg', 'vegan'],
      goals: ['general_fitness', 'sport_specific', 'fat_loss'],
      cuisineTags: ['mediterranean', 'middle_eastern', 'global'],
      coachingNote: 'Mediterranean-style lunch focused on protein, fibre, and training-day satiety.',
    },
    {
      name: 'Mexican Bean Rice Performance Bowl',
      foods: ['Beans', 'Rice', 'Corn and salsa', 'Lean protein or tofu'],
      diets: ['omni', 'veg', 'vegan'],
      goals: ['general_fitness', 'endurance', 'muscle_gain'],
      cuisineTags: ['latin_american', 'mexican', 'global'],
      coachingNote: 'Latin cuisine lens using practical carbs plus protein for reliable energy.',
    },
    {
      name: 'Asian Stir-Fry Noodle Bowl',
      foods: ['Noodles or rice', 'Tofu or chicken', 'Stir-fried vegetables', 'Soy-ginger sauce'],
      diets: ['omni', 'veg', 'vegan'],
      goals: ['sport_specific', 'general_fitness', 'muscle_gain'],
      cuisineTags: ['asian_global', 'chinese', 'thai', 'japanese', 'korean', 'vietnamese', 'global'],
      coachingNote: 'Asian-style lunch with adaptable carbs and protein for busy training schedules.',
    },
  ],
  Snack: [
    {
      name: 'Greek Yogurt Fruit Cup',
      foods: ['Greek yogurt', 'Banana', 'Seeds'],
      diets: ['veg', 'omni'],
      goals: ['muscle_gain', 'general_fitness', 'fat_loss'],
      sportTags: ['strength_power', 'precision', 'court'],
      coachingNote: 'Fast protein snack that is easy to fit between calls, classes, or commutes.',
    },
    {
      name: 'Roasted Chana and Fruit',
      foods: ['Roasted chana', 'Apple', 'Coconut water'],
      diets: ['veg', 'vegan', 'jain', 'omni'],
      goals: ['fat_loss', 'general_fitness', 'endurance'],
      sportTags: ['endurance', 'precision', 'recovery'],
      portableFriendly: true,
      canteenFriendly: true,
      budgetFriendly: true,
      coachingNote: 'Portable snack for Indian workdays when convenience matters.',
    },
    {
      name: 'Paneer Roll-Up',
      foods: ['Paneer', 'Whole wheat roti', 'Cucumber'],
      diets: ['veg', 'jain'],
      goals: ['muscle_gain', 'sport_specific'],
      sportTags: ['strength_power', 'combat', 'team_field'],
      coachingNote: 'Higher-protein snack when strength or muscle gain is the priority.',
    },
    {
      name: 'Soy Makhana Mix',
      foods: ['Roasted makhana', 'Soy nuts', 'Fruit'],
      diets: ['vegan'],
      goals: ['muscle_gain', 'general_fitness'],
      sportTags: ['strength_power', 'precision'],
      coachingNote: 'Protein-supportive vegan snack with better satiety than biscuits or packaged snacks.',
    },
    {
      name: 'Mediterranean Snack Plate',
      foods: ['Hummus', 'Pita or crackers', 'Cucumber and carrot sticks'],
      diets: ['omni', 'veg', 'vegan'],
      goals: ['general_fitness', 'fat_loss', 'endurance'],
      cuisineTags: ['mediterranean', 'middle_eastern', 'global'],
      coachingNote: 'Mediterranean snack option for athletes who prefer savory mini-meals.',
    },
    {
      name: 'Global Protein Smoothie',
      foods: ['Fruit', 'Milk or soy milk', 'Whey or pea protein', 'Seeds'],
      diets: ['omni', 'veg', 'vegan'],
      goals: ['muscle_gain', 'sport_specific', 'general_fitness'],
      cuisineTags: ['american', 'continental_european', 'global'],
      portableFriendly: true,
      coachingNote: 'Simple global-style snack that works when appetite is low but protein is needed.',
    },
  ],
  Dinner: [
    {
      name: 'Fish, Rice, and Vegetable Plate',
      foods: ['Fish curry', 'Rice', 'Vegetable stir-fry'],
      diets: ['omni'],
      goals: ['endurance', 'general_fitness', 'fat_loss'],
      sportTags: ['endurance', 'aquatic', 'recovery'],
      coachingNote: 'Balanced dinner for recovery without a very heavy late-night load.',
    },
    {
      name: 'Paneer, Roti, and Dal Plate',
      foods: ['Paneer tikka', 'Whole wheat roti', 'Dal', 'Sabzi'],
      diets: ['veg'],
      goals: ['muscle_gain', 'general_fitness', 'sport_specific'],
      sportTags: ['team_field', 'court', 'strength_power', 'combat'],
      canteenFriendly: true,
      budgetFriendly: true,
      regionTags: ['north', 'west', 'central'],
      coachingNote: 'Solid Indian dinner for protein, recovery, and better overnight satiety.',
    },
    {
      name: 'Tofu Stir-Fry Millet Bowl',
      foods: ['Tofu', 'Millet', 'Sauteed vegetables'],
      diets: ['vegan'],
      goals: ['fat_loss', 'general_fitness'],
      sportTags: ['precision', 'mixed', 'recovery'],
      coachingNote: 'Lighter plant-based dinner that still protects protein intake.',
    },
    {
      name: 'Jain Paneer Millet Plate',
      foods: ['Paneer', 'Millet roti', 'Bottle gourd sabzi', 'Curd'],
      diets: ['jain'],
      goals: ['general_fitness', 'muscle_gain', 'fat_loss'],
      sportTags: ['recovery', 'precision'],
      coachingNote: 'Recovery-focused Jain dinner built around familiar foods.',
    },
    {
      name: 'Italian-Style Protein Pasta Plate',
      foods: ['Whole wheat pasta', 'Tomato herb sauce', 'Chicken or tofu', 'Sauteed vegetables'],
      diets: ['omni', 'veg', 'vegan'],
      goals: ['sport_specific', 'muscle_gain', 'general_fitness'],
      cuisineTags: ['italian', 'continental_european', 'global'],
      coachingNote: 'Italian-style dinner for athletes who perform better with higher evening carbs.',
    },
    {
      name: 'Middle Eastern Grain and Protein Plate',
      foods: ['Rice or couscous', 'Chickpea or grilled protein', 'Roasted vegetables', 'Tahini yogurt dip'],
      diets: ['omni', 'veg', 'vegan'],
      goals: ['general_fitness', 'fat_loss', 'recovery'],
      cuisineTags: ['middle_eastern', 'mediterranean', 'global'],
      coachingNote: 'Middle Eastern style plate with good satiety and repeatable prep.',
    },
    {
      name: 'Asian Rice and Protein Bowl',
      foods: ['Rice', 'Tofu or chicken', 'Stir-fried greens', 'Light soy-ginger glaze'],
      diets: ['omni', 'veg', 'vegan'],
      goals: ['endurance', 'general_fitness', 'recovery'],
      cuisineTags: ['asian_global', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese', 'global'],
      coachingNote: 'Asian-style dinner for lighter digestion with reliable carb replenishment.',
    },
  ],
};

export class NutritionGenerator {
  async buildDailyNutrition(
    userId: string,
    goal: string,
    weightKg: number,
    heightCm: number,
    age: number,
    timingPreference: 'EARLY' | 'LATE' | 'IF' = 'EARLY',
    activityLevel: string = 'moderate',
    biologicalSex: string = 'unknown',
    pathwayType?: string,
    athleteContext?: AthleteMealContext
  ): Promise<RecommendedMeal[]> {
    const framework = this.applyAthleteDayAdjustments(
      buildNutritionFramework({
        goal,
        activityLevel,
        weightKg,
        heightCm,
        age,
        biologicalSex,
        pathwayType,
      }),
      athleteContext
    );
    const constraints = await this.fetchConstraints(userId);
    const dietProfile = this.resolveDietProfile(constraints);
    const distribution = this.resolveDistribution(timingPreference, athleteContext);

    const slots: MealSlot[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

    const plan = slots.map((slot) => {
      const share = distribution[slot];
      if (share === 0) {
        return {
          mealType: slot,
          name: 'Fasting Window',
          macros: { calories: 0, protein: 0, carbs: 0, fats: 0 },
          foods: ['Water', 'Unsweetened tea or coffee'],
          portionSizeGrams: 0,
          isSwapCandidate: false,
          coachingNote: 'Use this window only if fasting already fits your routine and recovery stays stable.',
          mealWindow: this.resolveMealWindow(slot, timingPreference),
        } satisfies RecommendedMeal;
      }

      const template = this.selectMealTemplate(slot, goal, activityLevel, dietProfile, constraints, athleteContext);
      const mealMacros = this.scaleMacros(
        {
          calories: framework.calories,
          protein: framework.proteinTarget,
          carbs: framework.carbTarget,
          fats: framework.fatTarget,
        },
        share
      );

      const sportNote = this.buildSportMealNote(slot, athleteContext);

      return {
        mealType: slot,
        name: template.name,
        macros: mealMacros,
        foods: template.foods,
        portionSizeGrams: this.estimatePortionSize(mealMacros, slot),
        isSwapCandidate: true,
        coachingNote: `${template.coachingNote} Aim for about ${framework.proteinPerFeeding} g protein in this feeding window when possible.${sportNote}`,
        mealWindow: this.resolveMealWindow(slot, timingPreference),
      } satisfies RecommendedMeal;
    });

    const contextualPlan = plan.map((meal) =>
      this.applyIndiaMealContext(
        meal,
        meal.mealType as MealSlot,
        constraints,
        dietProfile,
        athleteContext
      )
    );

    return this.runConstraintProcessor(contextualPlan, constraints, dietProfile);
  }

  private applyAthleteDayAdjustments(
    framework: ReturnType<typeof buildNutritionFramework>,
    athleteContext?: AthleteMealContext
  ) {
    if (!athleteContext?.sportProfile) return framework;

    const demandKeys = athleteContext.sportProfile.demandKeys || [];
    const isHighCarbDemand = demandKeys.some((item) =>
      ['Aerobic Endurance', 'Anaerobic Capacity', 'Fatigue Resistance', 'Explosive Power', 'Agility'].includes(item)
    );
    const isStrengthDemand = demandKeys.includes('Strength');

    let calories = framework.calories;
    let carbTarget = framework.carbTarget;
    let proteinTarget = framework.proteinTarget;

    if (athleteContext.sessionType === 'TRAIN') {
      if (isHighCarbDemand) {
        calories = Math.round(calories * 1.06);
        carbTarget = Math.round(carbTarget * 1.12);
      } else if (isStrengthDemand) {
        calories = Math.round(calories * 1.04);
        carbTarget = Math.round(carbTarget * 1.06);
        proteinTarget = Math.round(proteinTarget * 1.03);
      }
    }

    if (athleteContext.sessionType === 'RECOVER') {
      calories = Math.round(calories * 0.96);
      carbTarget = Math.round(carbTarget * 0.94);
      proteinTarget = Math.round(proteinTarget * 1.02);
    }

    return {
      ...framework,
      calories,
      carbTarget,
      proteinTarget,
    };
  }

  private resolveDistribution(timingPreference: 'EARLY' | 'LATE' | 'IF', athleteContext?: AthleteMealContext): MealDistribution {
    const base: MealDistribution =
      timingPreference === 'IF'
        ? { Breakfast: 0, Lunch: 0.42, Snack: 0.18, Dinner: 0.4 }
        : timingPreference === 'LATE'
          ? { Breakfast: 0.18, Lunch: 0.28, Snack: 0.12, Dinner: 0.42 }
          : { Breakfast: 0.3, Lunch: 0.35, Snack: 0.12, Dinner: 0.23 };

    if (!athleteContext?.sportProfile) return base;

    const demandKeys = athleteContext.sportProfile.demandKeys || [];
    if (athleteContext.sessionType === 'TRAIN' && demandKeys.some((item) => ['Aerobic Endurance', 'Anaerobic Capacity', 'Fatigue Resistance'].includes(item))) {
      return { Breakfast: 0.31, Lunch: 0.34, Snack: 0.17, Dinner: 0.18 } as const;
    }

    if (athleteContext.sessionType === 'RECOVER') {
      return { Breakfast: 0.27, Lunch: 0.31, Snack: 0.14, Dinner: 0.28 } as const;
    }

    return base;
  }

  private scaleMacros(target: MacroTarget, share: number): MacroTarget {
    return {
      calories: Math.round(target.calories * share),
      protein: Math.max(10, Math.round(target.protein * share)),
      carbs: Math.max(10, Math.round(target.carbs * share)),
      fats: Math.max(4, Math.round(target.fats * share)),
    };
  }

  private estimatePortionSize(macros: MacroTarget, slot: MealSlot) {
    const density =
      slot === 'Snack' ? 1.7 :
      slot === 'Breakfast' ? 1.45 :
      1.35;
    return Math.max(140, Math.round(macros.calories / density));
  }

  private resolveDietProfile(constraints: Constraints): DietProfile {
    if (constraints.isJain) return 'jain';
    if (constraints.isVegan) return 'vegan';
    if (constraints.isVeg) return 'veg';
    return 'omni';
  }

  private selectMealTemplate(
    slot: MealSlot,
    goal: string,
    activityLevel: string,
    dietProfile: DietProfile,
    constraints: Constraints,
    athleteContext?: AthleteMealContext
  ) {
    const blockedTerms = this.resolveBlockedTerms(constraints);
    const sportTags = this.resolveSportTags(athleteContext);
    const preferredCuisineKeys = constraints.preferredCuisines.map((item) => this.normalizeCuisineKey(item));
    const preferredCuisineTags = Array.from(
      new Set(
        preferredCuisineKeys.flatMap((item) => this.resolveCuisinePreferenceTags(item))
      )
    );
    const options = MEAL_LIBRARY[slot]
      .filter((option) => option.diets.includes(dietProfile) || (dietProfile === 'veg' && option.diets.includes('omni') === false))
      .map((option) => {
        let score = 0;
        if (option.goals.includes(goal)) score += 4;
        if (option.activityBias?.includes(activityLevel)) score += 2;
        if (sportTags.some((tag) => option.sportTags?.includes(tag))) score += 3;
        if (constraints.budgetTier === 'budget' && option.budgetFriendly) score += 2;
        if (constraints.foodSetup === 'hostel_canteen' && option.canteenFriendly) score += 2;
        if ((constraints.foodSetup === 'travel_heavy' || constraints.cookingAccess === 'minimal') && option.portableFriendly) score += 2;
        if (constraints.indiaRegion && option.regionTags?.includes(constraints.indiaRegion)) score += 2;
        if (preferredCuisineKeys.length > 0 && this.mealMatchesCuisinePreference(option, preferredCuisineKeys, preferredCuisineTags)) score += 2;
        if (blockedTerms.some((term) => option.foods.some((food) => food.toLowerCase().includes(term)))) score -= 5;
        return { option, score };
      })
      .sort((a, b) => b.score - a.score);

    return (options[0] || { option: MEAL_LIBRARY[slot][0], score: 0 }).option;
  }

  private resolveSportTags(athleteContext?: AthleteMealContext) {
    if (!athleteContext?.sportProfile) return [];

    const demandKeys = athleteContext.sportProfile.demandKeys || [];
    const sportKey = String(athleteContext.sportProfile.sportKey || athleteContext.sport || '').toLowerCase();
    const tags = [
      athleteContext.sportProfile.archetype.toLowerCase().includes('team') ? 'team_field' : null,
      athleteContext.sportProfile.archetype.toLowerCase().includes('court') ? 'court' : null,
      athleteContext.sportProfile.archetype.toLowerCase().includes('endurance') ? 'endurance' : null,
      athleteContext.sportProfile.archetype.toLowerCase().includes('strength') ? 'strength_power' : null,
      athleteContext.sportProfile.archetype.toLowerCase().includes('combat') ? 'combat' : null,
      athleteContext.sportProfile.archetype.toLowerCase().includes('precision') ? 'precision' : null,
      athleteContext.sportProfile.archetype.toLowerCase().includes('aquatic') ? 'aquatic' : null,
      /(cricket|shooting|archery|golf)/.test(sportKey) ? 'precision' : null,
      demandKeys.some((item) => ['Aerobic Endurance', 'Fatigue Resistance'].includes(item)) ? 'endurance' : null,
      demandKeys.some((item) => ['Explosive Power', 'Agility', 'Reaction Time'].includes(item)) ? 'court' : null,
      athleteContext.sessionType === 'RECOVER' ? 'recovery' : null,
    ].filter((item): item is string => Boolean(item));

    return [...new Set(tags)];
  }

  private buildSportMealNote(slot: MealSlot, athleteContext?: AthleteMealContext) {
    if (!athleteContext?.sportProfile) return '';

    const priority = athleteContext.nutritionGuidance?.priorities[0];
    const timing = athleteContext.nutritionGuidance?.timing[0];

    if (slot === 'Snack' && athleteContext.sessionType === 'TRAIN' && timing) {
      return ` ${athleteContext.sportProfile.positionName} fueling lens: ${timing}`;
    }

    if ((slot === 'Breakfast' || slot === 'Lunch') && priority) {
      return ` ${athleteContext.sportProfile.positionName} nutrition lens: ${priority}`;
    }

    if (slot === 'Dinner' && athleteContext.sessionType === 'RECOVER' && timing) {
      return ` Recovery lens: ${timing}`;
    }

    return '';
  }

  private applyIndiaMealContext(
    meal: RecommendedMeal,
    slot: MealSlot,
    constraints: Constraints,
    dietProfile: DietProfile,
    athleteContext?: AthleteMealContext
  ) {
    let contextualMeal = {
      ...meal,
      foods: [...meal.foods],
    };

    const setupOverride = this.getSetupMealOverride(slot, dietProfile, constraints);
    if (setupOverride) {
      contextualMeal = {
        ...contextualMeal,
        name: setupOverride.name,
        foods: setupOverride.foods,
        coachingNote: this.appendCoachingNote(contextualMeal.coachingNote, setupOverride.note),
      };
    } else {
      const regionalOverride = this.getRegionalMealOverride(slot, dietProfile, constraints, athleteContext);
      if (regionalOverride) {
        contextualMeal = {
          ...contextualMeal,
          name: regionalOverride.name,
          foods: regionalOverride.foods,
          coachingNote: this.appendCoachingNote(contextualMeal.coachingNote, regionalOverride.note),
        };
      }
    }

    if (constraints.budgetTier === 'budget') {
      contextualMeal = this.applyBudgetSwaps(contextualMeal, dietProfile);
    }

    return contextualMeal;
  }

  private getSetupMealOverride(
    slot: MealSlot,
    dietProfile: DietProfile,
    constraints: Constraints
  ): ContextualMealOverride | null {
    if (constraints.foodSetup === 'hostel_canteen') {
      const canteenMap: Record<DietProfile, Record<MealSlot, ContextualMealOverride>> = {
        omni: {
          Breakfast: {
            name: 'Canteen Idli, Eggs, and Banana',
            foods: ['Idli', 'Boiled eggs', 'Banana', 'Curd'],
            note: 'Hostel or canteen lens: built around common Indian breakfast options that are easier to find consistently.',
          },
          Lunch: {
            name: 'Canteen Dal-Rice Protein Plate',
            foods: ['Dal', 'Rice', 'Chicken or eggs', 'Curd', 'Seasonal sabzi'],
            note: 'Hostel or canteen lens: choose the simplest dal-rice-protein combination instead of chasing perfect macros.',
          },
          Snack: {
            name: 'Banana, Curd, and Roasted Chana',
            foods: ['Banana', 'Curd cup', 'Roasted chana'],
            note: 'Portable Indian snack built for canteen, academy, or campus breaks.',
          },
          Dinner: {
            name: 'Roti, Dal, and Chicken Plate',
            foods: ['Roti', 'Dal', 'Chicken curry or eggs', 'Salad'],
            note: 'Use the highest-protein canteen combination you can repeat without friction.',
          },
        },
        veg: {
          Breakfast: {
            name: 'Canteen Idli, Curd, and Banana',
            foods: ['Idli', 'Curd', 'Banana', 'Roasted chana'],
            note: 'Hostel or canteen lens: simple vegetarian breakfast built around common Indian options.',
          },
          Lunch: {
            name: 'Canteen Dal-Rice-Paneer Plate',
            foods: ['Dal', 'Rice', 'Paneer', 'Curd', 'Seasonal sabzi'],
            note: 'Use dal, rice, paneer, and curd as the repeatable vegetarian canteen base.',
          },
          Snack: {
            name: 'Dahi, Fruit, and Chana',
            foods: ['Curd cup', 'Fruit', 'Roasted chana'],
            note: 'Reliable vegetarian snack for classes, office, or academy flow.',
          },
          Dinner: {
            name: 'Roti, Dal, and Paneer Plate',
            foods: ['Roti', 'Dal', 'Paneer', 'Sabzi'],
            note: 'Keep dinner simple enough to repeat even when food quality is inconsistent.',
          },
        },
        vegan: {
          Breakfast: {
            name: 'Poha, Banana, and Roasted Chana',
            foods: ['Poha', 'Banana', 'Roasted chana'],
            note: 'Plant-based canteen-friendly breakfast without needing specialty foods.',
          },
          Lunch: {
            name: 'Dal-Rice-Soya Plate',
            foods: ['Dal', 'Rice', 'Soya chunks', 'Seasonal sabzi'],
            note: 'Plant-based performance lens using accessible Indian staples instead of expensive vegan products.',
          },
          Snack: {
            name: 'Fruit and Chana Travel Snack',
            foods: ['Fruit', 'Roasted chana', 'Coconut water'],
            note: 'Portable plant-based snack that works when the canteen options are thin.',
          },
          Dinner: {
            name: 'Roti, Dal, and Soya Plate',
            foods: ['Roti', 'Dal', 'Soya chunks', 'Sabzi'],
            note: 'Choose repeatable plant protein from dal and soya before chasing novelty foods.',
          },
        },
        jain: {
          Breakfast: {
            name: 'Idli, Curd, and Banana Plate',
            foods: ['Idli', 'Curd', 'Banana', 'Roasted chana'],
            note: 'Jain canteen breakfast built around familiar foods with low friction.',
          },
          Lunch: {
            name: 'Jain Dal-Rice-Curd Plate',
            foods: ['Moong dal', 'Rice', 'Curd', 'Bottle gourd sabzi'],
            note: 'Jain canteen lens: choose simple dal-rice-curd meals that digest cleanly.',
          },
          Snack: {
            name: 'Fruit, Curd, and Chana Snack',
            foods: ['Fruit', 'Curd', 'Roasted chana'],
            note: 'Portable Jain snack for school, office, or academy flow.',
          },
          Dinner: {
            name: 'Jain Roti-Dal Paneer Plate',
            foods: ['Roti', 'Moong dal', 'Paneer', 'Bottle gourd sabzi'],
            note: 'Use the calmest repeatable Jain dinner rather than waiting for a perfect option.',
          },
        },
      };

      return canteenMap[dietProfile][slot];
    }

    if (constraints.foodSetup === 'travel_heavy' || constraints.cookingAccess === 'minimal') {
      const travelMap: Record<DietProfile, Record<MealSlot, ContextualMealOverride>> = {
        omni: {
          Breakfast: {
            name: 'Travel Fruit, Milk, and Egg Combo',
            foods: ['Banana', 'Milk tetra pack', 'Boiled eggs', 'Plain sandwich'],
            note: 'Travel lens: use Indian convenience foods you can find in stations, airports, or roadside stops.',
          },
          Lunch: {
            name: 'Travel Khichdi or Rice Bowl',
            foods: ['Khichdi or rice bowl', 'Curd', 'Eggs or grilled chicken'],
            note: 'Pick the simplest warm carb plus protein option while travelling instead of skipping meals.',
          },
          Snack: {
            name: 'Portable Banana and Chana Snack',
            foods: ['Banana', 'Roasted chana', 'Coconut water'],
            note: 'Travel snack built for speed and digestion when timing is messy.',
          },
          Dinner: {
            name: 'Hotel Dal-Rice Protein Plate',
            foods: ['Dal', 'Rice', 'Chicken or egg curry', 'Curd'],
            note: 'Travel dinner lens: default to dal-rice-protein combinations you can repeat across cities.',
          },
        },
        veg: {
          Breakfast: {
            name: 'Travel Fruit, Milk, and Paneer Sandwich',
            foods: ['Banana', 'Milk or curd', 'Paneer sandwich'],
            note: 'Travel lens: use simple vegetarian staples that are easier to find and tolerate.',
          },
          Lunch: {
            name: 'Travel Dal-Rice-Curd Plate',
            foods: ['Dal', 'Rice', 'Curd', 'Paneer or sprouts'],
            note: 'Travel meals stay believable when you stop overcomplicating them.',
          },
          Snack: {
            name: 'Fruit, Curd, and Chana Snack',
            foods: ['Fruit', 'Curd cup', 'Roasted chana'],
            note: 'Portable vegetarian snack for bus, train, or airport gaps.',
          },
          Dinner: {
            name: 'Hotel Roti-Dal-Paneer Plate',
            foods: ['Roti', 'Dal', 'Paneer', 'Curd'],
            note: 'Use the safest vegetarian hotel order you can repeat without digestive chaos.',
          },
        },
        vegan: {
          Breakfast: {
            name: 'Travel Fruit and Chana Combo',
            foods: ['Banana', 'Roasted chana', 'Plain poha'],
            note: 'Travel lens: stay with simple Indian vegan foods rather than waiting for specialty products.',
          },
          Lunch: {
            name: 'Travel Dal-Rice-Soya Plate',
            foods: ['Dal', 'Rice', 'Soya chunks', 'Seasonal sabzi'],
            note: 'Travel vegan meals work best when you default to dal, rice, and easy protein anchors.',
          },
          Snack: {
            name: 'Fruit, Chana, and Coconut Water',
            foods: ['Fruit', 'Roasted chana', 'Coconut water'],
            note: 'Portable plant-based snack for heat, travel, and uncertain timing.',
          },
          Dinner: {
            name: 'Simple Dal-Roti Travel Plate',
            foods: ['Dal', 'Roti', 'Soya or mixed beans', 'Sabzi'],
            note: 'Choose digestible staples over novelty vegan meals while travelling.',
          },
        },
        jain: {
          Breakfast: {
            name: 'Travel Fruit, Curd, and Idli',
            foods: ['Banana', 'Curd', 'Idli'],
            note: 'Travel Jain breakfast built around common, low-friction foods.',
          },
          Lunch: {
            name: 'Jain Rice-Dal-Curd Plate',
            foods: ['Moong dal', 'Rice', 'Curd', 'Bottle gourd sabzi'],
            note: 'Travel Jain meals are easiest when you stay with simple cooked staples.',
          },
          Snack: {
            name: 'Fruit and Curd Snack',
            foods: ['Fruit', 'Curd', 'Roasted chana'],
            note: 'Portable Jain snack for long travel gaps.',
          },
          Dinner: {
            name: 'Jain Roti-Dal Plate',
            foods: ['Roti', 'Moong dal', 'Paneer', 'Bottle gourd sabzi'],
            note: 'Travel Jain dinner lens: choose a calm, repeatable combination over restaurant variety.',
          },
        },
      };

      return travelMap[dietProfile][slot];
    }

    return null;
  }

  private getRegionalMealOverride(
    slot: MealSlot,
    dietProfile: DietProfile,
    constraints: Constraints,
    athleteContext?: AthleteMealContext
  ): ContextualMealOverride | null {
    if (constraints.foodSetup === 'hostel_canteen' || constraints.foodSetup === 'travel_heavy') return null;
    if (constraints.cookingAccess === 'minimal') return null;

    const recoveryLens = athleteContext?.sessionType === 'RECOVER';
    const regionalKey = constraints.indiaRegion || this.resolveIndiaRegionFromCuisinePreferences(constraints.preferredCuisines);
    if (!regionalKey) return null;

    const regionalMap: Record<
      NonNullable<Constraints['indiaRegion']>,
      Partial<Record<MealSlot, Record<DietProfile, ContextualMealOverride>>>
    > = {
      north: {
        Breakfast: {
          omni: {
            name: 'Egg Roll and Curd Breakfast',
            foods: ['Egg roll', 'Curd', 'Fruit'],
            note: 'North India home-meal lens using roti-based breakfast options you can repeat.',
          },
          veg: {
            name: 'Paneer Roti and Curd Breakfast',
            foods: ['Paneer stuffed roti', 'Curd', 'Fruit'],
            note: 'North India home-meal lens built around familiar roti and paneer patterns.',
          },
          vegan: {
            name: 'Besan Cheela and Fruit Breakfast',
            foods: ['Besan cheela', 'Fruit', 'Seeds'],
            note: 'North India plant-based breakfast using low-friction staples.',
          },
          jain: {
            name: 'Moong Cheela and Curd Breakfast',
            foods: ['Moong dal cheela', 'Curd', 'Fruit'],
            note: 'North India Jain breakfast using familiar, easy-to-repeat foods.',
          },
        },
      },
      south: {
        Breakfast: {
          omni: {
            name: 'Idli, Sambar, and Egg Breakfast',
            foods: ['Idli', 'Sambar', 'Boiled eggs', 'Banana'],
            note: 'South India home-meal lens using familiar fermented breakfasts for lighter digestion.',
          },
          veg: {
            name: 'Idli, Sambar, and Curd Breakfast',
            foods: ['Idli', 'Sambar', 'Curd', 'Banana'],
            note: 'South India home-meal lens built around idli, sambar, and curd.',
          },
          vegan: {
            name: 'Podi Idli and Banana Breakfast',
            foods: ['Idli', 'Sambar', 'Banana', 'Roasted chana'],
            note: 'South India plant-based breakfast that stays practical and repeatable.',
          },
          jain: {
            name: 'Idli and Curd Breakfast',
            foods: ['Idli', 'Curd', 'Banana', 'Roasted chana'],
            note: 'South India Jain breakfast built around easy staples and lower digestive load.',
          },
        },
        Dinner: {
          omni: {
            name: 'Curd Rice and Fish Recovery Plate',
            foods: ['Curd rice', 'Fish curry', 'Vegetable poriyal'],
            note: 'South India dinner lens: calmer carb plus protein pattern that works well on recovery evenings.',
          },
          veg: {
            name: 'Curd Rice and Dal Recovery Plate',
            foods: ['Curd rice', 'Dal', 'Vegetable poriyal'],
            note: 'South India dinner lens for steady digestion and overnight recovery.',
          },
          vegan: {
            name: 'Rice, Dal, and Poriyal Plate',
            foods: ['Rice', 'Dal', 'Vegetable poriyal', 'Sundal'],
            note: 'South India plant-based dinner built around familiar home staples.',
          },
          jain: {
            name: 'Rice, Dal, and Bottle Gourd Plate',
            foods: ['Rice', 'Moong dal', 'Bottle gourd sabzi', 'Curd'],
            note: 'South India Jain dinner keeping the meal calm and practical.',
          },
        },
      },
      west: {
        Breakfast: {
          omni: {
            name: 'Poha, Eggs, and Curd Breakfast',
            foods: ['Poha', 'Boiled eggs', 'Curd', 'Fruit'],
            note: 'West India breakfast lens using poha as a repeatable carb anchor.',
          },
          veg: {
            name: 'Poha, Curd, and Sprouts Breakfast',
            foods: ['Poha', 'Curd', 'Sprouts', 'Fruit'],
            note: 'West India home-meal lens built around poha and easy protein support.',
          },
          vegan: {
            name: 'Poha and Sprouts Breakfast',
            foods: ['Poha', 'Sprouts', 'Fruit', 'Seeds'],
            note: 'West India plant-based breakfast using accessible staples instead of expensive alternatives.',
          },
          jain: {
            name: 'Poha and Curd Breakfast',
            foods: ['Poha', 'Curd', 'Fruit', 'Roasted chana'],
            note: 'West India Jain breakfast built for repeatability and light digestion.',
          },
        },
      },
      east: {
        Lunch: {
          omni: {
            name: 'Fish, Rice, and Dal Plate',
            foods: ['Fish curry', 'Rice', 'Dal', 'Vegetables'],
            note: 'East India home-meal lens using rice, fish, and dal as the core performance plate.',
          },
          veg: {
            name: 'Dal, Rice, and Paneer Plate',
            foods: ['Dal', 'Rice', 'Paneer', 'Vegetables'],
            note: 'East India vegetarian lunch built around simple rice and dal structure.',
          },
          vegan: {
            name: 'Dal, Rice, and Soya Plate',
            foods: ['Dal', 'Rice', 'Soya chunks', 'Vegetables'],
            note: 'East India plant-based lunch using simple staples with accessible protein.',
          },
          jain: {
            name: 'Dal, Rice, and Curd Plate',
            foods: ['Moong dal', 'Rice', 'Curd', 'Bottle gourd sabzi'],
            note: 'East India Jain lunch built around digestible staples.',
          },
        },
      },
      central: {
        Breakfast: {
          omni: {
            name: 'Poha, Eggs, and Banana Breakfast',
            foods: ['Poha', 'Boiled eggs', 'Banana', 'Curd'],
            note: 'Central India breakfast lens built around repeatable morning staples.',
          },
          veg: {
            name: 'Poha, Curd, and Chana Breakfast',
            foods: ['Poha', 'Curd', 'Roasted chana', 'Banana'],
            note: 'Central India vegetarian breakfast using practical local staples.',
          },
          vegan: {
            name: 'Poha and Chana Breakfast',
            foods: ['Poha', 'Roasted chana', 'Banana', 'Seeds'],
            note: 'Central India plant-based breakfast that stays affordable and accessible.',
          },
          jain: {
            name: 'Poha and Curd Breakfast',
            foods: ['Poha', 'Curd', 'Banana', 'Roasted chana'],
            note: 'Central India Jain breakfast designed for consistency, not novelty.',
          },
        },
      },
      north_east: {
        Lunch: {
          omni: {
            name: 'Rice, Eggs, and Greens Plate',
            foods: ['Rice', 'Eggs or fish', 'Sauteed greens', 'Dal'],
            note: 'North-East home-meal lens using simple rice-plus-protein patterns.',
          },
          veg: {
            name: 'Rice, Dal, and Greens Plate',
            foods: ['Rice', 'Dal', 'Paneer', 'Sauteed greens'],
            note: 'North-East vegetarian lunch built around rice and simple cooked foods.',
          },
          vegan: {
            name: 'Rice, Dal, and Soya Greens Plate',
            foods: ['Rice', 'Dal', 'Soya chunks', 'Sauteed greens'],
            note: 'North-East plant-based lunch using accessible staples and easy proteins.',
          },
          jain: {
            name: 'Rice, Dal, and Curd Plate',
            foods: ['Rice', 'Moong dal', 'Curd', 'Sauteed greens'],
            note: 'North-East Jain lunch built around simple rice and dal flow.',
          },
        },
      },
    };

    const slotMap = regionalMap[regionalKey]?.[slot];
    if (!slotMap) return null;
    const override = slotMap[dietProfile];
    if (!override) return null;

    if (recoveryLens && slot === 'Dinner') {
      return {
        ...override,
        note: `${override.note} Recovery lens: keep the meal lighter on the stomach and easier to repeat.`,
      };
    }

    return override;
  }

  private applyBudgetSwaps(meal: RecommendedMeal, dietProfile: DietProfile) {
    const replacementMap: Record<string, string> = {
      'Greek yogurt': 'Curd',
      'Fish curry': dietProfile === 'omni' ? 'Egg curry' : 'Dal',
      Fish: dietProfile === 'omni' ? 'Eggs' : 'Dal',
      Tofu: dietProfile === 'vegan' ? 'Soya chunks' : 'Paneer',
      Millet: 'Rice',
      millets: 'Rice',
      quinoa: 'Rice',
      Seeds: 'Roasted chana',
      'Soy yogurt': 'Curd',
    };

    const foods = meal.foods.map((food) => {
      const replacement = Object.entries(replacementMap).find(([key]) => food.toLowerCase().includes(key.toLowerCase()))
      return replacement ? replacement[1] : food;
    });

    return {
      ...meal,
      foods,
      coachingNote: this.appendCoachingNote(
        meal.coachingNote,
        'Budget lens: using lower-cost Indian staples like dal, eggs, curd, chana, rice, and seasonal produce where possible.'
      ),
    };
  }

  private appendCoachingNote(base: string | undefined, addition: string) {
    const current = String(base || '').trim();
    if (!current) return addition;
    if (current.includes(addition)) return current;
    return `${current} ${addition}`.trim();
  }

  private normalizeCuisineKey(value: string) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
  }

  private cuisineToRegion(cuisineKey: string): Constraints['indiaRegion'] {
    const normalized = this.normalizeCuisineKey(cuisineKey);
    if (
      normalized === 'north_indian' ||
      normalized === 'punjabi' ||
      normalized === 'kashmiri' ||
      normalized === 'rajasthani' ||
      normalized === 'mughlai' ||
      normalized === 'awadhi'
    ) {
      return 'north';
    }
    if (
      normalized === 'south_indian' ||
      normalized === 'andhra_telugu' ||
      normalized === 'tamil' ||
      normalized === 'kerala' ||
      normalized === 'karnataka' ||
      normalized === 'chettinad' ||
      normalized === 'hyderabadi'
    ) {
      return 'south';
    }
    if (
      normalized === 'west_indian' ||
      normalized === 'gujarati' ||
      normalized === 'maharashtrian' ||
      normalized === 'goan' ||
      normalized === 'malvani'
    ) {
      return 'west';
    }
    if (
      normalized === 'east_indian' ||
      normalized === 'bengali' ||
      normalized === 'odia'
    ) {
      return 'east';
    }
    if (normalized === 'north_east_indian') {
      return 'north_east';
    }
    if (normalized === 'bihari') {
      return 'central';
    }
    if (normalized === 'indo_chinese') {
      return null;
    }
    return null;
  }

  private resolveCuisinePreferenceTags(cuisineKey: string) {
    const normalized = this.normalizeCuisineKey(cuisineKey);
    const tags = new Set<string>([normalized]);

    if ([
      'north_indian',
      'south_indian',
      'west_indian',
      'east_indian',
      'north_east_indian',
      'punjabi',
      'gujarati',
      'maharashtrian',
      'bengali',
      'rajasthani',
      'andhra_telugu',
      'tamil',
      'kerala',
      'karnataka',
      'kashmiri',
      'goan',
      'odia',
      'bihari',
      'mughlai',
      'awadhi',
      'hyderabadi',
      'chettinad',
      'malvani',
      'indo_chinese',
    ].includes(normalized)) {
      tags.add('indian');
    }

    if (['mediterranean', 'greek'].includes(normalized)) {
      tags.add('mediterranean');
    }

    if (['middle_eastern', 'turkish', 'persian', 'arabic'].includes(normalized)) {
      tags.add('middle_eastern');
    }

    if (['italian', 'french', 'spanish', 'portuguese', 'continental_european'].includes(normalized)) {
      tags.add('continental_european');
    }

    if (['mexican', 'latin_american', 'caribbean'].includes(normalized)) {
      tags.add('latin_american');
    }

    if (normalized === 'american') {
      tags.add('american');
    }

    if ([
      'chinese',
      'japanese',
      'korean',
      'thai',
      'vietnamese',
      'malaysian',
      'singaporean',
      'indonesian',
      'filipino',
      'sri_lankan',
      'nepali',
      'tibetan',
      'indo_chinese',
    ].includes(normalized)) {
      tags.add('asian_global');
    }

    if (['african', 'ethiopian'].includes(normalized)) {
      tags.add('african');
    }

    if (!tags.has('indian')) {
      tags.add('global');
    }

    return Array.from(tags);
  }

  private resolveIndiaRegionFromCuisinePreferences(cuisines: string[]): Constraints['indiaRegion'] {
    for (const cuisine of cuisines) {
      const region = this.cuisineToRegion(cuisine);
      if (region) return region;
    }
    return null;
  }

  private mealMatchesCuisinePreference(
    option: MealTemplate,
    preferredCuisineKeys: string[],
    preferredCuisineTags: string[]
  ) {
    const preferredRegions = Array.from(
      new Set(
        preferredCuisineKeys
          .map((cuisine) => this.cuisineToRegion(cuisine))
          .filter((region): region is NonNullable<Constraints['indiaRegion']> => Boolean(region))
      )
    );

    const regionMatch =
      preferredRegions.length > 0 &&
      Boolean(option.regionTags?.some((region) => preferredRegions.includes(region)));

    const tagMatch =
      preferredCuisineTags.length > 0 &&
      Boolean(option.cuisineTags?.some((tag) => preferredCuisineTags.includes(tag)));

    const searchableText = `${option.name} ${option.foods.join(' ')} ${option.coachingNote}`.toLowerCase();
    const keywordMatch = preferredCuisineTags.some((tag) =>
      (CUISINE_TAG_KEYWORDS[tag] || []).some((keyword) => searchableText.includes(keyword))
    );

    return regionMatch || tagMatch || keywordMatch;
  }

  private resolveBlockedTerms(constraints: Constraints) {
    const inputTerms = [...constraints.allergies, ...constraints.dislikes];
    const blockedTerms: string[] = [];
    const seen = new Set<string>();

    for (const rawTerm of inputTerms) {
      const normalized = String(rawTerm || '').trim().toLowerCase();
      if (!normalized) continue;
      if (!seen.has(normalized)) {
        seen.add(normalized);
        blockedTerms.push(normalized);
      }

      const aliases = BLOCKED_TERM_ALIASES[normalized] || [];
      for (const alias of aliases) {
        const aliasTerm = String(alias || '').trim().toLowerCase();
        if (!aliasTerm || seen.has(aliasTerm)) continue;
        seen.add(aliasTerm);
        blockedTerms.push(aliasTerm);
      }
    }

    return blockedTerms;
  }

  private resolveMealWindow(slot: MealSlot, timingPreference: 'EARLY' | 'LATE' | 'IF') {
    if (slot === 'Breakfast') return timingPreference === 'IF' ? 'Skipped morning meal' : '7-9 AM';
    if (slot === 'Lunch') return '12-2 PM';
    if (slot === 'Snack') return '4-6 PM';
    return timingPreference === 'LATE' ? '8-10 PM' : '7-9 PM';
  }

  private async fetchConstraints(userId: string): Promise<Constraints> {
    try {
      const supabase = await this.getSupabaseClient();
      const { data: record } = await supabase
        .from('user_dietary_constraints')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const preferredCuisines = Array.isArray(record?.preferred_cuisines)
        ? record.preferred_cuisines
            .map((item: unknown) => this.normalizeCuisineKey(String(item || '')))
            .filter((item: string): item is string => Boolean(item))
        : [];

      const legacyRegion =
        record?.india_region === 'north' ||
        record?.india_region === 'south' ||
        record?.india_region === 'west' ||
        record?.india_region === 'east' ||
        record?.india_region === 'central' ||
        record?.india_region === 'north_east'
          ? record.india_region
          : null;

      return {
        isVeg: record?.diet_type === 'veg',
        isVegan: record?.diet_type === 'vegan',
        isJain: record?.diet_type === 'jain',
        allergies: Array.isArray(record?.allergies) ? record.allergies : [],
        dislikes: Array.isArray(record?.dislikes) ? record.dislikes : [],
        preferredCuisines,
        budgetTier:
          record?.budget_tier === 'budget' || record?.budget_tier === 'standard' || record?.budget_tier === 'performance'
            ? record.budget_tier
            : null,
        foodSetup:
          record?.food_setup === 'home_kitchen' ||
          record?.food_setup === 'hostel_canteen' ||
          record?.food_setup === 'mixed' ||
          record?.food_setup === 'travel_heavy'
            ? record.food_setup
            : null,
        cookingAccess:
          record?.cooking_access === 'full_kitchen' ||
          record?.cooking_access === 'basic_reheat' ||
          record?.cooking_access === 'minimal'
            ? record.cooking_access
            : null,
        indiaRegion: legacyRegion || this.resolveIndiaRegionFromCuisinePreferences(preferredCuisines),
      };
    } catch (error) {
      console.warn('[NutritionGenerator] Falling back to default constraints:', error);
      return DEFAULT_CONSTRAINTS;
    }
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

  private async runConstraintProcessor(
    meals: RecommendedMeal[],
    constraints: Constraints,
    dietProfile: DietProfile
  ): Promise<RecommendedMeal[]> {
    const blockedTerms = this.resolveBlockedTerms(constraints);
    const replacementMap: Record<string, string> = {
      egg: dietProfile === 'vegan' ? 'Tofu scramble' : 'Paneer bhurji',
      chicken: 'Paneer tikka',
      fish: 'Tofu',
      shellfish: 'Tofu',
      yogurt: dietProfile === 'vegan' ? 'Soy yogurt' : 'Curd',
      curd: dietProfile === 'vegan' ? 'Soy yogurt' : 'Curd',
      paneer: dietProfile === 'vegan' ? 'Tofu' : 'Paneer',
      milk: dietProfile === 'vegan' ? 'Soy milk' : 'Milk',
      dairy: 'Coconut yogurt',
      peanut: 'Seeds',
      nuts: 'Seeds',
      'tree nut': 'Seeds',
      soy: 'Roasted chana',
      wheat: 'Millets',
      gluten: 'Millets',
      sesame: 'Pumpkin seeds',
    };

    return meals.map((meal) => {
      const filteredFoods = meal.foods
        .map((food) => {
          const normalized = food.toLowerCase();
          const blocked = blockedTerms.find((term) => normalized.includes(term));
          if (!blocked) return food;
          return replacementMap[blocked] || null;
        })
        .filter((food): food is string => Boolean(food));

      const jainFiltered = constraints.isJain
        ? filteredFoods.filter((food) => !/(onion|garlic|potato)/i.test(food))
        : filteredFoods;

      const foods = jainFiltered.length ? jainFiltered : this.getFallbackFoods(dietProfile, meal.mealType as MealSlot);
      const noteSuffix =
        foods.join('|') !== meal.foods.join('|')
          ? ' Adjusted for your dietary preferences.'
          : '';

      return {
        ...meal,
        foods,
        coachingNote: `${meal.coachingNote || 'Balanced meal recommendation.'}${noteSuffix}`,
      };
    });
  }

  private getFallbackFoods(dietProfile: DietProfile, slot: MealSlot) {
    const fallbackMap: Record<DietProfile, Record<MealSlot, string[]>> = {
      omni: {
        Breakfast: ['Eggs', 'Toast', 'Fruit'],
        Lunch: ['Chicken', 'Rice', 'Vegetables'],
        Snack: ['Greek yogurt', 'Fruit'],
        Dinner: ['Fish or chicken', 'Roti or rice', 'Vegetables'],
      },
      veg: {
        Breakfast: ['Moong dal chilla', 'Curd'],
        Lunch: ['Dal', 'Rice', 'Sabzi'],
        Snack: ['Roasted chana', 'Fruit'],
        Dinner: ['Paneer', 'Roti', 'Vegetables'],
      },
      vegan: {
        Breakfast: ['Tofu', 'Poha', 'Fruit'],
        Lunch: ['Millets', 'Tofu', 'Vegetables'],
        Snack: ['Makhana', 'Fruit'],
        Dinner: ['Tofu', 'Millets', 'Vegetables'],
      },
      jain: {
        Breakfast: ['Moong dal chilla', 'Curd'],
        Lunch: ['Moong dal', 'Rice', 'Lauki sabzi'],
        Snack: ['Roasted chana', 'Fruit'],
        Dinner: ['Paneer', 'Millet roti', 'Bottle gourd sabzi'],
      },
    };

    return fallbackMap[dietProfile][slot];
  }
}

export const nutritionGenerator = new NutritionGenerator();
