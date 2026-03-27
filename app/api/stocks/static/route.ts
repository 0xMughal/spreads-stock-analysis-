import { NextResponse } from 'next/server'
import { Stock } from '@/lib/types'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

/**
 * GET /api/stocks/static
 * Returns stock data instantly from primary-stocks.json.
 * No external API calls — sub-10ms response.
 */
export async function GET() {
  try {
    const primaryPath = path.join(process.cwd(), 'public', 'data', 'primary-stocks.json')
    const fallbackPath = path.join(process.cwd(), 'public', 'data', 'stocks', 'index.json')
    const filePath = existsSync(primaryPath) ? primaryPath : fallbackPath
    const raw = readFileSync(filePath, 'utf-8')
    const index = JSON.parse(raw) as Array<{
      ticker: string
      name: string
      sector: string | null
      industry?: string | null
      country?: string | null
      exchange?: string | null
      quarters: number
      sharesOutstanding?: number
    }>

    const stocks: Stock[] = index.map((entry) => ({
      symbol: entry.ticker,
      name: entry.name,
      price: 0,
      change: 0,
      changesPercentage: 0,
      marketCap: 0,
      pe: null,
      eps: null,
        forwardPE: null,
        forwardEps: null,
      ebitda: null,
      dividendYield: null,
      sector: entry.sector || 'Other',
      industry: entry.industry || '',
      exchange: entry.exchange || 'US',
      country: entry.country || 'US',
      volume: 0,
      avgVolume: 0,
      dayHigh: 0,
      dayLow: 0,
      yearHigh: 0,
      yearLow: 0,
      logo: `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${entry.ticker}.png`,
    }))

    return NextResponse.json({
      data: stocks,
      source: 'static',
      stockCount: stocks.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('[API/static] Error:', error)
    return NextResponse.json({ data: [], source: 'static', stockCount: 0 })
  }
}
