import 'server-only'

// Shared Twelve Data credit budget so the live quotes poller and the buzz
// history charts don't race each other into 429s on the free plan.
export const CREDITS_PER_MINUTE = Math.max(1, Number(process.env.TWELVE_DATA_CREDITS_PER_MINUTE) || 8)
const WINDOW_MS = 61_000

const spent: { at: number; credits: number }[] = []
let priorityUntil = 0

function used(now: number) {
  while (spent.length && now - spent[0].at > WINDOW_MS) spent.shift()
  return spent.reduce((sum, s) => sum + s.credits, 0)
}

export function available() {
  return CREDITS_PER_MINUTE - used(Date.now())
}

export function spend(credits: number) {
  spent.push({ at: Date.now(), credits })
}

export function requestPriority(ms = 90_000) {
  priorityUntil = Date.now() + ms
}

export function releasePriority() {
  priorityUntil = 0
}

export function isPriorityHeld() {
  return Date.now() < priorityUntil
}

// After Twelve Data refuses a request for credits, stop calling it for a while
// (longer once the daily quota is gone) and let callers use the fallback source.
let blockedUntil = 0

export function blockTwelveData(daily: boolean) {
  blockedUntil = Date.now() + (daily ? 60 : 2) * 60_000
}

export function isTwelveDataBlocked() {
  return Date.now() < blockedUntil
}

export function isDailyLimitMessage(message: string) {
  return /for the day|daily/i.test(message)
}
