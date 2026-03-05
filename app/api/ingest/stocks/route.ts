/**
 * Stock Data Ingestion API
 *
 * This endpoint fetches stock data from Finnhub and stores it in YOUR database.
 * Once data is stored, you can serve it from your own database without hitting
 * external APIs every time.
 *
 * POST /api/ingest/stocks
 *
 * Benefits:
 * - Historical data accumulates over time
 * - No more rate limits (you own the data)
 * - Can backfill historical data
 * - Much faster queries (<50ms vs 200ms from Finnhub)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isDatabaseConfigured } from '@/lib/db/supabase'
import { bulkUpsertStocks, bulkUpsertStockQuotes } from '@/lib/db/operations'
import { SP500_STOCKS } from '@/lib/data/sp500-full'
import { NASDAQ100_STOCKS } from '@/lib/data/nasdaq100'
import { INTERNATIONAL_STOCKS } from '@/lib/data/international'

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const CRON_SECRET = process.env.CRON_SECRET

interface IngestRequest {
  dataset?: 'sp500' | 'nasdaq100' | 'international' | 'all'
  force?: boolean // Force refresh even if recently updated
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // ===============================================
  // 1. AUTHENTICATION
  // ===============================================
  const authHeader = request.headers.get('authorization')
  const providedSecret = authHeader?.replace('Bearer ', '')

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid CRON_SECRET' },
      { status: 401 }
    )
  }

  // ===============================================
  // 2. CHECK DATABASE CONFIGURATION
  // ===============================================
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: 'Database not configured',
        message: 'Add SUPABASE_URL and SUPABASE_KEY to .env.local',
        setup_guide: 'See OWN_API_PLAN.md for Supabase setup instructions',
      },
      { status: 503 }
    )
  }

  if (!FINNHUB_API_KEY) {
    return NextResponse.json(
      { error: 'FINNHUB_API_KEY not configured' },
      { status: 503 }
    )
  }

  // ===============================================
  // 3. PARSE REQUEST BODY
  // ===============================================
  let body: IngestRequest = {}
  try {
    body = await request.json()
  } catch {
    // Default to all datasets if no body provided
    body = { dataset: 'all' }
  }

  const dataset = body.dataset || 'all'

  // ===============================================
  // 4. SELECT DATASETS TO INGEST
  // ===============================================
  const datasetsToIngest: Array<{
    name: 'sp500' | 'nasdaq100' | 'international'
    stocks: Array<{ symbol: string; name: string; sector?: string; industry?: string; country?: string; exchange?: string }>
  }> = []

  if (dataset === 'all' || dataset === 'sp500') {
    datasetsToIngest.push({
      name: 'sp500',
      stocks: SP500_STOCKS,
    })
  }

  if (dataset === 'all' || dataset === 'nasdaq100') {
    datasetsToIngest.push({
      name: 'nasdaq100',
      stocks: NASDAQ100_STOCKS,
    })
  }

  if (dataset === 'all' || dataset === 'international') {
    datasetsToIngest.push({
      name: 'international',
      stocks: INTERNATIONAL_STOCKS,
    })
  }

  // ===============================================
  // 5. INGEST EACH DATASET
  // ===============================================
  const results: Array<{ dataset: string; stocks: number; quotes: number; error?: string }> = []

  for (const ds of datasetsToIngest) {
    console.log(`📥 Ingesting ${ds.name} dataset (${ds.stocks.length} stocks)...`)

    try {
      // Step 1: Upsert stock metadata
      const metadataResult = await bulkUpsertStocks(
        ds.stocks.map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          industry: stock.industry,
          exchange: stock.exchange,
          country: stock.country,
          dataset: ds.name,
        }))
      )

      if (!metadataResult.success) {
        results.push({
          dataset: ds.name,
          stocks: 0,
          quotes: 0,
          error: metadataResult.error,
        })
        continue
      }

      console.log(`  ✅ Stored ${metadataResult.count} stock metadata records`)

      // Step 2: Fetch and store latest quotes
      const quotes = await fetchQuotesForDataset(ds.stocks.map(s => s.symbol))

      const quotesResult = await bulkUpsertStockQuotes(quotes)

      if (!quotesResult.success) {
        results.push({
          dataset: ds.name,
          stocks: metadataResult.count || ds.stocks.length,
          quotes: 0,
          error: quotesResult.error,
        })
        continue
      }

      console.log(`  ✅ Stored ${quotesResult.count} stock quotes`)

      results.push({
        dataset: ds.name,
        stocks: metadataResult.count || ds.stocks.length,
        quotes: quotesResult.count || quotes.length,
      })
    } catch (error) {
      console.error(`Error ingesting ${ds.name}:`, error)
      results.push({
        dataset: ds.name,
        stocks: 0,
        quotes: 0,
        error: String(error),
      })
    }
  }

  // ===============================================
  // 6. RETURN RESULTS
  // ===============================================
  const totalStocks = results.reduce((sum, r) => sum + r.stocks, 0)
  const totalQuotes = results.reduce((sum, r) => sum + r.quotes, 0)
  const errors = results.filter(r => r.error)

  return NextResponse.json({
    success: errors.length === 0,
    message: `Ingested ${totalStocks} stocks and ${totalQuotes} quotes`,
    results,
    errors: errors.length > 0 ? errors : undefined,
    responseTime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  })
}

// ===============================================
// HELPER FUNCTIONS
// ===============================================

/**
 * Fetch quotes for a list of symbols from Finnhub
 * Respects rate limits (60 calls/min)
 */
