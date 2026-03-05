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
 * GET /api/v1/batch?symbols=AAPL,MSFT,GOOGL
 * Fetch multiple stock quotes (up to 50)
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
    // Parse symbols parameter
    const { searchParams } = new URL(request.url)
    const symbolsParam = searchParams.get('symbols')

    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'Missing required parameter: symbols' },
        { status: 400 }
      )
    }

    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).slice(0, 50)

    if (symbols.length === 0) {
      return NextResponse.json(
        { error: 'No valid symbols provided' },
        { status: 400 }
      )
    }

    // Get stocks from cache
    const cached = await kv.get<CachedData>('stocks:sp500')

    if (!cached || !cached.stocks) {
      return NextResponse.json(
        { error: 'Data not available' },
        { status: 503 }
      )
    }

    const stocks = cached.stocks.filter(s => symbols.includes(s.symbol))
    const notFound = symbols.filter(symbol => !stocks.find(s => s.symbol === symbol))

    const responseTime = Date.now() - startTime

    return NextResponse.json(
      {
        data: stocks,
        meta: {
          cached: true,
          cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
          source: 'live',
          responseTime,
          stockCount: stocks.length,
          requested: symbols.length,
          notFound: notFound.length > 0 ? notFound : undefined,
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
    console.error('[API v1] Batch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'
