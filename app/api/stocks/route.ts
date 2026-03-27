import { NextResponse } from 'next/server'
import { Stock } from '@/lib/types'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

// Revalidate every 60 seconds
export const revalidate = 60

interface IndexEntry {
  ticker: string
  name: string
  sector: string | null
  industry: string | null
  country: string | null
  exchange: string | null
  quarters: number
  sharesOutstanding: number | null
}

interface PriceData {
  price: number
  change: number
  changesPercentage: number
  marketCap: number
  pe: number | null
  eps: number | null
  forwardPE: number | null
  forwardEps: number | null
  dividendYield: number | null
  volume: number
  avgVolume: number
  dayHigh: number
  dayLow: number
  yearHigh: number
  yearLow: number
  name: string
}

interface PriceCache {
  updatedAt: string
  count: number
  prices: Record<string, PriceData>
}

function readIndex(): IndexEntry[] {
  try {
    // Use curated primary list (enriched with sector/country) instead of full index
    const primaryPath = path.join(process.cwd(), 'public', 'data', 'primary-stocks.json')
    if (existsSync(primaryPath)) {
      return JSON.parse(readFileSync(primaryPath, 'utf-8')) as IndexEntry[]
    }
    // Fallback to full index
    const filePath = path.join(process.cwd(), 'public', 'data', 'stocks', 'index.json')
    return JSON.parse(readFileSync(filePath, 'utf-8')) as IndexEntry[]
  } catch (err) {
    console.error('[API] Failed to read index.json:', err)
    return []
  }
}

function readPriceCache(): PriceCache | null {
  try {
    const cachePath = path.join(process.cwd(), 'public', 'data', 'prices.json')
    if (!existsSync(cachePath)) return null
    return JSON.parse(readFileSync(cachePath, 'utf-8')) as PriceCache
  } catch {
    return null
  }
}

/**
 * GET /api/stocks
 * Returns all stocks merged with cached FMP price data.
 * Prices are refreshed by /api/cron/refresh-prices every 10 minutes.
 * No external API calls — instant response from local cache.
 */
export async function GET() {
  const startTime = Date.now()

  try {
    const index = readIndex()
    if (index.length === 0) {
      return NextResponse.json({
        data: [],
        source: 'error',
        stockCount: 0,
        responseTime: Date.now() - startTime,
        error: 'Could not read stock index',
      })
    }

    const cache = readPriceCache()
    const prices = cache?.prices || {}

    const stocks: Stock[] = index.map((entry) => {
      const p = prices[entry.ticker]
      const price = p?.price ?? 0
      const marketCap = p?.marketCap
        || (entry.sharesOutstanding && price ? price * entry.sharesOutstanding : 0)

      return {
        symbol: entry.ticker,
        name: p?.name || entry.name,
        price,
        change: p?.change ?? 0,
        changesPercentage: p?.changesPercentage ?? 0,
        marketCap,
        pe: p?.pe ?? null,
        eps: p?.eps ?? null,
        forwardPE: p?.forwardPE ?? null,
        forwardEps: p?.forwardEps ?? null,
        ebitda: null,
        dividendYield: p?.dividendYield ?? null,
        sector: entry.sector || 'Other',
        industry: entry.industry || '',
        exchange: entry.exchange || 'US',
        country: entry.country || 'US',
        volume: p?.volume ?? 0,
        avgVolume: p?.avgVolume ?? 0,
        dayHigh: p?.dayHigh ?? 0,
        dayLow: p?.dayLow ?? 0,
        yearHigh: p?.yearHigh ?? 0,
        yearLow: p?.yearLow ?? 0,
        logo: `/data/logos/${entry.ticker.split('.')[0]}.png`,
      }
    })

    // Sort by market cap descending; use sharesOutstanding as tiebreaker when no price data
    const sharesMap = new Map(index.map(e => [e.ticker, e.sharesOutstanding || 0]))
    stocks.sort((a, b) => {
      const capDiff = (b.marketCap || 0) - (a.marketCap || 0)
      if (capDiff !== 0) return capDiff
      return (sharesMap.get(b.symbol) || 0) - (sharesMap.get(a.symbol) || 0)
    })

    console.log(`[API] Returned ${stocks.length} stocks in ${Date.now() - startTime}ms (cache: ${cache?.updatedAt || 'none'})`)

    return NextResponse.json({
      data: stocks,
      source: cache ? 'cache' : 'static',
      pricesUpdatedAt: cache?.updatedAt || null,
      stockCount: stocks.length,
      responseTime: Date.now() - startTime,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json({
      data: [],
      source: 'error',
      stockCount: 0,
      responseTime: Date.now() - startTime,
      error: 'Failed to fetch stock data',
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
