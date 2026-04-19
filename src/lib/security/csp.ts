import { getOptionalPublicSupabaseEnv, isProductionRuntime } from '@/lib/env'

const isDev = !isProductionRuntime()
const googleTagManagerOrigin = 'https://www.googletagmanager.com'
const googleAnalyticsOrigins = [
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
]
const mediaPipeWasmSource =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm/'

function getSupabaseOrigins() {
  const supabaseUrl = getOptionalPublicSupabaseEnv()?.NEXT_PUBLIC_SUPABASE_URL

  try {
    if (!supabaseUrl) return []

    const origin = new URL(supabaseUrl).origin
    const websocketOrigin = origin.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
    return [origin, websocketOrigin]
  } catch {
    return []
  }
}

export function buildContentSecurityPolicy(nonce: string) {
  const nonceSource = `'nonce-${nonce}'`
  const scriptRelaxations = isDev ? " 'unsafe-inline' 'unsafe-eval'" : ''
  const styleRelaxations = isDev ? " 'unsafe-inline'" : ''
  const connectSrc = [
    "'self'",
    mediaPipeWasmSource,
    googleTagManagerOrigin,
    ...googleAnalyticsOrigins,
    ...getSupabaseOrigins(),
  ].join(' ')

  return [
    "default-src 'self'",
    `script-src 'self' ${nonceSource}${scriptRelaxations} ${googleTagManagerOrigin}`,
    `style-src 'self' ${nonceSource}${styleRelaxations} https://fonts.googleapis.com`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connectSrc}`,
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
    'report-uri /api/security/csp-report',
  ].join('; ')
}
