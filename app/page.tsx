'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import StockLogo from './components/StockLogo'
import WatchlistButton from './components/WatchlistButton'
import { Stock } from '@/lib/types'
import { REGIONS, RegionKey } from '@/lib/data/regions'
import { INDEXES, IndexKey } from '@/lib/data/indexes'
import { getTaggedTickers } from '@/lib/data/search-tags'
import { useTheme } from './context/ThemeContext'

type CategoryKey = 'all' | 'tech' | 'healthcare' | 'finance' | 'ai' | 'saas' | 'crypto' | 'energy' | 'consumer' | 'industrial' | 'materials' | 'real-estate' | 'comms' | 'utilities'

interface CategoryDef {
  key: CategoryKey
  label: string
  filter: (stock: Stock) => boolean
}

const AI_TICKERS = new Set([
  'NVDA', 'AMD', 'MSFT', 'GOOGL', 'GOOG', 'META', 'AMZN', 'PLTR', 'ARM', 'SNOW',
  'CRM', 'NOW', 'SMCI', 'MRVL', 'AVGO', 'INTC', 'IBM', 'ORCL', 'CDNS', 'SNPS',
  'APP', 'SOUN', 'QBTS', 'RGTI', 'BBAI',
])

const SAAS_TICKERS = new Set([
  'CRM', 'NOW', 'ADBE', 'INTU', 'SNOW', 'SHOP', 'WDAY', 'PAYC', 'HUBS', 'ZS',
  'CRWD', 'NET', 'PANW', 'FTNT', 'DDOG', 'SPOT', 'RDDT',
])

const CRYPTO_TICKERS = new Set([
  'COIN', 'MARA', 'RIOT', 'MSTR', 'CIFR', 'WULF', 'IREN', 'OKLO', 'HOOD', 'SOFI',
])

// Priority tiers for stock ordering — Mag 7 first, then well-known mega/large caps
const STOCK_PRIORITY: Record<string, number> = {}
const TIER_1 = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'] // Mag 7
const TIER_2 = [
  'BRK-B', 'JPM', 'V', 'JNJ', 'WMT', 'MA', 'PG', 'UNH', 'HD', 'DIS',
  'BAC', 'XOM', 'NFLX', 'AVGO', 'KO', 'PEP', 'COST', 'TMO', 'ABBV', 'MRK',
  'LLY', 'ORCL', 'CRM', 'AMD', 'ADBE', 'CSCO', 'ACN', 'INTC', 'QCOM', 'TXN',
  'IBM', 'NOW', 'PYPL', 'UBER', 'SQ', 'SHOP', 'PLTR', 'COIN', 'ARM', 'SNOW',
] // Top mega-caps & well-known names
const TIER_3 = [
  'GS', 'MS', 'C', 'WFC', 'AXP', 'BLK', 'SCHW', 'CME', 'ICE', 'SPGI',
  'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'NEE', 'SO', 'DUK', 'AEP',
  'GOOG', 'BRK-A', 'PM', 'MO', 'NKE', 'SBUX', 'MCD', 'LOW', 'TGT', 'ABNB',
  'BA', 'CAT', 'GE', 'RTX', 'HON', 'LMT', 'UPS', 'DE', 'MMM',
  'AMGN', 'GILD', 'BMY', 'PFE', 'ABT', 'MDT', 'SYK', 'ISRG', 'DHR',
  'T', 'VZ', 'CMCSA', 'TMUS', 'CHTR',
  'CRWD', 'PANW', 'DDOG', 'NET', 'ZS', 'FTNT', 'MSTR', 'MARA',
  // Big international names
  'SHEL', 'AZN', 'HSBA.UK', 'ULVR.UK', 'BP.UK', 'GSK.UK', 'RIO.UK', 'BATS.UK',
  'ASML', 'MC.EU', 'SAP.EU', 'SIE.EU', 'OR.EU', 'NESN.EU',
  '7203.JP', '6758.JP', '9984.JP', 'SFTBMB.JP',
  'TSM', 'BABA', 'TCEHY', 'PDD', 'JD', 'BIDU',
  'SAMSUNG.KR', '005930.KR',
] // Large caps & well-known international
TIER_1.forEach((t, i) => STOCK_PRIORITY[t] = i)
TIER_2.forEach((t, i) => STOCK_PRIORITY[t] = 100 + i)
TIER_3.forEach((t, i) => STOCK_PRIORITY[t] = 200 + i)

