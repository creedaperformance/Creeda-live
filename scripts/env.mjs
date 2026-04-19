import * as dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

export function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required to run this script. Set it in .env.local or the shell environment.`)
  }

  return value
}

export function getSupabaseAnonScriptEnv() {
  return {
    supabaseUrl: requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  }
}

export function getDiagnosticLoginEnv() {
  return {
    email: requiredEnv('DIAG_TEST_EMAIL'),
    password: requiredEnv('DIAG_TEST_PASSWORD'),
  }
}

export function getDatabaseUrlWithLocalFallback() {
  return process.env.DATABASE_URL?.trim() || 'postgresql://postgres:postgres@localhost:54322/postgres'
}
