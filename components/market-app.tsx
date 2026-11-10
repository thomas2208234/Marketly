'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { UNIVERSE, type Ticker } from '@/lib/market'
import { useLiveTickers } from './use-live-tickers'
import { Watchlist, type WatchlistItem } from './watchlist'
import { SymbolDetail } from './symbol-detail'
import { MarketTable } from './market-table'
import { Logo } from './logo'
import { NewsFeed } from './news-feed'
import { BuzzPicks } from './buzz-picks'
import { EarningsReport } from './earnings-report'

type Tab = 'buzz' | 'news' | 'earnings' | 'watchlist'

type MarketAppProps = {
  initialTickers: Ticker[]
  initialWatchlist: string[]
  initialError: string | null
}

export function MarketApp({ initialTickers, initialWatchlist, initialError }: MarketAppProps) {
  const { tickers, error, updatedAt } = useLiveTickers(initialTickers)
  const [watchlist, setWatchlist] = useState(initialWatchlist)
  const [pickNames, setPickNames] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<Tab>('buzz')
  const [selected, setSelected] = useState(initialWatchlist[0] ?? initialTickers[0]?.symbol ?? '')
  const errorMessage = error?.message ?? (tickers.length === 0 ? initialError : null)

  const bySymbol = new Map(tickers.map((t) => [t.symbol, t]))
  const watchedItems: WatchlistItem[] = watchlist.flatMap((symbol) => {
    const name = UNIVERSE.find((u) => u.symbol === symbol)?.name ?? pickNames[symbol]
    return name ? [{ symbol, name, ticker: bySymbol.get(symbol) }] : []
  })
  const selectedTicker = bySymbol.get(selected) ?? tickers[0]

  const add = (symbol: string) => setWatchlist((list) => (list.includes(symbol) ? list : [...list, symbol]))
  const remove = (symbol: string) => setWatchlist((list) => list.filter((s) => s !== symbol))
  const toggle = (symbol: string) => (watchlist.includes(symbol) ? remove(symbol) : add(symbol))
  const togglePick = (symbol: string, name: string) => {
    setPickNames((names) => (names[symbol] ? names : { ...names, [symbol]: name }))
    toggle(symbol)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'buzz', label: 'Buzz picks' },
    { id: 'news', label: 'Stock news' },
    { id: 'earnings', label: 'Earnings Report' },
    { id: 'watchlist', label: 'Watchlist' },
  ]

  function onTabKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const index = tabs.findIndex((t) => t.id === tab)
    const step = e.key === 'ArrowRight' ? 1 : -1
    const next = tabs[(index + step + tabs.length) % tabs.length].id
    setTab(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-col border-b bg-card">
        <div className="flex items-center justify-between gap-4 px-5 pt-4 md:px-8">
          <Logo />
          <span className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            <span className={clsx('size-2 rounded-full', errorMessage ? 'bg-loss' : 'bg-gain')} aria-hidden="true" />
            {errorMessage
              ? 'Quotes unavailable'
              : updatedAt
                ? `Live · ${new Date(updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                : 'Loading quotes'}
          </span>
        </div>
        <div role="tablist" aria-label="Marketly sections" className="flex gap-6 px-5 md:px-8" onKeyDown={onTabKeyDown}>
          {tabs.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-2 border-b-2 pt-4 pb-3 text-sm font-medium transition-colors focus-visible:text-foreground focus-visible:outline-none',
                  active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
                {t.id === 'watchlist' && (
                  <span className="rounded bg-muted px-1.5 font-mono text-xs tabular text-muted-foreground">
                    {watchedItems.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {errorMessage && (
        <p role="alert" className="mx-5 mt-6 rounded-lg border border-loss/40 bg-card px-4 py-3 text-sm text-loss md:mx-8">
          {errorMessage}
        </p>
      )}

      <main
        id="panel-buzz"
        role="tabpanel"
        aria-labelledby="tab-buzz"
        hidden={tab !== 'buzz'}
        className="mx-auto w-full max-w-3xl px-5 py-6 md:px-8 md:py-8"
      >
        <BuzzPicks tickers={tickers} watchlist={watchlist} onToggleWatch={togglePick} />
      </main>

      <main
        id="panel-news"
        role="tabpanel"
        aria-labelledby="tab-news"
        hidden={tab !== 'news'}
        className="mx-auto w-full max-w-3xl px-5 py-6 md:px-8 md:py-8"
      >
        <NewsFeed symbols={watchlist} tickers={tickers} />
      </main>

      <main
        id="panel-earnings"
        role="tabpanel"
        aria-labelledby="tab-earnings"
        hidden={tab !== 'earnings'}
        className="mx-auto w-full max-w-4xl px-5 py-6 md:px-8 md:py-8"
      >
        {tab === 'earnings' && <EarningsReport />}
      </main>

      <div
        id="panel-watchlist"
        role="tabpanel"
        aria-labelledby="tab-watchlist"
        hidden={tab !== 'watchlist'}
        className={clsx('flex-1 flex-col lg:flex-row', tab === 'watchlist' ? 'flex' : 'hidden')}
      >
        <Watchlist
          items={watchedItems}
          universe={tickers}
          selected={selected}
          onSelect={setSelected}
          onAdd={add}
          onRemove={remove}
        />
        <main className="flex min-w-0 flex-1 flex-col gap-8 px-5 py-6 md:px-8 md:py-8">
          {selectedTicker && <SymbolDetail ticker={selectedTicker} />}
          {tickers.length > 0 && (
            <MarketTable tickers={tickers} watched={new Set(watchlist)} onToggle={toggle} onSelect={setSelected} />
          )}
        </main>
      </div>
    </div>
  )
}
