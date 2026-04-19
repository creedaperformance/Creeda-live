import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required to run this script. Set it in .env.local or the shell environment.`)
  }

  return value
}

export function getScriptSupabaseAdminEnv() {
  return {
    supabaseUrl: requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseServiceKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  }
}
