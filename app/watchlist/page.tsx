'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
import html2canvas from 'html2canvas'
import ErrorCard from '@/app/components/ErrorCard'
import { TableSkeleton } from '@/app/components/Skeleton'

type SortKey = 'marketCap' | 'changesPercentage' | 'price' | 'name' | 'pe'
type SortDir = 'asc' | 'desc'
type ViewMode = 'card' | 'table'

export default function WatchlistPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { status } = useSession()
  const { watchlist, loading: watchlistLoading, toggleWatchlist } = useWatchlist()
  const [allStocks, setAllStocks] = useState<Stock[]>([])
  const [stocksLoading, setStocksLoading] = useState(true)
  const [stocksError, setStocksError] = useState(false)

  // Search to add stocks
  const [addSearch, setAddSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const addRef = useRef<HTMLDivElement>(null)

  // Sort & view
  const [sortKey, setSortKey] = useState<SortKey>('marketCap')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('card')

  const isLoggedIn = status === 'authenticated'
  const shareCardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)

  const handleShareCard = useCallback(async () => {
    if (!shareCardRef.current || sharing) return
    setSharing(true)
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 3,
        backgroundColor: '#0b1a12',
        useCORS: true,
        logging: false,
      })
      canvas.toBlob(async (blob) => {
        if (!blob) { setSharing(false); return }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ])
          setShareSuccess(true)
          setTimeout(() => setShareSuccess(false), 2000)
        } catch {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `spreads-watchlist-${Date.now()}.png`
          a.click()
          URL.revokeObjectURL(url)
          setShareSuccess(true)
          setTimeout(() => setShareSuccess(false), 2000)
        }
        setSharing(false)
      }, 'image/png')
    } catch {
      setSharing(false)
    }
  }, [sharing])

  const fetchStocks = useCallback(() => {
    setStocksLoading(true); setStocksError(false)
    fetch('/api/stocks')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => setAllStocks(data.data || []))
      .catch(() => { setAllStocks([]); setStocksError(true) })
      .finally(() => setStocksLoading(false))
  }, [])

  useEffect(() => { fetchStocks() }, [fetchStocks])

  // Close add dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const watchlistedStocks = useMemo(() => {
    if (!watchlist.length || !allStocks.length) return []
    const stocks = watchlist
      .map(symbol => allStocks.find(s => s.symbol === symbol))
      .filter((s): s is Stock => !!s)

    // Sort
    stocks.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else {
        const av = a[sortKey] ?? 0
        const bv = b[sortKey] ?? 0
        cmp = (av as number) - (bv as number)
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

    return stocks
  }, [watchlist, allStocks, sortKey, sortDir])

  // Search results for add dropdown
  const searchResults = useMemo(() => {
    if (!addSearch.trim()) return []
    const q = addSearch.toLowerCase()
    return allStocks
      .filter(s => !watchlist.includes(s.symbol))
      .filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [addSearch, allStocks, watchlist])

  const loading = watchlistLoading || stocksLoading

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return null
    return sortDir === 'desc' ? ' ↓' : ' ↑'
  }

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

            {watchlistedStocks.length > 0 && (
              <button
                onClick={handleShareCard}
                disabled={sharing}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: shareSuccess ? '#22c55e' : 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                title="Share watchlist as image"
              >
                {sharing ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'var(--accent)' }} />
                ) : shareSuccess ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                )}
              </button>
            )}

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

      {/* Sign in banner */}
      {!isLoggedIn && status !== 'loading' && (
        <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-8 pt-4">
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
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

      {/* Toolbar: Search + Sort + View Toggle */}
      {!loading && !stocksError && (
        <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-8 pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Add stock search */}
            <div className="relative flex-1 max-w-xs" ref={addRef}>
              <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <input
                type="text"
                value={addSearch}
                onChange={(e) => { setAddSearch(e.target.value); setAddOpen(true) }}
                onFocus={() => addSearch.trim() && setAddOpen(true)}
                placeholder="Add stock..."
                className="w-full pl-8 pr-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
              {/* Dropdown */}
              {addOpen && searchResults.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl z-20 max-h-[280px] overflow-y-auto"
                  style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                >
                  {searchResults.map(stock => (
                    <button
                      key={stock.symbol}
                      onClick={() => {
                        toggleWatchlist(stock.symbol)
                        setAddSearch('')
                        setAddOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left"
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                    >
                      <StockLogo symbol={stock.symbol} name={stock.name} logo={stock.logo} size="sm" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{stock.symbol}</span>
                        <span className="text-[10px] ml-2 truncate" style={{ color: 'var(--text-muted)' }}>{stock.name}</span>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>${stock.price?.toFixed(2)}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort dropdown */}
            <select
              value={`${sortKey}-${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split('-') as [SortKey, SortDir]
                setSortKey(k); setSortDir(d)
              }}
              className="text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg outline-none shrink-0"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <option value="marketCap-desc">Mkt Cap (High)</option>
              <option value="marketCap-asc">Mkt Cap (Low)</option>
              <option value="changesPercentage-desc">Change (Best)</option>
              <option value="changesPercentage-asc">Change (Worst)</option>
              <option value="price-desc">Price (High)</option>
              <option value="price-asc">Price (Low)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>

            {/* View toggle */}
            <div
              className="flex rounded-lg overflow-hidden shrink-0"
              style={{ border: '1px solid var(--border-color)' }}
            >
              <button
                onClick={() => setViewMode('card')}
                className="px-2 py-1.5 sm:px-2.5 sm:py-2 transition-colors"
                style={{
                  backgroundColor: viewMode === 'card' ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: viewMode === 'card' ? '#fff' : 'var(--text-muted)',
                }}
                title="Card view"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className="px-2 py-1.5 sm:px-2.5 sm:py-2 transition-colors"
                style={{
                  backgroundColor: viewMode === 'table' ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: viewMode === 'table' ? '#fff' : 'var(--text-muted)',
                }}
                title="Table view"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-4 sm:py-6">
        {loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : stocksError ? (
          <ErrorCard
            title="Unable to load stock data"
            message="Could not fetch latest prices. Please try again."
            onRetry={fetchStocks}
          />
        ) : watchlistedStocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24" style={{ color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <p className="text-base font-medium mb-1">No stocks in your watchlist yet</p>
            <p className="text-sm opacity-60 mb-6">Star stocks from the dashboard or search above to add them</p>
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
        ) : viewMode === 'table' ? (
          /* ─── Table View ─── */
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {[
                      { key: 'name' as SortKey, label: 'Name', align: 'left' },
                      { key: 'price' as SortKey, label: 'Price', align: 'right' },
                      { key: 'changesPercentage' as SortKey, label: 'Change', align: 'right' },
                      { key: 'marketCap' as SortKey, label: 'Mkt Cap', align: 'right' },
                      { key: 'pe' as SortKey, label: 'P/E', align: 'right' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="px-4 py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                        style={{
                          color: sortKey === col.key ? 'var(--text-primary)' : 'var(--text-muted)',
                          textAlign: col.align as 'left' | 'right',
                        }}
                      >
                        {col.label}{sortIcon(col.key)}
                      </th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {watchlistedStocks.map((stock, i) => {
                    const pos = stock.changesPercentage >= 0
                    return (
                      <tr
                        key={stock.symbol}
                        onClick={() => router.push(`/stock/${stock.symbol}`)}
                        className="cursor-pointer transition-colors"
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          animation: `fadeUp 0.2s ease-out ${Math.min(i * 30, 300)}ms both`,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <StockLogo symbol={stock.symbol} name={stock.name} logo={stock.logo} size="sm" />
                            <div>
                              <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{stock.symbol}</div>
                              <div className="text-[10px] truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>{stock.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(stock.price)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className="text-xs font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: pos ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                              color: pos ? '#22c55e' : '#ef4444',
                            }}
                          >
                            {formatPercent(stock.changesPercentage)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {formatLargeCurrency(stock.marketCap)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {stock.pe != null ? stock.pe.toFixed(1) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                          <WatchlistButton symbol={stock.symbol} size="sm" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ─── Card View ─── */
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
                    <div className="shrink-0">
                      <StockLogo symbol={stock.symbol} name={stock.name} logo={logoUrl} size="lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {stock.symbol}
                          </h3>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {stock.name}
                          </p>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <WatchlistButton symbol={stock.symbol} size="sm" />
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                          {stock.price > 0 ? formatCurrency(stock.price) : 'N/A'}
                        </span>
                        {stock.price > 0 && (
                          <span
                            className="text-xs font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
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
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Hidden share card for image export */}
      {watchlistedStocks.length > 0 && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div
            ref={shareCardRef}
            style={{
              width: 600, padding: 32, backgroundColor: '#0b1a12',
              borderRadius: 20, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: '#1B3A2D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#22c55e', fontWeight: 800, fontSize: 16,
              }}>S</div>
              <div>
                <div style={{ color: '#e8efe9', fontWeight: 700, fontSize: 16 }}>My Watchlist</div>
                <div style={{ color: '#5e7a66', fontSize: 11 }}>{watchlistedStocks.length} stocks — spreads.markets</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {watchlistedStocks.slice(0, 12).map(s => {
                const pos = (s.changesPercentage ?? 0) >= 0
                return (
                  <div key={s.symbol} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12,
                    backgroundColor: '#12261a', border: '1px solid #1e3a2b',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      backgroundColor: '#1a3326',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#a3b8aa', fontWeight: 700, fontSize: 10,
                      overflow: 'hidden', flexShrink: 0,
                    }}>{s.symbol.slice(0, 2)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#e8efe9', fontWeight: 700, fontSize: 12 }}>{s.symbol}</div>
                      <div style={{ color: '#5e7a66', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{s.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                      <div style={{ color: '#e8efe9', fontWeight: 600, fontSize: 12 }}>${s.price?.toFixed(2)}</div>
                      <div style={{ color: pos ? '#22c55e' : '#ef4444', fontWeight: 600, fontSize: 10 }}>
                        {pos ? '+' : ''}{s.changesPercentage?.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {watchlistedStocks.length > 12 && (
              <div style={{ color: '#5e7a66', fontSize: 11, textAlign: 'center' as const, marginTop: 12 }}>
                +{watchlistedStocks.length - 12} more stocks
              </div>
            )}
            <div style={{
              marginTop: 20, paddingTop: 16, borderTop: '1px solid #1e3a2b',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ color: '#5e7a66', fontSize: 10 }}>
                Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 11 }}>spreads.markets</div>
            </div>
          </div>
        </div>
      )}

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
