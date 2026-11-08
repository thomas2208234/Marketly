import { getQuotes, QuotesError } from '@/lib/quotes'

export async function GET() {
  try {
    return Response.json({ tickers: await getQuotes() })
  } catch (error) {
    const message = error instanceof QuotesError ? error.message : 'Could not load quotes.'
    return Response.json({ error: message }, { status: 502 })
  }
}
