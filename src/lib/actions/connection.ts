'use server'

import { generateSixDigitCode } from '@/lib/security/codes'
import { hasAdminSupabaseEnv } from '@/lib/env.server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { rateLimit } from '@/lib/rate_limit'

type LockerCoachProfile = {
  id: string
  role: string
  full_name: string
  primary_sport?: string
}

async function findCoachByLockerCode(supabase: Awaited<ReturnType<typeof createClient>>, code: string): Promise<LockerCoachProfile | null> {
  const { data: rawData } = await supabase
    .rpc('find_profile_by_locker_code', { code })
    .maybeSingle()

  const rpcCoach = rawData as LockerCoachProfile | null
  if (rpcCoach?.id) return rpcCoach

  const { data: scopedCoach } = await supabase
    .from('profiles')
    .select('id, role, full_name, primary_sport')
    .eq('locker_code', code)
    .eq('role', 'coach')
    .maybeSingle()

  if (scopedCoach?.id) return scopedCoach as LockerCoachProfile

  if (hasAdminSupabaseEnv()) {
    const admin = createAdminClient()
    const { data: adminCoach } = await admin
      .from('profiles')
      .select('id, role, full_name, primary_sport')
      .eq('locker_code', code)
      .eq('role', 'coach')
      .maybeSingle()

    if (adminCoach?.id) return adminCoach as LockerCoachProfile
  }

  return null
}

/**
 * Directive 5: Get or generate a persistent 6-digit Locker Code for the current user.
 */
export async function getOrCreateLockerCode() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Try to fetch existing code
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('locker_code')
    .eq('id', user.id)
    .single()

  if (fetchError) {
    console.error('Locker Code Fetch Error:', fetchError)
    return { error: 'Failed to access profile.' }
  }

  if (profile.locker_code) {
    return { token: profile.locker_code }
  }

  // 2. Generate and save a new unique code if none exists
  // We'll retry a few times in case of collision, though 10^6 is large enough
  let newCode = ''
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    newCode = generateSixDigitCode()
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ locker_code: newCode })
      .eq('id', user.id)

    if (!updateError) {
      return { token: newCode }
    }

    // If collision (duplicate key), try again
    if (updateError.code === '23505') {
      attempts++
      continue
    }

    console.error('Locker Code Update Error:', updateError)
    return { error: 'Failed to initialize locker code.' }
  }

  return { error: 'Failed to generate unique locker code.' }
}

/**
 * Directive 5: Use a Locker Code to connect two users.
 * Look up target user by their persistent locker_code.
 */
export async function useLockerCode(token: string) {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) return { error: 'Unauthorized' }

  const cleanToken = token.trim().toUpperCase()

  // Rate Limit: Max 10 connection attempts per hour per user
  const limiter = await rateLimit(`locker:${currentUser.id}`, 10, 3600, {
    failOpen: false,
  })
  if (!limiter.success) return { error: limiter.error }

  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .maybeSingle()

  if (!currentUserProfile) return { error: 'User profile not found.' }
  const currentUserRole = currentUserProfile.role

  // Athlete -> Coach: request approval flow
  if (currentUserRole === 'athlete') {
    const targetUser = await findCoachByLockerCode(supabase, cleanToken)
    if (!targetUser) {
      return { error: 'Invalid Locker Code.' }
    }

    if (targetUser.id === currentUser.id) {
      return { error: 'You cannot connect with your own code.' }
    }

    // Request-approval flow: athlete sends request, coach approves from dashboard.
    const { error: requestError } = await supabase
      .from('connection_requests')
      .upsert(
        {
          athlete_id: currentUser.id,
          coach_id: targetUser.id,
          status: 'pending',
          updated_at: new Date().toISOString()
        },
        { onConflict: 'athlete_id,coach_id' }
      )

    if (requestError) {
      // Compatibility fallback:
      // If connection_requests table/policies are not deployed yet,
      // directly join the coach's team using athlete-owned permissions.
      const isMissingRequestInfra =
        requestError.code === '42P01' ||
        /connection_requests/i.test(requestError.message || '')

      if (!isMissingRequestInfra) {
        console.error('Request Error:', requestError)
        return { error: 'Failed to send squad connection request.' }
      }

      if (!hasAdminSupabaseEnv()) {
        return { error: 'Connection request system is not initialized. Please apply latest Supabase migrations.' }
      }

      const admin = createAdminClient()

      const { data: coachTeam, error: teamError } = await admin
        .from('teams')
        .select('id')
        .eq('coach_id', targetUser.id)
        .maybeSingle()

      if (teamError || !coachTeam) {
        return { error: 'Coach team not found. Ask your coach to initialize their squad first.' }
      }

      const { error: memberError } = await admin
        .from('team_members')
        .upsert(
          {
            team_id: coachTeam.id,
            athlete_id: currentUser.id,
            status: 'Active'
          },
          { onConflict: 'team_id,athlete_id' }
        )

      if (memberError) return { error: memberError.message }

      const { error: profileUpdateError } = await admin
        .from('profiles')
        .update({ coach_id: targetUser.id })
        .eq('id', currentUser.id)

      if (profileUpdateError) return { error: profileUpdateError.message }

      revalidatePath('/athlete')
      revalidatePath('/coach')
      revalidatePath('/coach/dashboard')
      return { success: true, targetName: targetUser.full_name, isRequest: false }
    }

    revalidatePath('/athlete')
    revalidatePath('/coach')
    revalidatePath('/coach/dashboard')
    return { success: true, targetName: targetUser.full_name, isRequest: true }
  }

  // Coach -> Athlete: manual direct add flow using athlete locker code
  if (currentUserRole === 'coach') {
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('locker_code', cleanToken)
      .maybeSingle()

    if (targetError || !targetUser) {
      return { error: 'Invalid Locker Code.' }
    }

    if (targetUser.id === currentUser.id) {
      return { error: 'You cannot connect with your own code.' }
    }

    if (targetUser.role !== 'athlete') {
      return { error: 'This code does not belong to an athlete.' }
    }

    // Coach adding an athlete (manual path)
    const { data: team } = await supabase.from('teams').select('id').eq('coach_id', currentUser.id).single()
    if (!team) return { error: 'Coach has no team.' }

    const { data: joinResult, error: joinError } = await supabase.rpc('manage_squad_member', {
      p_athlete_id: targetUser.id,
      p_team_id: team.id,
      p_action: 'add'
    })

    if (joinError) return { error: joinError.message }
    if (joinResult?.error) return { error: joinResult.error }

    revalidatePath('/coach')
    revalidatePath('/athlete')
    return { success: true, targetName: targetUser.full_name }
  }

  return { error: 'Connection must be between a Coach and an Athlete.' }
}

/**
 * Phase 25: Fetch Coach and Team info by Locker Code for the landing page.
 */
export async function getInviteData(lockerCode: string) {
  const supabase = await createClient()

  const profile = await findCoachByLockerCode(supabase, lockerCode.trim().toUpperCase())
  if (!profile) {
    return { error: 'Invalid or expired invitation link.' }
  }

  // Fetch Team details
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('team_name, sport')
    .eq('coach_id', profile.id)
    .maybeSingle()

  if (teamError) {
    return { error: 'Team details not found.' }
  }

  const fallbackTeamName = `${profile.full_name.split(' ')[0] || 'Coach'} Squad`

  return {
    success: true,
    coachName: profile.full_name,
    teamName: team?.team_name || fallbackTeamName,
    sport: team?.sport || profile.primary_sport || 'General',
    fullAccess: true
  }
}
