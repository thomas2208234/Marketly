import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { MarketApp } from '@/components/market-app'
import { AccountMenu } from '@/components/account-menu'
import { auth } from '@/lib/auth'
import { DEFAULT_WATCHLIST, type Ticker } from '@/lib/market'
import { getQuotes, QuotesError } from '@/lib/quotes'

export const metadata: Metadata = {
  title: 'Markets — Marketly',
}

export default async function MarketsPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  let tickers: Ticker[] = []
  let error: string | null = null
  try {
    tickers = await getQuotes()
  } catch (e) {
    error = e instanceof QuotesError ? e.message : 'Could not load quotes.'
  }

  return (
    <MarketApp
      initialTickers={tickers}
      initialWatchlist={DEFAULT_WATCHLIST}
      initialError={error}
      account={<AccountMenu user={session?.user ? { name: session.user.name, email: session.user.email } : null} />}
    />
  )
}
