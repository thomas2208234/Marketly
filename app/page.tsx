import { MarketApp } from '@/components/market-app'
import { DEFAULT_WATCHLIST, type Ticker } from '@/lib/market'
import { getQuotes, QuotesError } from '@/lib/quotes'

export default async function Page() {
  let tickers: Ticker[] = []
  let error: string | null = null
  try {
    tickers = await getQuotes()
  } catch (e) {
    error = e instanceof QuotesError ? e.message : 'Could not load quotes.'
  }

  return <MarketApp initialTickers={tickers} initialWatchlist={DEFAULT_WATCHLIST} initialError={error} />
}
