'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[marketly] page error', error)
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-lg border border-border bg-card p-8 text-card-foreground">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-balance">Marketly hit a snag</h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Something went wrong loading this page. Try again, and if it keeps happening, share the
            reference below so it can be tracked down.
          </p>
        </div>
        <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground break-all">
          {`Reference: ${error.digest ?? error.message ?? 'unknown'}`}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
