import 'server-only'
import { available, releasePriority, requestPriority, spend } from './credits'

export type PricePoint = { date: string; close: number }

type TimeSeries = { status: 'ok'; values: { datetime: string; close: string }[] }
type TwelveDataError = { status: 'error'; code: number; message: string }

export class HistoryError extends Error {}

// Daily candles only change once per session, so a long cache keeps these
// requests from eating the per-minute credits the live quotes poller needs.
const TTL_MS = 6 * 60 * 60 * 1000
const DAYS = 30
const SYMBOL_PATTERN = /^[A-Z][A-Z.-]{0,9}$/

const cache = new Map<string, { at: number; points: PricePoint[] }>()

function isError(value: unknown): value is TwelveDataError {
  return typeof value === 'object' && value !== null && (value as TwelveDataError).status === 'error'
}

function toPoints(series: TimeSeries): PricePoint[] {
  return series.values
    .map((v) => ({ date: v.datetime, close: Number(v.close) }))
    .filter((p) => p.close > 0)
    .reverse()
}

export function sanitizeSymbols(raw: string | null): string[] {
  if (!raw) return []
  const symbols = raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => SYMBOL_PATTERN.test(s))
  return [...new Set(symbols)].slice(0, 8)
}

async function fetchSeries(symbols: string[], apiKey: string) {
  const url = `https://api.twelvedata.com/time_series?symbol=${symbols.map(encodeURIComponent).join(',')}&interval=1day&outputsize=${DAYS}&apikey=${apiKey}`
  const res = await fetch(url, { cache: 'no-store' })
  if (res.status === 429) throw new HistoryError('Twelve Data credit limit reached. Retrying shortly.')
  if (!res.ok) throw new HistoryError(`Twelve Data request failed (${res.status}).`)

  const body: unknown = await res.json()
  if (isError(body)) {
    throw new HistoryError(body.code === 429 ? 'Twelve Data credit limit reached. Retrying shortly.' : body.message)
  }

  const entries = symbols.length === 1 ? { [symbols[0]]: body } : (body as Record<string, unknown>)
  const now = Date.now()
  for (const [symbol, value] of Object.entries(entries)) {
    if (isError(value) || !(value as TimeSeries)?.values) continue
    cache.set(symbol, { at: now, points: toPoints(value as TimeSeries) })
  }
}

export async function getHistory(symbols: string[]): Promise<Record<string, PricePoint[]>> {
  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) throw new HistoryError('TWELVE_DATA_API_KEY is not set.')

  const stale = symbols.filter((s) => {
    const hit = cache.get(s)
    return !hit || Date.now() - hit.at > TTL_MS
  })

  if (stale.length > 0) {
    requestPriority()
    const budget = available()
    if (budget <= 0) {
      if (!symbols.some((s) => cache.has(s))) throw new HistoryError('Twelve Data credit limit reached. Retrying shortly.')
      return pick(symbols)
    }
    const batch = stale.slice(0, budget)
    try {
      spend(batch.length)
      await fetchSeries(batch, apiKey)
      if (batch.length === stale.length) releasePriority()
    } catch (error) {
      if (!symbols.some((s) => cache.has(s))) throw error
      console.error('[history] Serving cached history after refresh failure:', error)
    }
  }

  return pick(symbols)
}

function pick(symbols: string[]): Record<string, PricePoint[]> {
  return Object.fromEntries(symbols.flatMap((s) => (cache.has(s) ? [[s, cache.get(s)!.points]] : [])))
}
