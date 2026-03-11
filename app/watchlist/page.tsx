'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import StockLogo from '@/app/components/StockLogo'
import WatchlistButton from '@/app/components/WatchlistButton'
import { useWatchlist } from '@/app/hooks/useWatchlist'
import { useTheme } from '@/app/context/ThemeContext'
import { Stock } from '@/lib/types'
import { formatCurrency, formatLargeCurrency, formatPercent } from '@/lib/utils'

export default function WatchlistPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { status } = useSession()
  const { watchlist, loading: watchlistLoading } = useWatchlist()
  const [allStocks, setAllStocks] = useState<Stock[]>([])
  const [stocksLoading, setStocksLoading] = useState(true)

  const isLoggedIn = status === 'authenticated'

  useEffect(() => {
    fetch('/api/stocks')
      .then(r => r.json())
      .then(data => setAllStocks(data.data || []))
      .catch(() => setAllStocks([]))
      .finally(() => setStocksLoading(false))
  }, [])

  const watchlistedStocks = useMemo(() => {
    if (!watchlist.length || !allStocks.length) return []
    return watchlist
      .map(symbol => allStocks.find(s => s.symbol === symbol))
      .filter((s): s is Stock => !!s)
  }, [watchlist, allStocks])

  const loading = watchlistLoading || stocksLoading

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(var(--bg-primary-rgb), 0.92)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-2.5 sm:py-3.5">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <Image
                src="/spreads-logo.jpg"
                alt="Spreads"
                width={28}
                height={28}
                className="rounded-lg sm:w-8 sm:h-8"
              />
              <span
                className="text-sm sm:text-base font-semibold tracking-tight hidden sm:block"
                style={{ color: 'var(--accent, var(--spreads-green))' }}
              >
                Spreads
              </span>
            </Link>

            <div className="flex-1">
              <h1 className="text-sm sm:text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Watchlist
              </h1>
            </div>

            <span className="text-[11px] sm:text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
              {watchlistedStocks.length} {watchlistedStocks.length === 1 ? 'stock' : 'stocks'}
            </span>

            <button
              onClick={toggleTheme}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Sign in banner for non-logged-in users */}
      {!isLoggedIn && status !== 'loading' && (
        <div
          className="max-w-[1200px] w-full mx-auto px-4 sm:px-8 pt-4"
        >
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Link href="/login" className="font-semibold underline" style={{ color: 'var(--accent)' }}>Sign in</Link>
              {' '}to save your watchlist across devices.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent, var(--spreads-green))' }} />
          </div>
        ) : watchlistedStocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24" style={{ color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <p className="text-base font-medium mb-1">No stocks in your watchlist yet</p>
            <p className="text-sm opacity-60 mb-6">Star stocks from the dashboard to add them here</p>
            <Link
              href="/"
              className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95"
              style={{
                backgroundColor: 'var(--accent, var(--spreads-green))',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              Browse Stocks
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {watchlistedStocks.map((stock, i) => {
              const isPositive = stock.changesPercentage >= 0
              const logoUrl = `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${stock.symbol}.png`

              return (
                <div
                  key={stock.symbol}
                  className="group rounded-xl overflow-hidden transition-all duration-200 sm:hover:shadow-lg sm:hover:-translate-y-0.5 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    animation: `fadeUp 0.3s ease-out ${Math.min(i * 50, 400)}ms both`,
                  }}
                  onClick={() => router.push(`/stock/${stock.symbol}`)}
                >
                  <div className="p-4 flex items-start gap-3">
                    {/* Logo */}
                    <div className="shrink-0">
                      <StockLogo
                        symbol={stock.symbol}
                        name={stock.name}
                        logo={logoUrl}
                        size="lg"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3
                            className="text-sm font-bold truncate"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {stock.symbol}
                          </h3>
                          <p
                            className="text-xs truncate"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {stock.name}
                          </p>
                        </div>
                        <WatchlistButton symbol={stock.symbol} size="sm" />
                      </div>

                      <div className="mt-2.5 flex items-baseline gap-2">
                        <span
                          className="text-base font-bold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {stock.price > 0 ? formatCurrency(stock.price) : 'N/A'}
                        </span>
                        {stock.price > 0 && (
                          <span
                            className="text-xs font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: isPositive
                                ? 'rgba(34,197,94,0.12)'
                                : 'rgba(239,68,68,0.12)',
                              color: isPositive ? '#22c55e' : '#ef4444',
                            }}
                          >
                            {formatPercent(stock.changesPercentage)}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-4">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Mkt Cap</span>
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            {stock.marketCap > 0 ? formatLargeCurrency(stock.marketCap) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>P/E</span>
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            {stock.pe != null ? stock.pe.toFixed(1) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sector</span>
                          <p className="text-xs font-semibold truncate max-w-[80px]" style={{ color: 'var(--text-secondary)' }} title={stock.sector}>
                            {stock.sector || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes watchlistPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
