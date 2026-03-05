import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Stock } from '@/lib/types'
import { authenticateRequest, createAuthErrorResponse, isKVAvailable } from '@/lib/middleware/auth'
import { checkRateLimit, checkDailyLimit, trackUsage, createRateLimitResponse } from '@/lib/middleware/rateLimit'

interface CachedData {
  stocks: Stock[]
  timestamp: number
}

/**
 * GET /api/v1/quote/{symbol}
 * Fetch a single stock quote
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const startTime = Date.now()
  const { symbol } = await params

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
    // Get stock from cache
    const cached = await kv.get<CachedData>('stocks:sp500')

    if (!cached || !cached.stocks) {
      return NextResponse.json(
        { error: 'Data not available' },
        { status: 503 }
      )
    }

    const stock = cached.stocks.find(s => s.symbol === symbol.toUpperCase())

    if (!stock) {
      return NextResponse.json(
        { error: `Stock symbol '${symbol}' not found in S&P 500` },
        { status: 404 }
      )
    }

    const responseTime = Date.now() - startTime

    return NextResponse.json(
      {
        data: stock,
        meta: {
          cached: true,
          cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
          source: 'live',
          responseTime,
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
    console.error('[API v1] Quote error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'
