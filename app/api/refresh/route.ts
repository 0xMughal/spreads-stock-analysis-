import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { fetchAllQuotes, YahooQuote } from '@/lib/yahoo'
import { Stock } from '@/lib/types'

const CACHE_KEY_ALL = 'stocks:all'
const CACHE_KEY_SP500 = 'stocks:sp500'
const CACHE_KEY_NASDAQ = 'stocks:nasdaq100'
const CACHE_TTL = 86400 // 24 hours

interface CachedData {
  stocks: Stock[]
  timestamp: number
}

function quoteToStock(
  q: YahooQuote,
  meta?: { name: string; sector: string; industry: string }
): Stock {
  return {
    symbol: q.symbol,
    name: q.longName || q.shortName || meta?.name || q.symbol,
    price: q.price,
    change: q.change,
    changesPercentage: q.changePercent,
    marketCap: q.marketCap || 0,
    pe: q.trailingPE || null,
    eps: q.epsTrailingTwelveMonths || null,
    ebitda: null,
    dividendYield: q.dividendYield || null,
    sector: meta?.sector || 'Other',
    industry: meta?.industry || '',
    exchange: 'US',
    volume: q.volume || 0,
    avgVolume: 0,
    dayHigh: q.dayHigh,
    dayLow: q.dayLow,
    yearHigh: q.fiftyTwoWeekHigh || q.price * 1.1,
    yearLow: q.fiftyTwoWeekLow || q.price * 0.9,
    logo: `https://logo.clearbit.com/${q.symbol.toLowerCase()}.com`,
  }
}

/**
 * GET /api/refresh
 *
 * Scrapes stock prices from Yahoo Finance chart endpoint and caches for 24h.
 * No API key needed. Runs ~50 concurrent requests per batch.
 */
export async function GET() {
  const startTime = Date.now()

  try {
    // Load stock list and metadata
    let ALL_SYMBOLS: string[]
    let STOCK_METADATA: Record<string, { name: string; sector: string; industry: string }>

    try {
      const mod = await import('@/lib/data/stocks-1000')
      ALL_SYMBOLS = mod.ALL_SYMBOLS
      STOCK_METADATA = mod.STOCK_METADATA
    } catch {
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

    console.log(`[Refresh] Fetching ${ALL_SYMBOLS.length} stocks from Yahoo Finance...`)

    const quotes = await fetchAllQuotes(ALL_SYMBOLS)

    // Convert to Stock objects, enriching with our metadata
    const stocks: Stock[] = quotes.map(q => {
      const meta = STOCK_METADATA[q.symbol]
      return quoteToStock(q, meta)
    })

    // Sort by market cap (stocks without market cap go to end)
    stocks.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))

    console.log(`[Refresh] Got ${stocks.length} stocks with prices`)

    // Cache in Vercel KV
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const data: CachedData = { stocks, timestamp: Date.now() }
      await kv.set(CACHE_KEY_ALL, data, { ex: CACHE_TTL })

      // Also update legacy cache keys
      try {
        const sp500Symbols = new Set(
          (await import('@/lib/data/sp500-full')).SP500_SYMBOLS
        )
        const nasdaqSymbols = new Set(
          (await import('@/lib/data/nasdaq100')).NASDAQ100_STOCKS.map(
            (s: { symbol: string }) => s.symbol
          )
        )

        const sp500Stocks = stocks.filter(s => sp500Symbols.has(s.symbol))
        const nasdaqStocks = stocks.filter(s => nasdaqSymbols.has(s.symbol))

        await Promise.all([
          kv.set(CACHE_KEY_SP500, { stocks: sp500Stocks, timestamp: Date.now() }, { ex: CACHE_TTL }),
          kv.set(CACHE_KEY_NASDAQ, { stocks: nasdaqStocks, timestamp: Date.now() }, { ex: CACHE_TTL }),
          kv.set('stocks:nasdaq100:free', { stocks: nasdaqStocks, timestamp: Date.now() }, { ex: CACHE_TTL }),
        ])

        console.log(`[Refresh] Cached: ${stocks.length} total, ${sp500Stocks.length} SP500, ${nasdaqStocks.length} NASDAQ`)
      } catch (e) {
        console.error('[Refresh] Legacy cache update failed:', e)
      }
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
export const maxDuration = 60
