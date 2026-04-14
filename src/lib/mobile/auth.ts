import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getRoleHomeRoute, getRoleOnboardingRoute, isAppRole, type AppRole } from '@/lib/role_routes'

export interface MobileAuthenticatedUser {
  userId: string
  email: string | null
  profile: {
    id: string
    role: AppRole
    fullName: string
    username: string | null
    avatarUrl: string | null
    primarySport: string | null
    position: string | null
    onboardingCompleted: boolean
  }
}

type MobileAuthResult =
  | { ok: true; user: MobileAuthenticatedUser }
  | { ok: false; response: NextResponse }

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 })
}

export async function authenticateMobileApiRequest(
  request: NextRequest
): Promise<MobileAuthResult> {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, response: unauthorized('Missing Bearer token.') }
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return { ok: false, response: unauthorized('Invalid Bearer token.') }
  }

  const admin = createAdminClient()
  const { data: authData, error: authError } = await admin.auth.getUser(token)

  if (authError || !authData?.user) {
    return { ok: false, response: unauthorized('Unauthorized.') }
  }

  const { data: resolvedProfile, error: resolvedProfileError } = await admin
    .from('profiles')
    .select('id, role, full_name, username, avatar_url, primary_sport, position, onboarding_completed')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (resolvedProfileError || !resolvedProfile) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Profile not found for authenticated user.' },
        { status: 404 }
      ),
    }
  }

  if (!isAppRole(resolvedProfile.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unsupported CREEDA role for mobile access.' },
        { status: 409 }
      ),
    }
  }

  return {
    ok: true,
    user: {
      userId: authData.user.id,
      email: authData.user.email || null,
      profile: {
        id: authData.user.id,
        role: resolvedProfile.role,
        fullName: String(resolvedProfile.full_name || 'Creeda User'),
        username: resolvedProfile.username ? String(resolvedProfile.username) : null,
        avatarUrl: resolvedProfile.avatar_url ? String(resolvedProfile.avatar_url) : null,
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
