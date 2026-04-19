'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
import { requestPasswordReset } from './actions'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const result = await requestPasswordReset(new FormData(event.currentTarget))

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setMessage(result?.message || 'Check your email for a reset link.')
    setLoading(false)
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="mb-2 text-2xl font-black text-primary tracking-tight uppercase" style={{ fontFamily: 'var(--font-orbitron)' }}>Reset Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="athlete@creeda.in"
            required
            disabled={loading}
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

        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>

      <div className="mt-8 flex justify-center sm:justify-start">
        <Link href="/login" className="flex items-center text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  )
}
