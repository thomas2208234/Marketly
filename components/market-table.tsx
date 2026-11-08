'use client'

import { Star } from 'lucide-react'
import clsx from 'clsx'
import { changeOf, formatPrice, formatSigned, type Ticker } from '@/lib/market'

type MarketTableProps = {
  tickers: Ticker[]
  watched: Set<string>
  onToggle: (symbol: string) => void
  onSelect: (symbol: string) => void
}

export function MarketTable({ tickers, watched, onToggle, onSelect }: MarketTableProps) {
  const sorted = [...tickers].sort((a, b) => Math.abs(changeOf(b).percent) - Math.abs(changeOf(a).percent))

  return (
    <section aria-labelledby="market-heading" className="flex flex-col gap-3">
      <h2 id="market-heading" className="text-sm font-semibold tracking-wide uppercase">
        Biggest movers
      </h2>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="w-10 px-4 py-3">
                <span className="sr-only">Watch</span>
              </th>
              <th scope="col" className="py-3 pr-4 font-normal">Symbol</th>
              <th scope="col" className="hidden py-3 pr-4 font-normal md:table-cell">Sector</th>
              <th scope="col" className="py-3 pr-4 text-right font-normal">Last</th>
              <th scope="col" className="py-3 pr-4 text-right font-normal">Change</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const { change, percent } = changeOf(t)
              const up = change >= 0
              const isWatched = watched.has(t.symbol)
              return (
                <tr key={t.symbol} className="border-b last:border-b-0 hover:bg-muted/50">
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => onToggle(t.symbol)}
                      aria-pressed={isWatched}
                      className="flex size-7 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <Star
                        className={clsx('size-4', isWatched ? 'fill-primary text-primary' : 'text-muted-foreground')}
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        {isWatched ? `Remove ${t.symbol} from watchlist` : `Add ${t.symbol} to watchlist`}
                      </span>
                    </button>
                  </td>
                  <td className="py-2.5 pr-4">
                    <button
                      type="button"
                      onClick={() => onSelect(t.symbol)}
                      className="flex flex-col text-left hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                      <span className="font-mono font-semibold">{t.symbol}</span>
                      <span className="text-xs text-muted-foreground">{t.name}</span>
                    </button>
                  </td>
                  <td className="hidden py-2.5 pr-4 text-muted-foreground md:table-cell">{t.sector}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular">{formatPrice(t.price)}</td>
                  <td className={clsx('py-2.5 pr-4 text-right font-mono tabular', up ? 'text-gain' : 'text-loss')}>
                    {formatSigned(percent)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
