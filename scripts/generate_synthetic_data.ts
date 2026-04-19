
import { createClient } from '@supabase/supabase-js'
import { getScriptSupabaseAdminEnv } from './env'

const { supabaseUrl, supabaseServiceKey } = getScriptSupabaseAdminEnv()

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const SPORTS = [
  'wrestling', 'football', 'swimming', 'athletics', 'badminton', 
  'tennis', 'hockey', 'boxing', 'endurance', 'strength'
]

const PERFORMANCE_LEVELS = ['Professional', 'Elite', 'State', 'District', 'Club', 'Recreational']
const GOALS = ['Performance', 'Prevention', 'Recovery']

async function clearOldTestData() {
  console.log('🧹 Clearing old test data...')
  const { data: testUsers, error: usersError } = await supabase.auth.admin.listUsers({
    perPage: 10000
  })
  if (usersError) throw usersError

  const toDelete = testUsers.users.filter(u => u.email?.endsWith('@test.creeda.com'))
  console.log(`Found ${toDelete.length} test users to delete.`)

  const batchSize = 50
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize)
    await Promise.all(batch.map(user => supabase.auth.admin.deleteUser(user.id)))
    console.log(`   Deleted ${Math.min(i + batchSize, toDelete.length)} / ${toDelete.length}`)
  }
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const sleepQualities = ['Excellent', 'Good', 'Okay', 'Poor']
const energyLevels = ['Peak', 'High', 'Moderate', 'Low', 'Drained']
const bodyFeels = ['Light/Fresh', 'Normal', 'Heavy', 'Stiff/Sore']
const stressLevels = ['None', 'Low', 'Moderate', 'High']
const mentalReadiness = ['Combat-ready', 'Focused', 'Distracted', 'Not ready']
const menstrualStates = ['Stable', 'Luteal', 'Follicular', 'Ovulatory']
const occupations = ['Student', 'Desk-bound', 'Physical/Manual', 'Corporate', 'Professional Athlete']

