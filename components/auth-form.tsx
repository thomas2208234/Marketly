'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Logo } from './logo'

type AuthFormProps = {
  mode: 'sign-in' | 'sign-up'
}

const inputClass =
  'w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25'

type AuthError = { code?: string; status?: number }

function signUpErrorMessage({ code, status }: AuthError): string {
  if (code?.startsWith('USER_ALREADY_EXISTS')) {
    return 'An account with this email already exists. Try logging in instead.'
  }
  if (code === 'INVALID_EMAIL') return 'Enter a valid email address.'
  if (code === 'PASSWORD_TOO_SHORT') return 'Password must be at least 8 characters.'
  if (code === 'PASSWORD_TOO_LONG') return 'Password must be 128 characters or fewer.'
  if (status === 429) return 'Too many attempts. Wait a minute and try again.'
  return 'We couldn’t create your account. Check your connection and try again.'
}

function signInErrorMessage({ status }: AuthError): string {
  if (status === 429) return 'Too many attempts. Wait a minute and try again.'
  if (status === 401 || status === 400) return 'Incorrect email or password.'
  return 'We couldn’t log you in. Check your connection and try again.'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const isSignUp = mode === 'sign-up'
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

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
    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    if (error) {
      setPending(false)
      console.error('Auth request failed', error)
      setError(isSignUp ? signUpErrorMessage(error) : signInErrorMessage(error))
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
              disabled={pending}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? (isSignUp ? 'Creating account…' : 'Logging in…') : isSignUp ? 'Sign up' : 'Log in'}
            </button>
          </form>
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
