import { NextResponse } from 'next/server'
import { getPicks } from '@/lib/picks'

export const maxDuration = 120

export async function GET() {
  try {
    const report = await getPicks()
    return NextResponse.json(report, { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } })
  } catch (error) {
    console.error('[picks] Failed to generate picks:', error)
    return NextResponse.json({ error: 'Could not scan social buzz right now.' }, { status: 502 })
  }
}
