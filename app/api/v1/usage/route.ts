import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, createAuthErrorResponse, isKVAvailable } from '@/lib/middleware/auth'
import { getUsageStats } from '@/lib/middleware/rateLimit'
import { RATE_LIMITS } from '@/lib/types/api'

/**
 * GET /api/v1/usage
 * Get usage statistics for the authenticated API key
 *
 * Query params:
 * - days: Number of days to retrieve (default: 30, max: 90)
 */
export async function GET(request: NextRequest) {
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

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get('days')
    const days = Math.min(parseInt(daysParam || '30'), 90)

    // Get usage stats
    const stats = await getUsageStats(apiKey!, days)

    // Calculate totals
    const totalRequests = Object.values(stats).reduce((sum, count) => sum + count, 0)
    const avgRequestsPerDay = totalRequests / days

    // Get rate limits for user's tier
    const limits = RATE_LIMITS[user!.tier]

    // Calculate today's usage
    const today = new Date()
    const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`
    const todayRequests = stats[todayKey] || 0

    return NextResponse.json({
      data: {
        tier: user!.tier,
        limits: {
          requestsPerMinute: limits.requestsPerMinute,
          requestsPerDay: limits.requestsPerDay,
          requestsPerMonth: limits.requestsPerMonth,
          cacheTTL: limits.cacheTTL,
        },
        usage: {
          today: {
            requests: todayRequests,
            remaining: Math.max(0, limits.requestsPerDay - todayRequests),
            percentUsed: (todayRequests / limits.requestsPerDay * 100).toFixed(1),
          },
          history: stats,
          period: {
            days,
            totalRequests,
            avgRequestsPerDay: parseFloat(avgRequestsPerDay.toFixed(1)),
          },
        },
        apiKey: {
          key: `${apiKey!.key.substring(0, 20)}...`,
          createdAt: apiKey!.createdAt,
          lastUsedAt: apiKey!.lastUsedAt,
        },
      },
    })
  } catch (error) {
    console.error('[API v1] Usage error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'
