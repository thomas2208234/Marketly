'use client'

import { useState } from 'react'
import type { Ticker } from '@/lib/market'
import { useLiveTickers } from './use-live-tickers'
import { Watchlist } from './watchlist'
import { SymbolDetail } from './symbol-detail'
import { MarketTable } from './market-table'

type MarketAppProps = {
  initialTickers: Ticker[]
  initialWatchlist: string[]
}

export function MarketApp({ initialTickers, initialWatchlist }: MarketAppProps) {
  const tickers = useLiveTickers(initialTickers)
  const [watchlist, setWatchlist] = useState(initialWatchlist)
  const [selected, setSelected] = useState(initialWatchlist[0] ?? initialTickers[0].symbol)

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
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-gain" aria-hidden="true" />
            Simulated live prices
          </span>
        </header>
        <main className="flex flex-col gap-8 px-5 py-6 md:px-8 md:py-8">
          <SymbolDetail ticker={selectedTicker} />
          <MarketTable tickers={tickers} watched={new Set(watchlist)} onToggle={toggle} onSelect={setSelected} />
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
