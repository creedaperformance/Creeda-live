import { createClient } from '@supabase/supabase-js'
import { getSupabaseAnonScriptEnv } from '../env.mjs'

const { supabaseUrl, supabaseAnonKey } = getSupabaseAnonScriptEnv()

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
  const { data, error } = await supabase.from('daily_load_logs').select('current_pain_level').limit(1)
  console.log("Error querying current_pain_level:", error)
}

checkSchema()
