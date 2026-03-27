import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Stock } from '@/lib/types'
import { NASDAQ100_STOCKS, NASDAQ100_METADATA } from '@/lib/data/nasdaq100'

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY
const CACHE_TTL = 21600 // 6 hours

// Top 30 NASDAQ stocks to fetch on cache miss (completes in ~5s)
const QUICK_FETCH_SYMBOLS = NASDAQ100_STOCKS.slice(0, 30).map(s => s.symbol)

interface CachedData {
  stocks: Stock[]
  timestamp: number
}

function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

async function fetchQuickBatch(symbols: string[]): Promise<Stock[]> {
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const [quoteRes, metricsRes] = await Promise.all([
          fetch(`${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`),
          fetch(`${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`),
        ])
        const quote = await quoteRes.json()
        const metrics = await metricsRes.json()

        if (!quote.c) return null

        const metadata = NASDAQ100_METADATA[symbol]
        if (!metadata) return null

        return {
          symbol,
          name: metadata.name,
          price: quote.c,
          change: quote.d || 0,
          changesPercentage: quote.dp || 0,
          marketCap: metrics?.metric?.marketCapitalization
            ? metrics.metric.marketCapitalization * 1e6
            : quote.c * 1e9,
          pe: metrics?.metric?.peTTM ?? null,
          eps: metrics?.metric?.epsTTM ?? null,
        forwardPE: null,
        forwardEps: null,
          ebitda: null,
          dividendYield: metrics?.metric?.dividendYieldIndicatedAnnual ?? null,
          sector: metadata.sector,
          industry: metadata.industry,
          exchange: 'NASDAQ',
          volume: 0,
          avgVolume: 0,
          dayHigh: quote.h,
          dayLow: quote.l,
          yearHigh: metrics?.metric?.['52WeekHigh'] ?? quote.h * 1.1,
          yearLow: metrics?.metric?.['52WeekLow'] ?? quote.l * 0.9,
          logo: `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${symbol}.png`,
        } as Stock
      } catch {
        return null
      }
    })
  )
  return results.filter(Boolean) as Stock[]
}

export async function GET() {
  const startTime = Date.now()

  try {
    // 1. Check cache first (fast path)
    if (isKVAvailable()) {
      try {
        const cached = (await kv.get<CachedData>('stocks:nasdaq100'))
          ?? (await kv.get<CachedData>('stocks:nasdaq100:free'))

        if (cached && cached.stocks && cached.stocks.length > 0) {
          return NextResponse.json({
            data: cached.stocks,
            source: 'live',
            cached: true,
            cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
            stockCount: cached.stocks.length,
            responseTime: Date.now() - startTime,
          }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
        }
      } catch (kvError) {
        console.error('[API] KV error:', kvError)
      }
    }

    // 2. Cache miss — fetch top 30 stocks quickly (~5s) so users always see data
    console.log('[API] NASDAQ cache miss — fetching quick batch')
    const stocks = await fetchQuickBatch(QUICK_FETCH_SYMBOLS)

    // Store in cache so next request is instant
    if (stocks.length > 0 && isKVAvailable()) {
      const data = { stocks, timestamp: Date.now() }
      await kv.set('stocks:nasdaq100', data, { ex: CACHE_TTL }).catch(() => {})
    }

    return NextResponse.json({
      data: stocks,
      source: 'live',
      cached: false,
      stockCount: stocks.length,
      responseTime: Date.now() - startTime,
    }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })

  } catch (error) {
    console.error('[API] NASDAQ-100 error:', error)
    return NextResponse.json({ data: [], source: 'error', stockCount: 0, responseTime: Date.now() - startTime }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
