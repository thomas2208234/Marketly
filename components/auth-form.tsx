'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Logo } from './logo'

type AuthFormProps = {
  mode: 'sign-in' | 'sign-up'
  guestActive?: boolean
}

const inputClass =
  'w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25'

function describeAuthError(
  error: { code?: string; message?: string; status?: number; statusText?: string },
  isSignUp: boolean,
) {
  console.warn('[auth] request failed', { status: error.status, code: error.code, message: error.message })
  const code = error.code ?? ''
  if (code.includes('USER_ALREADY_EXISTS') || code.includes('EMAIL_ALREADY'))
    return 'An account with this email already exists. Log in instead.'
  if (code.includes('INVALID_EMAIL_OR_PASSWORD')) return 'Incorrect email or password.'
  if (code.includes('INVALID_EMAIL')) return 'Enter a valid email address.'
  if (code.includes('PASSWORD_TOO_SHORT')) return 'Password must be at least 8 characters.'
  if (code.includes('PASSWORD_TOO_LONG')) return 'Password is too long.'
  if (code.includes('ORIGIN') || error.status === 403)
    return 'This page’s address isn’t allowed to sign in. Open Marketly at marketly-theta-five.vercel.app and try again.'
  if (error.status === 429) return 'Too many attempts. Wait a minute and try again.'
  if (error.status === 401 && !error.message)
    return 'Your preview session expired. Reload the page, or open Marketly at marketly-theta-five.vercel.app.'
  if (error.status && error.status >= 500)
    return `Marketly’s server hit an error (code ${error.status}). Please try again in a moment.`
  const reason = error.message || (error.status ? `code ${error.status}${error.statusText ? ` ${error.statusText}` : ''}` : '')
  const detail = reason ? ` (${reason})` : ''
  return isSignUp
    ? `We couldn’t create your account${detail}. Please try again.`
    : `We couldn’t log you in${detail}. Please try again.`
}

export function AuthForm({ mode, guestActive = false }: AuthFormProps) {
  const router = useRouter()
  const isSignUp = mode === 'sign-up'
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [guestPending, setGuestPending] = useState(false)

  async function handleGuest() {
    setError(null)
    if (!guestActive) {
      setGuestPending(true)
      const { error } = await authClient.signIn.anonymous()
      if (error) {
        setGuestPending(false)
        setError('We couldn’t start a guest session. Please try again.')
        return
      }
    }
    router.push('/markets')
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const name = String(form.get('name') ?? '').trim()

    if (isSignUp && password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setPending(true)
    let result: Awaited<ReturnType<typeof authClient.signIn.email>>
    try {
      result = isSignUp
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password })
    } catch {
      setPending(false)
      setError('Couldn’t reach Marketly. Check your connection and try again.')
      return
    }

    if (result.error) {
      setPending(false)
      setError(describeAuthError(result.error, isSignUp))
      return
    }

    router.push('/markets')
    router.refresh()
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Link href="/" className="self-center" aria-label="Marketly home">
          <Logo />
        </Link>

        <div className="flex flex-col gap-6 rounded-lg border bg-card p-6 md:p-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isSignUp ? 'Sign up to keep track of the market with Marketly.' : 'Log in to your Marketly account.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate={false}>
            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Name
                </label>
                <input id="name" name="name" type="text" autoComplete="name" required className={inputClass} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                minLength={isSignUp ? 8 : undefined}
                aria-describedby={isSignUp ? 'password-hint' : undefined}
                className={inputClass}
              />
              {isSignUp && (
                <p id="password-hint" className="text-xs text-muted-foreground">
                  At least 8 characters.
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-loss/40 px-3 py-2 text-sm text-loss">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending || guestPending}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? (isSignUp ? 'Creating account…' : 'Logging in…') : isSignUp ? 'Sign up' : 'Log in'}
            </button>
          </form>

          {!isSignUp && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={handleGuest}
                disabled={pending || guestPending}
                className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
              >
                {guestPending ? 'Starting guest session…' : 'Continue as guest'}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <p>
            {isSignUp ? 'Already have an account? ' : 'New to Marketly? '}
            <Link href={isSignUp ? '/sign-in' : '/sign-up'} className="font-medium text-primary hover:underline">
              {isSignUp ? 'Log in' : 'Sign up'}
            </Link>
          </p>
          <Link href="/" className="hover:text-foreground hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
