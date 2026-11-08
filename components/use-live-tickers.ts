'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { MAX_HISTORY_POINTS, type Ticker } from '@/lib/market'

const REFRESH_MS = 15_000

async function fetchQuotes(url: string): Promise<Ticker[]> {
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Could not load quotes.')
  return body.tickers
}

function mergeHistory(previous: Ticker[], next: Ticker[]) {
  const bySymbol = new Map(previous.map((t) => [t.symbol, t]))
  return next.map((t) => {
    const prior = bySymbol.get(t.symbol)
    if (!prior) return t
    const history = prior.updatedAt === t.updatedAt && prior.price === t.price ? prior.history : [...prior.history, t.price]
    return { ...t, history: history.slice(-MAX_HISTORY_POINTS) }
  })
}

export function useLiveTickers(initial: Ticker[]) {
  const [tickers, setTickers] = useState(initial)
  const { error } = useSWR('/api/quotes', fetchQuotes, {
    refreshInterval: REFRESH_MS,
    revalidateOnMount: initial.length === 0,
    onSuccess: (next) => setTickers((current) => (current.length ? mergeHistory(current, next) : next)),
  })

  const updatedAt = tickers.reduce((latest, t) => Math.max(latest, t.updatedAt), 0)
  return { tickers, error: error as Error | undefined, updatedAt }
}
