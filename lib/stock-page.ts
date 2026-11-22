import 'server-only'
import { cache } from 'react'
import { UNIVERSE } from './market'
import { fetchYahooDaily, type YahooDaily } from './yahoo'
import { getNews, type NewsItem } from './news'
import { getEarnings, type EarningsReport } from './earnings'

export type StockMeta = (typeof UNIVERSE)[number]

export type StockPageData = {
  meta: StockMeta
  quote: YahooDaily | null
  news: NewsItem[]
  earnings: EarningsReport | null
}

const QUOTE_TTL_MS = 60_000
const quoteCache = new Map<string, { at: number; quote: YahooDaily }>()

export function findStock(rawSymbol: string): StockMeta | undefined {
  const symbol = decodeURIComponent(rawSymbol).toUpperCase()
  return UNIVERSE.find((u) => u.symbol === symbol)
}

async function loadQuote(symbol: string) {
  const hit = quoteCache.get(symbol)
  if (hit && Date.now() - hit.at < QUOTE_TTL_MS) return hit.quote
  const quote = await fetchYahooDaily(symbol)
  quoteCache.set(symbol, { at: Date.now(), quote })
  return quote
}

export const getStockQuote = cache(async (symbol: string): Promise<YahooDaily | null> => {
  try {
    return await loadQuote(symbol)
  } catch (error) {
    console.error(`[stocks] Quote unavailable for ${symbol}:`, error)
    return null
  }
})

export async function getStockPageData(meta: StockMeta): Promise<StockPageData> {
  const [quote, news, earnings] = await Promise.all([
    getStockQuote(meta.symbol),
    getNews([meta.symbol]).catch(() => [] as NewsItem[]),
    getEarnings(meta.symbol).catch(() => null),
  ])
  return { meta, quote, news: news.slice(0, 8), earnings }
}

export function relatedStocks(meta: StockMeta, count = 6) {
  const sameSector = UNIVERSE.filter((u) => u.sector === meta.sector && u.symbol !== meta.symbol)
  const others = UNIVERSE.filter((u) => u.sector !== meta.sector)
  return [...sameSector, ...others].slice(0, count)
}
