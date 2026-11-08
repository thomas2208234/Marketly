'use client'

import { useId, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import clsx from 'clsx'
import { changeOf, formatPrice, formatSigned, type Ticker } from '@/lib/market'
import { Sparkline } from './sparkline'

export type WatchlistItem = { symbol: string; name: string; ticker?: Ticker }

type WatchlistProps = {
  items: WatchlistItem[]
  universe: Ticker[]
  selected: string
  onSelect: (symbol: string) => void
  onAdd: (symbol: string) => void
  onRemove: (symbol: string) => void
}

export function Watchlist({ items, universe, selected, onSelect, onAdd, onRemove }: WatchlistProps) {
  const [query, setQuery] = useState('')
  const searchId = useId()
  const watched = new Set(items.map((t) => t.symbol))
  const q = query.trim().toLowerCase()
  const suggestions = q
    ? universe
        .filter((t) => !watched.has(t.symbol))
        .filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
        .slice(0, 5)
    : []

  function add(symbol: string) {
    onAdd(symbol)
    setQuery('')
  }

  return (
    <aside
      aria-label="Watchlist"
      className="flex w-full flex-col border-t bg-card lg:sticky lg:top-0 lg:h-dvh lg:w-80 lg:shrink-0 lg:border-t-0 lg:border-r xl:w-96"
    >
      <div className="flex flex-col gap-3 border-b px-5 pt-5 pb-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Watchlist</h2>
          <span className="font-mono text-xs text-muted-foreground tabular">{items.length} symbols</span>
        </div>

        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault()
            if (suggestions[0]) add(suggestions[0].symbol)
          }}
        >
          <label htmlFor={searchId} className="sr-only">
            Add a symbol to your watchlist
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id={searchId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add symbol…"
            autoComplete="off"
            className="h-9 w-full rounded-lg border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {suggestions.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border bg-card shadow-lg">
              {suggestions.map((s) => (
                <li key={s.symbol}>
                  <button
                    type="button"
                    onClick={() => add(s.symbol)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className="w-14 font-mono font-semibold">{s.symbol}</span>
                    <span className="flex-1 truncate text-muted-foreground">{s.name}</span>
                    <Plus className="size-4 text-primary" aria-hidden="true" />
                    <span className="sr-only">Add {s.symbol}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      </div>

      <div className="flex px-5 py-2 text-xs text-muted-foreground">
        <span className="flex-1">Symbol</span>
        <span className="w-24 text-right">Last / Chg</span>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm leading-relaxed text-muted-foreground">
          Your watchlist is empty. Search above to add a symbol.
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto pb-4">
          {items.map((t) => {
            const quote = t.ticker
            const percent = quote ? changeOf(quote).percent : 0
            const up = percent >= 0
            const isSelected = t.symbol === selected
            return (
              <li key={t.symbol} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(t.symbol)}
                  aria-current={isSelected ? 'true' : undefined}
                  className={clsx(
                    'flex w-full items-center gap-3 border-l-2 py-3 pr-5 pl-[18px] text-left transition-colors focus-visible:bg-muted focus-visible:outline-none',
                    isSelected ? 'border-primary bg-muted' : 'border-transparent hover:bg-muted/60',
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-mono text-sm font-semibold">{t.symbol}</span>
                    <span className="truncate text-xs text-muted-foreground">{t.name}</span>
                  </span>
                  {quote ? (
                    <>
                      <Sparkline values={quote.history.slice(-24)} positive={up} />
                      <span className="flex w-24 flex-col items-end font-mono tabular">
                        <span className="text-sm">{formatPrice(quote.price)}</span>
                        <span className={clsx('text-xs', up ? 'text-gain' : 'text-loss')}>{formatSigned(percent)}%</span>
                      </span>
                    </>
                  ) : (
                    <span className="flex w-24 flex-col items-end font-mono text-muted-foreground">
                      <span className="text-sm" aria-hidden="true">
                        {'—'}
                      </span>
                      <span className="text-xs">Loading</span>
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(t.symbol)}
                  className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-card hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Remove {t.symbol} from watchlist</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
