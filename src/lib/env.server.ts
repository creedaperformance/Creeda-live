import * as z from 'zod'

import {
  formatEnvIssues,
  getOptionalPublicSupabaseEnv,
  getPublicSupabaseEnv,
  readEnv,
} from '@/lib/env'

const adminSupabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .trim()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL.'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .trim()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required for admin Supabase operations.'),
})

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL is required.'),
})

export function getOptionalSupabaseServiceRoleKey() {
  return readEnv('SUPABASE_SERVICE_ROLE_KEY')
}

export function hasAdminSupabaseEnv() {
  return Boolean(getOptionalSupabaseServiceRoleKey() && getOptionalPublicSupabaseEnv())
}

export function getAdminSupabaseEnv() {
  const publicEnv = getPublicSupabaseEnv()
  const parsed = adminSupabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  if (!parsed.success) {
    throw new Error(`Invalid admin Supabase environment configuration. ${formatEnvIssues(parsed.error)}`)
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  }
}

export function hasDatabaseUrl() {
  return Boolean(readEnv('DATABASE_URL'))
}

export function getDatabaseUrl() {
  const parsed = databaseEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
  })

  if (!parsed.success) {
    throw new Error(`Invalid database configuration. ${formatEnvIssues(parsed.error)}`)
  }

  return parsed.data.DATABASE_URL
}

export function getIndexNowEnv() {
  return {
    key: readEnv('INDEXNOW_KEY'),
    apiToken: readEnv('INDEXNOW_API_TOKEN'),
  }
}
