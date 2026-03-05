/**
 * S&P 500 Refresh Cron Job
 *
 * Separate endpoint for S&P 500 to avoid timeouts
 */

import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Stock } from '@/lib/types'
import { SP500_SYMBOLS, SP500_METADATA } from '@/lib/data/sp500-full'
import { RATE_LIMITS } from '@/lib/types/api'

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY

// Import helper functions (same as refresh-stocks-v2)
async function fetchQuote(symbol: string) {
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

async function fetchMetrics(symbol: string) {
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

async function fetchVolume(symbol: string) {
  try {
    const to = Math.floor(Date.now() / 1000)
    const from = to - (20 * 24 * 60 * 60)
    const res = await fetch(
      `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.s !== 'ok' || !data.v || data.v.length === 0) return null
    const volumes = data.v
    const todayVolume = volumes[volumes.length - 1]
    const avgVolume = Math.floor(volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length)
    return { volume: todayVolume, avgVolume }
  } catch {
    return null
  }
}

function buildStock(
  symbol: string,
  quote: any,
  metrics: any,
  volumeData: any,
  metadataSource: string
): Stock | null {
  const metadata = SP500_METADATA[symbol]
  if (!metadata) return null

  return {
    symbol,
    name: metadata.name,
    price: quote.c,
    change: quote.d,
    changesPercentage: quote.dp,
    marketCap: metrics?.metric?.marketCapitalization ?? 0,
    pe: metrics?.metric?.peTTM ?? metrics?.metric?.peBasicExclExtraTTM ?? 0,
    eps: metrics?.metric?.epsTTM ?? metrics?.metric?.epsBasicExclExtraItemsTTM ?? 0,
    ebitda: null,
    dividendYield: metrics?.metric?.dividendYieldIndicatedAnnual ?? 0,
    sector: metadata.sector,
    industry: metadata.industry,
    exchange: 'NYSE',
    volume: volumeData?.volume ?? 0,
    avgVolume: volumeData?.avgVolume ?? 0,
    dayHigh: quote.h,
    dayLow: quote.l,
    yearHigh: metrics?.metric?.['52WeekHigh'] ?? quote.h * 1.1,
    yearLow: metrics?.metric?.['52WeekLow'] ?? quote.l * 0.9,
    logo: `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${symbol}.png`,
  }
}

export const maxDuration = 300 // 5 minutes (Vercel Pro allows up to 300s)

export async function GET(request: Request) {
  const startTime = Date.now()

  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[CRON SP500] Starting S&P 500 refresh...')

  try {
    const stocks: Stock[] = []
    const batchSize = 30 // 30 stocks * 3 calls = 90 calls/min
    const totalSymbols = SP500_SYMBOLS.length

    console.log(`[CRON SP500] Fetching ${totalSymbols} stocks in batches of ${batchSize}`)

    for (let i = 0; i < totalSymbols; i += batchSize) {
      const batch = SP500_SYMBOLS.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(totalSymbols / batchSize)

      console.log(`[CRON SP500] Batch ${batchNumber}/${totalBatches} (${batch.length} stocks)`)

      const results = await Promise.all(
        batch.map(async (symbol) => {
          try {
            const [quote, metrics, volumeData] = await Promise.all([
              fetchQuote(symbol),
              fetchMetrics(symbol),
              fetchVolume(symbol)
            ])

            if (!quote) {
              console.warn(`[CRON SP500] Failed to fetch quote for ${symbol}`)
              return null
            }

            return buildStock(symbol, quote, metrics, volumeData, 'sp500')
          } catch (error) {
            console.error(`[CRON SP500] Error fetching ${symbol}:`, error)
            return null
          }
        })
      )

      for (const stock of results) {
        if (stock) stocks.push(stock)
      }

      console.log(`[CRON SP500] Batch ${batchNumber}/${totalBatches} complete. Total: ${stocks.length}/${i + batch.length}`)

      // Wait between batches (slightly faster - 40s instead of 60s)
      if (i + batchSize < totalSymbols) {
        await new Promise(resolve => setTimeout(resolve, 40000))
      }
    }

    // Sort by market cap
    stocks.sort((a, b) => b.marketCap - a.marketCap)

    // Cache with all tier-specific TTLs
    const timestamp = Date.now()
    const sp500Data = { stocks, timestamp }

    await Promise.all([
      kv.set('stocks:sp500', sp500Data, { ex: 21600 }),
      kv.set('stocks:sp500:free', sp500Data, { ex: RATE_LIMITS.free.cacheTTL }),
      kv.set('stocks:sp500:starter', sp500Data, { ex: RATE_LIMITS.starter.cacheTTL }),
      kv.set('stocks:sp500:pro', sp500Data, { ex: RATE_LIMITS.pro.cacheTTL }),
      kv.set('stocks:sp500:enterprise', sp500Data, { ex: RATE_LIMITS.enterprise.cacheTTL }),
    ])

    const totalTime = Date.now() - startTime
    console.log(`[CRON SP500] ✅ Successfully cached ${stocks.length} stocks in ${Math.round(totalTime / 1000)}s`)

    return NextResponse.json({
      success: true,
      dataset: 'sp500',
      stockCount: stocks.length,
      totalTime: Math.round(totalTime / 1000),
      failed: totalSymbols - stocks.length,
    })
  } catch (error) {
    console.error('[CRON SP500] Fatal error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh S&P 500', message: String(error) },
      { status: 500 }
    )
  }
}
