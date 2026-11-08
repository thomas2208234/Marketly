'use client'

import { useEffect, useState } from 'react'
import type { Ticker } from '@/lib/market'

const TICK_MS = 2500

export function useLiveTickers(initial: Ticker[]) {
  const [tickers, setTickers] = useState(initial)

  useEffect(() => {
    const id = setInterval(() => {
      setTickers((current) =>
        current.map((t) => {
          if (Math.random() < 0.4) return t
          const price = Number((t.price * (1 + (Math.random() - 0.5) * 0.004)).toFixed(2))
          const history = [...t.history.slice(0, -1), price]
          return { ...t, price, history }
        }),
      )
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  return tickers
}
