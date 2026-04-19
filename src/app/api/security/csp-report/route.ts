import { NextRequest, NextResponse } from 'next/server'

import { jsonError } from '@/lib/security/http'

function scrubUri(value: unknown) {
  if (typeof value !== 'string') return undefined
  if (value.startsWith('data:')) return 'data:'
  if (value.startsWith('blob:')) return 'blob:'

  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`
  } catch {
    return value.slice(0, 120)
  }
}

function sanitizeReport(payload: unknown) {
  const report =
    typeof payload === 'object' && payload !== null && 'csp-report' in payload
      ? (payload as Record<string, unknown>)['csp-report']
      : payload

  if (typeof report !== 'object' || report === null) return {}

  const source = report as Record<string, unknown>
  return {
    effectiveDirective: source['effective-directive'] || source.effectiveDirective,
    violatedDirective: source['violated-directive'] || source.violatedDirective,
    blockedUri: scrubUri(source['blocked-uri'] || source.blockedURL),
    documentUri: scrubUri(source['document-uri'] || source.documentURL),
    sourceFile: scrubUri(source['source-file'] || source.sourceFile),
    lineNumber: source['line-number'] || source.lineNumber,
    columnNumber: source['column-number'] || source.columnNumber,
    disposition: source.disposition,
  }
}

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
      report: sanitizeReport(payload),
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
