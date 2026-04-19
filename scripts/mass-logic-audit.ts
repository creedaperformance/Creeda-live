
import { createClient } from '@supabase/supabase-js'
import { processAthleticIntelligence } from '../src/lib/intelligence_engine'
import { getScriptSupabaseAdminEnv } from './env'

const { supabaseUrl, supabaseServiceKey } = getScriptSupabaseAdminEnv()

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMassAudit() {
  console.log('🧪 Starting Mass Logic Engine Audit (N=1000)...')

  // 1. Fetch All Test Athletes with full context
  const { data: athletes, error: athleteError } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      primary_sport,
      gender,
      diagnostics (
        *
      ),
      daily_load_logs (
        *
      )
    `)
    .ilike('email', '%@test.creeda.com')
    .eq('role', 'athlete')

  if (athleteError) {
    console.error('❌ Error fetching athletes:', athleteError.message)
    return
  }

  console.log(`📡 Loaded ${athletes.length} Athletes. Beginning reasoning processing...`)

  const auditResults: any[] = []
  const judgements: string[] = []
  const errors: any[] = []

  for (const athlete of athletes) {
    try {
      const logs = (athlete.daily_load_logs as any[]) || []
      const latestLog = logs[0]
      const diagnostic = (athlete.diagnostics as any[])?.[0]

      if (!latestLog || !diagnostic) continue

      const context = {
        fullName: athlete.full_name,
        sport: diagnostic.sport_context?.primarySport || athlete.primary_sport || 'Other',
        position: 'General',
        goal: diagnostic.primary_goal || 'Performance'
      }

      const intel = processAthleticIntelligence(
        context, 
        latestLog, 
        logs.slice(1), 
        diagnostic
      )

      auditResults.push({
        athleteId: athlete.id,
        score: intel.readinessScore,
        rationale: intel.explanation?.rationale || [],
        primaryFactor: intel.explanation?.primaryFactor,
        judgement: intel.combinedInsight
      })
      judgements.push(intel.combinedInsight)

    } catch (err: any) {
      errors.push({ id: athlete.id, error: err.message })
    }
  }

  // 2. Statistics & Integrity Checks
  console.log('\n📊 --- Audit Statistics ---')
  console.log(`   Athletes Processed: ${auditResults.length}`)
  console.log(`   Processing Errors: ${errors.length}`)

  // Uniqueness (Logic Entropy)
  const uniqueJudgements = new Set(judgements)
  const uniquenessPerc = (uniqueJudgements.size / judgements.length) * 100
  console.log(`   Unique Judgements: ${uniqueJudgements.size} (${uniquenessPerc.toFixed(1)}%)`)

  // Score Distribution
  const scoreBuckets = { red: 0, yellow: 0, green: 0 }
  auditResults.forEach(r => {
    if (r.score < 50) scoreBuckets.red++
    else if (r.score < 80) scoreBuckets.yellow++
    else scoreBuckets.green++
  })
  console.log(`   Score Distribution: Red=${scoreBuckets.red}, Yellow=${scoreBuckets.yellow}, Green=${scoreBuckets.green}`)

  // Scientific Consistency Check (Manual Laborers)
  const manualLaborAudit = athletes.filter(a => (a.diagnostics?.[0] as any)?.daily_living?.occupation === 'Physical/Manual')
    .map(a => auditResults.find(r => r.athleteId === a.id))
    .filter(Boolean)
  
  const laborAware = manualLaborAudit.filter(r => r.judgement.toLowerCase().includes('occupation') || r.rationale.some((rat: string) => rat.toLowerCase().includes('occupation')))
  console.log(`   Manual Labor Awareness: ${laborAware.length} / ${manualLaborAudit.length}`)

  // Female Physiology Check
  const femaleAthletes = athletes.filter(a => a.gender === 'Female')
    .map(a => auditResults.find(r => r.athleteId === a.id))
    .filter(Boolean)
  
  const cycleAware = femaleAthletes.filter(r => r.judgement.toLowerCase().includes('cycle'))
  console.log(`   Female Cycle Awareness: ${cycleAware.length} / ${femaleAthletes.length}`)

  console.log('\n🚀 Mass Logic Audit Complete.')
}

runMassAudit()
