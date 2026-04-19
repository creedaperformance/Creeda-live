'use server'

import { createClient } from '@/lib/supabase/server'
import { strongPasswordSchema } from '@/lib/signup'

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirm_password') || '')

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const parsedPassword = strongPasswordSchema.safeParse(password)
  if (!parsedPassword.success) {
    return { error: parsedPassword.error.issues[0]?.message || 'Please choose a stronger password.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: 'Your reset link expired or could not be verified. Please request a fresh reset link.',
    }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return { error: 'We could not update your password right now. Please try again.' }
  }

  return {
    success: true,
    message: 'Your password has been updated. You can continue to your dashboard.',
  }
}