async function fetchQuotesForDataset(
  symbols: string[]
): Promise<
  Array<{
    symbol: string
    price: number
    change?: number
    change_percent?: number
    volume?: number
    avg_volume?: number
    day_high?: number
    day_low?: number
    year_high?: number
    year_low?: number
    market_cap?: number
    pe_ratio?: number
    timestamp: Date
  }>
> {
  const quotes: Array<any> = []
  const batchSize = 20 // 20 stocks * 3 calls = 60 calls/min

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    console.log(`  📡 Fetching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}...`)

    const batchQuotes = await Promise.all(
      batch.map(async symbol => {
        try {
          // Fetch quote, metrics, and volume data
          const [quoteRes, metricsRes, volumeRes] = await Promise.all([
            fetch(`${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`),
            fetch(`${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`),
            fetchVolume(symbol),
          ])

          const quoteData = await quoteRes.json()
          const metricsData = await metricsRes.json()

          // Build quote object
          return {
            symbol,
            price: quoteData.c || 0,
            change: quoteData.d || 0,
            change_percent: quoteData.dp || 0,
            volume: volumeRes?.volume || 0,
            avg_volume: volumeRes?.avgVolume || 0,
            day_high: quoteData.h || 0,
            day_low: quoteData.l || 0,
            year_high: metricsData.metric?.['52WeekHigh'] || 0,
            year_low: metricsData.metric?.['52WeekLow'] || 0,
            market_cap: metricsData.metric?.marketCapitalization || 0,
            pe_ratio: metricsData.metric?.peNormalizedAnnual || 0,
            timestamp: new Date(),
          }
        } catch (error) {
          console.error(`Error fetching quote for ${symbol}:`, error)
          return null
        }
      })
    )

    quotes.push(...batchQuotes.filter(Boolean))

    // Wait 1 minute between batches to respect rate limits
    if (i + batchSize < symbols.length) {
      console.log(`  ⏳ Waiting 60s before next batch...`)
      await new Promise(resolve => setTimeout(resolve, 60000))
    }
  }

  return quotes
}

/**
 * Fetch volume data from Finnhub candles API
 */
async function fetchVolume(symbol: string): Promise<{ volume: number; avgVolume: number } | null> {
  try {
    const to = Math.floor(Date.now() / 1000)
    const from = to - 20 * 24 * 60 * 60 // 20 days ago

    const res = await fetch(
      `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
    )

    const data = await res.json()

    if (data.s !== 'ok' || !data.v || data.v.length === 0) {
      return null
    }

    const volumes = data.v
    const todayVolume = volumes[volumes.length - 1]
    const avgVolume = Math.floor(volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length)

    return { volume: todayVolume, avgVolume }
  } catch (error) {
    return null
  }
}
