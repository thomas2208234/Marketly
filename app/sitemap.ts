import type { MetadataRoute } from 'next'
import { UNIVERSE } from '@/lib/market'
import { SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/stocks`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...UNIVERSE.map((u) => ({
      url: `${SITE_URL}/stocks/${u.symbol}`,
      lastModified: now,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    })),
  ]
}
