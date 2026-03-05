import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Stock } from '@/lib/types'
import { SP500_SYMBOLS, SP500_METADATA } from '@/lib/data/sp500-full'
import { NASDAQ100_SYMBOLS, NASDAQ100_METADATA } from '@/lib/data/nasdaq100'
import { INTERNATIONAL_SYMBOLS, INTERNATIONAL_METADATA } from '@/lib/data/international'
import { RATE_LIMITS } from '@/lib/types/api'

// Finnhub API configuration
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

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

/**
 * Fetch a single stock's quote from Finnhub
 */
async function fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
  try {
    const res = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 0 } }
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
      { next: { revalidate: 0 } }
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
      { next: { revalidate: 0 } }
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
  volumeData: { volume: number; avgVolume: number } | null,
  metadataSource: 'sp500' | 'nasdaq100' | 'international' = 'sp500'
): Stock | null {
  // Skip invalid data
  if (quote.c === 0 && quote.d === null) return null

  // Get metadata from appropriate source
  let metadata: any
  if (metadataSource === 'nasdaq100') {
    metadata = NASDAQ100_METADATA[symbol]
  } else if (metadataSource === 'international') {
    metadata = INTERNATIONAL_METADATA[symbol]
  } else {
    metadata = SP500_METADATA[symbol]
  }

  if (!metadata) {
    metadata = {
      name: symbol,
      sector: 'Other',
      industry: '',
      exchange: 'US'
    }
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
    exchange: metadata.exchange || (metadata.country ? metadata.exchange : 'US'),
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
 * Check if market is open (9am-4pm EST, Monday-Friday)
 */
function isMarketOpen(): boolean {
  const now = new Date()
  const hour = now.getUTCHours() - 5 // EST offset
  const day = now.getUTCDay()

  // Weekend check
  if (day === 0 || day === 6) return false

  // Market hours: 9am-4pm EST
  return hour >= 9 && hour < 16
}

/**
 * Fetch stocks for a specific dataset
 */
async function fetchStocksForDataset(
  symbols: string[],
  datasetName: string,
  metadataSource: 'sp500' | 'nasdaq100' | 'international',
  marketOpen: boolean
): Promise<Stock[]> {
  const stocks: Stock[] = []
  const batchSize = 20 // 20 stocks * 3 API calls = 60 calls/min

  console.log(`[CRON] Fetching ${symbols.length} ${datasetName} stocks in batches of ${batchSize}`)

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(symbols.length / batchSize)

    console.log(`[CRON] ${datasetName} batch ${batchNumber}/${totalBatches} (${batch.length} stocks)`)

    // Fetch quotes, metrics, and volume in parallel for this batch
    const results = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const [quote, metrics, volumeData] = await Promise.all([
            fetchQuote(symbol),
            fetchMetrics(symbol),
            fetchVolume(symbol)
          ])

          if (!quote) {
            console.warn(`[CRON] ${datasetName}: Failed to fetch quote for ${symbol}`)
            return null
          }

          return buildStock(symbol, quote, metrics, volumeData, metadataSource)
        } catch (error) {
          console.error(`[CRON] ${datasetName}: Error fetching ${symbol}:`, error)
          return null
        }
      })
    )

    // Add valid stocks to results
    for (const stock of results) {
      if (stock) stocks.push(stock)
    }

    console.log(`[CRON] ${datasetName} batch ${batchNumber}/${totalBatches} complete. Total: ${stocks.length}`)

    // Delay between batches to respect rate limits
    if (i + batchSize < symbols.length) {
      const delayMs = marketOpen ? 60000 : 30000 // 1 min during market hours, 30s after hours
      console.log(`[CRON] Waiting ${delayMs}ms before next batch...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  // Sort by market cap
  stocks.sort((a, b) => b.marketCap - a.marketCap)

  return stocks
}

/**
 * GET /api/cron/refresh-stocks-v2
 * Background job to refresh all stocks (S&P 500, NASDAQ-100, International)
 *
 * Vercel Cron schedule:
 * - Every 5 minutes during market hours (9am-4pm EST, Mon-Fri)
 * - Every 30 minutes after hours
 */
export async function GET(request: Request) {
  const startTime = Date.now()

  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[CRON] Starting stock refresh for all datasets...')

  try {
    const marketOpen = isMarketOpen()
    console.log(`[CRON] Market status: ${marketOpen ? 'OPEN' : 'CLOSED'}`)

    // Fetch all three datasets in sequence (to avoid rate limits)
    console.log('\n[CRON] ===== FETCHING S&P 500 =====')
    const sp500Stocks = await fetchStocksForDataset(SP500_SYMBOLS, 'S&P 500', 'sp500', marketOpen)

    console.log('\n[CRON] ===== FETCHING NASDAQ-100 =====')
    const nasdaq100Stocks = await fetchStocksForDataset(NASDAQ100_SYMBOLS, 'NASDAQ-100', 'nasdaq100', marketOpen)

    console.log('\n[CRON] ===== FETCHING INTERNATIONAL =====')
    const internationalStocks = await fetchStocksForDataset(INTERNATIONAL_SYMBOLS, 'International', 'international', marketOpen)

    // Cache data for all tiers and datasets
    const timestamp = Date.now()

    // S&P 500 caching
    const sp500Data = { stocks: sp500Stocks, timestamp }
    await Promise.all([
      kv.set('stocks:sp500', sp500Data, { ex: 600 }),
      kv.set('stocks:sp500:free', sp500Data, { ex: RATE_LIMITS.free.cacheTTL }),
      kv.set('stocks:sp500:starter', sp500Data, { ex: RATE_LIMITS.starter.cacheTTL }),
      kv.set('stocks:sp500:pro', sp500Data, { ex: RATE_LIMITS.pro.cacheTTL }),
      kv.set('stocks:sp500:enterprise', sp500Data, { ex: RATE_LIMITS.enterprise.cacheTTL }),
    ])

    // NASDAQ-100 caching
    const nasdaq100Data = { stocks: nasdaq100Stocks, timestamp }
    await Promise.all([
      kv.set('stocks:nasdaq100', nasdaq100Data, { ex: 600 }),
      kv.set('stocks:nasdaq100:free', nasdaq100Data, { ex: RATE_LIMITS.free.cacheTTL }),
      kv.set('stocks:nasdaq100:starter', nasdaq100Data, { ex: RATE_LIMITS.starter.cacheTTL }),
      kv.set('stocks:nasdaq100:pro', nasdaq100Data, { ex: RATE_LIMITS.pro.cacheTTL }),
      kv.set('stocks:nasdaq100:enterprise', nasdaq100Data, { ex: RATE_LIMITS.enterprise.cacheTTL }),
    ])

    // International caching
    const internationalData = { stocks: internationalStocks, timestamp }
    await Promise.all([
      kv.set('stocks:international', internationalData, { ex: 600 }),
      kv.set('stocks:international:free', internationalData, { ex: RATE_LIMITS.free.cacheTTL }),
      kv.set('stocks:international:starter', internationalData, { ex: RATE_LIMITS.starter.cacheTTL }),
      kv.set('stocks:international:pro', internationalData, { ex: RATE_LIMITS.pro.cacheTTL }),
      kv.set('stocks:international:enterprise', internationalData, { ex: RATE_LIMITS.enterprise.cacheTTL }),
    ])

    const totalTime = Date.now() - startTime
    const totalStocks = sp500Stocks.length + nasdaq100Stocks.length + internationalStocks.length

    console.log(`\n[CRON] ✅ Successfully cached all datasets:`)
    console.log(`  - S&P 500: ${sp500Stocks.length} stocks`)
    console.log(`  - NASDAQ-100: ${nasdaq100Stocks.length} stocks`)
    console.log(`  - International: ${internationalStocks.length} stocks`)
    console.log(`  - Total: ${totalStocks} stocks in ${Math.round(totalTime / 1000)}s`)

    return NextResponse.json({
      success: true,
      datasets: {
        sp500: sp500Stocks.length,
        nasdaq100: nasdaq100Stocks.length,
        international: internationalStocks.length,
        total: totalStocks,
      },
      totalTime,
      marketOpen,
      timestamp,
    })
  } catch (error) {
    console.error('[CRON] Fatal error:', error)
    return NextResponse.json(
      { error: 'Refresh failed', message: String(error) },
      { status: 500 }
    )
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'
