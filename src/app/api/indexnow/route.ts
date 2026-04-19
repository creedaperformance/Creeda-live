import { NextResponse } from 'next/server'
import { getSiteUrl } from '@/lib/env'
import { getIndexNowEnv } from '@/lib/env.server'
import { PUBLIC_URLS } from '@/lib/seo/public-urls'
import { enforceTrustedMutationOrigin, jsonError, jsonResponse } from '@/lib/security/http'

const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
]

function normalizeSiteUrl() {
  return getSiteUrl()
}

function getDefaultUrls(siteUrl: string) {
  return PUBLIC_URLS.map((entry) => `${siteUrl}${entry.path}`)
}

function filterAllowedUrls(candidateUrls: string[], siteUrl: string) {
  const base = new URL(siteUrl)
  return candidateUrls
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .filter((url) => {
      try {
        const parsed = new URL(url)
        return parsed.origin === base.origin
      } catch {
        return false
      }
    })
    .slice(0, 1000)
}

export async function POST(request: Request) {
  const originViolation = enforceTrustedMutationOrigin(request)
  if (originViolation) return originViolation

  const { apiToken, key: indexNowKey } = getIndexNowEnv()
  const siteUrl = normalizeSiteUrl()

  if (!indexNowKey) {
    return jsonError(request, 503, 'IndexNow is not configured.')
  }

  if (apiToken) {
    const requestToken = request.headers.get('x-indexnow-token') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
    if (requestToken !== apiToken) {
      return jsonError(request, 401, 'Unauthorized.')
    }
  }

  let requestedUrls: string[] | undefined
  try {
    const parsedBody = await request.json()
    if (Array.isArray(parsedBody?.urls)) {
      requestedUrls = parsedBody.urls.map((url: unknown) => String(url))
    }
  } catch {
    requestedUrls = undefined
  }

  const urls = filterAllowedUrls(requestedUrls || getDefaultUrls(siteUrl), siteUrl)
  if (!urls.length) {
    return jsonError(request, 400, 'No valid URLs to submit.')
  }

  const host = new URL(siteUrl).host
  const payload = {
    host,
    key: indexNowKey,
    keyLocation: `${siteUrl}/indexnow.txt`,
    urlList: urls,
  }

  const results = await Promise.all(
    INDEXNOW_ENDPOINTS.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify(payload),
        })
        return {
          endpoint,
          status: response.status,
          ok: response.ok,
        }
      } catch {
        return {
          endpoint,
          status: 0,
          ok: false,
        }
      }
    })
  )

  const success = results.some((item) => item.ok)
  return jsonResponse(request, {
    ok: success,
    submittedUrlCount: urls.length,
    endpoints: results,
  })
}
