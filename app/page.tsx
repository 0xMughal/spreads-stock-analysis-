'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import StockLogo from './components/StockLogo'
import { Stock } from '@/lib/types'
import { REGIONS, RegionKey } from '@/lib/data/regions'
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

const DISPLAY_LIMIT = 200

export default function Home() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all')
  const [activeRegion, setActiveRegion] = useState<RegionKey>('all')
  const searchRef = useRef<HTMLInputElement>(null)

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
        setSearch('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const regionDef = REGIONS.find((r) => r.key === activeRegion)
  const categoryFilter = CATEGORIES.find((c) => c.key === activeCategory)?.filter ?? (() => true)

  const displayStocks = useMemo(() => {
    let filtered = stocks
    if (activeRegion !== 'all' && regionDef) {
      filtered = filtered.filter((s) => regionDef.countries.includes(s.country))
    }
    if (activeCategory !== 'all') {
      filtered = filtered.filter(categoryFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      filtered = filtered.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      )
    }
    return filtered.slice(0, search.trim() ? 200 : DISPLAY_LIMIT)
  }, [stocks, activeRegion, activeCategory, search, regionDef, categoryFilter])

  const handleStockClick = useCallback(
    (symbol: string) => router.push(`/stock/${symbol}`),
    [router]
  )

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
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-3.5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 shrink-0">
              <Image
                src="/spreads-logo.jpg"
                alt="Spreads"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span
                className="text-base font-semibold tracking-tight hidden sm:block"
                style={{ color: 'var(--accent, var(--spreads-green))' }}
              >
                Spreads
              </span>
            </div>

            <div className="flex-1 max-w-sm relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
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
                placeholder="Search stocks..."
                className="w-full pl-9 pr-9 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
              {search ? (
                <button onClick={() => setSearch('')} className="absolute inset-y-0 right-3 flex items-center" style={{ color: 'var(--text-muted)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              ) : (
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>/</kbd>
                </div>
              )}
            </div>

            <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              {stocks.length.toLocaleString()} stocks
            </span>

            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Logo Grid */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-5 sm:px-8 py-10">
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
            className="grid justify-center gap-6 sm:gap-8"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, 72px)',
            }}
          >
            {displayStocks.map((stock, i) => (
              <button
                key={stock.symbol}
                onClick={() => handleStockClick(stock.symbol)}
                className="group flex flex-col items-center gap-2 outline-none"
                style={{
                  animation: `fadeUp 0.4s ease-out ${i * 12}ms both`,
                }}
              >
                <div className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-1">
                  <StockLogo
                    symbol={stock.symbol}
                    name={stock.name}
                    logo={stock.logo}
                    size="xl"
                    className="shadow-md group-hover:shadow-xl transition-shadow duration-300"
                  />
                </div>
                <span
                  className="text-[10px] font-medium tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {stock.symbol}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Filter Bar */}
      <div
        className="sticky bottom-0 z-50 backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(var(--bg-primary-rgb), 0.92)',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-2.5 space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest shrink-0 w-12" style={{ color: 'var(--text-muted)' }}>Market</span>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5" style={{ minWidth: 'max-content' }}>
                {REGIONS.map((region) => {
                  const active = activeRegion === region.key
                  return (
                    <button
                      key={region.key}
                      onClick={() => setActiveRegion(region.key)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-150"
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
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest shrink-0 w-12" style={{ color: 'var(--text-muted)' }}>Sector</span>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5" style={{ minWidth: 'max-content' }}>
                {CATEGORIES.map((cat) => {
                  const active = activeCategory === cat.key
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategory(cat.key)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-150"
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
        </div>
      </div>

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
