import { getSiteUrl, getTrustedSiteOrigins } from '@/lib/env'

function firstHeaderValue(value: string | null | undefined) {
  return String(value || '')
    .split(',')[0]
    ?.trim()
}

function normalizeOrigin(value: string | null | undefined) {
  const candidate = firstHeaderValue(value)
  if (!candidate) return null

  try {
    return new URL(candidate).origin
  } catch {
    return null
  }
}

function normalizeHost(host: string | null | undefined) {
  const candidate = firstHeaderValue(host)
  if (!candidate) return null

  try {
    return new URL(`https://${candidate}`).host.toLowerCase()
  } catch {
    return null
  }
}

function normalizeProto(proto: string | null | undefined) {
  return firstHeaderValue(proto) === 'http' ? 'http' : 'https'
}

function buildOriginFromParts(host: string | null | undefined, proto: string | null | undefined) {
  const normalizedHost = normalizeHost(host)
  if (!normalizedHost) return null

  return `${normalizeProto(proto)}://${normalizedHost}`
}

function configuredSiteOrigin() {
  return normalizeOrigin(getSiteUrl()) || getSiteUrl()
}

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
}

function isTrustedOrigin(origin: string) {
  try {
    const candidate = new URL(origin)

    if (getTrustedSiteOrigins().includes(candidate.origin)) {
      return true
    }

    return isLoopbackHost(candidate.hostname)
  } catch {
    return false
  }
}

function candidateOriginsFromHeaders(headers: Headers) {
  return [
    normalizeOrigin(headers.get('origin')),
    buildOriginFromParts(headers.get('x-forwarded-host'), headers.get('x-forwarded-proto')),
    buildOriginFromParts(headers.get('host'), headers.get('x-forwarded-proto')),
    buildOriginFromParts(headers.get('host'), headers.get('x-forwarded-protocol')),
    buildOriginFromParts(headers.get('host'), headers.get('x-forwarded-scheme')),
  ].filter((value): value is string => Boolean(value))
}

export function resolveTrustedOriginFromHeaders(headers: Headers) {
  const trustedCandidate = candidateOriginsFromHeaders(headers).find(isTrustedOrigin)
  return trustedCandidate || configuredSiteOrigin()
}

export function resolveTrustedOriginFromRequest(request: {
  headers: Headers
  nextUrl: URL
}) {
  const requestOrigin = normalizeOrigin(request.nextUrl.origin)
  if (requestOrigin && isTrustedOrigin(requestOrigin)) {
    return requestOrigin
  }

  return resolveTrustedOriginFromHeaders(request.headers)
}

export function sanitizeInternalRedirectPath(
  value: string | null | undefined,
  fallback = '/'
) {
  const candidate = firstHeaderValue(value)
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback
  }

  try {
    const parsed = new URL(candidate, 'https://creeda.local')
    if (parsed.origin !== 'https://creeda.local') {
      return fallback
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
