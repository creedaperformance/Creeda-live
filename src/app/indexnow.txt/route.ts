import { NextResponse } from 'next/server'
import { getIndexNowEnv } from '@/lib/env.server'

export function GET() {
  const { key } = getIndexNowEnv()
  if (!key) {
    return new NextResponse('Not Found', { status: 404 })
  }

  return new NextResponse(`${key}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
