import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getPublicSupabaseEnv } from '@/lib/env'

async function checkDatabase() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicSupabaseEnv()
  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)

    if (error) {
      const normalizedMessage = error.message.toLowerCase()
      const permissionError =
        normalizedMessage.includes('permission denied') ||
        normalizedMessage.includes('row-level security') ||
        normalizedMessage.includes('not authenticated')

      if (permissionError) {
        return {
          name: 'database',
          ok: true,
          message: 'Supabase connectivity verified.',
        }
      }

      throw error
    }

    return {
      name: 'database',
      ok: true,
      message: 'Database connectivity verified.',
    }
  } catch (error) {
    console.error('[api/ready][database] failed', error)
    return {
      name: 'database',
      ok: false,
      message: 'Database readiness failed.',
    }
  }
}

export async function GET() {
  const checks = []

  try {
    getPublicSupabaseEnv()
    checks.push({
      name: 'env',
      ok: true,
      message: 'Required runtime environment variables are configured.',
    })
  } catch (error) {
    console.error('[api/ready][env] failed', error)
    checks.push({
      name: 'env',
      ok: false,
      message: 'Required runtime configuration is missing or invalid.',
    })
  }

  checks.push(await checkDatabase())

  const ok = checks.every((check) => check.ok)

  return NextResponse.json(
    {
      ok,
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
      },
    }
  )
}