async function generateData() {
  try {
    // For extreme scale validation, we want a clean slate
    await clearOldTestData()

    console.log('🚀 Generating 1000 Coaches...')
    const coachIds: string[] = []
    const teamInserts: any[] = []
    const profileUpdates: any[] = []

    const coachBatchSize = 25
    for (let i = 1; i <= 1000; i += coachBatchSize) {
      const promises = []
      for (let j = 0; j < coachBatchSize && (i + j) <= 1000; j++) {
        const index = i + j
        promises.push(supabase.auth.admin.createUser({
          email: `coach${index}@test.creeda.com`,
          password: 'password123',
          email_confirm: true,
          user_metadata: {
            full_name: `Coach ${index}`,
            role: 'coach',
            subscription_tier: index % 10 === 0 ? 'Coach-Pro-Plus' : 'Coach-Pro'
          }
        }))
      }
      const results = await Promise.all(promises)
      
      results.forEach((res, j) => {
        const index = i + j
        if (res.error) {
          console.error(`Error creating coach ${index}:`, res.error.message)
          return
        }
        const coachId = res.data.user.id
        coachIds.push(coachId)
        const sport = getRandomElement(SPORTS)

        const tier = index % 10 === 0 ? 'Coach-Pro-Plus' : 'Coach-Pro'
        teamInserts.push({
          coach_id: coachId,
          team_name: `Coach ${index}'s ${sport.toUpperCase()} Squad`,
          sport: sport,
          purchased_seats: index % 10 === 0 ? 35 : 15
        })

        profileUpdates.push({
          id: coachId,
          primary_sport: sport,
          locker_code: `C${index.toString().padStart(4, '0')}`,
          onboarding_completed: true,
          role: 'coach',
          full_name: `Coach ${index}`,
          email: `coach${index}@test.creeda.com`,
          subscription_tier: tier
        })
      })
      console.log(`   Registered ${coachIds.length} / 1000 Coaches`)
    }

    console.log('📦 Bulk inserting teams...')
    const { data: teams, error: teamsError } = await supabase.from('teams').insert(teamInserts).select()
    if (teamsError) throw teamsError

    console.log('📦 Bulk updating coach profiles...')
    const { error: coachProfError } = await supabase.from('profiles').upsert(profileUpdates)
    if (coachProfError) throw coachProfError

    console.log('🚀 Generating 1000 Athletes...')
    const athleteIds: string[] = []
    const athleteBatchSize = 20
    const teamIds = teams.map(t => t.id)

    for (let i = 1; i <= 1000; i += athleteBatchSize) {
      const promises = []
      for (let j = 0; j < athleteBatchSize && (i + j) <= 1000; j++) {
        const index = i + j
        promises.push(supabase.auth.admin.createUser({
          email: `athlete${index}@test.creeda.com`,
          password: 'password123',
          email_confirm: true,
          user_metadata: {
            full_name: `Athlete ${index}`,
            role: 'athlete'
          }
        }))
      }
      const results = await Promise.all(promises)

      const athleteProfiles: any[] = []
      const diagnostics: any[] = []
      const teamMembers: any[] = []
      const allLogs: any[] = []

      for (let j = 0; j < results.length; j++) {
        const res = results[j]
        const index = i + j
        if (res.error) {
          console.error(`Error creating athlete ${index}:`, res.error.message)
          continue
        }
        const athleteId = res.data.user.id
        athleteIds.push(athleteId)

        const gender = index <= 500 ? 'Male' : 'Female'
        const sport = getRandomElement(SPORTS)
        const level = getRandomElement(PERFORMANCE_LEVELS)
        const goal = getRandomElement(GOALS)
        const persona = index % 10 === 0 ? 'overtrainer' : (index % 10 === 1 ? 'manual-laborer' : 'normal')

        athleteProfiles.push({
          id: athleteId,
          full_name: `Athlete ${index}`,
          email: `athlete${index}@test.creeda.com`,
          role: 'athlete',
          gender,
          primary_sport: sport,
          onboarding_completed: true,
          height: getRandomInt(150, 200),
          weight: getRandomInt(50, 100),
          locker_code: `A${index.toString().padStart(4, '0')}`,
          subscription_tier: index % 20 === 0 ? 'Premium-Solo' : 'Free'
        })

        diagnostics.push({
          athlete_id: athleteId,
          primary_goal: goal,
          sport_context: { primarySport: sport, playingLevel: level },
          daily_living: { occupation: persona === 'manual-laborer' ? 'Physical/Manual' : getRandomElement(occupations) },
          profile_data: { gender }
        })

        const teamId = getRandomElement(teamIds)
        teamMembers.push({
          team_id: teamId,
          athlete_id: athleteId,
          status: 'Active'
        })

        for (let d = 0; d < 14; d++) {
          const date = new Date()
          date.setDate(date.getDate() - d)
          
          const isStressed = persona === 'overtrainer' || (index % 5 === 0)
          
          allLogs.push({
            athlete_id: athleteId,
            log_date: date.toISOString().split('T')[0],
            sleep_quality: isStressed ? getRandomElement(['Poor', 'Okay']) : getRandomElement(['Excellent', 'Good']),
            energy_level: isStressed ? getRandomElement(['Low', 'Drained']) : getRandomElement(['Peak', 'High']),
            muscle_soreness: isStressed ? getRandomElement(['Heavy', 'Stiff/Sore']) : getRandomElement(['Light/Fresh', 'Normal']),
            stress_level: isStressed ? getRandomElement(['High', 'Moderate']) : getRandomElement(['None', 'Low']),
            mental_readiness: isStressed ? getRandomElement(['Distracted', 'Not ready']) : getRandomElement(['Combat-ready', 'Focused']),
            current_pain_level: isStressed ? getRandomInt(1, 5) : 0,
            session_rpe: isStressed ? getRandomInt(7, 10) : getRandomInt(3, 6),
            duration_minutes: getRandomInt(30, 150),
            competition_today: d === 7,
            menstrual_status: gender === 'Female' ? getRandomElement(menstrualStates) : null,
            yesterday_load_demand: isStressed ? 'High' : 'Moderate'
          })
        }
      }

      await supabase.from('profiles').upsert(athleteProfiles)
      await supabase.from('diagnostics').insert(diagnostics)
      await supabase.from('team_members').insert(teamMembers)
      
      // Split logs into smaller chunks to avoid payload size limits if necessary
      const logChunks = []
      for (let k = 0; k < allLogs.length; k += 500) {
        logChunks.push(allLogs.slice(k, k + 500))
      }
      for (const chunk of logChunks) {
        const { error: logsError } = await supabase.from('daily_load_logs').insert(chunk)
        if (logsError) console.error("Logs Error:", logsError.message)
      }

      console.log(`   Processed ${athleteIds.length} / 1000 Athletes (+logs)`)
    }

    console.log('✅ Mass Population Generation Complete!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Fatal error:', err)
    process.exit(1)
  }
}

generateData()
