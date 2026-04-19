'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from './actions'

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const result = await updatePassword(new FormData(event.currentTarget))

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setMessage(result?.message || 'Your password has been updated.')
    setLoading(false)
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-8 text-center sm:text-left">
        <h1
          className="mb-2 text-2xl font-black uppercase tracking-tight text-primary"
          style={{ fontFamily: 'var(--font-orbitron)' }}
        >
          Create New Password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password to secure your CREEDA account.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              disabled={loading || Boolean(message)}
              className="pr-10 transition-colors focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm password</Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type={showPassword ? 'text' : 'password'}
            required
            disabled={loading || Boolean(message)}
            className="transition-colors focus:border-primary"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-500 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-300">
            {message}
          </div>
        )}

        <Button
          type="submit"
          className="h-11 w-full text-base font-semibold"
          disabled={loading || Boolean(message)}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </Button>
      </form>

      <div className="mt-8 flex justify-center sm:justify-start">
        <Link href="/dashboard" className="text-sm font-semibold text-primary hover:underline">
          Continue to dashboard
        </Link>
      </div>
    </div>
  )
}
