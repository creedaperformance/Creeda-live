'use server'

import { headers } from 'next/headers'

import { rateLimit } from '@/lib/rate_limit'
import { resolveTrustedOriginFromHeaders } from '@/lib/security/request'
import { createClient } from '@/lib/supabase/server'

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()

  if (!email) {
    return { error: 'Please enter your email address.' }
  }

  const limiter = await rateLimit(`password-reset:${email}`, 3, 3600, {
    failOpen: false,
  })
  if (!limiter.success) return { error: limiter.error }

  const headersList = await headers()
  const origin = resolveTrustedOriginFromHeaders(headersList)
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return {
      error: 'We could not send a reset link right now. Please try again later.',
    }
  }

  return {
    success: true,
    message:
      'If an account exists for that email, a reset link will arrive shortly.',
  }
}
