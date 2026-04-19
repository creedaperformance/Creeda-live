
import { createClient } from '@supabase/supabase-js'
import { processAthleticIntelligence } from '../src/lib/intelligence_engine'
import { getScriptSupabaseAdminEnv } from './env'

const { supabaseUrl, supabaseServiceKey } = getScriptSupabaseAdminEnv()

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runLongitudinalAudit() {
  console.log('📈 Starting Longitudinal Trend Audit...')

  // Pick an athlete with history (like athlete5, who we know has 14 logs)
  const { data: athlete } = await supabase.from('profiles')
    .select('id, full_name, primary_sport, position, gender')
    .eq('email', 'athlete5@test.creeda.com')
    .single()

  if (!athlete) {
    console.error('Athlete not found. Did you run the synthetic data script?')
    return
  }

  const { data: logs } = await supabase.from('daily_load_logs')
    .select('*')
    .eq('athlete_id', athlete.id)
    .order('log_date', { ascending: true })

  if (!logs || logs.length < 14) {
    console.error(`Insufficient logs for athlete ${athlete.full_name}. Found: ${logs?.length}`)
    return
  }

  console.log(`Processing 14 days of history for ${athlete.full_name} (${athlete.primary_sport})...`)

  let previousRisk: any = null
  let trendDeltas = 0

  for (let i = 0; i < logs.length; i++) {
    const dailyLog = logs[i]
    const history = logs.slice(0, i) // Traaling history

    const context = {
      fullName: athlete.full_name,
      sport: athlete.primary_sport!,
      position: athlete.position!,
      goal: 'Performance' as const
    }

    const result = processAthleticIntelligence(context, dailyLog, history)

    console.log(`Day ${i + 1}: ${dailyLog.log_date} | Score: ${result.readinessScore} | Status: ${result.status}`)
    
    if (result.predictiveRisk.type !== 'none') {
      console.log(`  ⚠️ Risk: ${result.predictiveRisk.label} (${result.predictiveRisk.score}%)`)
    }

    if (previousRisk && result.predictiveRisk.type !== previousRisk.type) {
      trendDeltas++
    }
    previousRisk = result.predictiveRisk
  }

  console.log(`\n✅ Longitudinal Audit Complete.`)
  console.log(`Trend Adaptations detected: ${trendDeltas}`)
  
  if (trendDeltas === 0) {
    console.warn('⚠️ WARNING: Lack of trend adaptation! Risk model might be too static.')
  } else {
    console.log('🎉 Intelligence correctly adapts to longitudinal data shifts.')
  }

  process.exit(0)
}

runLongitudinalAudit()