const CATEGORIES: CategoryDef[] = [
  { key: 'all', label: 'All', filter: () => true },
  { key: 'tech', label: 'Tech', filter: (s) => s.sector === 'Technology' },
  { key: 'healthcare', label: 'Healthcare', filter: (s) => s.sector === 'Healthcare' },
  { key: 'finance', label: 'Finance', filter: (s) => s.sector === 'Financials' },
  { key: 'ai', label: 'AI', filter: (s) => AI_TICKERS.has(s.symbol) },
  { key: 'saas', label: 'SaaS', filter: (s) => SAAS_TICKERS.has(s.symbol) },
  { key: 'crypto', label: 'Crypto', filter: (s) => CRYPTO_TICKERS.has(s.symbol) },
  { key: 'energy', label: 'Energy', filter: (s) => s.sector === 'Energy' },
  { key: 'consumer', label: 'Consumer', filter: (s) => s.sector === 'Consumer Discretionary' || s.sector === 'Consumer Staples' },
  { key: 'industrial', label: 'Industrial', filter: (s) => s.sector === 'Industrials' },
  { key: 'materials', label: 'Materials', filter: (s) => s.sector === 'Materials' },
  { key: 'real-estate', label: 'Real Estate', filter: (s) => s.sector === 'Real Estate' },
  { key: 'comms', label: 'Comms', filter: (s) => s.sector === 'Communication Services' },
  { key: 'utilities', label: 'Utilities', filter: (s) => s.sector === 'Utilities' },
]

const PAGE_SIZE = 150

