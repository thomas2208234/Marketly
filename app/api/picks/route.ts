import { NextResponse } from 'next/server'
import { getPicks } from '@/lib/picks'
import { getSession, unauthorized } from '@/lib/session'

export const maxDuration = 120

export async function GET() {
  if (!(await getSession())?.user) return unauthorized()

  try {
    const report = await getPicks()
    return NextResponse.json(report, { headers: { 'Cache-Control': 'private, max-age=1800' } })
  } catch (error) {
    console.error('[picks] Failed to generate picks:', error)
    return NextResponse.json({ error: 'Could not scan social buzz right now.' }, { status: 502 })
  }
}
