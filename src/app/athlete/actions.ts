'use server'

import { createClient } from '@/lib/supabase/server'
import { hasAdminSupabaseEnv } from '@/lib/env.server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: { 
  full_name?: string; 
  username?: string; 
  mobile_number?: string; 
  avatar_url?: string;
  height?: number;
  weight?: number;
  fitstart_completed?: boolean;
}) {
  const supabase = await createClient()

  // 1. Get User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const updates: any = {}

  // 2. Validate & Prep Full Name
  if (data.full_name !== undefined) {
    if (data.full_name.length < 2) return { error: 'Name is too short.' }
    updates.full_name = data.full_name
  }

  // 3. Validate & Prep Username
  if (data.username !== undefined) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(data.username)) {
      return { error: 'Username must be 3-20 characters (letters, numbers, underscores).' }
    }

    // Check if Username is already taken (excluding self)
    const { isUsernameTaken } = await import('@/lib/auth_utils')
    const taken = await isUsernameTaken(data.username, user.id)

    if (taken) {
      return { error: 'This username is already taken.' }
    }
    updates.username = data.username.toLowerCase()
  }

  // 4. Validate & Prep Mobile
  if (data.mobile_number !== undefined) {
    if (data.mobile_number && !/^\+?[0-9]{10,15}$/.test(data.mobile_number.replace(/\s/g, ''))) {
      return { error: 'Invalid mobile number format.' }
    }
    updates.mobile_number = data.mobile_number
  }

  // 5. Avatar URL
  if (data.avatar_url !== undefined) {
    updates.avatar_url = data.avatar_url
  }

  // 6. Height & Weight
  if (data.height !== undefined) {
    if (data.height < 50 || data.height > 250) return { error: 'Invalid height (50-250cm).' }
    updates.height = data.height
  }
  if (data.weight !== undefined) {
    if (data.weight < 20 || data.weight > 300) return { error: 'Invalid weight (20-300kg).' }
    updates.weight = data.weight
  }
  if (data.fitstart_completed !== undefined) {
    updates.fitstart_completed = data.fitstart_completed
  }

  if (Object.keys(updates).length === 0) return { error: 'No changes provided.' }

  // 6. Update Profile
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    console.error('Update Profile Error:', error)
    return { error: 'Failed to update profile. Please try again.' }
  }

  revalidatePath('/athlete')
  revalidatePath('/coach')
  return { success: true }
}

export async function deleteAccount() {
  const supabase = await createClient()
  
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 2. Check for environment variable
  if (!hasAdminSupabaseEnv()) {
    console.error('Delete Account Error: SUPABASE_SERVICE_ROLE_KEY is missing.')
    return { error: 'Account deletion requires administrative permissions. Please contact support.' }
  }

  try {
    // 3. Use Admin Client to delete from auth.users
    // Import dynamically to avoid client-side leakage if this file is ever imported there
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()

    const { error } = await adminClient.auth.admin.deleteUser(user.id)
    
    if (error) {
      console.error('Delete User Error:', error)
      return { error: 'Failed to delete account from system. Please contact support.' }
    }

    // 3. Sign out (this will clear cookies)
    await supabase.auth.signOut()
    
    return { success: true }
  } catch (err) {
    console.error('Delete Account Catch:', err)
    return { error: 'A system error occurred. Please contact support.' }
  }
}


export async function updateStrategicGoal(goal: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Get the latest diagnostic record
  const { data: diagnostic, error: fetchError } = await supabase
    .from('diagnostics')
    .select('id')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (fetchError || !diagnostic) {
    return { error: 'No diagnostic record found to update.' }
  }

  // 2. Update the primary_goal
  const { error: updateError } = await supabase
    .from('diagnostics')
    .update({ primary_goal: goal })
    .eq('id', diagnostic.id)

  if (updateError) {
    console.error('Update Goal Error:', updateError)
    return { error: 'Failed to update strategic goal.' }
  }

  revalidatePath('/athlete')
  return { success: true }
}
