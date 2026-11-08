'use client'

import useSWR from 'swr'
import clsx from 'clsx'
import { ArrowUpRight, Clock, Globe, Play, TrendingUp, Music2 } from 'lucide-react'
import { changeOf, formatSigned, type Ticker } from '@/lib/market'

type Platform = 'web' | 'youtube' | 'tiktok'

type Pick = {
  symbol: string
  name: string
  thesis: string
  signal: 'buy-soon' | 'wait'
  timing: string
  confidence: 'low' | 'medium' | 'high'
  buzz: Record<Platform, number>
  sources: { title: string; url: string; platform: Platform }[]
}

type PicksReport = { generatedAt: string; marketMood: string; picks: Pick[] }

async function fetchPicks(url: string): Promise<PicksReport> {
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Could not load picks.')
  return body
}

const PLATFORMS: { id: Platform; label: string; Icon: typeof Globe }[] = [
  { id: 'web', label: 'Web', Icon: Globe },
  { id: 'youtube', label: 'YouTube', Icon: Play },
  { id: 'tiktok', label: 'TikTok', Icon: Music2 },
]

function BuzzMeter({ label, value, Icon }: { label: string; value: number; Icon: typeof Globe }) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Icon className="size-3" aria-hidden="true" />
          {label}
        </span>
        <span className="font-mono tabular">{value}/10</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={`${label} buzz`}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  )
}

function PickCard({ pick, ticker }: { pick: Pick; ticker?: Ticker }) {
  const buySoon = pick.signal === 'buy-soon'
  const change = ticker ? changeOf(ticker) : null
  return (
    <article className="flex flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h3 className="font-mono text-lg font-semibold">{pick.symbol}</h3>
          <p className="truncate text-sm text-muted-foreground">{pick.name}</p>
        </div>
        {ticker && change && (
          <div className="flex flex-col items-end font-mono tabular">
            <span className="text-sm font-medium">${ticker.price.toFixed(2)}</span>
            <span className={clsx('text-xs', change.percent >= 0 ? 'text-gain' : 'text-loss')}>
              {formatSigned(change.percent)}%
            </span>
          </div>
        )}
      </div>

      <p className="text-sm leading-relaxed text-pretty">{pick.thesis}</p>

      <div className="flex gap-4">
        {PLATFORMS.map((p) => (
          <BuzzMeter key={p.id} label={p.label} value={pick.buzz[p.id]} Icon={p.Icon} />
        ))}
      </div>

      {pick.sources.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {pick.sources.map((s, i) => (
            <li key={`${s.url}-${i}`}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-medium uppercase">{s.platform}</span>
                <span className="truncate">{s.title}</span>
                <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <div
        className={clsx(
          'flex items-start gap-3 rounded-md border px-3 py-2.5',
          buySoon ? 'border-gain/40 bg-gain/10' : 'border-loss/30 bg-loss/5',
        )}
      >
        {buySoon ? (
          <TrendingUp className="mt-0.5 size-4 shrink-0 text-gain" aria-hidden="true" />
        ) : (
          <Clock className="mt-0.5 size-4 shrink-0 text-loss" aria-hidden="true" />
        )}
        <div className="flex flex-col gap-0.5">
          <span className={clsx('text-sm font-semibold', buySoon ? 'text-gain' : 'text-loss')}>
            {buySoon ? 'Buy soon' : 'Wait to buy'}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{pick.confidence} confidence</span>
          </span>
          <span className="text-xs leading-relaxed text-muted-foreground">{pick.timing}</span>
        </div>
      </div>
    </article>
  )
}

export function BuzzPicks({ tickers }: { tickers: Ticker[] }) {
  const { data, error, isLoading } = useSWR('/api/picks', fetchPicks, {
    revalidateOnFocus: false,
    dedupingInterval: 600_000,
  })
  const bySymbol = new Map(tickers.map((t) => [t.symbol, t]))

  return (
    <section aria-labelledby="buzz-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="buzz-heading" className="text-xl font-semibold tracking-tight text-balance">
          Stocks with bullish buzz
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {data?.marketMood ?? 'Scanning financial news, YouTube, and TikTok for stocks people expect to go up.'}
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4" aria-live="polite">
          <p className="text-sm text-muted-foreground">Searching the web, YouTube, and TikTok. This can take up to a minute.</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-lg border bg-card" />
          ))}
        </div>
      )}

      {error && !data && (
        <p role="alert" className="rounded-lg border border-loss/40 bg-card px-4 py-3 text-sm text-loss">
          {error.message}
        </p>
      )}

      {data && (
        <div className="flex flex-col gap-4">
          {data.picks.map((pick, i) => (
            <PickCard key={`${pick.symbol}-${i}`} pick={pick} ticker={bySymbol.get(pick.symbol)} />
          ))}
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        AI-generated from public posts and articles. Social buzz is not financial advice and can reverse quickly.
      </p>
    </section>
  )
}
