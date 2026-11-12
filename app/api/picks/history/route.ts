import { getHistory, HistoryError, sanitizeSymbols } from '@/lib/history'
import { getSession, unauthorized } from '@/lib/session'

export async function GET(request: Request) {
  if (!(await getSession())?.user) return unauthorized()

  const symbols = sanitizeSymbols(new URL(request.url).searchParams.get('symbols'))
  if (symbols.length === 0) return Response.json({ history: {} })

  try {
    return Response.json({ history: await getHistory(symbols) })
  } catch (error) {
    const message = error instanceof HistoryError ? error.message : 'Could not load price history.'
    return Response.json({ error: message }, { status: 502 })
  }
}
