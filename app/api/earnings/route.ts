import { NextResponse, type NextRequest } from 'next/server'
import { getManyEarnings, SYMBOL_PATTERN } from '@/lib/earnings'
import { UNIVERSE } from '@/lib/market'
import { getSession, unauthorized } from '@/lib/session'

const MAX_SYMBOLS = 20

export async function GET(request: NextRequest) {
  if (!(await getSession())?.user) return unauthorized()

  const param = request.nextUrl.searchParams.get('symbols')
  const requested = param
    ? param
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    : UNIVERSE.map((u) => u.symbol)

  const symbols = [...new Set(requested)].filter((s) => SYMBOL_PATTERN.test(s)).slice(0, MAX_SYMBOLS)
  if (symbols.length === 0) {
    return NextResponse.json({ error: 'Enter a valid ticker symbol, like AAPL.' }, { status: 400 })
  }

  try {
    const reports = await getManyEarnings(symbols)
    return NextResponse.json({ reports }, { headers: { 'Cache-Control': 'private, max-age=3600' } })
  } catch (error) {
    console.error('[earnings] Failed to load earnings:', error)
    return NextResponse.json({ error: 'Could not load earnings right now.' }, { status: 502 })
  }
}
