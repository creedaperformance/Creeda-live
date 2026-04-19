
import { createClient } from '@supabase/supabase-js'
import { getScriptSupabaseAdminEnv } from './env'

const { supabaseUrl, supabaseServiceKey } = getScriptSupabaseAdminEnv()
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function injectTodayLogs() {
  console.log("💉 Injecting logs for today (2026-03-18)...")
  
  const { data: athletes } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'athlete')
    .ilike('email', '%@test.creeda.com')

  if (!athletes) return

  const todayStr = new Date().toISOString().split('T')[0]
  const newLogs = athletes.map(a => ({
    athlete_id: a.id,
    log_date: todayStr,
    sleep_quality: 'Good',
    energy_level: 'High',
    muscle_soreness: 'Normal',
    stress_level: 'Low',
    mental_readiness: 'Focused',
    current_pain_level: 0,
    session_rpe: 5,
    duration_minutes: 60,
    yesterday_load_demand: 'Moderate'
  }))

  const batchSize = 1000
  for (let i = 0; i < newLogs.length; i += batchSize) {
    const chunk = newLogs.slice(i, i + batchSize)
    const { error } = await supabase.from('daily_load_logs').upsert(chunk, { onConflict: 'athlete_id,log_date' })
    if (error) console.error("Upsert Error:", error.message)
    else console.log(`   Injected ${i + chunk.length} / ${newLogs.length}`)
  }

  console.log("✅ Injection complete.")
}

injectTodayLogs()
