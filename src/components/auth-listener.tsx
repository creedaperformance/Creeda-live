'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getRoleOnboardingRoute, isAppRole } from '@/lib/role_routes'

export function AuthListener() {
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

    // Public auth pages should still prerender in CI even when Supabase env vars
    // are not present for build-only jobs.
    if (!supabaseUrl || !supabaseAnonKey) {
      return
    }

    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Verify if they have a completed profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, role')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!mounted) return

        if (profile && profile.onboarding_completed === false) {
           const isAlreadyOnOnboarding =
             window.location.pathname.startsWith('/onboarding') ||
             window.location.pathname.startsWith('/fitstart') ||
             window.location.pathname.includes('/onboarding')
           
          if (!isAlreadyOnOnboarding && isAppRole(profile.role)) {
            router.push(getRoleOnboardingRoute(profile.role))
          }
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  return null
}
