import 'server-only'

// Keyless fallback used when Twelve Data is out of credits, so quotes and
// charts keep working instead of going blank until the daily reset.

type YahooChart = {
  chart: {
    result:
      | {
          meta: {
            symbol: string
            regularMarketPrice: number
            regularMarketTime: number
            regularMarketDayHigh?: number
            regularMarketDayLow?: number
            chartPreviousClose?: number
            exchangeTimezoneName?: string
          }
          timestamp?: number[]
          indicators: { quote: { open: (number | null)[]; close: (number | null)[] }[] }
        }[]
      | null
    error: { description: string } | null
  }
}

export type YahooDaily = {
  price: number
  previousClose: number
  open: number
  high: number
  low: number
  updatedAt: number
  candles: { date: string; close: number }[]
}

export async function fetchYahooDaily(symbol: string): Promise<YahooDaily> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol.replace('.', '-'))}?range=3mo&interval=1d`
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Marketly/1.0)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Yahoo Finance request failed (${res.status}).`)

  const body = (await res.json()) as YahooChart
  const result = body.chart.result?.[0]
  if (!result) throw new Error(body.chart.error?.description ?? `No data for ${symbol}.`)

  const { meta } = result
  const timeZone = meta.exchangeTimezoneName ?? 'America/New_York'
  const quote = result.indicators.quote[0]
  const candles = (result.timestamp ?? []).flatMap((ts, i) => {
    const close = quote.close[i]
    return close && close > 0
      ? [{ date: new Date(ts * 1000).toLocaleDateString('en-CA', { timeZone }), close, open: quote.open[i] ?? close }]
      : []
  })
  if (!(meta.regularMarketPrice > 0) || candles.length === 0) throw new Error(`No price for ${symbol}.`)

  const last = candles[candles.length - 1]
  const previousClose = candles.length > 1 ? candles[candles.length - 2].close : (meta.chartPreviousClose ?? last.close)

  return {
    price: meta.regularMarketPrice,
    previousClose,
    open: last.open,
    high: meta.regularMarketDayHigh ?? meta.regularMarketPrice,
    low: meta.regularMarketDayLow ?? meta.regularMarketPrice,
    updatedAt: meta.regularMarketTime * 1000,
    candles: candles.map(({ date, close }) => ({ date, close })),
  }
}
