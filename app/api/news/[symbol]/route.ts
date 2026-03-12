import { NextRequest, NextResponse } from 'next/server'

/**
 * News API — fetches recent news for a stock symbol.
 * Uses Finnhub free tier (60 calls/min) with in-memory cache (30 min TTL).
 * At 10k users, we'd only hit Finnhub once per stock per 30 min.
 */

interface NewsArticle {
  headline: string
  summary: string
  source: string
  url: string
  datetime: number // unix timestamp
  image: string
}

// In-memory cache: { symbol: { data, fetchedAt } }
const cache = new Map<string, { data: NewsArticle[]; fetchedAt: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const sym = symbol.toUpperCase()

  // Check cache
  const cached = cache.get(sym)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ articles: cached.data, cached: true })
  }

  try {
    const apiKey = process.env.FINNHUB_API_KEY
    if (!apiKey) {
      // Fallback: return empty with a message
      return NextResponse.json({ articles: [], error: 'News API not configured' })
    }

    // Finnhub company news — last 7 days
    const to = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(sym)}&from=${from}&to=${to}&token=${apiKey}`,
      { signal: AbortSignal.timeout(8000) }
    )

    if (!res.ok) {
      return NextResponse.json({ articles: [], error: 'Failed to fetch news' })
    }

    const raw = await res.json()

    // Map and limit to 8 articles
    const articles: NewsArticle[] = (raw || [])
      .slice(0, 8)
      .map((a: Record<string, unknown>) => ({
        headline: a.headline || '',
        summary: a.summary || '',
        source: a.source || '',
        url: a.url || '',
        datetime: a.datetime || 0,
        image: a.image || '',
      }))
      .filter((a: NewsArticle) => a.headline && a.url)

    // Cache result
    cache.set(sym, { data: articles, fetchedAt: Date.now() })

    return NextResponse.json({ articles })
  } catch {
    return NextResponse.json({ articles: [], error: 'News fetch failed' })
  }
}
