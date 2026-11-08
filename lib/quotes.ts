import 'server-only'
import { DEFAULT_WATCHLIST, UNIVERSE, type Ticker } from './market'

type TwelveDataQuote = {
  symbol: string
  open: string
  high: string
  low: string
  close: string
  previous_close: string
  timestamp: number
}

type TwelveDataError = { status: 'error'; code: number; message: string }

export class QuotesError extends Error {}

// Twelve Data bills 1 credit per symbol. The free plan allows 8 credits/minute,
// so symbols are refreshed in round-robin batches that stay inside that budget.
const CREDITS_PER_MINUTE = Math.max(1, Number(process.env.TWELVE_DATA_CREDITS_PER_MINUTE) || 8)
const BATCH_SIZE = Math.min(CREDITS_PER_MINUTE, UNIVERSE.length)
// Default watchlist symbols go first so the starter watchlist fills in on the first batch.
const FETCH_ORDER = [
  ...DEFAULT_WATCHLIST.filter((s) => UNIVERSE.some((u) => u.symbol === s)),
  ...UNIVERSE.map((u) => u.symbol).filter((s) => !DEFAULT_WATCHLIST.includes(s)),
]
const BATCH_INTERVAL_MS = Math.max(15_000, Math.ceil((60_000 * BATCH_SIZE) / CREDITS_PER_MINUTE))

const cache = new Map<string, Ticker>()
let cursor = 0
let lastBatchAt = 0
let inflight: Promise<void> | null = null

function isError(value: unknown): value is TwelveDataError {
  return typeof value === 'object' && value !== null && (value as TwelveDataError).status === 'error'
}

function toTicker(quote: TwelveDataQuote): Ticker | null {
  const meta = UNIVERSE.find((u) => u.symbol === quote.symbol)
  const price = Number(quote.close)
  if (!meta || !(price > 0)) return null
  const previousClose = Number(quote.previous_close)
  const open = Number(quote.open)
  return {
    ...meta,
    price,
    previousClose,
    open,
    high: Number(quote.high),
    low: Number(quote.low),
    updatedAt: quote.timestamp * 1000,
    history: [previousClose, open, price],
  }
}

async function fetchBatch(symbols: string[], apiKey: string) {
  const url = `https://api.twelvedata.com/quote?symbol=${symbols.map(encodeURIComponent).join(',')}&apikey=${apiKey}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new QuotesError(`Twelve Data request failed (${res.status}).`)

  const body: unknown = await res.json()
  if (isError(body)) {
    if (body.code === 401 || body.code === 403) throw new QuotesError('Twelve Data rejected the API key.')
    if (body.code === 429) throw new QuotesError('Twelve Data credit limit reached. Retrying shortly.')
    throw new QuotesError(body.message)
  }

  const entries = symbols.length === 1 ? { [symbols[0]]: body } : (body as Record<string, unknown>)
  for (const value of Object.values(entries)) {
    if (isError(value)) continue
    const ticker = toTicker(value as TwelveDataQuote)
    if (ticker) cache.set(ticker.symbol, ticker)
  }
}

async function refreshNextBatch(apiKey: string) {
  const symbols = Array.from({ length: BATCH_SIZE }, (_, i) => FETCH_ORDER[(cursor + i) % FETCH_ORDER.length])
  lastBatchAt = Date.now()
  await fetchBatch(symbols, apiKey)
  cursor = (cursor + BATCH_SIZE) % FETCH_ORDER.length
}

export async function getQuotes(): Promise<Ticker[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) throw new QuotesError('TWELVE_DATA_API_KEY is not set.')

  if (!inflight && Date.now() - lastBatchAt >= BATCH_INTERVAL_MS) {
    inflight = refreshNextBatch(apiKey).finally(() => {
      inflight = null
    })
  }

  if (inflight) {
    try {
      await inflight
    } catch (error) {
      if (cache.size === 0) throw error
      console.error('[quotes] Serving cached quotes after refresh failure:', error)
    }
  }

  return UNIVERSE.flatMap(({ symbol }) => cache.get(symbol) ?? [])
}
