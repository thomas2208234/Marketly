'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { Ticker } from '@/lib/market'
import { useLiveTickers } from './use-live-tickers'
import { Watchlist } from './watchlist'
import { SymbolDetail } from './symbol-detail'
import { MarketTable } from './market-table'

type MarketAppProps = {
  initialTickers: Ticker[]
  initialWatchlist: string[]
  initialError: string | null
}

export function MarketApp({ initialTickers, initialWatchlist, initialError }: MarketAppProps) {
  const { tickers, error, updatedAt } = useLiveTickers(initialTickers)
  const [watchlist, setWatchlist] = useState(initialWatchlist)
  const [selected, setSelected] = useState(initialWatchlist[0] ?? initialTickers[0]?.symbol ?? '')
  const errorMessage = error?.message ?? (tickers.length === 0 ? initialError : null)

  const bySymbol = new Map(tickers.map((t) => [t.symbol, t]))
  const watchedTickers = watchlist.map((s) => bySymbol.get(s)).filter((t): t is Ticker => Boolean(t))
  const selectedTicker = bySymbol.get(selected) ?? tickers[0]

  const add = (symbol: string) => setWatchlist((list) => (list.includes(symbol) ? list : [...list, symbol]))
  const remove = (symbol: string) => setWatchlist((list) => list.filter((s) => s !== symbol))
  const toggle = (symbol: string) => (watchlist.includes(symbol) ? remove(symbol) : add(symbol))

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-5 py-4 md:px-8">
          <span className="text-lg font-bold tracking-tight">
            Market<span className="text-primary">ly</span>
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            <span className={clsx('size-2 rounded-full', errorMessage ? 'bg-loss' : 'bg-gain')} aria-hidden="true" />
            {errorMessage
              ? 'Quotes unavailable'
              : updatedAt
                ? `Live · Twelve Data · ${new Date(updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                : 'Loading quotes'}
          </span>
        </header>
        <main className="flex flex-col gap-8 px-5 py-6 md:px-8 md:py-8">
          {errorMessage && (
            <p role="alert" className="rounded-lg border border-loss/40 bg-card px-4 py-3 text-sm text-loss">
              {errorMessage}
            </p>
          )}
          {selectedTicker && <SymbolDetail ticker={selectedTicker} />}
          {tickers.length > 0 && (
            <MarketTable tickers={tickers} watched={new Set(watchlist)} onToggle={toggle} onSelect={setSelected} />
          )}
        </main>
      </div>
      <Watchlist
        tickers={watchedTickers}
        universe={tickers}
        selected={selected}
        onSelect={setSelected}
        onAdd={add}
        onRemove={remove}
      />
    </div>
  )
}
