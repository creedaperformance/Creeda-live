export const DEFAULT_SITE_URL = 'https://www.creeda.in'
export const DEFAULT_GA_MEASUREMENT_ID = 'G-0GS3PDQELT'

type PublicSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
}

export function formatEnvIssues(result: { issues: Array<{ message: string }> }) {
  return result.issues.map((issue) => issue.message).join(' ')
}

export function readEnv(name: string) {
  const value = process.env[name]?.trim()
  return value || null
}

export function getRuntimeEnvironment() {
  return readEnv('NODE_ENV') || 'development'
}

export function isProductionRuntime() {
  return getRuntimeEnvironment() === 'production'
}

export function isCiRuntime() {
  return readEnv('CI') === 'true'
}

export function normalizeSiteUrl(value: string | null | undefined) {
  const candidate = String(value || '').trim() || DEFAULT_SITE_URL

  try {
    return new URL(candidate).origin.replace(/\/+$/, '')
  } catch {
    return DEFAULT_SITE_URL
  }
}

export function getSiteUrl() {
  return normalizeSiteUrl(readEnv('NEXT_PUBLIC_SITE_URL'))
}

export function getSiteOrigin() {
  return new URL(getSiteUrl()).origin
}

export function getTrustedSiteOrigins() {
  const origins = new Set<string>([
    getSiteOrigin(),
    new URL(DEFAULT_SITE_URL).origin,
    'https://creeda.in',
  ])

  return [...origins]
}

function parsePublicSupabaseEnv():
  | { success: true; data: PublicSupabaseEnv }
  | { success: false; issues: Array<{ message: string }> } {
  const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const issues: Array<{ message: string }> = []

  if (!supabaseUrl) {
    issues.push({ message: 'NEXT_PUBLIC_SUPABASE_URL is required.' })
  } else {
    try {
      new URL(supabaseUrl)
    } catch {
      issues.push({ message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL.' })
    }
  }

  if (!supabaseAnonKey) {
    issues.push({ message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required.' })
  }

  if (issues.length || !supabaseUrl || !supabaseAnonKey) {
    return { success: false, issues }
  }

  return {
    success: true,
    data: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    },
  }
}

export function getOptionalPublicSupabaseEnv() {
  const parsed = parsePublicSupabaseEnv()
  return parsed.success ? parsed.data : null
}

export function getPublicSupabaseEnv() {
  const parsed = parsePublicSupabaseEnv()
  if (parsed.success) return parsed.data

  throw new Error(`Invalid public Supabase environment configuration. ${formatEnvIssues(parsed)}`)
}

export function getPublicAnalyticsEnv() {
  return {
    googleSiteVerification: readEnv('NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION'),
    bingSiteVerification: readEnv('NEXT_PUBLIC_BING_SITE_VERIFICATION'),
    gaMeasurementId: readEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID') || DEFAULT_GA_MEASUREMENT_ID,
  }
}