export default function Home() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all')
  const [activeRegion, setActiveRegion] = useState<RegionKey>('all')
  const [activeIndex, setActiveIndex] = useState<IndexKey>('all')
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/stocks')
      .then((r) => r.json())
      .then((data) => setStocks(data.data || []))
      .catch(() => setStocks([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') {
        if (filtersOpen) { setFiltersOpen(false); return }
        setSearch('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [filtersOpen])


  const regionDef = REGIONS.find((r) => r.key === activeRegion)
  const categoryFilter = CATEGORIES.find((c) => c.key === activeCategory)?.filter ?? (() => true)

  const filteredStocks = useMemo(() => {
    let filtered = stocks
    if (activeRegion !== 'all' && regionDef) {
      filtered = filtered.filter((s) => regionDef.countries.includes(s.country))
    }
    if (activeIndex !== 'all') {
      const indexDef = INDEXES.find((idx) => idx.key === activeIndex)
      if (indexDef && indexDef.tickers.size > 0) {
        filtered = filtered.filter((s) => indexDef.tickers.has(s.symbol))
      }
    }
    if (activeCategory !== 'all') {
      filtered = filtered.filter(categoryFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const taggedTickers = getTaggedTickers(q)
      filtered = filtered.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || taggedTickers.has(s.symbol)
      )
    }
    // Sort by priority tier (Mag 7 first, then mega-caps, then rest)
    filtered.sort((a, b) => {
      const pa = STOCK_PRIORITY[a.symbol] ?? 999
      const pb = STOCK_PRIORITY[b.symbol] ?? 999
      if (pa !== pb) return pa - pb
      // Within same tier, sort by market cap descending (if available), else alphabetically
      if ((b.marketCap || 0) !== (a.marketCap || 0)) return (b.marketCap || 0) - (a.marketCap || 0)
      return a.symbol.localeCompare(b.symbol)
    })
    return filtered
  }, [stocks, activeRegion, activeIndex, activeCategory, search, regionDef, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filteredStocks.length / PAGE_SIZE))
  const displayStocks = useMemo(() => {
    return filteredStocks.slice(0, page * PAGE_SIZE)
  }, [filteredStocks, page])

  // Reset page when any filter changes
  useEffect(() => { setPage(1) }, [activeRegion, activeIndex, activeCategory, search])

  const activeFilterCount = (activeRegion !== 'all' ? 1 : 0) + (activeIndex !== 'all' ? 1 : 0) + (activeCategory !== 'all' ? 1 : 0)
  const activeChips: { label: string; clear: () => void }[] = []
  if (activeRegion !== 'all') {
    const label = REGIONS.find((r) => r.key === activeRegion)?.label || activeRegion
    activeChips.push({ label, clear: () => setActiveRegion('all') })
  }
  if (activeIndex !== 'all') {
    const label = INDEXES.find((idx) => idx.key === activeIndex)?.label || activeIndex
    activeChips.push({ label, clear: () => setActiveIndex('all') })
  }
  if (activeCategory !== 'all') {
    const label = CATEGORIES.find((c) => c.key === activeCategory)?.label || activeCategory
    activeChips.push({ label, clear: () => setActiveCategory('all') })
  }

  const handleStockClick = useCallback(
    (symbol: string) => router.push(`/stock/${symbol}`),
    [router]
  )

  // Market Pulse tickers
  const PULSE_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'BTC-USD', 'GLD']
  const pulseStocks = useMemo(() => {
    return PULSE_SYMBOLS.map((sym) => stocks.find((s) => s.symbol === sym)).filter(Boolean) as Stock[]
  }, [stocks])

  // Market status (ET timezone)
  const isMarketOpen = useMemo(() => {
    const now = new Date()
    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const day = et.getDay()
    const hours = et.getHours()
    const minutes = et.getMinutes()
    const totalMinutes = hours * 60 + minutes
    return day >= 1 && day <= 5 && totalMinutes >= 570 && totalMinutes < 960 // 9:30 AM - 4:00 PM
  }, [])

  // Average market change
  const avgChange = useMemo(() => {
    if (stocks.length === 0) return 0
    const sum = stocks.reduce((acc, s) => acc + (s.changesPercentage || 0), 0)
    return sum / stocks.length
  }, [stocks])

  // Top movers
  const isDefaultView = !search.trim() && activeCategory === 'all' && activeRegion === 'all' && activeIndex === 'all'

  const topGainers = useMemo(() => {
    return [...stocks]
      .filter((s) => s.changesPercentage > 0)
      .sort((a, b) => b.changesPercentage - a.changesPercentage)
      .slice(0, 8)
  }, [stocks])

  const topLosers = useMemo(() => {
    return [...stocks]
      .filter((s) => s.changesPercentage < 0)
      .sort((a, b) => a.changesPercentage - b.changesPercentage)
      .slice(0, 8)
  }, [stocks])

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
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
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
            </div>

            <div className="flex-1 max-w-sm relative">
              <div className="absolute inset-y-0 left-2.5 sm:left-3 flex items-center pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-1.5 sm:py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
              {search ? (
                <button onClick={() => setSearch('')} className="absolute inset-y-0 right-2.5 sm:right-3 flex items-center" style={{ color: 'var(--text-muted)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              ) : (
                <div className="absolute inset-y-0 right-2.5 sm:right-3 items-center pointer-events-none hidden sm:flex">
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>/</kbd>
                </div>
              )}
            </div>

            <span className="text-[11px] sm:text-xs hidden sm:block shrink-0" style={{ color: 'var(--text-muted)' }}>
              {filteredStocks.length === stocks.length
                ? `${stocks.length.toLocaleString()} stocks`
                : `${filteredStocks.length.toLocaleString()} / ${stocks.length.toLocaleString()}`}
            </span>

            <button
              onClick={() => router.push('/watchlist')}
              className="px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-all duration-150 hidden sm:flex items-center gap-1.5 shrink-0"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Watchlist
            </button>

            <button
              onClick={() => router.push('/screener')}
              className="px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-all duration-150 hidden sm:flex items-center gap-1.5 shrink-0"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
              Screener
            </button>

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

      {/* Market Pulse Ticker Strip */}
      {!loading && pulseStocks.length > 0 && (
        <div
          className="w-full overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            height: 34,
          }}
        >
          <div className="ticker-scroll h-full items-center gap-0 sm:gap-0 sm:justify-center sm:max-w-[1200px] sm:mx-auto sm:px-8">
            {/* Duplicate items for seamless mobile scroll */}
            {[...pulseStocks, ...pulseStocks].map((stock, i) => (
              <button
                key={`${stock.symbol}-${i}`}
                onClick={() => handleStockClick(stock.symbol)}
                className="flex items-center gap-2 px-4 sm:px-5 h-full shrink-0 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {stock.symbol === 'BTC-USD' ? 'BTC' : stock.symbol}
                </span>
                <span className="text-[11px] sm:text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  ${stock.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className="text-[10px] sm:text-[11px] font-semibold"
                  style={{ color: stock.changesPercentage >= 0 ? '#22c55e' : '#ef4444' }}
                >
                  {stock.changesPercentage >= 0 ? '+' : ''}{stock.changesPercentage?.toFixed(2)}%
                </span>
                {/* Separator dot */}
                <span
                  className="w-[3px] h-[3px] rounded-full ml-2 sm:ml-3 hidden sm:block"
                  style={{ backgroundColor: 'var(--border-color)' }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats Bar */}
      {!loading && stocks.length > 0 && (
        <div
          className="w-full"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-1.5 flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: isMarketOpen ? '#22c55e' : '#ef4444' }}
              />
              <span className="text-[10px] sm:text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                Market: {isMarketOpen ? 'Open' : 'Closed'}
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {stocks.length.toLocaleString()} stocks
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium" style={{ color: avgChange >= 0 ? '#22c55e' : '#ef4444' }}>
              Avg: {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Logo Grid */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {/* Top Movers Section */}
        {!loading && isDefaultView && (topGainers.length > 0 || topLosers.length > 0) && (
          <div className="mb-8 sm:mb-10">
            <h2
              className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-muted)' }}
            >
              Today&apos;s Movers
            </h2>

            {/* Top Gainers */}
            {topGainers.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                  <span className="text-[10px] sm:text-[11px] font-semibold" style={{ color: '#22c55e' }}>
                    Top Gainers
                  </span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                  {topGainers.map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => handleStockClick(stock.symbol)}
                      className="shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-95 sm:hover:-translate-y-0.5"
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        minWidth: 120,
                      }}
                    >
                      <StockLogo symbol={stock.symbol} name={stock.name} logo={stock.logo} size="sm" />
                      <div className="flex flex-col items-start">
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {stock.symbol}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                            ${stock.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: '#22c55e' }}>
                            +{stock.changesPercentage?.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Top Losers */}
            {topLosers.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  <span className="text-[10px] sm:text-[11px] font-semibold" style={{ color: '#ef4444' }}>
                    Top Losers
                  </span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                  {topLosers.map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => handleStockClick(stock.symbol)}
                      className="shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-95 sm:hover:-translate-y-0.5"
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        minWidth: 120,
                      }}
                    >
                      <StockLogo symbol={stock.symbol} name={stock.name} logo={stock.logo} size="sm" />
                      <div className="flex flex-col items-start">
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {stock.symbol}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                            ${stock.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: '#ef4444' }}>
                            {stock.changesPercentage?.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent, var(--spreads-green))' }} />
          </div>
        ) : displayStocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32" style={{ color: 'var(--text-muted)' }}>
            <p className="text-base font-medium">No stocks found</p>
            <p className="text-sm mt-1 opacity-60">Try a different search or filter</p>
          </div>
        ) : (
          <div
            className="grid justify-center gap-4 sm:gap-8"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 72px))',
            }}
          >
            {displayStocks.map((stock, i) => (
              <div
                key={stock.symbol}
                className="relative group"
                style={{
                  animation: `fadeUp 0.3s ease-out ${Math.min(i * 12, 600)}ms both`,
                }}
              >
                {/* Watchlist star — always visible on mobile, hover on desktop */}
                <div className="absolute -top-1 -right-1 z-10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                  <WatchlistButton symbol={stock.symbol} size="sm" />
                </div>
                <button
                  onClick={() => handleStockClick(stock.symbol)}
                  className="flex flex-col items-center gap-1 sm:gap-2 outline-none active:scale-95 transition-transform w-full"
                >
                  <div className="transition-transform duration-300 ease-out sm:group-hover:scale-110 sm:group-hover:-translate-y-1">
                    <StockLogo
                      symbol={stock.symbol}
                      name={stock.name}
                      logo={stock.logo}
                      size="lg"
                      className="shadow-md sm:group-hover:shadow-xl transition-shadow duration-300 sm:hidden"
                    />
                    <StockLogo
                      symbol={stock.symbol}
                      name={stock.name}
                      logo={stock.logo}
                      size="xl"
                      className="shadow-md sm:group-hover:shadow-xl transition-shadow duration-300 hidden sm:block"
                    />
                  </div>
                  <span
                    className="text-[9px] sm:text-[10px] font-medium tracking-wide max-w-[60px] sm:max-w-[90px] truncate text-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
                    style={{ color: 'var(--text-muted)' }}
                    title={stock.name}
                  >
                    {stock.symbol}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Load More / Pagination */}
        {!loading && displayStocks.length < filteredStocks.length && (
          <div className="flex flex-col items-center gap-2 pt-8 sm:pt-10 pb-4">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-8 py-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 sm:hover:-translate-y-0.5"
              style={{
                backgroundColor: 'var(--accent, var(--spreads-green))',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              Load More
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Showing {displayStocks.length} of {filteredStocks.length.toLocaleString()}
            </span>
          </div>
        )}
        {!loading && displayStocks.length > 0 && displayStocks.length >= filteredStocks.length && filteredStocks.length > PAGE_SIZE && (
          <div className="text-center pt-6 pb-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              All {filteredStocks.length.toLocaleString()} stocks loaded
            </span>
          </div>
        )}
      </main>

      {/* Filter Button + Active Chips */}
      <div
        className="sticky bottom-0 z-50 backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(var(--bg-primary-rgb), 0.92)',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-2 sm:py-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
            <div className="relative shrink-0">
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                style={{
                  backgroundColor: filtersOpen || activeFilterCount > 0 ? 'var(--accent, var(--spreads-green))' : 'var(--bg-tertiary)',
                  color: filtersOpen || activeFilterCount > 0 ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${filtersOpen || activeFilterCount > 0 ? 'var(--accent, var(--spreads-green))' : 'var(--border-color)'}`,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                </svg>
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span
                    className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Active filter chips */}
            {activeChips.map((chip) => (
              <span
                key={chip.label}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {chip.label}
                <button
                  onClick={chip.clear}
                  className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </span>
            ))}

            {/* Stock count on mobile */}
            {activeFilterCount > 0 && (
              <span className="text-[10px] sm:hidden shrink-0 ml-auto" style={{ color: 'var(--text-muted)' }}>
                {filteredStocks.length.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Panel — Bottom sheet on mobile, popover on desktop */}
      {filtersOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60]"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={() => setFiltersOpen(false)}
          />
          <div
            ref={filterRef}
            className="fixed z-[70] inset-x-0 bottom-0 sm:inset-auto sm:bottom-12 sm:left-4 rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              animation: 'slideUp 0.25s ease-out',
            }}
          >
            {/* Drag handle on mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
            </div>

            <div className="p-4 space-y-4 max-h-[60vh] sm:max-h-none overflow-y-auto sm:w-[380px]">
              {/* Market */}
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>Market</span>
                <div className="flex flex-wrap gap-1.5">
                  {REGIONS.map((region) => {
                    const active = activeRegion === region.key
                    return (
                      <button
                        key={region.key}
                        onClick={() => setActiveRegion(region.key)}
                        className="px-2.5 py-1.5 sm:py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-150"
                        style={{
                          backgroundColor: active ? 'var(--accent, var(--spreads-green))' : 'transparent',
                          color: active ? '#fff' : 'var(--text-secondary)',
                          border: `1px solid ${active ? 'var(--accent, var(--spreads-green))' : 'var(--border-color)'}`,
                        }}
                      >
                        {region.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Index */}
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>Index</span>
                <div className="flex flex-wrap gap-1.5">
                  {INDEXES.map((idx) => {
                    const active = activeIndex === idx.key
                    return (
                      <button
                        key={idx.key}
                        onClick={() => setActiveIndex(idx.key)}
                        className="px-2.5 py-1.5 sm:py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-150"
                        style={{
                          backgroundColor: active ? 'var(--accent, var(--spreads-green))' : 'transparent',
                          color: active ? '#fff' : 'var(--text-secondary)',
                          border: `1px solid ${active ? 'var(--accent, var(--spreads-green))' : 'var(--border-color)'}`,
                        }}
                      >
                        {idx.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sector */}
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>Sector</span>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const active = activeCategory === cat.key
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        className="px-2.5 py-1.5 sm:py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-150"
                        style={{
                          backgroundColor: active ? 'var(--accent, var(--spreads-green))' : 'transparent',
                          color: active ? '#fff' : 'var(--text-secondary)',
                          border: `1px solid ${active ? 'var(--accent, var(--spreads-green))' : 'var(--border-color)'}`,
                        }}
                      >
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 safe-pb" style={{ borderTop: '1px solid var(--border-color)' }}>
              {activeFilterCount > 0 ? (
                <button
                  onClick={() => { setActiveRegion('all'); setActiveIndex('all'); setActiveCategory('all') }}
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Clear all
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={() => setFiltersOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium sm:hidden"
                style={{
                  backgroundColor: 'var(--accent, var(--spreads-green))',
                  color: '#fff',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}

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
