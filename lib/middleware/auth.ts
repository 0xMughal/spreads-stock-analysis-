import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { ApiKey, User } from '@/lib/types/api'

export interface AuthResult {
  success: boolean
  apiKey?: ApiKey
  user?: User
  error?: string
  statusCode?: number
}

/**
 * Extract API key from Authorization header
 */
export function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return null
  }

  // Support both "Bearer sk_..." and "sk_..." formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return authHeader
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  // API keys should be in format: sk_test_xxx or sk_live_xxx
  return /^sk_(test|live)_[a-zA-Z0-9]{32}$/.test(key)
}

/**
 * Authenticate request using API key
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  const apiKeyString = extractApiKey(request)

  if (!apiKeyString) {
    return {
      success: false,
      error: 'Missing API key. Include it in the Authorization header: "Authorization: Bearer sk_..."',
      statusCode: 401,
    }
  }

  if (!isValidApiKeyFormat(apiKeyString)) {
    return {
      success: false,
      error: 'Invalid API key format. Expected: sk_test_xxx or sk_live_xxx',
      statusCode: 401,
    }
  }

  try {
    // Fetch API key from Vercel KV
    const apiKey = await kv.hget<ApiKey>('api_keys', apiKeyString)

    if (!apiKey) {
      return {
        success: false,
        error: 'Invalid API key',
        statusCode: 401,
      }
    }

    // Check if key is active
    if (apiKey.status !== 'active') {
      return {
        success: false,
        error: `API key is ${apiKey.status}`,
        statusCode: 401,
      }
    }

    // Check if key has expired
    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
      return {
        success: false,
        error: 'API key has expired',
        statusCode: 401,
      }
    }

    // Fetch user data
    const user = await kv.hget<User>('users', apiKey.userId)

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        statusCode: 401,
      }
    }

    // Update last used timestamp (async, don't wait)
    kv.hset('api_keys', {
      [apiKeyString]: {
        ...apiKey,
        lastUsedAt: Date.now(),
      },
    }).catch(err => console.error('Failed to update lastUsedAt:', err))

    return {
      success: true,
      apiKey,
      user,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed',
      statusCode: 500,
    }
  }
}

/**
 * Create authentication error response
 */
export function createAuthErrorResponse(authResult: AuthResult): NextResponse {
  return NextResponse.json(
    {
      error: authResult.error,
      message: authResult.error,
    },
    {
      status: authResult.statusCode || 401,
      headers: {
        'WWW-Authenticate': 'Bearer realm="API", charset="UTF-8"',
      },
    }
  )
}

/**
 * Check if Vercel KV is available
 */
export function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}
