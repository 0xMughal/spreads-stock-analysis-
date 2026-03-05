import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { ApiKey, User } from '@/lib/types/api'
import { generateApiKey, hashEmail } from '@/lib/utils/crypto'
import { isKVAvailable } from '@/lib/middleware/auth'

export async function POST(request: NextRequest) {
  try {
    if (!isKVAvailable()) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { email, keyType = 'test' } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate key type
    if (keyType !== 'test' && keyType !== 'live') {
      return NextResponse.json(
        { error: 'Invalid key type. Must be "test" or "live"' },
        { status: 400 }
      )
    }

    // Generate user ID from email hash
    const userId = await hashEmail(email)

    // Check if user exists
    let user = await kv.hget<User>('users', userId)

    if (!user) {
      // Create new user
      user = {
        email: email.toLowerCase(),
        tier: 'free',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await kv.hset('users', { [userId]: user })
    }

    // Generate API key
    const apiKeyString = generateApiKey(keyType)
    const apiKey: ApiKey = {
      key: apiKeyString,
      userId,
      tier: user.tier,
      status: 'active',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    }

    // Store API key
    await kv.hset('api_keys', { [apiKeyString]: apiKey })

    return NextResponse.json(
      {
        success: true,
        apiKey: apiKeyString,
        tier: user.tier,
        message: 'API key created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    )
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'
