import { MarketApp } from '@/components/market-app'
import { DEFAULT_WATCHLIST, getTickers } from '@/lib/market'

export default function Page() {
  return <MarketApp initialTickers={getTickers()} initialWatchlist={DEFAULT_WATCHLIST} />
}
