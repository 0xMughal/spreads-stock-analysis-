import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { fetchAllQuotes, YahooQuote } from '@/lib/yahoo'
import { Stock } from '@/lib/types'

// We'll import the stock list once it's ready — for now use a dynamic import
// import { ALL_SYMBOLS, STOCK_METADATA } from '@/lib/data/stocks-1000'

const CACHE_KEY_ALL = 'stocks:all'
const CACHE_KEY_SP500 = 'stocks:sp500'
const CACHE_KEY_NASDAQ = 'stocks:nasdaq100'
const CACHE_TTL = 86400 // 24 hours

interface CachedData {
  stocks: Stock[]
  timestamp: number
}

function yahooToStock(q: YahooQuote, metadata?: { name: string; sector: string; industry: string }): Stock | null {
  if (!q.regularMarketPrice || q.regularMarketPrice === 0) return null

  return {
    symbol: q.symbol,
    name: q.longName || q.shortName || metadata?.name || q.symbol,
    price: q.regularMarketPrice,
    change: q.regularMarketChange || 0,
    changesPercentage: q.regularMarketChangePercent || 0,
    marketCap: q.marketCap || 0,
    pe: q.trailingPE || null,
    eps: q.epsTrailingTwelveMonths || null,
    ebitda: null,
    dividendYield: q.trailingAnnualDividendYield ? q.trailingAnnualDividendYield * 100 : null,
    sector: metadata?.sector || q.sector || 'Other',
    industry: metadata?.industry || q.industry || '',
    exchange: 'US',
    volume: q.regularMarketVolume || 0,
    avgVolume: q.averageDailyVolume3Month || 0,
    dayHigh: q.regularMarketDayHigh || q.regularMarketPrice,
    dayLow: q.regularMarketDayLow || q.regularMarketPrice,
    yearHigh: q.fiftyTwoWeekHigh || q.regularMarketPrice * 1.1,
    yearLow: q.fiftyTwoWeekLow || q.regularMarketPrice * 0.9,
    logo: `https://logo.clearbit.com/${q.symbol.toLowerCase()}.com`,
  }
}

/**
 * GET /api/refresh
 *
 * Fetches all stocks from Yahoo Finance and caches in Vercel KV for 24 hours.
 * Call this once per day (manually or via cron).
 */
export async function GET() {
  const startTime = Date.now()

  try {
    // Dynamically import the stock list
    let ALL_SYMBOLS: string[]
    let STOCK_METADATA: Record<string, { name: string; sector: string; industry: string }>

    try {
      const mod = await import('@/lib/data/stocks-1000')
      ALL_SYMBOLS = mod.ALL_SYMBOLS
      STOCK_METADATA = mod.STOCK_METADATA
    } catch {
      // Fallback to existing lists if stocks-1000 isn't ready yet
      const sp500 = await import('@/lib/data/sp500-full')
      const nasdaq = await import('@/lib/data/nasdaq100')

      const combined = new Map<string, { name: string; sector: string; industry: string }>()
      for (const s of sp500.SP500_STOCKS) {
        combined.set(s.symbol, { name: s.name, sector: s.sector, industry: s.industry })
      }
      for (const s of nasdaq.NASDAQ100_STOCKS) {
        if (!combined.has(s.symbol)) {
          combined.set(s.symbol, { name: s.name, sector: s.sector, industry: s.industry })
        }
      }

      ALL_SYMBOLS = Array.from(combined.keys())
      STOCK_METADATA = Object.fromEntries(combined)
    }

    console.log(`[Refresh] Starting fetch for ${ALL_SYMBOLS.length} stocks via Yahoo Finance...`)

    // Fetch all quotes from Yahoo Finance
    const quotes = await fetchAllQuotes(ALL_SYMBOLS)

    // Convert to Stock objects
    const stocks: Stock[] = []
    for (const q of quotes) {
      const meta = STOCK_METADATA[q.symbol]
      const stock = yahooToStock(q, meta)
      if (stock) stocks.push(stock)
    }

    // Sort by market cap
    stocks.sort((a, b) => b.marketCap - a.marketCap)

    console.log(`[Refresh] Converted ${stocks.length} valid stocks`)

    // Store in Vercel KV
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const data: CachedData = { stocks, timestamp: Date.now() }

      // Store the full dataset
      await kv.set(CACHE_KEY_ALL, data, { ex: CACHE_TTL })

      // Also update the individual dataset caches for backward compatibility
      const sp500Symbols = new Set((await import('@/lib/data/sp500-full')).SP500_SYMBOLS)
      const nasdaqSymbols = new Set((await import('@/lib/data/nasdaq100')).NASDAQ100_STOCKS.map((s: { symbol: string }) => s.symbol))

      const sp500Stocks = stocks.filter(s => sp500Symbols.has(s.symbol))
      const nasdaqStocks = stocks.filter(s => nasdaqSymbols.has(s.symbol))

      await Promise.all([
        kv.set(CACHE_KEY_SP500, { stocks: sp500Stocks, timestamp: Date.now() }, { ex: CACHE_TTL }),
        kv.set(CACHE_KEY_NASDAQ, { stocks: nasdaqStocks, timestamp: Date.now() }, { ex: CACHE_TTL }),
        kv.set('stocks:nasdaq100:free', { stocks: nasdaqStocks, timestamp: Date.now() }, { ex: CACHE_TTL }),
      ])

      console.log(`[Refresh] Cached: ${stocks.length} all, ${sp500Stocks.length} SP500, ${nasdaqStocks.length} NASDAQ`)
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    return NextResponse.json({
      success: true,
      stockCount: stocks.length,
      elapsed: `${elapsed}s`,
      timestamp: new Date().toISOString(),
      breakdown: {
        total: stocks.length,
        withPrice: stocks.filter(s => s.price > 0).length,
        withPE: stocks.filter(s => s.pe !== null).length,
        withDividend: stocks.filter(s => s.dividendYield !== null).length,
      },
    })
  } catch (error) {
    console.error('[Refresh] Error:', error)
    return NextResponse.json(
      { success: false, error: String(error), elapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s` },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for fetching 1000 stocks
