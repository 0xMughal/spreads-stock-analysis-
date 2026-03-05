import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Stock } from '@/lib/types'
import { authenticateRequest, createAuthErrorResponse, isKVAvailable } from '@/lib/middleware/auth'
import { checkRateLimit, checkDailyLimit, trackUsage, createRateLimitResponse } from '@/lib/middleware/rateLimit'

interface CachedData {
  stocks: Stock[]
  timestamp: number
}

interface SectorMetrics {
  sector: string
  stockCount: number
  totalMarketCap: number
  avgChange: number
  avgChangesPercentage: number
  topGainers: Stock[]
  topLosers: Stock[]
}

/**
 * GET /api/v1/sectors
 * Get aggregated sector performance metrics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  if (!isKVAvailable()) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 }
    )
  }

  // Authenticate request
  const authResult = await authenticateRequest(request)
  if (!authResult.success) {
    return createAuthErrorResponse(authResult)
  }

  const { apiKey } = authResult

  // Check rate limits
  const rateLimitResult = await checkRateLimit(apiKey!)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }

  // Check daily limit
  const dailyLimitResult = await checkDailyLimit(apiKey!)
  if (!dailyLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Daily limit exceeded',
        message: `You have exceeded your daily limit of ${dailyLimitResult.limit} requests`,
        limit: dailyLimitResult.limit,
        remaining: 0,
      },
      { status: 429 }
    )
  }

  // Track usage
  trackUsage(apiKey!).catch(err => console.error('Failed to track usage:', err))

  try {
    // Get stocks from cache
    const cached = await kv.get<CachedData>('stocks:sp500')

    if (!cached || !cached.stocks) {
      return NextResponse.json(
        { error: 'Data not available' },
        { status: 503 }
      )
    }

    // Group stocks by sector
    const sectorMap = new Map<string, Stock[]>()

    for (const stock of cached.stocks) {
      const sector = stock.sector || 'Other'
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, [])
      }
      sectorMap.get(sector)!.push(stock)
    }

    // Calculate sector metrics
    const sectors: SectorMetrics[] = []

    for (const [sector, stocks] of sectorMap.entries()) {
      const totalMarketCap = stocks.reduce((sum, s) => sum + s.marketCap, 0)
      const avgChange = stocks.reduce((sum, s) => sum + s.change, 0) / stocks.length
      const avgChangesPercentage = stocks.reduce((sum, s) => sum + s.changesPercentage, 0) / stocks.length

      // Sort by change percentage
      const sorted = [...stocks].sort((a, b) => b.changesPercentage - a.changesPercentage)

      sectors.push({
        sector,
        stockCount: stocks.length,
        totalMarketCap,
        avgChange: parseFloat(avgChange.toFixed(2)),
        avgChangesPercentage: parseFloat(avgChangesPercentage.toFixed(2)),
        topGainers: sorted.slice(0, 3),
        topLosers: sorted.slice(-3).reverse(),
      })
    }

    // Sort sectors by average change percentage
    sectors.sort((a, b) => b.avgChangesPercentage - a.avgChangesPercentage)

    const responseTime = Date.now() - startTime

    return NextResponse.json(
      {
        data: sectors,
        meta: {
          cached: true,
          cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
          source: 'live',
          responseTime,
          sectorCount: sectors.length,
          rateLimit: {
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            reset: rateLimitResult.reset,
          },
        },
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    )
  } catch (error) {
    console.error('[API v1] Sectors error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'
