import { NextResponse } from 'next/server'
import { getRuntimeEnvironment } from '@/lib/env'

const startedAt = Date.now()

export async function GET() {
  const now = Date.now()
  const uptimeSeconds = Math.max(0, Math.floor((now - startedAt) / 1000))

  const body = [
    '# HELP creeda_app_uptime_seconds Process uptime in seconds.',
    '# TYPE creeda_app_uptime_seconds gauge',
    `creeda_app_uptime_seconds ${uptimeSeconds}`,
    '# HELP creeda_app_build_info Static build information.',
    '# TYPE creeda_app_build_info gauge',
    `creeda_app_build_info{service="creeda-app",environment="${getRuntimeEnvironment()}"} 1`,
  ].join('\n')

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    },
  })
}
