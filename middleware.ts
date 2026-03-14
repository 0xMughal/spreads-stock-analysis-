import { NextResponse } from "next/server"
import { auth } from "@/auth"

// Routes that are always public
const publicRoutes = [
  "/",
  "/login",
  "/stock",
  "/api/auth",
  "/api/stocks",
  "/api/nasdaq100",
  "/api/international",
  "/api/cron",
  "/api/debug-auth",
  "/api/historical-pe",
  "/api/revenue-growth",
  "/api/reddit-sentiment",
  "/api/reddit-trending",
  "/api/trending",
  "/api/sp500-pe",
  "/api/refresh",
  "/api/v1",
  "/api/v2",
  "/api/ingest",
  "/api/dividends",
  "/api/earnings",
  "/api/compound-calculations",
  "/api/portfolio",
  "/api/watchlist",
  "/api/insider-trades",
  "/api/news",
  "/watchlist",
  "/screener",
  "/insiders",
  "/compare",
  "/data",
]

// Admin-only routes
const adminRoutes = [
  "/admin",
  "/api/admin",
]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const isAdmin = req.auth?.user?.isAdmin

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // Check if route is admin-only
  const isAdminRoute = adminRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Handle admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      }
      const loginUrl = new URL("/login", req.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (!isAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        )
      }
      return NextResponse.redirect(new URL("/", req.url))
    }
    return NextResponse.next()
  }

  // Handle all other protected routes
  if (!isLoggedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
