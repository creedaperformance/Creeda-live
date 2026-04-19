
import { createClient } from '@supabase/supabase-js'
import { getScriptSupabaseAdminEnv } from './env'

const { supabaseUrl, supabaseServiceKey } = getScriptSupabaseAdminEnv()

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runCoachAudit() {
  console.log('🛡️ Starting Mass Coach System Audit (N=1000)...')

  // 1. Fetch all coach teams and memberships
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select(`
      id,
      coach_id,
      team_name,
      profiles (full_name),
      team_members (athlete_id)
    `)
    .ilike('team_name', '%Coach % Squad%')

  if (teamsError) {
    console.error('❌ Error fetching teams:', teamsError.message)
    return
  }

  console.log(`📡 Analyzing ${teams.length} Squads...`)

  let emptySquads = 0
  let totalAssignments = 0
  const coachSquadCounts: Record<string, number> = {}

  teams.forEach(team => {
    const members = (team.team_members as any[]) || []
    if (members.length === 0) emptySquads++
    totalAssignments += members.length
    coachSquadCounts[team.coach_id] = (coachSquadCounts[team.coach_id] || 0) + members.length
  })

  // 2. Statistics
  console.log('\n📊 --- Coach System Statistics ---')
  console.log(`   Total Coaches/Teams: ${teams.length}`)
  console.log(`   Total Athlete Assignments: ${totalAssignments}`)
  console.log(`   Empty Squads: ${emptySquads}`)
  
  const squadSizes = Object.values(coachSquadCounts)
  const avgSquadSize = squadSizes.reduce((a, b) => a + b, 0) / squadSizes.length
  console.log(`   Average Squad Size: ${avgSquadSize.toFixed(1)}`)
  console.log(`   Max Squad Size: ${Math.max(...squadSizes)}`)

  // 3. Integrity Checks
  console.log('\n🔍 --- Integrity Checks ---')
  
  // Check for duplicate assignments across teams (if any)
  const { data: duplicates } = await supabase.rpc('get_duplicate_team_members') // Assuming we might have a helper or just check locally
  // Local check for duplicates
  const allAthleteIds = teams.flatMap(t => (t.team_members as any[]).map(m => m.athlete_id))
  const uniqueAthletes = new Set(allAthleteIds)
  const duplicateCount = allAthleteIds.length - uniqueAthletes.size
  console.log(`   Duplicate Assignments Found: ${duplicateCount}`)

  if (duplicateCount === 0) {
    console.log('✅ Integrity Check Passed: No athlete is double-rostered.')
  } else {
    console.log('⚠️ Warning: Multiple assignments detected.')
  }

  console.log('\n🛡️ Mass Coach Audit Complete.')
}

runCoachAudit()
