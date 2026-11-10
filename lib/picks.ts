import 'server-only'
import { gateway, generateText, isStepCount, Output } from 'ai'
import { z } from 'zod'

const pickSchema = z.object({
  generatedAt: z.string().describe('ISO date of the analysis'),
  marketMood: z.string().describe('One sentence on the overall retail and social sentiment right now'),
  picks: z
    .array(
      z.object({
        symbol: z.string().describe('US-listed ticker symbol, uppercase'),
        name: z.string(),
        thesis: z.string().describe('2-3 sentences on why buzz suggests this stock may rise'),
        signal: z.enum(['buy-soon', 'wait']),
        timing: z.string().describe('One sentence explaining why to buy soon or why to wait for a better entry'),
        confidence: z.enum(['low', 'medium', 'high']),
        buzz: z.object({
          web: z.number().int().min(0).max(10),
          youtube: z.number().int().min(0).max(10),
          tiktok: z.number().int().min(0).max(10),
        }),
        sources: z
          .array(
            z.object({
              title: z.string(),
              url: z.string(),
              platform: z.enum(['web', 'youtube', 'tiktok']),
            }),
          )
          .max(4),
      }),
    )
    .max(8),
})

export type PicksReport = z.infer<typeof pickSchema>

const TTL_MS = 30 * 60_000
let cached: { report: PicksReport; at: number } | null = null
let inflight: Promise<PicksReport> | null = null

async function generateReport(): Promise<PicksReport> {
  const today = new Date().toISOString().slice(0, 10)
  const { output } = await generateText({
    model: 'openai/gpt-5.4-mini',
    tools: {
      web_search: gateway.tools.perplexitySearch({ maxResults: 10, searchRecencyFilter: 'week', country: 'US' }),
      youtube_search: gateway.tools.perplexitySearch({
        maxResults: 10,
        searchRecencyFilter: 'week',
        searchDomainFilter: ['youtube.com'],
      }),
      tiktok_search: gateway.tools.perplexitySearch({
        maxResults: 10,
        searchRecencyFilter: 'week',
        searchDomainFilter: ['tiktok.com'],
      }),
    },
    stopWhen: isStepCount(8),
    output: Output.object({ schema: pickSchema }),
    system: `You are a market research analyst tracking which US stocks are getting bullish attention across financial news, YouTube, and TikTok. Today is ${today}.
Use all three search tools: web_search for financial news and analyst coverage, youtube_search for stock videos, tiktok_search for #stocktok trends.
Return 5 to 8 stocks with the strongest combined bullish buzz from the past week that are most likely to go up.
For each, decide "buy-soon" (momentum is building and price has not run up much yet, or a near-term catalyst is coming) or "wait" (already spiked on hype, overbought, earnings risk ahead, or a pullback is likely).
Score buzz 0-10 per platform based on what you actually found. Only cite source URLs that appeared in search results. Be balanced and factual; do not invent data.`,
    prompt: 'Find the stocks with the most bullish buzz right now across the web, YouTube, and TikTok, and give a buy-soon or wait call for each.',
  })
  return output
}

export async function getPicks(): Promise<PicksReport> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.report
  inflight ??= generateReport()
    .then((report) => {
      cached = { report, at: Date.now() }
      return report
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}
