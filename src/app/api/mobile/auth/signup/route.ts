import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getPublicSupabaseEnv } from '@/lib/env'
import { hasAdminSupabaseEnv } from '@/lib/env.server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate_limit'
import { resolveTrustedOriginFromRequest } from '@/lib/security/request'
import { enforceJsonRequest, jsonError, jsonResponse } from '@/lib/security/http'
import { performCreedaSignup, signupPayloadSchema } from '@/lib/signup'

export async function POST(request: NextRequest) {
  const jsonRequestViolation = enforceJsonRequest(request)
  if (jsonRequestViolation) return jsonRequestViolation

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return jsonError(request, 400, 'Invalid JSON payload.')
  }

  const parsed = signupPayloadSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return jsonError(request, 400, 'Invalid signup payload.', {
      details: parsed.error.flatten(),
    })
  }

  const limiter = await rateLimit(`signup:${parsed.data.email.toLowerCase()}`, 3, 3600, {
    failOpen: false,
  })
  if (!limiter.success) {
    return NextResponse.json({ error: limiter.error }, { status: 429 })
  }

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicSupabaseEnv()
  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const admin = hasAdminSupabaseEnv() ? createAdminClient() : undefined

  const result = await performCreedaSignup({
    supabase,
    adminSupabase: admin,
    payload: parsed.data,
    origin: resolveTrustedOriginFromRequest(request),
    auditMeta: {
      userAgent: request.headers.get('user-agent'),
      requestIp: request.headers.get('x-forwarded-for'),
    },
  })

  if (!result.success) {
    return jsonError(request, 400, result.error)
  }

  return jsonResponse(request, result)
}
