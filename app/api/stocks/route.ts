import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Stock } from '@/lib/types'
import { SP500_SYMBOLS, SP500_METADATA } from '@/lib/data/sp500-full'

// Finnhub API configuration
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

// Cache configuration
const CACHE_KEY = 'stocks:sp500'
const CACHE_TTL_SECONDS = 21600 // 6 hours

// Finnhub API types
interface FinnhubQuote {
  c: number  // Current price
  d: number  // Change
  dp: number // Percent change
  h: number  // High
  l: number  // Low
  o: number  // Open
  pc: number // Previous close
}

interface FinnhubMetrics {
  metric: {
    peTTM?: number
    peBasicExclExtraTTM?: number
    epsTTM?: number
    epsBasicExclExtraItemsTTM?: number
    marketCapitalization?: number
    '52WeekHigh'?: number
    '52WeekLow'?: number
    dividendYieldIndicatedAnnual?: number
  }
}

interface CachedData {
  stocks: Stock[]
  timestamp: number
}

/**
 * Fetch a single stock's quote from Finnhub
 */
async function fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
  try {
    const res = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * Fetch a single stock's metrics from Finnhub
 */
async function fetchMetrics(symbol: string): Promise<FinnhubMetrics | null> {
  try {
    const res = await fetch(
      `${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * Fetch volume data from Finnhub candles API
 */
async function fetchVolume(symbol: string): Promise<{ volume: number; avgVolume: number } | null> {
  try {
    const to = Math.floor(Date.now() / 1000)
    const from = to - (20 * 24 * 60 * 60) // 20 days ago

    const res = await fetch(
      `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 60 } }
    )

    if (!res.ok) return null
    const data = await res.json()

    if (data.s !== 'ok' || !data.v || data.v.length === 0) {
      return null
    }

    const volumes = data.v
    const todayVolume = volumes[volumes.length - 1]
    const avgVolume = Math.floor(volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length)

    return { volume: todayVolume, avgVolume }
  } catch {
    return null
  }
}

/**
 * Build a Stock object from Finnhub data
 */
function buildStock(
  symbol: string,
  quote: FinnhubQuote,
  metrics: FinnhubMetrics | null,
  volumeData: { volume: number; avgVolume: number } | null
): Stock | null {
  // Skip invalid data
  if (quote.c === 0 && quote.d === null) return null

  const metadata = SP500_METADATA[symbol] || {
    name: symbol,
    sector: 'Other',
    industry: ''
  }

  const pe = metrics?.metric?.peTTM ?? metrics?.metric?.peBasicExclExtraTTM ?? null
  const eps = metrics?.metric?.epsTTM ?? metrics?.metric?.epsBasicExclExtraItemsTTM ?? null
  const marketCap = metrics?.metric?.marketCapitalization
    ? metrics.metric.marketCapitalization * 1e6
    : quote.c * 1e9
  const dividendYield = metrics?.metric?.dividendYieldIndicatedAnnual ?? null

  return {
    symbol,
    name: metadata.name,
    price: quote.c,
    change: quote.d || 0,
    changesPercentage: quote.dp || 0,
    marketCap,
    pe,
    eps,
    ebitda: null,
    dividendYield,
    sector: metadata.sector,
    industry: metadata.industry,
    exchange: 'US',
    volume: volumeData?.volume ?? 0,
    avgVolume: volumeData?.avgVolume ?? 0,
    dayHigh: quote.h,
    dayLow: quote.l,
    yearHigh: metrics?.metric?.['52WeekHigh'] ?? quote.h * 1.1,
    yearLow: metrics?.metric?.['52WeekLow'] ?? quote.l * 0.9,
    logo: `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${symbol}.png`,
  }
}

/**
 * Fetch all S&P 500 stocks in parallel batches
 */
