import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Stock } from '@/lib/types'

interface CachedData {
  stocks: Stock[]
  timestamp: number
}

/**
 * Check if Vercel KV is available
 */
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/**
 * GET /api/international
 * Public endpoint to fetch International stocks (no auth required)
 * Used by the frontend dashboard
 */
export async function GET() {
  const startTime = Date.now()

  try {
    // Try to get cached data from Vercel KV (if available)
    if (isKVAvailable()) {
      try {
        const cached = (await kv.get<CachedData>('stocks:international'))
          ?? (await kv.get<CachedData>('stocks:international:free'))

        if (cached && cached.stocks && cached.stocks.length > 0) {
          const cacheAge = Math.round((Date.now() - cached.timestamp) / 1000)
          console.log(`[API] International cache hit - ${cached.stocks.length} stocks, age: ${cacheAge}s`)

          return NextResponse.json({
            data: cached.stocks,
            source: 'live',
            cached: true,
            cacheAge,
            stockCount: cached.stocks.length,
            responseTime: Date.now() - startTime,
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            }
          })
        }
      } catch (kvError) {
        console.error('[API] KV error, continuing without cache:', kvError)
      }
    }

    // If no cache, return empty array with message
    return NextResponse.json({
      data: [],
      source: 'cache',
      cached: false,
      stockCount: 0,
      responseTime: Date.now() - startTime,
      message: 'International data not available. Run the cron job to populate cache.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60',
      }
    })

  } catch (error) {
    console.error('[API] International error:', error)

    return NextResponse.json({
      data: [],
      source: 'error',
      cached: false,
      stockCount: 0,
      responseTime: Date.now() - startTime,
      error: 'Failed to fetch International data',
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'public, s-maxage=60',
      }
    })
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// ISR revalidation every 5 minutes
export const revalidate = 300
