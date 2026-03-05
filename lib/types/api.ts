// API Authentication & Authorization Types

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise'

export interface ApiKey {
  key: string
  userId: string
  tier: SubscriptionTier
  status: 'active' | 'inactive' | 'revoked'
  createdAt: number
  lastUsedAt: number
  expiresAt?: number
}

export interface User {
  email: string
  tier: SubscriptionTier
  stripeCustomerId?: string
  subscriptionId?: string
  subscriptionStatus?: 'active' | 'canceled' | 'past_due'
  createdAt: number
  updatedAt: number
}

export interface UsageRecord {
  apiKey: string
  date: string // YYYY-MM-DD
  requests: number
}

export interface RateLimitConfig {
  tier: SubscriptionTier
  requestsPerMinute: number
  requestsPerDay: number
  requestsPerMonth: number
  cacheTTL: number // seconds
}

export const RATE_LIMITS: Record<SubscriptionTier, RateLimitConfig> = {
  free: {
    tier: 'free',
    requestsPerMinute: 10,
    requestsPerDay: 100,
    requestsPerMonth: 3000,
    cacheTTL: 600, // 10 minutes
  },
  starter: {
    tier: 'starter',
    requestsPerMinute: 30,
    requestsPerDay: 1000,
    requestsPerMonth: 10000,
    cacheTTL: 300, // 5 minutes
  },
  pro: {
    tier: 'pro',
    requestsPerMinute: 100,
    requestsPerDay: 10000,
    requestsPerMonth: 100000,
    cacheTTL: 60, // 1 minute
  },
  enterprise: {
    tier: 'enterprise',
    requestsPerMinute: 500,
    requestsPerDay: 50000,
    requestsPerMonth: 1000000,
    cacheTTL: 15, // 15 seconds
  },
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  meta?: {
    cached: boolean
    cacheAge?: number
    source: 'live' | 'cached' | 'mock'
    responseTime: number
    stockCount?: number
    rateLimit?: {
      limit: number
      remaining: number
      reset: number
    }
  }
}

export interface AuthenticatedRequest {
  apiKey: ApiKey
  user: User
}
