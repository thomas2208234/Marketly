'use client'

import { useState } from 'react'
import useSWR from 'swr'
import clsx from 'clsx'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Hourglass, Search } from 'lucide-react'

type Forecast = {
  found: boolean
  symbol: string
  name: string
  direction: 'up' | 'down' | 'sideways'
  confidence: 'low' | 'medium' | 'high'
  timeframe: string
  timeframeReason: string
  opinion: string
  bullCase: string[]
  bearCase: string[]
  sources: { title: string; url: string }[]
}

async function fetchForecast(url: string): Promise<Forecast> {
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Could not analyze that stock.')
  return body
}

const DIRECTION = {
  up: { label: 'Likely to go up', Icon: ArrowUpRight, tone: 'text-gain', box: 'border-gain/40 bg-gain/10' },
  down: { label: 'Likely to go down', Icon: ArrowDownRight, tone: 'text-loss', box: 'border-loss/40 bg-loss/10' },
  sideways: { label: 'Likely to trade sideways', Icon: ArrowRight, tone: 'text-foreground', box: 'border-border bg-muted' },
} as const

function ForecastCard({ forecast }: { forecast: Forecast }) {
  const d = DIRECTION[forecast.direction]
  return (
    <article className="flex flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="flex flex-col">
        <h3 className="font-mono text-lg font-semibold">{forecast.symbol}</h3>
        <p className="text-sm text-muted-foreground">{forecast.name}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={clsx('flex items-start gap-3 rounded-md border px-3 py-2.5', d.box)}>
          <d.Icon className={clsx('mt-0.5 size-5 shrink-0', d.tone)} aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className={clsx('text-sm font-semibold', d.tone)}>{d.label}</span>
            <span className="text-xs text-muted-foreground">{forecast.confidence} confidence</span>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border px-3 py-2.5">
          <Hourglass className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">Expected within {forecast.timeframe}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">{forecast.timeframeReason}</span>
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-pretty">{forecast.opinion}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: 'Why it could rise', items: forecast.bullCase, tone: 'text-gain' },
          { title: 'Why it could fall', items: forecast.bearCase, tone: 'text-loss' },
        ].map((col) => (
          <div key={col.title} className="flex flex-col gap-2">
            <h4 className={clsx('text-xs font-semibold uppercase tracking-wide', col.tone)}>{col.title}</h4>
            <ul className="flex list-disc flex-col gap-1 pl-4 text-sm leading-relaxed text-muted-foreground">
              {col.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {forecast.sources.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t pt-3">
          {forecast.sources.map((s, i) => (
            <li key={`${s.url}-${i}`}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <span className="truncate">{s.title}</span>
                <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export function StockLookup() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const { data, error, isLoading } = useSWR(
    query ? `/api/forecast?q=${encodeURIComponent(query)}` : null,
    fetchForecast,
    { revalidateOnFocus: false, dedupingInterval: 600_000, shouldRetryOnError: false },
  )

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next = input.trim()
    if (next) setQuery(next)
  }

  return (
    <section aria-labelledby="lookup-heading" className="flex flex-col gap-4">
      <h2 id="lookup-heading" className="sr-only">
        Look up any stock
      </h2>
      <form onSubmit={onSubmit} role="search" className="flex gap-2">
        <label htmlFor="stock-search" className="sr-only">
          Search any stock by ticker or company name
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="stock-search"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={40}
            autoComplete="off"
            placeholder="Search any stock, e.g. AAPL or Nvidia"
            className="h-11 w-full rounded-md border bg-card pr-3 pl-9 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          {isLoading ? 'Analyzing…' : 'Analyze'}
        </button>
      </form>

      <div aria-live="polite" className="flex flex-col gap-4">
        {isLoading && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{`Researching ${query}. This can take up to 30 seconds.`}</p>
            <div className="h-64 animate-pulse rounded-lg border bg-card" />
          </div>
        )}
        {error && !isLoading && (
          <p role="alert" className="rounded-lg border border-loss/40 bg-card px-4 py-3 text-sm text-loss">
            {error.message}
          </p>
        )}
        {data && !isLoading && !data.found && (
          <p className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
            {`We couldn't find a publicly traded stock matching "${query}". Try a ticker symbol like TSLA.`}
          </p>
        )}
        {data && !isLoading && data.found && <ForecastCard forecast={data} />}
      </div>
    </section>
  )
}
