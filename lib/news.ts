import 'server-only'

export type NewsItem = {
  id: string
  title: string
  summary: string
  url: string
  publishedAt: number
  source: string
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" }

function decode(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, code: string) => {
      if (code[0] === '#') {
        const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
        return Number.isFinite(n) ? String.fromCodePoint(n) : match
      }
      return ENTITIES[code] ?? match
    })
    .replace(/<[^>]+>/g, '')
    .trim()
}

function tag(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return match ? decode(match[1]) : ''
}

function sourceOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Yahoo Finance'
  }
}

export async function getNews(symbols: string[]): Promise<NewsItem[]> {
  const list = symbols.filter((s) => /^[A-Z.]{1,6}$/.test(s)).slice(0, 20)
  const query = list.length ? list.join(',') : '^GSPC'
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(query)}&region=US&lang=en-US`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Marketly news reader)' },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`News feed request failed (${res.status}).`)

  const xml = await res.text()
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []

  return items
    .map((item) => {
      const link = tag(item, 'link')
      return {
        id: tag(item, 'guid') || link,
        title: tag(item, 'title'),
        summary: tag(item, 'description'),
        url: link,
        publishedAt: Date.parse(tag(item, 'pubDate')) || 0,
        source: sourceOf(link),
      }
    })
    .filter((n) => n.title && n.url.startsWith('http'))
    .sort((a, b) => b.publishedAt - a.publishedAt)
}
