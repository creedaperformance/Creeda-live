import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isProductionRuntime } from '@/lib/env'
import { getCanonicalHost, getCanonicalProtocol } from '@/lib/seo/site'
import { buildContentSecurityPolicy } from '@/lib/security/csp'
import { updateSession } from '@/lib/supabase/middleware'

const MAX_API_REQUEST_BYTES = 10 * 1024 * 1024
const PREVIEW_HOST_SUFFIXES = ['.vercel.app', '.vercel.sh', '.netlify.app']

function shouldDisableCache(pathname: string) {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/athlete') ||
    pathname.startsWith('/coach') ||
    pathname.startsWith('/individual') ||
    pathname === '/dashboard' ||
    pathname === '/learn' ||
    pathname === '/offline' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/verify-email' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/verification-success'
  )
}

function maybeRedirectToCanonicalUrl(request: NextRequest) {
  if (!isProductionRuntime()) {
    return null
  }

  const canonicalHost = getCanonicalHost().toLowerCase()
  const canonicalProtocol = getCanonicalProtocol().replace(/:$/, '').toLowerCase()
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host
  const normalizedHost = forwardedHost.split(',')[0]?.trim().toLowerCase()

  if (
    !normalizedHost ||
    normalizedHost.startsWith('localhost') ||
    normalizedHost.startsWith('127.0.0.1') ||
    PREVIEW_HOST_SUFFIXES.some((suffix) => normalizedHost.endsWith(suffix))
  ) {
    return null
  }

  const alternateHost = canonicalHost.startsWith('www.')
    ? canonicalHost.slice(4)
    : `www.${canonicalHost}`
  const forwardedProto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase() ||
    request.nextUrl.protocol.replace(/:$/, '').toLowerCase()

  const shouldRedirectHost = normalizedHost === alternateHost && normalizedHost !== canonicalHost
  const shouldRedirectProto =
    normalizedHost === canonicalHost &&
    canonicalProtocol === 'https' &&
    forwardedProto === 'http'

  if (!shouldRedirectHost && !shouldRedirectProto) {
    return null
  }

  const redirectUrl = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    `${canonicalProtocol}://${canonicalHost}`
  )
  return NextResponse.redirect(redirectUrl, 308)
}

function generateNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

export async function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const nonce = generateNonce()
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce)
  const pathname = request.nextUrl.pathname

  if (pathname.includes('..')) {
    return NextResponse.json(
      { error: 'Invalid request path.', requestId },
      { status: 400 }
    )
  }

  const canonicalRedirect = maybeRedirectToCanonicalUrl(request)
  if (canonicalRedirect) {
    return canonicalRedirect
  }

  if (pathname.startsWith('/api/')) {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (Number.isFinite(contentLength) && contentLength > MAX_API_REQUEST_BYTES) {
      return NextResponse.json(
        { error: 'Payload too large.', requestId },
        { status: 413 }
      )
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy)

  const response = await updateSession(request, requestHeaders)
  response.headers.set('X-Request-Id', requestId)
  response.headers.set('Content-Security-Policy', contentSecurityPolicy)

  if (shouldDisableCache(pathname)) {
    response.headers.set('Cache-Control', 'private, no-store, no-cache, max-age=0, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
  }

  return response
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
