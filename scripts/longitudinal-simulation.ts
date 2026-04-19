
import { createClient } from '@supabase/supabase-js'
import { getScriptSupabaseAdminEnv } from './env'

const { supabaseUrl, supabaseServiceKey } = getScriptSupabaseAdminEnv()
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const bodyFeels = ['Light/Fresh', 'Normal', 'Heavy', 'Stiff/Sore']
const menstrualStates = ['Stable', 'Luteal', 'Follicular', 'Ovulatory']

async function runLongitudinalSimulation() {
  console.log('📈 Starting 30-Day Longitudinal Simulation (N=200)...')

  // 1. Fetch 200 Sample Athletes
  const { data: athletes, error: athleteError } = await supabase
    .from('profiles')
    .select('id, gender, diagnostics(*)')
    .ilike('email', '%@test.creeda.com')
    .eq('role', 'athlete')
    .limit(200)

  if (athleteError) throw athleteError

  console.log(`📡 Simulating 30 additional days for ${athletes.length} athletes...`)

  const allLogs: any[] = []
  const startDate = new Date()
  
  for (const athlete of athletes) {
    const gender = athlete.gender
    const isManualLaborer = (athlete.diagnostics?.[0] as any)?.daily_living?.occupation === 'Physical/Manual'
    
    // We'll simulate a "Trend Shift" at Day 15
    for (let d = 1; d <= 30; d++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + d)
      
      const isInjuryPhase = d > 15 && d < 22 // Moderate injury period
      const isRecoveryPhase = d >= 22
      
      allLogs.push({
        athlete_id: athlete.id,
        log_date: date.toISOString().split('T')[0],
        sleep_quality: isInjuryPhase ? 'Poor' : (isRecoveryPhase ? 'Excellent' : 'Good'),
        energy_level: isInjuryPhase ? 'Low' : (isRecoveryPhase ? 'Peak' : 'High'),
        muscle_soreness: isInjuryPhase ? 'Stiff/Sore' : 'Normal',
        stress_level: isInjuryPhase ? 'High' : 'Low',
        mental_readiness: 'Focused',
        current_pain_level: isInjuryPhase ? 6 : 0,
        pain_location: isInjuryPhase ? ['Knee'] : [],
        session_rpe: isInjuryPhase ? 9 : 4,
        duration_minutes: isInjuryPhase ? 30 : 90,
        menstrual_status: gender === 'Female' ? menstrualStates[d % 4] : null,
        yesterday_load_demand: isInjuryPhase ? 'High' : 'Moderate'
      })
    }
  }

  // 2. Batch Insert Logs
  console.log(`📦 Injecting ${allLogs.length} simulated logs...`)
  const batchSize = 1000
  for (let i = 0; i < allLogs.length; i += batchSize) {
    const { error } = await supabase.from('daily_load_logs').upsert(allLogs.slice(i, i + batchSize))
    if (error) console.error("Simulation Insert Error:", error.message)
    else console.log(`   Injected ${Math.min(i + batchSize, allLogs.length)} / ${allLogs.length}`)
  }

  console.log('✅ Longitudinal Simulation Data Injection Complete.')
}

runLongitudinalSimulation()
