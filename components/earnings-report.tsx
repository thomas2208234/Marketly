'use client'

import { useState } from 'react'
import useSWR from 'swr'
import clsx from 'clsx'
import { Search, X } from 'lucide-react'

type EarningsQuarter = {
  fiscalQuarter: string
  reportedAt: string
  actual: number
  estimate: number
  surprisePercent: number
}

type EarningsReport = {
  symbol: string
  name: string
  quarters: EarningsQuarter[]
}

async function fetchEarnings(url: string): Promise<EarningsReport[]> {
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Could not load earnings.')
  return body.reports
}

const formatEps = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`

function formatDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function outcomeOf(q: EarningsQuarter) {
  if (q.actual > q.estimate) return 'beat' as const
  if (q.actual < q.estimate) return 'miss' as const
  return 'met' as const
}

function OutcomeBadge({ quarter }: { quarter: EarningsQuarter }) {
  const outcome = outcomeOf(quarter)
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold',
        outcome === 'beat' && 'bg-gain/15 text-gain',
        outcome === 'miss' && 'bg-loss/15 text-loss',
        outcome === 'met' && 'bg-muted text-muted-foreground',
      )}
    >
      {outcome === 'beat' ? 'Beat' : outcome === 'miss' ? 'Missed' : 'Met'}
      <span className="font-mono tabular">
        {quarter.surprisePercent >= 0 ? '+' : ''}
        {quarter.surprisePercent.toFixed(1)}%
      </span>
    </span>
  )
}

function SearchResult({ symbol, onClear }: { symbol: string; onClear: () => void }) {
  const { data, error, isLoading } = useSWR(`/api/earnings?symbols=${encodeURIComponent(symbol)}`, fetchEarnings)
  const report = data?.[0]

  return (
    <section aria-labelledby="search-result-heading" className="flex flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 id="search-result-heading" className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-semibold">{symbol}</span>
            {report && <span className="text-sm text-muted-foreground">{report.name}</span>}
          </h3>
          <p className="text-xs text-muted-foreground">Last reported quarters vs. consensus EPS</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Clear search result</span>
        </button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading earnings for {symbol}…</p>}
      {error && <p className="text-sm text-loss">{error.message}</p>}
      {data && !report && (
        <p className="text-sm text-muted-foreground">No earnings history found for {symbol}. Check the ticker and try again.</p>
      )}

      {report && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {report.quarters.map((q) => (
            <li key={q.reportedAt} className="flex flex-col gap-3 rounded-md border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{q.fiscalQuarter}</span>
                <OutcomeBadge quarter={q} />
              </div>
              <dl className="flex gap-6 text-sm">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">Actual EPS</dt>
                  <dd className="font-mono tabular font-semibold">{formatEps(q.actual)}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">Expected</dt>
                  <dd className="font-mono tabular text-muted-foreground">{formatEps(q.estimate)}</dd>
                </div>
              </dl>
              <span className="text-xs text-muted-foreground">Reported {formatDate(q.reportedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function EarningsReport() {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState<string | null>(null)
  const { data, error, isLoading } = useSWR('/api/earnings', fetchEarnings, { revalidateOnFocus: false })

  const needle = query.trim().toUpperCase()
  const reports = (data ?? [])
    .filter((r) => !needle || r.symbol.includes(needle) || r.name.toUpperCase().includes(needle))
    .sort((a, b) => b.quarters[0].reportedAt.localeCompare(a.quarters[0].reportedAt))

  const beats = (data ?? []).filter((r) => outcomeOf(r.quarters[0]) === 'beat').length

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (needle) setSearched(needle)
  }

  return (
    <section aria-labelledby="earnings-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="earnings-heading" className="text-sm font-semibold tracking-wide uppercase">
          Earnings report
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          Latest reported earnings per share against Wall Street&apos;s consensus estimate.
          {data && data.length > 0 && ` ${beats} of ${data.length} beat expectations last quarter.`}
        </p>
      </div>

      <form role="search" onSubmit={onSubmit} className="flex gap-2">
        <label htmlFor="earnings-search" className="sr-only">
          Search a stock ticker
        </label>
        <div className="flex flex-1 items-center gap-2 rounded-md border bg-card px-3 focus-within:border-primary">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <input
            id="earnings-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any ticker, e.g. PLTR"
            autoComplete="off"
            spellCheck={false}
            className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          disabled={!needle}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          Look up
        </button>
      </form>

      {searched && <SearchResult key={searched} symbol={searched} onClear={() => setSearched(null)} />}

      {isLoading && <p className="text-sm text-muted-foreground">Loading earnings…</p>}
      {error && !data && (
        <p role="alert" className="rounded-lg border border-loss/40 bg-card px-4 py-3 text-sm text-loss">
          {error.message}
        </p>
      )}

      {data && (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">Most recent quarterly earnings versus estimates</caption>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Stock</th>
                <th scope="col" className="px-4 py-3 font-medium">Quarter</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Actual EPS</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Expected</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const q = r.quarters[0]
                return (
                  <tr key={r.symbol} className="border-b last:border-b-0 hover:bg-muted/50">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <button
                        type="button"
                        onClick={() => setSearched(r.symbol)}
                        className="flex flex-col items-start rounded focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <span className="font-mono font-semibold">{r.symbol}</span>
                        <span className="text-xs text-muted-foreground">{r.name}</span>
                      </button>
                    </th>
                    <td className="px-4 py-3">
                      <span className="flex flex-col">
                        <span>{q.fiscalQuarter}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(q.reportedAt)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular font-semibold">{formatEps(q.actual)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular text-muted-foreground">{formatEps(q.estimate)}</td>
                    <td className="px-4 py-3 text-right">
                      <OutcomeBadge quarter={q} />
                    </td>
                  </tr>
                )
              })}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No tracked stocks match &quot;{query}&quot;. Press Look up to search all tickers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Source: Nasdaq earnings surprise data. Click a stock for its last four quarters.</p>
    </section>
  )
}
