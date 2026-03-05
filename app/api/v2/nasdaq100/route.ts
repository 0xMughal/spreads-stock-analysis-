/**
 * Your Own Stock API - NASDAQ-100
 *
 * GET /api/v2/nasdaq100
 *
 * Serves NASDAQ-100 data from YOUR database.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isDatabaseConfigured } from '@/lib/db/supabase'
import { getDatasetQuotes } from '@/lib/db/operations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: 'Database not configured',
        fallback: 'Use /api/nasdaq100 for external API fallback',
      },
      { status: 503 }
    )
  }

  try {
    const quotes = await getDatasetQuotes('nasdaq100')

    if (quotes.length === 0) {
      return NextResponse.json(
        {
          error: 'No data available',
          message: 'Run data ingestion first: POST /api/ingest/stocks',
          data: [],
        },
        { status: 404 }
      )
    }

    const stocks = quotes.map(quote => ({
      symbol: quote.symbol,
      name: '',
      price: Number(quote.price),
      change: Number(quote.change || 0),
      changesPercentage: Number(quote.change_percent || 0),
      marketCap: Number(quote.market_cap || 0),
      PE: Number(quote.pe_ratio || 0),
      volume: Number(quote.volume || 0),
      avgVolume: Number(quote.avg_volume || 0),
      dayHigh: Number(quote.day_high || 0),
      dayLow: Number(quote.day_low || 0),
      yearHigh: Number(quote.year_high || 0),
      yearLow: Number(quote.year_low || 0),
      sector: '',
      industry: '',
      exchange: '',
    }))

    return NextResponse.json({
      data: stocks,
      source: 'database',
      stockCount: stocks.length,
      responseTime: Date.now() - startTime,
      lastUpdate: quotes[0]?.updated_at || null,
      dataset: 'nasdaq100',
    })
  } catch (error) {
    console.error('Error fetching NASDAQ-100 from database:', error)
    return NextResponse.json(
      { error: 'Database query failed', data: [] },
      { status: 500 }
    )
  }
}
