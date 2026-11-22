import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import clsx from 'clsx'
import { PublicHeader } from '@/components/public-header'
import { StockPriceChart } from '@/components/stock-price-chart'
import { changeOf, formatPrice, formatSigned } from '@/lib/market'
import { findStock, getStockPageData, getStockQuote, relatedStocks } from '@/lib/stock-page'
import { SITE_URL } from '@/lib/site'

type Props = { params: Promise<{ symbol: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const meta = findStock((await params).symbol)
  if (!meta) return { title: 'Stock not found — Marketly' }

  const quote = await getStockQuote(meta.symbol)
  const priceText = quote ? ` trading at $${formatPrice(quote.price)}` : ''
  const title = `${meta.symbol} Stock Price, News & Earnings — ${meta.name} | Marketly`
  const description = `${meta.name} (${meta.symbol})${priceText}. See the live ${meta.symbol} stock price, 3-month chart, latest news, and earnings results vs. estimates.`
  const url = `/stocks/${meta.symbol}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', siteName: 'Marketly' },
    twitter: { card: 'summary', title, description },
  }
}

function formatDate(value: string | number) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function StockPage({ params }: Props) {
  const meta = findStock((await params).symbol)
  if (!meta) notFound()

  const { quote, news, earnings } = await getStockPageData(meta)
  const related = relatedStocks(meta)

  const day = quote ? changeOf(quote) : null
  const candles = quote?.candles ?? []
  const first = candles[0]?.close
  const rangeChange = quote && first ? ((quote.price - first) / first) * 100 : null
  const rangeHigh = candles.length ? Math.max(...candles.map((c) => c.close)) : null
  const rangeLow = candles.length ? Math.min(...candles.map((c) => c.close)) : null
  const up = (day?.change ?? 0) >= 0

  const stats = quote
    ? [
        ['Previous close', formatPrice(quote.previousClose)],
        ['Open', formatPrice(quote.open)],
        ['Day high', formatPrice(quote.high)],
        ['Day low', formatPrice(quote.low)],
        ['3-month high', rangeHigh ? formatPrice(rangeHigh) : '—'],
        ['3-month low', rangeLow ? formatPrice(rangeLow) : '—'],
      ]
    : []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Corporation',
        name: meta.name,
        tickerSymbol: meta.symbol,
        url: `${SITE_URL}/stocks/${meta.symbol}`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Stocks', item: `${SITE_URL}/stocks` },
          { '@type': 'ListItem', position: 2, name: meta.symbol, item: `${SITE_URL}/stocks/${meta.symbol}` },
        ],
      },
    ],
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <PublicHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/stocks" className="hover:text-foreground">
                Stocks
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-mono text-foreground">
              {meta.symbol}
            </li>
          </ol>
        </nav>

        <section aria-labelledby="stock-heading" className="flex flex-col gap-6 rounded-lg border bg-card p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">
                {meta.sector} · <span className="font-mono">{meta.symbol}</span>
              </p>
              <h1 id="stock-heading" className="text-balance text-2xl font-semibold md:text-3xl">
                {meta.name} ({meta.symbol}) stock price
              </h1>
            </div>
            {quote && day ? (
              <div className="flex flex-col items-end font-mono tabular">
                <span className="text-3xl font-medium">${formatPrice(quote.price)}</span>
                <span className={clsx('text-sm', up ? 'text-gain' : 'text-loss')}>
                  {formatSigned(day.change)} ({formatSigned(day.percent)}%) today
                </span>
                <span className="text-xs text-muted-foreground">As of {formatDate(quote.updatedAt)}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Live price is temporarily unavailable.</p>
            )}
          </div>

          {candles.length > 1 && (
            <>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide">3-month chart</h2>
                {rangeChange !== null && (
                  <span className={clsx('font-mono text-sm tabular', rangeChange >= 0 ? 'text-gain' : 'text-loss')}>
                    {formatSigned(rangeChange)}% over 3 months
                  </span>
                )}
              </div>
              <StockPriceChart
                points={candles}
                up={(rangeChange ?? 0) >= 0}
                label={`${meta.symbol} daily closing price over the last 3 months`}
              />
            </>
          )}

          {stats.length > 0 && (
            <dl className="grid grid-cols-2 gap-4 border-t pt-4 font-mono text-sm tabular md:grid-cols-6">
              {stats.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="font-sans text-xs text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <div className="grid gap-8 lg:grid-cols-5">
          <section aria-labelledby="news-heading" className="flex flex-col gap-4 lg:col-span-3">
            <h2 id="news-heading" className="text-sm font-semibold uppercase tracking-wide">
              Latest {meta.symbol} news
            </h2>
            {news.length ? (
              <ul className="flex flex-col divide-y rounded-lg border bg-card">
                {news.map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="group flex flex-col gap-1 p-4 hover:bg-muted"
                    >
                      <span className="flex items-start justify-between gap-3 font-medium leading-snug text-pretty">
                        {item.title}
                        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.source}
                        {item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ''}
                      </span>
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No recent headlines right now.</p>
            )}
          </section>

          <section aria-labelledby="earnings-heading" className="flex flex-col gap-4 lg:col-span-2">
            <h2 id="earnings-heading" className="text-sm font-semibold uppercase tracking-wide">
              {meta.symbol} earnings
            </h2>
            {earnings?.quarters.length ? (
              <div className="overflow-hidden rounded-lg border bg-card">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    {meta.name} reported earnings per share compared with analyst estimates
                  </caption>
                  <thead className="bg-muted text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">Quarter</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">EPS</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">Est.</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">Surprise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono tabular">
                    {earnings.quarters.slice(0, 4).map((q) => (
                      <tr key={q.fiscalQuarter}>
                        <th scope="row" className="px-4 py-3 text-left font-sans font-normal">
                          {q.fiscalQuarter}
                        </th>
                        <td className="px-4 py-3 text-right">{q.actual.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{q.estimate.toFixed(2)}</td>
                        <td className={clsx('px-4 py-3 text-right', q.surprisePercent >= 0 ? 'text-gain' : 'text-loss')}>
                          {formatSigned(q.surprisePercent, 1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Earnings data is unavailable right now.</p>
            )}

            <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
              <h3 className="font-semibold text-balance">Will {meta.symbol} go up or down?</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Get Marketly&apos;s AI forecast for {meta.name}, with bull and bear cases and an expected timeframe.
              </p>
              <Link
                href="/sign-up"
                className="self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Get the free {meta.symbol} forecast
              </Link>
            </div>
          </section>
        </div>

        <section aria-labelledby="related-heading" className="flex flex-col gap-4">
          <h2 id="related-heading" className="text-sm font-semibold uppercase tracking-wide">
            Related stocks
          </h2>
          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-6">
            {related.map((r) => (
              <li key={r.symbol}>
                <Link href={`/stocks/${r.symbol}`} className="flex h-full flex-col gap-1 bg-card p-4 hover:bg-muted">
                  <span className="font-mono font-medium">{r.symbol}</span>
                  <span className="text-xs text-muted-foreground">{r.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Prices may be delayed. Data from Yahoo Finance and Nasdaq. For information only, not investment advice.
        </p>
      </main>
    </div>
  )
}
