import { createClient } from '@supabase/supabase-js'
import { getAdminSupabaseEnv } from '@/lib/env.server'

export const createAdminClient = () => {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getAdminSupabaseEnv()

  return createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
