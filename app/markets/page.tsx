import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarketApp } from '@/components/market-app'
import { AccountMenu } from '@/components/account-menu'
import { DEFAULT_WATCHLIST, type Ticker } from '@/lib/market'
import { getQuotes, QuotesError } from '@/lib/quotes'
import { getSession } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Markets — Marketly',
}

export default async function MarketsPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

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
      account={<AccountMenu user={{ name: session.user.name, email: session.user.email }} />}
    />
  )
}
