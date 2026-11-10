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
  changes: z
    .array(
      z.object({
        removed: z.string().describe('Ticker dropped from the previous list'),
        added: z.string().optional().describe('Ticker that replaced it, if any'),
        reason: z.string().describe('The concrete reason the swap was justified'),
      }),
    )
    .describe('Every ticker removed from the previous list, with the reason. Empty if nothing changed.'),
})

export type PicksReport = z.infer<typeof pickSchema>

const TTL_MS = 30 * 60_000
let cached: { report: PicksReport; at: number } | null = null
let inflight: Promise<PicksReport> | null = null

function describePrevious(previous: PicksReport | null): string {
  if (!previous || previous.picks.length === 0) {
    return 'There is no previous list. Build a fresh one.'
  }
  const lines = previous.picks.map(
    (p) =>
      `- ${p.symbol} (${p.name}): signal=${p.signal}, confidence=${p.confidence}, buzz web/youtube/tiktok=${p.buzz.web}/${p.buzz.youtube}/${p.buzz.tiktok}. Thesis: ${p.thesis}`,
  )
  return `Your previous list (from ${previous.generatedAt}):
${lines.join('\n')}

STABILITY RULES — follow these strictly:
- Start from the previous list. Keep every previous ticker by default and refresh its thesis, buzz scores, timing, and sources with what you find now.
- Only remove a ticker when there is a clear, specific reason, such as: its buzz has clearly faded (combined score dropped by roughly 40% or more), the bullish thesis is broken by news (downgrade, guidance cut, scandal, failed catalyst), the catalyst has already passed and the move has played out, or the stock is no longer US-listed or tradable.
- Only add a new ticker if it replaces a removed one, or if the list has fewer than 5 picks, or if a new stock's buzz is clearly and substantially stronger than the weakest current pick.
- Small day-to-day wiggles in buzz or price are NOT a reason to swap. When in doubt, keep the existing pick.
- You may change a kept pick's signal between "buy-soon" and "wait" only if its price action or catalyst timing has meaningfully changed.
- Keep kept picks in roughly the same order unless their relative buzz changed clearly.
- List every removed ticker in "changes" with the concrete reason.`
}

async function generateReport(previous: PicksReport | null): Promise<PicksReport> {
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
Score buzz 0-10 per platform based on what you actually found. Only cite source URLs that appeared in search results. Be balanced and factual; do not invent data.

${describePrevious(previous)}`,
    prompt: previous
      ? 'Re-check each of your previous picks across the web, YouTube, and TikTok, update them, and only swap a pick if there is a clear reason.'
      : 'Find the stocks with the most bullish buzz right now across the web, YouTube, and TikTok, and give a buy-soon or wait call for each.',
  })
  return output
}

export async function getPicks(): Promise<PicksReport> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.report
  const previous = cached?.report ?? null
  inflight ??= generateReport(previous)
    .then((report) => {
      cached = { report, at: Date.now() }
      return report
    })
    .catch((error) => {
      if (previous) return previous
      throw error
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}
