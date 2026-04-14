import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  return NextResponse.json({
    success: true,
    user: serializeMobileUser(auth.user),
  })
}
