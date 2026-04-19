
import { createClient } from '@supabase/supabase-js'
import { getScriptSupabaseAdminEnv } from './env'

const { supabaseUrl, supabaseServiceKey } = getScriptSupabaseAdminEnv()
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAthleteLogs() {
  const email = 'athlete5@test.creeda.com'
  const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single()
  if (!profile) {
    console.log("No profile found for", email)
    return
  }

  const { data: logs } = await supabase
    .from('daily_load_logs')
    .select('log_date')
    .eq('athlete_id', profile.id)
    .order('log_date', { ascending: false })
    .limit(5)

  console.log(`Logs for ${email}:`, logs)
  console.log(`Current Date (ISO): ${new Date().toISOString().split('T')[0]}`)
}

checkAthleteLogs()
