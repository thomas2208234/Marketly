import Link from 'next/link'
import { Logo } from './logo'

const features = [
  { title: 'Buzz picks', body: 'See which tickers the market is talking about right now.' },
  { title: 'Stock news', body: 'Headlines for the companies you follow, in one feed.' },
  { title: 'Earnings Report', body: 'Upcoming and recent earnings at a glance.' },
  { title: 'Watchlist', body: 'Keep your favorite tickers on live quotes and charts.' },
]

export function Landing() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Logo />
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Log in
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-16 md:px-8 md:py-24">
          <div className="flex max-w-2xl flex-col gap-5">
            <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <span className="size-2 rounded-full bg-gain" aria-hidden="true" />
              Live market data
            </span>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              The market, on <span className="text-primary">one screen</span>.
            </h1>
            <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
              Marketly brings live quotes, charts, stock news, and earnings together with a watchlist that keeps up
              with you.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/sign-up"
              className="rounded-lg bg-primary px-6 py-3 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Sign Up
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg border bg-card px-6 py-3 text-center text-sm font-semibold text-foreground hover:bg-muted"
            >
              Login
            </Link>
            <Link
              href="/markets"
              className="px-2 py-3 text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Continue as Guest
            </Link>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="border-t bg-card">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-12 md:px-8">
            <h2 id="features-heading" className="text-sm font-semibold text-muted-foreground">
              What&apos;s inside
            </h2>
            <ul className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <li key={f.title} className="flex flex-col gap-2 bg-card p-5">
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}
