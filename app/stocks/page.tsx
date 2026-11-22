import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicHeader } from '@/components/public-header'
import { UNIVERSE } from '@/lib/market'

export const metadata: Metadata = {
  title: 'Stock Prices, News & Earnings for Popular Stocks | Marketly',
  description:
    'Live stock prices, charts, news and earnings for Apple, NVIDIA, Microsoft, Tesla, Amazon and other popular stocks.',
  alternates: { canonical: '/stocks' },
}

export default function StocksIndexPage() {
  const sectors = [...new Set(UNIVERSE.map((u) => u.sector))].sort()

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-10 md:px-8 md:py-14">
        <div className="flex max-w-2xl flex-col gap-3">
          <h1 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Popular stocks</h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            Pick a stock to see its live price, 3-month chart, latest news and earnings results.
          </p>
        </div>

        {sectors.map((sector) => (
          <section key={sector} aria-labelledby={`sector-${sector}`} className="flex flex-col gap-3">
            <h2 id={`sector-${sector}`} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {sector}
            </h2>
            <ul className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {UNIVERSE.filter((u) => u.sector === sector).map((u) => (
                <li key={u.symbol}>
                  <Link href={`/stocks/${u.symbol}`} className="flex h-full flex-col gap-1 bg-card p-4 hover:bg-muted">
                    <span className="font-mono font-medium">{u.symbol}</span>
                    <span className="text-sm text-muted-foreground">{u.name} stock</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  )
}
