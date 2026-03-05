/**
 * Your Own Stock API - S&P 500
 *
 * GET /api/v2/stocks
 *
 * This endpoint serves S&P 500 data from YOUR database instead of external APIs.
 *
 * Benefits:
 * - No API rate limits (you own the data)
 * - Faster response times (<50ms vs 200ms from external APIs)
 * - Historical data accumulates over time
 * - 100% uptime (not dependent on third-party services)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isDatabaseConfigured } from '@/lib/db/supabase'
import { getDatasetQuotes } from '@/lib/db/operations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // ===============================================
  // 1. CHECK DATABASE CONFIGURATION
  // ===============================================
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: 'Database not configured',
        message: 'This endpoint requires Supabase database setup',
        fallback: 'Use /api/stocks for external API fallback',
        setup_guide: 'See OWN_API_PLAN.md for setup instructions',
      },
      { status: 503 }
    )
  }

  // ===============================================
  // 2. FETCH FROM YOUR DATABASE
  // ===============================================
  try {
    const quotes = await getDatasetQuotes('sp500')

    if (quotes.length === 0) {
      return NextResponse.json(
        {
          error: 'No data available',
          message: 'Run data ingestion first: POST /api/ingest/stocks',
          data: [],
          stockCount: 0,
        },
        { status: 404 }
      )
    }

    // ===============================================
    // 3. TRANSFORM TO FRONTEND FORMAT
    // ===============================================
    const stocks = quotes.map(quote => ({
      symbol: quote.symbol,
      name: '', // Could join with stocks table if needed
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

    // ===============================================
    // 4. RETURN RESPONSE
    // ===============================================
    return NextResponse.json({
      data: stocks,
      source: 'database', // YOUR database, not external API!
      stockCount: stocks.length,
      responseTime: Date.now() - startTime,
      lastUpdate: quotes[0]?.updated_at || null,
      dataset: 'sp500',
    })
  } catch (error) {
    console.error('Error fetching stocks from database:', error)

    return NextResponse.json(
      {
        error: 'Database query failed',
        message: String(error),
        data: [],
        stockCount: 0,
      },
      { status: 500 }
    )
  }
}
