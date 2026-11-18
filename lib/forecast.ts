import 'server-only'
import { gateway, generateText, isStepCount, Output } from 'ai'
import { z } from 'zod'

const forecastSchema = z.object({
  found: z.boolean().describe('False if the query does not match a real publicly traded stock'),
  symbol: z.string().describe('Ticker symbol, uppercase. Empty string if not found'),
  name: z.string().describe('Company name. Empty string if not found'),
  direction: z.enum(['up', 'down', 'sideways']),
  confidence: z.enum(['low', 'medium', 'high']),
  timeframe: z.string().describe('Short label for how long until the expected move plays out, e.g. "2-4 weeks" or "3-6 months"'),
  timeframeReason: z.string().describe('One sentence on what sets that timeline, e.g. an upcoming earnings date or catalyst'),
  opinion: z.string().describe('3-4 sentence plain-English opinion on the stock right now'),
  bullCase: z.array(z.string()).max(3).describe('Short reasons it could go up'),
  bearCase: z.array(z.string()).max(3).describe('Short reasons it could go down'),
  sources: z
    .array(z.object({ title: z.string(), url: z.string() }))
    .max(4),
})

export type Forecast = z.infer<typeof forecastSchema>

const TTL_MS = 30 * 60_000
const MAX_CACHE = 200
const cache = new Map<string, { forecast: Forecast; at: number }>()
const inflight = new Map<string, Promise<Forecast>>()

export function sanitizeQuery(raw: string | null) {
  return (raw ?? '')
    .replace(/[^A-Za-z0-9 .&'-]/g, '')
    .trim()
    .slice(0, 40)
}

async function generateForecast(query: string): Promise<Forecast> {
  const today = new Date().toISOString().slice(0, 10)
  const { output } = await generateText({
    model: 'openai/gpt-5.4-mini',
    tools: {
      web_search: gateway.tools.perplexitySearch({ maxResults: 8, searchRecencyFilter: 'month', country: 'US' }),
    },
    stopWhen: isStepCount(5),
    output: Output.object({ schema: forecastSchema }),
    system: `You are a balanced equity research analyst. Today is ${today}.
The user gives a ticker symbol or company name. Resolve it to the publicly traded stock they most likely mean. If none exists, set found to false and leave other text fields brief.
Use web_search to check the latest price action, news, earnings dates, analyst views, and sentiment.
Give a clear call: will the stock most likely go up, down, or trade sideways next, and roughly how long until that move plays out. Tie the timeframe to concrete catalysts where possible.
Be honest about uncertainty. Only cite URLs that appeared in search results. Do not invent numbers.`,
    prompt: `Give your opinion and short-term outlook for: ${query}`,
  })
  return output
}

export async function getForecast(query: string): Promise<Forecast> {
  const key = query.toUpperCase()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.forecast

  let pending = inflight.get(key)
  if (!pending) {
    pending = generateForecast(query)
      .then((forecast) => {
        if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!)
        cache.set(key, { forecast, at: Date.now() })
        return forecast
      })
      .finally(() => inflight.delete(key))
    inflight.set(key, pending)
  }
  return pending
}
