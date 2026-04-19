import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { getPublicSupabaseEnv } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRoleHomeRoute, getRoleOnboardingRoute, isAppRole, type AppRole } from '@/lib/role_routes'
import { jsonError } from '@/lib/security/http'

export interface MobileAuthenticatedUser {
  userId: string
  email: string | null
  profile: {
    id: string
    role: AppRole
    fullName: string
    username: string | null
    avatarUrl: string | null
    mobileNumber: string | null
    primarySport: string | null
    position: string | null
    onboardingCompleted: boolean
  }
}

type MobileAuthResult =
  | { ok: true; user: MobileAuthenticatedUser; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }

function unauthorized(request: NextRequest) {
  return jsonError(request, 401, 'Unauthorized.')
}

function createMobileUserClient(accessToken: string) {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicSupabaseEnv()

  return createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export async function authenticateMobileApiRequest(
  request: NextRequest
): Promise<MobileAuthResult> {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, response: unauthorized(request) }
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return { ok: false, response: unauthorized(request) }
  }

  const admin = createAdminClient()
  const supabase = createMobileUserClient(token)
  const { data: authData, error: authError } = await admin.auth.getUser(token)

  if (authError || !authData?.user) {
    return { ok: false, response: unauthorized(request) }
  }

  const { data: resolvedProfile, error: resolvedProfileError } = await supabase
    .from('profiles')
    .select(
      'id, role, full_name, username, avatar_url, mobile_number, primary_sport, position, onboarding_completed'
    )
    .eq('id', authData.user.id)
    .maybeSingle()

  if (resolvedProfileError || !resolvedProfile) {
    return {
      ok: false,
      response: jsonError(request, 403, 'Mobile access is not available for this account.'),
    }
  }

  if (!isAppRole(resolvedProfile.role)) {
    return {
      ok: false,
      response: jsonError(request, 403, 'Mobile access is not available for this account.'),
    }
  }

  return {
    ok: true,
    supabase,
    user: {
      userId: authData.user.id,
      email: authData.user.email || null,
      profile: {
        id: authData.user.id,
        role: resolvedProfile.role,
        fullName: String(resolvedProfile.full_name || 'Creeda User'),
        username: resolvedProfile.username ? String(resolvedProfile.username) : null,
        avatarUrl: resolvedProfile.avatar_url ? String(resolvedProfile.avatar_url) : null,
        mobileNumber: resolvedProfile.mobile_number ? String(resolvedProfile.mobile_number) : null,
        primarySport: resolvedProfile.primary_sport ? String(resolvedProfile.primary_sport) : null,
        position: resolvedProfile.position ? String(resolvedProfile.position) : null,
        onboardingCompleted: resolvedProfile.onboarding_completed !== false,
      },
    },
  }
}

export function serializeMobileUser(user: MobileAuthenticatedUser) {
  return {
    id: user.userId,
    email: user.email,
    profile: user.profile,
    homeRoute: getRoleHomeRoute(user.profile.role),
    onboardingRoute: getRoleOnboardingRoute(user.profile.role),
  }
}
