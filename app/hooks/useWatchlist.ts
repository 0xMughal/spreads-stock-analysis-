'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

const LOCAL_STORAGE_KEY = 'spreads_watchlist'

function getLocalWatchlist(): string[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function setLocalWatchlist(symbols: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(symbols))
  } catch { /* */ }
}

export function useWatchlist() {
  const { data: session, status } = useSession()
  const isLoggedIn = status === 'authenticated' && !!session?.user?.email
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const prevRef = useRef<string[]>([])

  // Fetch watchlist on mount / auth change
  useEffect(() => {
    if (status === 'loading') return

    if (isLoggedIn) {
      setLoading(true)
      fetch('/api/watchlist')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const symbols = data?.symbols || []
          setWatchlist(symbols)
          prevRef.current = symbols
        })
        .catch(() => {
          // Fall back to localStorage if API fails
          const local = getLocalWatchlist()
          setWatchlist(local)
          prevRef.current = local
        })
        .finally(() => setLoading(false))
    } else {
      const local = getLocalWatchlist()
      setWatchlist(local)
      prevRef.current = local
      setLoading(false)
    }
  }, [isLoggedIn, status])

  const isInWatchlist = useCallback(
    (symbol: string) => watchlist.includes(symbol.toUpperCase()),
    [watchlist]
  )

  const toggleWatchlist = useCallback(
    async (symbol: string) => {
      const upper = symbol.toUpperCase()
      const isAdding = !watchlist.includes(upper)

      // Optimistic update
      const optimistic = isAdding
        ? [...watchlist, upper]
        : watchlist.filter(s => s !== upper)

      prevRef.current = watchlist
      setWatchlist(optimistic)

      if (!isLoggedIn) {
        // Just use localStorage
        setLocalWatchlist(optimistic)
        return
      }

      // Also save to localStorage as backup
      setLocalWatchlist(optimistic)

      try {
        const res = isAdding
          ? await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ symbol: upper }),
            })
          : await fetch('/api/watchlist', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ symbol: upper }),
            })

        if (!res.ok) throw new Error('API error')

        const data = await res.json()
        const serverSymbols = data.symbols || optimistic
        setWatchlist(serverSymbols)
        setLocalWatchlist(serverSymbols)
      } catch {
        // Revert on error
        setWatchlist(prevRef.current)
        setLocalWatchlist(prevRef.current)
      }
    },
    [watchlist, isLoggedIn]
  )

  return { watchlist, isInWatchlist, toggleWatchlist, loading }
}
