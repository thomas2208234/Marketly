import 'server-only'
import { UNIVERSE, type Ticker } from './market'

type FinnhubQuote = { c: number; d: number | null; dp: number | null; h: number; l: number; o: number; pc: number; t: number }

export class QuotesError extends Error {}

async function fetchQuote(symbol: string, token: string): Promise<FinnhubQuote | null> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`
  const res = await fetch(url, { next: { revalidate: 15 } })
  if (res.status === 401 || res.status === 403) throw new QuotesError('Finnhub rejected the API key.')
  if (res.status === 429) throw new QuotesError('Finnhub rate limit reached. Retrying shortly.')
  if (!res.ok) return null
  const quote = (await res.json()) as FinnhubQuote
  return quote.c > 0 ? quote : null
}

export async function getQuotes(): Promise<Ticker[]> {
  const token = process.env.FINNHUB_API_KEY
  if (!token) throw new QuotesError('FINNHUB_API_KEY is not set.')

  const quotes = await Promise.all(UNIVERSE.map(({ symbol }) => fetchQuote(symbol, token)))

  return UNIVERSE.flatMap(({ symbol, name, sector }, i) => {
    const q = quotes[i]
    if (!q) return []
    return [
      {
        symbol,
        name,
        sector,
        price: q.c,
        previousClose: q.pc,
        open: q.o,
        high: q.h,
        low: q.l,
        updatedAt: q.t * 1000,
        history: [q.pc, q.o, q.c],
      },
    ]
  })
}
