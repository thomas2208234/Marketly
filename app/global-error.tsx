'use client'

import './globals.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="bg-background">
      <body className="flex min-h-dvh items-center justify-center bg-background px-6 font-sans text-foreground">
        <div className="flex w-full max-w-md flex-col gap-5 rounded-lg border border-border bg-card p-8 text-card-foreground">
          <h1 className="text-xl font-semibold">Marketly couldn&apos;t load</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Try reloading. If it keeps happening, share the reference below.
          </p>
          <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground break-all">
            {`Reference: ${error.digest ?? error.message ?? 'unknown'}`}
          </p>
          <button
            type="button"
            onClick={reset}
            className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
