'use client'

import useSWR from 'swr'
import { ArrowUpRight } from 'lucide-react'
import clsx from 'clsx'
import { changeOf, formatSigned, type Ticker } from '@/lib/market'

type NewsItem = {
  id: string
  title: string
  summary: string
  url: string
  publishedAt: number
  source: string
}

async function fetchNews(url: string): Promise<NewsItem[]> {
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Could not load news.')
  return body.items
}

function timeAgo(ts: number) {
  const minutes = Math.round((Date.now() - ts) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type NewsFeedProps = {
  symbols: string[]
  tickers: Ticker[]
}

export function NewsFeed({ symbols, tickers }: NewsFeedProps) {
  const key = `/api/news?symbols=${[...symbols].sort().join(',')}`
  const { data, error, isLoading } = useSWR(key, fetchNews, { refreshInterval: 300_000, keepPreviousData: true })
  const bySymbol = new Map(tickers.map((t) => [t.symbol, t]))

  const mentionsOf = (item: NewsItem) => {
    const text = `${item.title} ${item.summary}`.toUpperCase()
    return symbols.filter((s) => {
      const name = bySymbol.get(s)?.name.split(' ')[0].toUpperCase()
      return new RegExp(`\\b${s}\\b`).test(text) || (name && name.length > 3 && text.includes(name))
    })
  }

  return (
    <section aria-labelledby="news-heading" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="news-heading" className="text-sm font-semibold tracking-wide uppercase">
          Current stock news
        </h2>
        <span className="text-xs text-muted-foreground">Yahoo Finance · your watchlist</span>
      </div>

      {error && !data && (
        <p role="alert" className="rounded-lg border border-loss/40 bg-card px-4 py-3 text-sm text-loss">
          {error.message}
        </p>
      )}

      {isLoading && !data ? (
        <ul className="flex flex-col gap-3" aria-busy="true" aria-label="Loading news">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="h-24 animate-pulse rounded-lg border bg-card" />
          ))}
        </ul>
      ) : data && data.length === 0 ? (
        <p className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No recent headlines for your watchlist.
        </p>
      ) : (
        <ul className="flex flex-col divide-y overflow-hidden rounded-lg border bg-card">
          {data?.map((item) => {
            const mentions = mentionsOf(item).slice(0, 3)
            return (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none md:px-5"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{item.source}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={new Date(item.publishedAt).toISOString()} className="shrink-0">
                      {timeAgo(item.publishedAt)}
                    </time>
                  </div>
                  <h3 className="flex items-start justify-between gap-3 text-pretty font-semibold leading-snug">
                    <span>{item.title}</span>
                    <ArrowUpRight
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                      aria-hidden="true"
                    />
                    <span className="sr-only">(opens in a new tab)</span>
                  </h3>
                  {item.summary && (
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
                  )}
                  {mentions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {mentions.map((s) => {
                        const t = bySymbol.get(s)
                        const percent = t ? changeOf(t).percent : null
                        return (
                          <span
                            key={s}
                            className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-0.5 font-mono text-xs tabular"
                          >
                            <span className="font-semibold">{s}</span>
                            {percent !== null && (
                              <span className={clsx(percent >= 0 ? 'text-gain' : 'text-loss')}>
                                {formatSigned(percent)}%
                              </span>
                            )}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
