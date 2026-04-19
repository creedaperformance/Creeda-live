'use server'

import { revalidatePath } from 'next/cache'

import { submitAthleteDailyCheckInForUser, athleteDailyCheckInSchema } from '@/lib/athlete-checkin'
import { verifyRole } from '@/lib/auth_utils'
import { rateLimit } from '@/lib/rate_limit'
import { createClient } from '@/lib/supabase/server'

export async function submitAthleteDailyCheckIn(rawData: unknown) {
  try {
    const parsed = athleteDailyCheckInSchema.parse(rawData)
    const { user } = await verifyRole('athlete')
    const supabase = await createClient()

    const limiter = await rateLimit(`athlete_daily_checkin:${user.id}`, 6, 3600, {
      failOpen: false,
    })
    if (!limiter.success) return { error: limiter.error }

    const response = await submitAthleteDailyCheckInForUser({
      supabase,
      userId: user.id,
      parsed,
    })

    if ('error' in response) {
      return response
    }

    revalidatePath('/athlete')
    revalidatePath('/athlete/dashboard')
    revalidatePath('/athlete/checkin')

    return response
  } catch (error: unknown) {
    console.error('[athlete/checkin] submission failed', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to save your daily check-in.',
    }
  }
}

export async function submitHabitCheckIn(rawData: unknown) {
  return submitAthleteDailyCheckIn(rawData)
}
