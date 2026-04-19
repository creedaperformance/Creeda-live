import Constants from 'expo-constants'

type ExpoExtra = {
  supabaseUrl?: string
  supabaseAnonKey?: string
  apiBaseUrl?: string
}

type LegacyConstants = typeof Constants & {
  manifest?: {
    debuggerHost?: string
  } | null
  manifest2?: {
    extra?: {
      expoGo?: {
        debuggerHost?: string
      }
    }
  } | null
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function normalizeOptionalUrl(value: string | undefined, fallback: string) {
  const candidate = String(value || '').trim()
  if (!candidate) return fallback

  try {
    return stripTrailingSlash(new URL(candidate).toString())
  } catch {
    return fallback
  }
}

function getExpoExtra() {
  return ((Constants.expoConfig?.extra || {}) as ExpoExtra)
}

function resolveDevApiBaseUrl() {
  const legacyConstants = Constants as LegacyConstants
  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ||
    legacyConstants.manifest2?.extra?.expoGo?.debuggerHost ||
    legacyConstants.manifest?.debuggerHost ||
    ''

  const host = hostUri.split(':')[0]
  return host ? `http://${host}:3000` : 'http://localhost:3000'
}

const extra = getExpoExtra()

export const mobileEnv = {
  supabaseUrl: extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  apiBaseUrl: normalizeOptionalUrl(
    extra.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL,
    resolveDevApiBaseUrl()
  ),
}

export const hasSupabaseConfig = Boolean(mobileEnv.supabaseUrl && mobileEnv.supabaseAnonKey)
