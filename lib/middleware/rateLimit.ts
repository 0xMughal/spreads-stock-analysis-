import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server'
import { ApiKey, RATE_LIMITS } from '@/lib/types/api'

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp when limit resets
  error?: string
}

/**
 * Get current minute key for rate limiting
 */
function getCurrentMinuteKey(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const hour = String(now.getUTCHours()).padStart(2, '0')
  const minute = String(now.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}-${hour}-${minute}`
}

/**
 * Get current day key for usage tracking
 */
function getCurrentDayKey(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Get reset timestamp for current minute
 */
function getResetTimestamp(): number {
  const now = new Date()
  const resetTime = new Date(now)
  resetTime.setUTCSeconds(59, 999)
  return Math.floor(resetTime.getTime() / 1000)
}

/**
 * Check rate limit for API key
 */
export async function checkRateLimit(apiKey: ApiKey): Promise<RateLimitResult> {
  const config = RATE_LIMITS[apiKey.tier]
  const minuteKey = getCurrentMinuteKey()
  const rateLimitKey = `ratelimit:${apiKey.key}:${minuteKey}`

  try {
    // Get current request count for this minute
    const currentCount = await kv.get<number>(rateLimitKey) || 0

    if (currentCount >= config.requestsPerMinute) {
      return {
        success: false,
        limit: config.requestsPerMinute,
        remaining: 0,
        reset: getResetTimestamp(),
        error: 'Rate limit exceeded',
      }
    }

    // Increment counter (with 2-minute TTL to auto-cleanup)
    await kv.incr(rateLimitKey)
    await kv.expire(rateLimitKey, 120)

    return {
      success: true,
      limit: config.requestsPerMinute,
      remaining: config.requestsPerMinute - currentCount - 1,
      reset: getResetTimestamp(),
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // On error, allow request but log it
    return {
      success: true,
      limit: config.requestsPerMinute,
      remaining: config.requestsPerMinute,
      reset: getResetTimestamp(),
    }
  }
}

/**
 * Track usage for billing/analytics
 */
export async function trackUsage(apiKey: ApiKey): Promise<void> {
  const dayKey = getCurrentDayKey()
  const usageKey = `usage:${apiKey.key}:${dayKey}`

  try {
    await kv.incr(usageKey)
    // Set 35-day TTL for usage data
    await kv.expire(usageKey, 35 * 24 * 60 * 60)
  } catch (error) {
    console.error('Usage tracking error:', error)
  }
}

/**
 * Get usage stats for API key
 */
export async function getUsageStats(apiKey: ApiKey, days: number = 30): Promise<Record<string, number>> {
  const stats: Record<string, number> = {}
  const now = new Date()

  try {
    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setUTCDate(date.getUTCDate() - i)

      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const dayKey = `${year}-${month}-${day}`

      const usageKey = `usage:${apiKey.key}:${dayKey}`
      const count = await kv.get<number>(usageKey) || 0

      stats[dayKey] = count
    }
  } catch (error) {
    console.error('Get usage stats error:', error)
  }

  return stats
}

/**
 * Check daily usage limit
 */
export async function checkDailyLimit(apiKey: ApiKey): Promise<RateLimitResult> {
  const config = RATE_LIMITS[apiKey.tier]
  const dayKey = getCurrentDayKey()
  const usageKey = `usage:${apiKey.key}:${dayKey}`

  try {
    const currentCount = await kv.get<number>(usageKey) || 0

    if (currentCount >= config.requestsPerDay) {
      // Get midnight reset time
      const now = new Date()
      const resetTime = new Date(now)
      resetTime.setUTCDate(resetTime.getUTCDate() + 1)
      resetTime.setUTCHours(0, 0, 0, 0)

      return {
        success: false,
        limit: config.requestsPerDay,
        remaining: 0,
        reset: Math.floor(resetTime.getTime() / 1000),
        error: 'Daily limit exceeded',
      }
    }

    return {
      success: true,
      limit: config.requestsPerDay,
      remaining: config.requestsPerDay - currentCount,
      reset: 0, // Not applicable for daily limit
    }
  } catch (error) {
    console.error('Daily limit check error:', error)
    return {
      success: true,
      limit: config.requestsPerDay,
      remaining: config.requestsPerDay,
      reset: 0,
    }
  }
}

/**
 * Create rate limit error response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: result.error,
      message: result.error,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': '60',
      },
    }
  )
}
