import 'server-only'
import { UNIVERSE } from './market'

export type EarningsQuarter = {
  fiscalQuarter: string
  reportedAt: string
  actual: number
  estimate: number
  surprisePercent: number
}

export type EarningsReport = {
  symbol: string
  name: string
  quarters: EarningsQuarter[]
}

type NasdaqSurpriseRow = {
  fiscalQtrEnd: string
  dateReported: string
  eps: number | string
  consensusForecast: number | string
  percentageSurprise: number | string
}

type NasdaqResponse<T> = { data: T | null; status?: { rCode: number } }

export class EarningsError extends Error {}

export const SYMBOL_PATTERN = /^[A-Z][A-Z.\-]{0,9}$/

const TTL_MS = 6 * 60 * 60 * 1000
const cache = new Map<string, { at: number; report: EarningsReport | null }>()

// Nasdaq's public endpoints reject requests without browser-like headers.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
}

async function nasdaq<T>(path: string): Promise<T | null> {
  const res = await fetch(`https://api.nasdaq.com/api${path}`, { headers: HEADERS, cache: 'no-store' })
  if (!res.ok) throw new EarningsError(`Earnings request failed (${res.status}).`)
  const body = (await res.json()) as NasdaqResponse<T>
  return body.data
}

function toQuarter(row: NasdaqSurpriseRow): EarningsQuarter | null {
  const actual = Number(row.eps)
  const estimate = Number(row.consensusForecast)
  if (!Number.isFinite(actual) || !Number.isFinite(estimate)) return null
  const reported = new Date(row.dateReported)
  const surprise = Number(row.percentageSurprise)
  return {
    fiscalQuarter: row.fiscalQtrEnd,
    reportedAt: Number.isNaN(reported.getTime()) ? row.dateReported : reported.toISOString(),
    actual,
    estimate,
    surprisePercent: Number.isFinite(surprise)
      ? surprise
      : estimate
        ? ((actual - estimate) / Math.abs(estimate)) * 100
        : 0,
  }
}

async function lookupName(symbol: string) {
  const known = UNIVERSE.find((u) => u.symbol === symbol)?.name
  if (known) return known
  try {
    const info = await nasdaq<{ companyName?: string }>(`/quote/${encodeURIComponent(symbol)}/info?assetclass=stocks`)
    return info?.companyName?.replace(/\s+(Common Stock|Class [A-Z] Common Stock|Ordinary Shares).*$/i, '') ?? symbol
  } catch {
    return symbol
  }
}

async function loadReport(symbol: string): Promise<EarningsReport | null> {
  const [surprise, name] = await Promise.all([
    nasdaq<{ earningsSurpriseTable?: { rows?: NasdaqSurpriseRow[] } }>(
      `/company/${encodeURIComponent(symbol)}/earnings-surprise`,
    ),
    lookupName(symbol),
  ])
  const quarters = (surprise?.earningsSurpriseTable?.rows ?? []).flatMap((row) => toQuarter(row) ?? [])
  return quarters.length ? { symbol, name, quarters } : null
}

export async function getEarnings(symbol: string): Promise<EarningsReport | null> {
  const hit = cache.get(symbol)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.report
  const report = await loadReport(symbol)
  cache.set(symbol, { at: Date.now(), report })
  return report
}

export async function getManyEarnings(symbols: string[]) {
  const results = await Promise.allSettled(symbols.map(getEarnings))
  const failures = results.filter((r) => r.status === 'rejected')
  if (failures.length === results.length && results.length > 0) throw (failures[0] as PromiseRejectedResult).reason
  return results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []))
}
