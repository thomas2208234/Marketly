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
// Leave one credit of headroom so a stray request can't push a batch over the limit.
const BATCH_SIZE = Math.min(Math.max(1, CREDITS_PER_MINUTE - 1), UNIVERSE.length)
// Default watchlist symbols go first so the starter watchlist fills in on the first batch.
const FETCH_ORDER = [
  ...DEFAULT_WATCHLIST.filter((s) => UNIVERSE.some((u) => u.symbol === s)),
  ...UNIVERSE.map((u) => u.symbol).filter((s) => !DEFAULT_WATCHLIST.includes(s)),
]
const BATCH_INTERVAL_MS = Math.max(15_000, Math.ceil((60_000 * BATCH_SIZE) / CREDITS_PER_MINUTE))

const RATE_LIMIT_BACKOFF_MS = 61_000

type QuoteState = {
  cache: Map<string, Ticker>
  cursor: number
  nextBatchAt: number
  inflight: Promise<void> | null
}

// Kept on globalThis so dev-server hot reloads don't wipe the cache and re-spend credits.
const globalForQuotes = globalThis as typeof globalThis & { __twelveDataQuotes?: QuoteState }
const state: QuoteState = (globalForQuotes.__twelveDataQuotes ??= {
  cache: new Map(),
  cursor: 0,
  nextBatchAt: 0,
  inflight: null,
})
const cache = state.cache

class RateLimitError extends QuotesError {}

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
    if (body.code === 429) throw new RateLimitError('Twelve Data credit limit reached. Retrying shortly.')
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
  const symbols = Array.from(
    { length: BATCH_SIZE },
    (_, i) => FETCH_ORDER[(state.cursor + i) % FETCH_ORDER.length],
  )
  state.nextBatchAt = Date.now() + BATCH_INTERVAL_MS
  try {
    await fetchBatch(symbols, apiKey)
  } catch (error) {
    // The per-minute window resets on Twelve Data's clock, so wait a full window before retrying.
    if (error instanceof RateLimitError) state.nextBatchAt = Date.now() + RATE_LIMIT_BACKOFF_MS
    throw error
  }
  state.cursor = (state.cursor + BATCH_SIZE) % FETCH_ORDER.length
}

export async function getQuotes(): Promise<Ticker[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) throw new QuotesError('TWELVE_DATA_API_KEY is not set.')

  if (!state.inflight && Date.now() >= state.nextBatchAt) {
    state.inflight = refreshNextBatch(apiKey).finally(() => {
      state.inflight = null
    })
  }

  if (state.inflight) {
    try {
      await state.inflight
    } catch (error) {
      if (cache.size === 0) throw error
      console.error('[quotes] Serving cached quotes after refresh failure:', error)
    }
  }

  return UNIVERSE.flatMap(({ symbol }) => cache.get(symbol) ?? [])
}
