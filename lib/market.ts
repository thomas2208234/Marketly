export type Ticker = {
  symbol: string
  name: string
  sector: string
  price: number
  previousClose: number
  history: number[]
}

const UNIVERSE: { symbol: string; name: string; sector: string; base: number }[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', base: 228.4 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', base: 442.1 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Semiconductors', base: 138.7 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer', base: 196.3 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication', base: 171.9 },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Communication', base: 584.2 },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', base: 251.6 },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', base: 221.8 },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financials', base: 289.5 },
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', base: 118.2 },
  { symbol: 'KO', name: 'Coca-Cola Co.', sector: 'Staples', base: 69.4 },
  { symbol: 'DIS', name: 'Walt Disney Co.', sector: 'Communication', base: 97.1 },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication', base: 702.3 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Semiconductors', base: 156.8 },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'Staples', base: 889.0 },
  { symbol: 'BA', name: 'Boeing Co.', sector: 'Industrials', base: 154.2 },
]

export const DEFAULT_WATCHLIST = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'JPM', 'KO', 'NFLX']

function seeded(seedText: string) {
  let seed = 0
  for (const char of seedText) seed = (seed * 31 + char.charCodeAt(0)) >>> 0
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HISTORY_POINTS = 60

export function getTickers(): Ticker[] {
  return UNIVERSE.map(({ symbol, name, sector, base }) => {
    const rand = seeded(symbol)
    const history: number[] = []
    let value = base * (0.92 + rand() * 0.1)
    const drift = (rand() - 0.45) * 0.004
    for (let i = 0; i < HISTORY_POINTS; i++) {
      value = value * (1 + drift + (rand() - 0.5) * 0.028)
      history.push(Number(value.toFixed(2)))
    }
    const price = history[history.length - 1]
    const previousClose = history[history.length - 2]
    return { symbol, name, sector, price, previousClose, history }
  })
}

export function changeOf(t: Pick<Ticker, 'price' | 'previousClose'>) {
  const change = t.price - t.previousClose
  return { change, percent: (change / t.previousClose) * 100 }
}

export const formatPrice = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatSigned = (n: number, digits = 2) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`