async function fetchAllStocks(): Promise<Stock[]> {
  const stocks: Stock[] = []
  const batchSize = 20 // Fetch 20 stocks at a time (3 API calls per stock = 60 calls/min)

  console.log(`[API] Fetching ${SP500_SYMBOLS.length} S&P 500 stocks...`)

  for (let i = 0; i < SP500_SYMBOLS.length; i += batchSize) {
    const batch = SP500_SYMBOLS.slice(i, i + batchSize)

    // Fetch quotes, metrics, and volume in parallel for this batch
    const results = await Promise.all(
      batch.map(async (symbol) => {
        const [quote, metrics, volumeData] = await Promise.all([
          fetchQuote(symbol),
          fetchMetrics(symbol),
          fetchVolume(symbol)
        ])
        if (!quote) return null
        return buildStock(symbol, quote, metrics, volumeData)
      })
    )

    // Add valid stocks to results
    for (const stock of results) {
      if (stock) stocks.push(stock)
    }

    console.log(`[API] Progress: ${Math.min(i + batchSize, SP500_SYMBOLS.length)}/${SP500_SYMBOLS.length}`)

    // Delay between batches to respect rate limits (60 calls/min)
    if (i + batchSize < SP500_SYMBOLS.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log(`[API] Completed: ${stocks.length} stocks fetched successfully`)
  return stocks.sort((a, b) => b.marketCap - a.marketCap)
}

/**
 * Generate mock stocks for fallback
 */
function generateMockStocks(): Stock[] {
  return SP500_SYMBOLS.map((symbol, index) => {
    const metadata = SP500_METADATA[symbol] || { name: symbol, sector: 'Other', industry: '' }
    const basePrice = 50 + Math.random() * 400
    const change = (Math.random() - 0.5) * 10
    const marketCap = (500 - index) * 10e9 + Math.random() * 50e9

    return {
      symbol,
      name: metadata.name,
      price: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changesPercentage: parseFloat((change / basePrice * 100).toFixed(2)),
      marketCap: Math.floor(marketCap),
      pe: 15 + Math.random() * 30,
      eps: basePrice / (15 + Math.random() * 30),
      ebitda: null,
      dividendYield: Math.random() > 0.3 ? Math.random() * 3 : null,
      sector: metadata.sector,
      industry: metadata.industry,
      exchange: 'US',
      volume: Math.floor(10e6 + Math.random() * 50e6),
      avgVolume: Math.floor(10e6 + Math.random() * 50e6),
      dayHigh: parseFloat((basePrice * 1.02).toFixed(2)),
      dayLow: parseFloat((basePrice * 0.98).toFixed(2)),
      yearHigh: parseFloat((basePrice * 1.25).toFixed(2)),
      yearLow: parseFloat((basePrice * 0.75).toFixed(2)),
      logo: `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${symbol}.png`,
    }
  }).sort((a, b) => b.marketCap - a.marketCap)
}

/**
 * Check if Vercel KV is available
 */
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/**
 * GET /api/stocks
 * Returns S&P 100 stock data with Vercel KV caching (5-min TTL)
 */
export async function GET() {
  const startTime = Date.now()

  try {
    // Try to get cached data from Vercel KV (if available)
    if (isKVAvailable()) {
      try {
        // Check the new unified cache first, then fall back to sp500-specific
        const cached = (await kv.get<CachedData>('stocks:all'))
          ?? (await kv.get<CachedData>(CACHE_KEY))

        if (cached && cached.stocks && cached.stocks.length > 0) {
          const cacheAge = Math.round((Date.now() - cached.timestamp) / 1000)
          console.log(`[API] Cache hit - ${cached.stocks.length} stocks, age: ${cacheAge}s`)

          return NextResponse.json({
            data: cached.stocks,
            source: 'live',
            cached: true,
            cacheAge,
            stockCount: cached.stocks.length,
            responseTime: Date.now() - startTime,
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            }
          })
        }
      } catch (kvError) {
        console.error('[API] KV error, continuing without cache:', kvError)
      }
    }

    // Cache miss — return empty immediately instead of blocking for 25+ seconds.
    // The cron job (refresh-sp500) is responsible for populating the cache.
    console.log('[API] Cache miss - returning empty, cron job will populate cache')
    return NextResponse.json({
      data: [],
      source: 'live',
      cached: false,
      stockCount: 0,
      responseTime: Date.now() - startTime,
      message: 'Data is being refreshed. Please try again in a few minutes.',
    }, {
      headers: {
        'Cache-Control': 'no-store',
      }
    })

  } catch (error) {
    console.error('[API] Error:', error)

    // Return mock data as fallback
    const mockStocks = generateMockStocks()

    return NextResponse.json({
      data: mockStocks,
      source: 'mock',
      cached: false,
      stockCount: mockStocks.length,
      responseTime: Date.now() - startTime,
      error: 'Using demo data - live data unavailable',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    })
  }
}

// Force dynamic rendering (don't pre-render at build time)
export const dynamic = 'force-dynamic'

// ISR revalidation every 5 minutes (for edge caching)
export const revalidate = 300
