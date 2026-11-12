import 'server-only'
import { DEFAULT_WATCHLIST, UNIVERSE, type Ticker } from './market'
import {
  available,
  blockTwelveData,
  CREDITS_PER_MINUTE,
  isDailyLimitMessage,
  isPriorityHeld,
  isTwelveDataBlocked,
  spend,
} from './credits'
import { fetchYahooDaily } from './yahoo'

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
class CreditLimitError extends QuotesError {}

// Twelve Data bills 1 credit per symbol. The free plan allows 8 credits/minute,
// so symbols are refreshed in round-robin batches that stay inside that budget.
const BATCH_SIZE = Math.min(CREDITS_PER_MINUTE, UNIVERSE.length)
// Default watchlist symbols go first so the starter watchlist fills in on the first batch.
const FETCH_ORDER = [
  ...DEFAULT_WATCHLIST.filter((s) => UNIVERSE.some((u) => u.symbol === s)),
  ...UNIVERSE.map((u) => u.symbol).filter((s) => !DEFAULT_WATCHLIST.includes(s)),
]
const BATCH_INTERVAL_MS = Math.max(15_000, Math.ceil((60_000 * BATCH_SIZE) / CREDITS_PER_MINUTE))
const FALLBACK_INTERVAL_MS = 30_000

const cache = new Map<string, Ticker>()
let cursor = 0
let lastBatchAt = 0
let lastFallbackAt = 0
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
  if (res.status === 429) throw new CreditLimitError('Twelve Data credit limit reached.')
  if (!res.ok) throw new QuotesError(`Twelve Data request failed (${res.status}).`)

  const body: unknown = await res.json()
  if (isError(body)) {
    if (body.code === 401 || body.code === 403) throw new QuotesError('Twelve Data rejected the API key.')
    if (body.code === 429) throw new CreditLimitError(body.message)
    throw new QuotesError(body.message)
  }

  const entries = symbols.length === 1 ? { [symbols[0]]: body } : (body as Record<string, unknown>)
  for (const value of Object.values(entries)) {
    if (isError(value)) continue
    const ticker = toTicker(value as TwelveDataQuote)
    if (ticker) cache.set(ticker.symbol, ticker)
  }
}

async function refreshFromFallback() {
  lastFallbackAt = Date.now()
  const results = await Promise.allSettled(UNIVERSE.map((meta) => fetchYahooDaily(meta.symbol)))
  let loaded = 0
  results.forEach((result, i) => {
    if (result.status !== 'fulfilled') return
    const { price, previousClose, open, high, low, updatedAt } = result.value
    cache.set(UNIVERSE[i].symbol, {
      ...UNIVERSE[i],
      price,
      previousClose,
      open,
      high,
      low,
      updatedAt,
      history: [previousClose, open, price],
    })
    loaded++
  })
  if (loaded === 0) throw new QuotesError('Market data is temporarily unavailable. Retrying shortly.')
}

async function refreshNextBatch(apiKey: string) {
  const symbols = Array.from({ length: BATCH_SIZE }, (_, i) => FETCH_ORDER[(cursor + i) % FETCH_ORDER.length])
  lastBatchAt = Date.now()
  spend(symbols.length)
  try {
    await fetchBatch(symbols, apiKey)
    cursor = (cursor + BATCH_SIZE) % FETCH_ORDER.length
  } catch (error) {
    if (!(error instanceof CreditLimitError)) throw error
    blockTwelveData(isDailyLimitMessage(error.message))
    console.error('[quotes] Twelve Data out of credits, switching to fallback source:', error.message)
    await refreshFromFallback()
  }
}

export async function getQuotes(): Promise<Ticker[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY
  const now = Date.now()

  if (!inflight) {
    if (!apiKey || isTwelveDataBlocked()) {
      if (now - lastFallbackAt >= FALLBACK_INTERVAL_MS) inflight = refreshFromFallback()
    } else {
      const canSpend = cache.size === 0 || (!isPriorityHeld() && available() >= BATCH_SIZE)
      if (canSpend && now - lastBatchAt >= BATCH_INTERVAL_MS) inflight = refreshNextBatch(apiKey)
    }
    inflight = inflight?.finally(() => {
      inflight = null
    }) ?? null
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
