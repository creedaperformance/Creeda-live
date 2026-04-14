import 'react-native-url-polyfill/auto'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

import { hasSupabaseConfig, mobileEnv } from './env'

export const supabase = createClient(
  mobileEnv.supabaseUrl || 'https://placeholder.invalid',
  mobileEnv.supabaseAnonKey || 'missing-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)

export const supabaseConfigError = hasSupabaseConfig
  ? null
  : 'Supabase is not configured for the Expo app. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY or rely on the shared repo env.'

