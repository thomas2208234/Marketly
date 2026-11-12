'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

type AccountMenuProps = {
  user: { name: string; email: string } | null
}

export function AccountMenu({ user }: AccountMenuProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    setPending(true)
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
          Guest
        </span>
        <Link href="/sign-in" className="font-medium text-muted-foreground hover:text-foreground">
          Log in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign up
        </Link>
      </div>
    )
  }

  const initial = (user.name || user.email).charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-foreground"
        >
          {initial}
        </span>
        <span className="hidden max-w-40 truncate font-medium text-foreground sm:inline">{user.name || user.email}</span>
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className="rounded-lg border px-3 py-1.5 font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  )
}
