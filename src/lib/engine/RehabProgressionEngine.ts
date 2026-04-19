import { createClient } from "@/lib/supabase/server";

export class RehabProgressionEngine {
  /**
   * Assesses rehab logs and computes the next sensible stage.
   */
  async evaluateProgression(userId: string, injuryType: string): Promise<{ stage: number; flag: string }> {
    const supabase = await createClient();
    const { data: history } = await supabase
      .from('rehab_history')
      .select('stage, pain_score, timestamp')
      .eq('user_id', userId)
      .eq('injury_type', injuryType)
      .order('timestamp', { ascending: false })
      .limit(3);

    const defaultStage = { stage: 1, flag: 'START' };

    if (!history || history.length === 0) {
      return defaultStage;
    }

    const currentStage = history[0].stage;
    const latestPain = history[0].pain_score;

    // 1. If absolute pain spike, drop back a stage immediately
    if (latestPain >= 7) {
      return { stage: Math.max(1, currentStage - 1), flag: 'PAIN_SPIKE_REGRESSION' };
    }

    // 2. Need 3 days of data to process a true promotion
    if (history.length < 3) {
      return { stage: currentStage, flag: 'GATHERING_DATA' };
    }

    const day1 = history[0].pain_score; // Most recent
    const day2 = history[1].pain_score;
    const day3 = history[2].pain_score;

    // 3. Promote Stage Logic (Consecutive Decrease in pain without crossing threshold)
    if (day1 <= 2 && day2 <= 3 && day3 <= 4 && day1 <= day2 && day2 <= day3) {
      return { stage: Math.min(5, currentStage + 1), flag: 'PROGRESSION_APPROVED' };
    }

    // 4. Hold Stage Logic
    return { stage: currentStage, flag: 'HOLDING_STAGE' };
  }
}

export const rehabProgressionEngine = new RehabProgressionEngine();
