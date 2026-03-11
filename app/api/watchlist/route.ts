import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { kv } from "@vercel/kv"

// GET /api/watchlist - Fetch user's watchlist symbols
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const watchlistKey = `watchlist:${session.user.email}`
    const symbols = await kv.get<string[]>(watchlistKey)

    return NextResponse.json({
      symbols: symbols || [],
      timestamp: Date.now()
    })

  } catch (error) {
    console.error("Error fetching watchlist:", error)
    return NextResponse.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 }
    )
  }
}

// POST /api/watchlist - Add a symbol to user's watchlist
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { symbol } = body

    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json(
        { error: "Invalid symbol" },
        { status: 400 }
      )
    }

    const watchlistKey = `watchlist:${session.user.email}`
    const existing = await kv.get<string[]>(watchlistKey)
    const symbols = existing || []

    // Don't add duplicates
    if (symbols.includes(symbol.toUpperCase())) {
      return NextResponse.json({
        symbols,
        timestamp: Date.now()
      })
    }

    const updated = [...symbols, symbol.toUpperCase()]
    await kv.set(watchlistKey, updated)

    return NextResponse.json({
      symbols: updated,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error("Error adding to watchlist:", error)
    return NextResponse.json(
      { error: "Failed to add to watchlist" },
      { status: 500 }
    )
  }
}

// DELETE /api/watchlist - Remove a symbol from user's watchlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { symbol } = body

    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json(
        { error: "Invalid symbol" },
        { status: 400 }
      )
    }

    const watchlistKey = `watchlist:${session.user.email}`
    const existing = await kv.get<string[]>(watchlistKey)

    if (!existing) {
      return NextResponse.json({
        symbols: [],
        timestamp: Date.now()
      })
    }

    const updated = existing.filter(s => s !== symbol.toUpperCase())
    await kv.set(watchlistKey, updated)

    return NextResponse.json({
      symbols: updated,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error("Error removing from watchlist:", error)
    return NextResponse.json(
      { error: "Failed to remove from watchlist" },
      { status: 500 }
    )
  }
}
