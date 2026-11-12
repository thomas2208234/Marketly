import { getQuotes, QuotesError } from '@/lib/quotes'
import { getSession, unauthorized } from '@/lib/session'

export async function GET() {
  if (!(await getSession())?.user) return unauthorized()

  try {
    return Response.json({ tickers: await getQuotes() })
  } catch (error) {
    const message = error instanceof QuotesError ? error.message : 'Could not load quotes.'
    return Response.json({ error: message }, { status: 502 })
  }
}
