'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import StockLogo from '@/app/components/StockLogo'
import { useTheme } from '@/app/context/ThemeContext'
import { InsiderTrade } from '@/lib/types'

interface AggregatedTrade extends InsiderTrade {
  symbol: string
  companyName: string
}

type FilterTab = 'all' | 'buys' | 'sells' | 'large'

function formatValue(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
  return `$${value.toFixed(2)}`
}

function formatShares(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getTypeLabel(type: 'buy' | 'sell' | 'exercise'): string {
  if (type === 'buy') return 'Buy'
  if (type === 'sell') return 'Sell'
  return 'Exercise'
}

function getTypeIcon(type: 'buy' | 'sell' | 'exercise'): string {
  if (type === 'buy') return 'M5 12l5 5L20 7' // checkmark/up
  if (type === 'sell') return 'M19 12l-5 5-5-5' // down arrow
  return 'M12 2v10m0 0l3-3m-3 3l-3-3M12 22v-10' // exercise/exchange
}

function InsidersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, toggleTheme } = useTheme()
  const filterSymbol = searchParams.get('symbol')?.toUpperCase() || null

  const [trades, setTrades] = useState<AggregatedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  useEffect(() => {
    const url = filterSymbol
      ? `/api/insider-trades?symbol=${filterSymbol}`
      : '/api/insider-trades'

    fetch(url)
      .then((r) => r.json())
      .then((data) => setTrades(data.trades || []))
      .catch(() => setTrades([]))
      .finally(() => setLoading(false))
  }, [filterSymbol])

  const filteredTrades = useMemo(() => {
    let result = trades
    if (activeFilter === 'buys') result = result.filter((t) => t.type === 'buy')
    if (activeFilter === 'sells') result = result.filter((t) => t.type === 'sell')
    if (activeFilter === 'large') result = result.filter((t) => t.totalValue >= 1_000_000)
    return result
  }, [trades, activeFilter])

  const stats = useMemo(() => {
    const buys = trades.filter((t) => t.type === 'buy')
    const sells = trades.filter((t) => t.type === 'sell')
    const totalBuyValue = buys.reduce((s, t) => s + t.totalValue, 0)
    const totalSellValue = sells.reduce((s, t) => s + t.totalValue, 0)
    return { buyCount: buys.length, sellCount: sells.length, totalBuyValue, totalSellValue }
  }, [trades])

  const filters: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All Trades', count: trades.length },
    { key: 'buys', label: 'Buys Only', count: stats.buyCount },
    { key: 'sells', label: 'Sells Only', count: stats.sellCount },
    { key: 'large', label: 'Large (>$1M)', count: trades.filter((t) => t.totalValue >= 1_000_000).length },
  ]

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

            <div className="flex items-center gap-2 flex-1">
              <h1 className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Insider Trading
              </h1>
              {filterSymbol && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                >
                  {filterSymbol}
                  <button
                    onClick={() => router.push('/insiders')}
                    className="ml-1.5 opacity-50 hover:opacity-100"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </span>
              )}
            </div>

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

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {/* Stats Bar */}
        {!loading && trades.length > 0 && (
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6"
            style={{ animation: 'fadeUp 0.4s ease-out both' }}
          >
            <div className="rounded-xl p-3 sm:p-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Trades</p>
              <p className="text-lg sm:text-xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{trades.length}</p>
            </div>
            <div className="rounded-xl p-3 sm:p-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Buy Volume</p>
              <p className="text-lg sm:text-xl font-bold mt-0.5 text-green-600 dark:text-green-400">{formatValue(stats.totalBuyValue)}</p>
            </div>
            <div className="rounded-xl p-3 sm:p-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sell Volume</p>
              <p className="text-lg sm:text-xl font-bold mt-0.5 text-red-600 dark:text-red-400">{formatValue(stats.totalSellValue)}</p>
            </div>
            <div className="rounded-xl p-3 sm:p-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Buy/Sell Ratio</p>
              <p className="text-lg sm:text-xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {stats.sellCount > 0 ? (stats.buyCount / stats.sellCount).toFixed(2) : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div
          className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-6"
          style={{ animation: 'fadeUp 0.4s ease-out 100ms both' }}
        >
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 flex items-center gap-1.5"
              style={{
                backgroundColor: activeFilter === f.key ? 'var(--accent, var(--spreads-green))' : 'var(--card-bg)',
                color: activeFilter === f.key ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${activeFilter === f.key ? 'var(--accent, var(--spreads-green))' : 'var(--card-border)'}`,
              }}
            >
              {f.label}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  backgroundColor: activeFilter === f.key ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
                  color: activeFilter === f.key ? '#fff' : 'var(--text-muted)',
                }}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent, var(--spreads-green))' }}
            />
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32" style={{ color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-base font-medium">No trades found</p>
            <p className="text-sm mt-1 opacity-60">Try a different filter</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)', animation: 'fadeUp 0.4s ease-out 200ms both' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Date</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Company</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Insider</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Title</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Type</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Shares</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Price</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade, i) => {
                    const isBuy = trade.type === 'buy'
                    const isSell = trade.type === 'sell'
                    const logoUrl = trade.symbol ? `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${trade.symbol}.png` : undefined

                    return (
                      <tr
                        key={`${trade.symbol}-${trade.name}-${trade.date}-${i}`}
                        className="transition-colors duration-150"
                        style={{
                          backgroundColor: 'var(--card-bg)',
                          borderBottom: '1px solid var(--card-border)',
                          animation: `fadeUp 0.3s ease-out ${Math.min(i * 30, 500)}ms both`,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--card-bg)'}
                      >
                        <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(trade.date)}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/stock/${trade.symbol}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <StockLogo
                              symbol={trade.symbol || ''}
                              name={trade.companyName}
                              logo={logoUrl}
                              size="sm"
                            />
                            <div>
                              <span className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>{trade.symbol}</span>
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{trade.companyName}</span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {trade.name}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {trade.title}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: isBuy ? 'rgba(34, 197, 94, 0.12)' : isSell ? 'rgba(239, 68, 68, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                              color: isBuy ? '#22c55e' : isSell ? '#ef4444' : '#eab308',
                            }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d={getTypeIcon(trade.type)} />
                            </svg>
                            {getTypeLabel(trade.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-right" style={{ color: 'var(--text-primary)' }}>
                          {formatShares(trade.shares)}
                        </td>
                        <td className="px-4 py-3 text-xs text-right" style={{ color: 'var(--text-muted)' }}>
                          {trade.pricePerShare > 0 ? `$${trade.pricePerShare.toFixed(2)}` : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-right" style={{ color: isBuy ? '#22c55e' : isSell ? '#ef4444' : 'var(--text-primary)' }}>
                          {trade.totalValue > 0 ? formatValue(trade.totalValue) : 'N/A'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="sm:hidden space-y-3" style={{ animation: 'fadeUp 0.4s ease-out 200ms both' }}>
              {filteredTrades.map((trade, i) => {
                const isBuy = trade.type === 'buy'
                const isSell = trade.type === 'sell'
                const logoUrl = trade.symbol ? `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${trade.symbol}.png` : undefined

                return (
                  <div
                    key={`mobile-${trade.symbol}-${trade.name}-${trade.date}-${i}`}
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      animation: `fadeUp 0.3s ease-out ${Math.min(i * 40, 400)}ms both`,
                    }}
                  >
                    {/* Top row: Company + Type badge */}
                    <div className="flex items-center justify-between mb-3">
                      <Link href={`/stock/${trade.symbol}`} className="flex items-center gap-2.5">
                        <StockLogo
                          symbol={trade.symbol || ''}
                          name={trade.companyName}
                          logo={logoUrl}
                          size="md"
                        />
                        <div>
                          <span className="text-sm font-bold block" style={{ color: 'var(--text-primary)' }}>{trade.symbol}</span>
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{trade.companyName}</span>
                        </div>
                      </Link>
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{
                          backgroundColor: isBuy ? 'rgba(34, 197, 94, 0.12)' : isSell ? 'rgba(239, 68, 68, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                          color: isBuy ? '#22c55e' : isSell ? '#ef4444' : '#eab308',
                        }}
                      >
                        {getTypeLabel(trade.type)}
                      </span>
                    </div>

                    {/* Insider info */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{trade.name}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{trade.title}</span>
                    </div>

                    {/* Stats row */}
                    <div
                      className="grid grid-cols-3 gap-2 pt-2"
                      style={{ borderTop: '1px solid var(--border-color)' }}
                    >
                      <div>
                        <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Shares</p>
                        <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{formatShares(trade.shares)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Value</p>
                        <p className="text-xs font-bold" style={{ color: isBuy ? '#22c55e' : isSell ? '#ef4444' : 'var(--text-primary)' }}>
                          {trade.totalValue > 0 ? formatValue(trade.totalValue) : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Date</p>
                        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{formatDate(trade.date)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Back to Dashboard */}
        <div className="mt-10 mb-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'var(--accent, var(--spreads-green))', color: '#fff' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </main>

      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default function InsidersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }} /></div>}>
      <InsidersPageContent />
    </Suspense>
  )
}
