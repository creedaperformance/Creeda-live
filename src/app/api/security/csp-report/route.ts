import { NextRequest, NextResponse } from 'next/server'

import { jsonError } from '@/lib/security/http'

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  const normalizedContentType = contentType.toLowerCase()
  const isSupportedReportType =
    normalizedContentType.includes('application/json') ||
    normalizedContentType.includes('application/csp-report') ||
    normalizedContentType.includes('application/reports+json')

  if (!isSupportedReportType) {
    return jsonError(
      request,
      415,
      'Unsupported content type. Expected a JSON-compatible CSP report.'
    )
  }

  try {
    const rawPayload = await request.text()
    const payload = rawPayload ? JSON.parse(rawPayload) : {}
    console.warn('[security/csp-report] violation', {
      requestId: request.headers.get('x-request-id') || undefined,
      report: payload,
    })

    return NextResponse.json(
      { ok: true },
      {
        status: 202,
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
        },
      }
    )
  } catch {
    return jsonError(request, 400, 'Invalid CSP report payload.')
  }
}
