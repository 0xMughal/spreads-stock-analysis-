import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Stock } from '@/lib/types'
import { authenticateRequest, createAuthErrorResponse, isKVAvailable } from '@/lib/middleware/auth'
import { checkRateLimit, checkDailyLimit, trackUsage, createRateLimitResponse } from '@/lib/middleware/rateLimit'
import { RATE_LIMITS } from '@/lib/types/api'

interface CachedData {
  stocks: Stock[]
  timestamp: number
}

/**
 * GET /api/v1/nasdaq100
 * Bulk endpoint to fetch all NASDAQ-100 stocks
 *
 * Query params:
 * - fields: Comma-separated list of fields to include (e.g., "symbol,price,change")
 * - sectors: Comma-separated list of sectors to filter by (e.g., "Technology,Healthcare")
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

  const { apiKey, user } = authResult

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
    // Get cache TTL based on user tier
    const cacheTTL = RATE_LIMITS[user!.tier].cacheTTL
    const cacheKey = `stocks:nasdaq100:${user!.tier}`

    // Try to get cached data
    const cached = await kv.get<CachedData>(cacheKey)

    let stocks: Stock[] = []
    let fromCache = false
    let cacheAge = 0

    if (cached && cached.stocks && cached.stocks.length > 0) {
      stocks = cached.stocks
      fromCache = true
      cacheAge = Math.round((Date.now() - cached.timestamp) / 1000)
      console.log(`[API v1] NASDAQ-100 cache hit for tier ${user!.tier} - ${stocks.length} stocks, age: ${cacheAge}s`)
    } else {
      // Cache miss - try to get from the free tier cache
      const freeCache = await kv.get<CachedData>('stocks:nasdaq100')

      if (freeCache && freeCache.stocks && freeCache.stocks.length > 0) {
        stocks = freeCache.stocks
        fromCache = true
        cacheAge = Math.round((Date.now() - freeCache.timestamp) / 1000)
        console.log(`[API v1] Using fallback NASDAQ-100 cache - ${stocks.length} stocks`)

        // Store in tier-specific cache
        await kv.set(cacheKey, { stocks, timestamp: Date.now() }, { ex: cacheTTL })
      } else {
        return NextResponse.json(
          {
            error: 'Data not available',
            message: 'NASDAQ-100 data is being fetched. Please try again in a few moments.',
          },
          { status: 503 }
        )
      }
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const fieldsParam = searchParams.get('fields')
    const sectorsParam = searchParams.get('sectors')

    // Filter by sectors if specified
    if (sectorsParam) {
      const sectors = sectorsParam.split(',').map(s => s.trim())
      stocks = stocks.filter(stock => sectors.includes(stock.sector))
    }

    // Filter fields if specified
    if (fieldsParam) {
      const fields = fieldsParam.split(',').map(f => f.trim())
      stocks = stocks.map(stock => {
        const filtered: any = {}
        fields.forEach(field => {
          if (field in stock) {
            filtered[field] = stock[field as keyof Stock]
          }
        })
        return filtered as Stock
      })
    }

    const responseTime = Date.now() - startTime

    return NextResponse.json(
      {
        data: stocks,
        meta: {
          cached: fromCache,
          cacheAge: fromCache ? cacheAge : undefined,
          source: 'live',
          responseTime,
          stockCount: stocks.length,
          index: 'NASDAQ-100',
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
          'Cache-Control': `public, s-maxage=${cacheTTL}, stale-while-revalidate=300`,
        },
      }
    )
  } catch (error) {
    console.error('[API v1] NASDAQ-100 error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'
