import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'
import { fetchAllQuotes } from '@/lib/yahoo'

/**
 * GET /api/cron/refresh-prices
 *
 * Fetches all stock prices from Yahoo Finance and writes prices.json cache.
 * Uses Yahoo v7 batch endpoint (150 symbols/request) — free, no API key.
 * Run every 10 minutes via Vercel cron or external scheduler.
 * Locally, can also be triggered manually.
 */
export async function GET(request: Request) {
  const startTime = Date.now()

  // Optional: Verify cron secret in production
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // Read primary stock list (curated ~1200 stocks with sector/country data)
    const primaryPath = path.join(process.cwd(), 'public', 'data', 'primary-stocks.json')
    const indexPath = path.join(process.cwd(), 'public', 'data', 'stocks', 'index.json')
    const raw = readFileSync(existsSync(primaryPath) ? primaryPath : indexPath, 'utf-8')
    const index = JSON.parse(raw) as Array<{ ticker: string }>
    const tickers = index.map(e => e.ticker)

    console.log(`[Cron] Refreshing prices for ${tickers.length} stocks via Yahoo...`)

    // Fetch all quotes from Yahoo (batch of 150, with v8 fallback)
    const quotes = await fetchAllQuotes(tickers)

    // Build price cache: ticker -> quote data
    const priceCache: Record<string, {
      price: number
      change: number
      changesPercentage: number
      marketCap: number
      pe: number | null
      eps: number | null
      dividendYield: number | null
      volume: number
      avgVolume: number
      dayHigh: number
      dayLow: number
      yearHigh: number
      yearLow: number
      name: string
    }> = {}

    for (const q of quotes) {
      if (q.price > 0) {
        priceCache[q.symbol] = {
          price: q.price,
          change: q.change,
          changesPercentage: q.changePercent,
          marketCap: q.marketCap || 0,
          pe: q.trailingPE ?? null,
          eps: q.epsTrailingTwelveMonths ?? null,
          dividendYield: q.dividendYield ?? null,
          volume: q.volume,
          avgVolume: 0,
          dayHigh: q.dayHigh,
          dayLow: q.dayLow,
          yearHigh: q.fiftyTwoWeekHigh || q.price,
          yearLow: q.fiftyTwoWeekLow || q.price,
          name: q.longName || q.shortName || '',
        }
      }
    }

    // Write cache file
    const cachePath = path.join(process.cwd(), 'public', 'data', 'prices.json')
    const cacheData = {
      updatedAt: new Date().toISOString(),
      count: Object.keys(priceCache).length,
      prices: priceCache,
    }
    writeFileSync(cachePath, JSON.stringify(cacheData))

    const elapsed = Date.now() - startTime
    console.log(`[Cron] Price refresh done: ${Object.keys(priceCache).length}/${tickers.length} stocks in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      stocksUpdated: Object.keys(priceCache).length,
      totalStocks: tickers.length,
      elapsed: `${elapsed}ms`,
      updatedAt: cacheData.updatedAt,
    })
  } catch (error) {
    console.error('[Cron] Price refresh failed:', error)
    return NextResponse.json({
      success: false,
      error: String(error),
      elapsed: `${Date.now() - startTime}ms`,
    }, { status: 500 })
  }
}
