import { NextResponse, type NextRequest } from 'next/server'
import { getNews } from '@/lib/news'

export async function GET(request: NextRequest) {
  const symbols = (request.nextUrl.searchParams.get('symbols') ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)

  try {
    const items = await getNews(symbols)
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } })
  } catch (error) {
    console.error('[news] Failed to load headlines:', error)
    return NextResponse.json({ error: 'Could not load market news right now.' }, { status: 502 })
  }
}
