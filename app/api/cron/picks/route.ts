import { type NextRequest, NextResponse } from 'next/server'
import { refreshPicks } from '@/lib/picks'

export const maxDuration = 300

function easternHour() {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(
      new Date(),
    ),
  )
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Cron runs at both 16:00 and 17:00 UTC so one of them lands on 12pm Eastern across daylight saving.
  if (easternHour() !== 12) {
    return NextResponse.json({ skipped: true, reason: 'Not 12pm Eastern' })
  }

  try {
    const report = await refreshPicks()
    return NextResponse.json({ updated: true, generatedAt: report.generatedAt, picks: report.picks.length })
  } catch (error) {
    console.error('[cron/picks] Refresh failed:', error)
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 })
  }
}
