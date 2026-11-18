import { NextResponse } from 'next/server'
import { getForecast, sanitizeQuery } from '@/lib/forecast'
import { getSession, unauthorized } from '@/lib/session'

export const maxDuration = 90

export async function GET(request: Request) {
  if (!(await getSession())?.user) return unauthorized()

  const query = sanitizeQuery(new URL(request.url).searchParams.get('q'))
  if (!query) return NextResponse.json({ error: 'Enter a stock ticker or company name.' }, { status: 400 })

  try {
    const forecast = await getForecast(query)
    return NextResponse.json(forecast, { headers: { 'Cache-Control': 'private, max-age=1800' } })
  } catch (error) {
    console.error('[forecast] Failed to generate forecast:', error)
    return NextResponse.json({ error: 'Could not analyze that stock right now. Try again shortly.' }, { status: 502 })
  }
}
