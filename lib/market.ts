export type Ticker = {
  symbol: string
  name: string
  sector: string
  price: number
  previousClose: number
  open: number
  high: number
  low: number
  updatedAt: number
  history: number[]
}

export const UNIVERSE: { symbol: string; name: string; sector: string }[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Semiconductors' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Communication' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financials' },
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy' },
  { symbol: 'KO', name: 'Coca-Cola Co.', sector: 'Staples' },
  { symbol: 'DIS', name: 'Walt Disney Co.', sector: 'Communication' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Semiconductors' },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'Staples' },
  { symbol: 'BA', name: 'Boeing Co.', sector: 'Industrials' },
]

export const DEFAULT_WATCHLIST = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'JPM', 'KO', 'NFLX']

export const MAX_HISTORY_POINTS = 60

export function changeOf(t: Pick<Ticker, 'price' | 'previousClose'>) {
  const change = t.price - t.previousClose
  return { change, percent: t.previousClose ? (change / t.previousClose) * 100 : 0 }
}

export const formatPrice = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatSigned = (n: number, digits = 2) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`
