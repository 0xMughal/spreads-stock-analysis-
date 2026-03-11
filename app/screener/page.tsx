'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import StockLogo from '../components/StockLogo'
import { Stock } from '@/lib/types'
import { useTheme } from '../context/ThemeContext'

// --- Filter option types ---
type MarketCapFilter = 'any' | 'mega' | 'large' | 'mid' | 'small' | 'micro'
type PEFilter = 'any' | 'under10' | '10-20' | '20-30' | '30-50' | 'over50' | 'negative'
type DividendFilter = 'any' | 'over1' | 'over2' | 'over3' | 'over5'
type SortKey = 'symbol' | 'price' | 'changesPercentage' | 'marketCap' | 'pe' | 'dividendYield' | 'yearRange'
type SortDir = 'asc' | 'desc'
type PresetKey = 'undervalued' | 'highDiv' | 'aiTech' | 'cashGrowth' | 'megaCaps' | null

const MARKET_CAP_OPTIONS: { value: MarketCapFilter; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'mega', label: 'Mega (>$200B)' },
  { value: 'large', label: 'Large ($10B-$200B)' },
  { value: 'mid', label: 'Mid ($2B-$10B)' },
  { value: 'small', label: 'Small ($300M-$2B)' },
  { value: 'micro', label: 'Micro (<$300M)' },
]

const PE_OPTIONS: { value: PEFilter; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'under10', label: 'Under 10' },
  { value: '10-20', label: '10 - 20' },
  { value: '20-30', label: '20 - 30' },
  { value: '30-50', label: '30 - 50' },
  { value: 'over50', label: 'Over 50' },
  { value: 'negative', label: 'Negative' },
]

const DIVIDEND_OPTIONS: { value: DividendFilter; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'over1', label: 'Over 1%' },
  { value: 'over2', label: 'Over 2%' },
  { value: 'over3', label: 'Over 3%' },
  { value: 'over5', label: 'Over 5%' },
]

const AI_TECH_TICKERS = new Set([
  'NVDA', 'AMD', 'MSFT', 'GOOGL', 'GOOG', 'META', 'AMZN', 'PLTR', 'ARM', 'SNOW',
  'CRM', 'NOW', 'SMCI', 'MRVL', 'AVGO', 'INTC', 'IBM', 'ORCL', 'CDNS', 'SNPS',
  'APP', 'SOUN', 'QBTS', 'RGTI', 'BBAI', 'CRWD', 'PANW', 'DDOG', 'NET', 'ZS',
  'FTNT', 'ADBE', 'INTU', 'SHOP', 'WDAY',
])

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'undervalued', label: 'Undervalued Large Caps' },
  { key: 'highDiv', label: 'High Dividend' },
  { key: 'aiTech', label: 'AI & Tech' },
  { key: 'cashGrowth', label: 'Cash Rich Growth' },
  { key: 'megaCaps', label: 'Mega Caps' },
]

const PAGE_SIZE = 50

// --- Helpers ---
function formatMarketCap(mc: number): string {
  if (mc >= 1e12) return `$${(mc / 1e12).toFixed(2)}T`
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(1)}M`
  return `$${mc.toLocaleString()}`
}

function formatPct(val: number | null | undefined): string {
  if (val == null) return '--'
  const sign = val >= 0 ? '+' : ''
  return `${sign}${val.toFixed(2)}%`
}

function formatPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `$${p.toFixed(2)}`
}

function formatDivYield(y: number | null): string {
  if (y == null || y === 0) return '--'
  return `${y.toFixed(2)}%`
}

function formatPE(pe: number | null): string {
  if (pe == null) return '--'
  return pe.toFixed(1)
}

// --- Component ---
export default function ScreenerPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [marketCapFilter, setMarketCapFilter] = useState<MarketCapFilter>('any')
  const [peFilter, setPeFilter] = useState<PEFilter>('any')
  const [divFilter, setDivFilter] = useState<DividendFilter>('any')
  const [sectorFilter, setSectorFilter] = useState<string>('any')
  const [countryFilter, setCountryFilter] = useState<string>('any')
  const [activePreset, setActivePreset] = useState<PresetKey>(null)

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('marketCap')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Pagination
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/stocks')
      .then((r) => r.json())
      .then((data) => setStocks(data.data || []))
      .catch(() => setStocks([]))
      .finally(() => setLoading(false))
  }, [])

  // Derive sectors and countries
  const sectors = useMemo(() => {
    const set = new Set<string>()
    stocks.forEach((s) => { if (s.sector) set.add(s.sector) })
    return Array.from(set).sort()
  }, [stocks])

  const countries = useMemo(() => {
    const set = new Set<string>()
    stocks.forEach((s) => { if (s.country) set.add(s.country) })
    return Array.from(set).sort()
  }, [stocks])

  // Apply preset
  const applyPreset = useCallback((key: PresetKey) => {
    // Reset all first
    setMarketCapFilter('any')
    setPeFilter('any')
    setDivFilter('any')
    setSectorFilter('any')
    setCountryFilter('any')

    if (activePreset === key) {
      setActivePreset(null)
      return
    }

    setActivePreset(key)
    switch (key) {
      case 'undervalued':
        setMarketCapFilter('large')
        setPeFilter('under10')
        break
      case 'highDiv':
        setDivFilter('over3')
        break
      case 'aiTech':
        setSectorFilter('__ai_tech__')
        break
      case 'cashGrowth':
        setPeFilter('20-30')
        setMarketCapFilter('mid')
        break
      case 'megaCaps':
        setMarketCapFilter('mega')
        break
    }
  }, [activePreset])

  // Filter logic
  const filtered = useMemo(() => {
    let result = stocks

    // Market cap
    if (marketCapFilter !== 'any') {
      result = result.filter((s) => {
        const mc = s.marketCap || 0
        switch (marketCapFilter) {
          case 'mega': return mc > 200e9
          case 'large': return mc >= 10e9 && mc <= 200e9
          case 'mid': return mc >= 2e9 && mc <= 10e9
          case 'small': return mc >= 300e6 && mc <= 2e9
          case 'micro': return mc < 300e6
          default: return true
        }
      })
    }

    // P/E
    if (peFilter !== 'any') {
      result = result.filter((s) => {
        const pe = s.pe
        if (pe == null) return peFilter === 'negative'
        switch (peFilter) {
          case 'under10': return pe > 0 && pe < 10
          case '10-20': return pe >= 10 && pe <= 20
          case '20-30': return pe > 20 && pe <= 30
          case '30-50': return pe > 30 && pe <= 50
          case 'over50': return pe > 50
          case 'negative': return pe < 0
          default: return true
        }
      })
    }

    // Dividend
    if (divFilter !== 'any') {
      result = result.filter((s) => {
        const dy = s.dividendYield ?? 0
        switch (divFilter) {
          case 'over1': return dy >= 1
          case 'over2': return dy >= 2
          case 'over3': return dy >= 3
          case 'over5': return dy >= 5
          default: return true
        }
      })
    }

    // Sector (or AI & Tech preset)
    if (sectorFilter === '__ai_tech__') {
      result = result.filter((s) => AI_TECH_TICKERS.has(s.symbol))
    } else if (sectorFilter !== 'any') {
      result = result.filter((s) => s.sector === sectorFilter)
    }

    // Country
    if (countryFilter !== 'any') {
      result = result.filter((s) => s.country === countryFilter)
    }

    return result
  }, [stocks, marketCapFilter, peFilter, divFilter, sectorFilter, countryFilter])

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let va: number, vb: number
      switch (sortKey) {
        case 'symbol':
          return sortDir === 'asc' ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol)
        case 'price':
          va = a.price ?? 0; vb = b.price ?? 0; break
        case 'changesPercentage':
          va = a.changesPercentage ?? 0; vb = b.changesPercentage ?? 0; break
        case 'marketCap':
          va = a.marketCap ?? 0; vb = b.marketCap ?? 0; break
        case 'pe':
          va = a.pe ?? (sortDir === 'asc' ? Infinity : -Infinity)
          vb = b.pe ?? (sortDir === 'asc' ? Infinity : -Infinity)
          break
        case 'dividendYield':
          va = a.dividendYield ?? 0; vb = b.dividendYield ?? 0; break
        case 'yearRange':
          va = a.yearHigh && a.yearLow ? ((a.price - a.yearLow) / (a.yearHigh - a.yearLow)) : 0
          vb = b.yearHigh && b.yearLow ? ((b.price - b.yearLow) / (b.yearHigh - b.yearLow)) : 0
          break
        default:
          va = 0; vb = 0
      }
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [marketCapFilter, peFilter, divFilter, sectorFilter, countryFilter, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="ml-1 opacity-30">&#8597;</span>
    return <span className="ml-1">{sortDir === 'asc' ? '&#9650;' : '&#9660;'}</span>
  }

  const clearAllFilters = () => {
    setMarketCapFilter('any')
    setPeFilter('any')
    setDivFilter('any')
    setSectorFilter('any')
    setCountryFilter('any')
    setActivePreset(null)
  }

  const hasFilters = marketCapFilter !== 'any' || peFilter !== 'any' || divFilter !== 'any' || sectorFilter !== 'any' || countryFilter !== 'any'

  // 52-week range bar
  const RangeBar = ({ low, high, current }: { low: number; high: number; current: number }) => {
    const pct = high > low ? Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100)) : 50
    return (
      <div className="flex items-center gap-1.5 min-w-[120px]">
        <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatPrice(low)}</span>
        <div className="flex-1 h-1.5 rounded-full relative" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{ left: `${pct}%`, backgroundColor: 'var(--accent, var(--spreads-green))', transform: `translate(-50%, -50%)` }}
          />
        </div>
        <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatPrice(high)}</span>
      </div>
    )
  }

  const selectStyle = {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
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
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-2.5 sm:py-3.5">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 sm:gap-2.5 shrink-0">
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
            </button>

            <span
              className="text-xs font-medium px-2 py-0.5 rounded-md"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              Screener
            </span>

            <div className="flex-1" />

            <span className="text-[11px] sm:text-xs hidden sm:block shrink-0" style={{ color: 'var(--text-muted)' }}>
              {sorted.length.toLocaleString()} results
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

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-4 sm:py-6">
        {/* Preset Chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0"
              style={{
                backgroundColor: activePreset === p.key ? 'var(--accent, var(--spreads-green))' : 'transparent',
                color: activePreset === p.key ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${activePreset === p.key ? 'var(--accent, var(--spreads-green))' : 'var(--border-color)'}`,
              }}
            >
              {p.label}
            </button>
          ))}
          {hasFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              Clear All
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div
          className="rounded-xl p-3 sm:p-4 mb-4"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {/* Market Cap */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Market Cap</label>
              <select
                value={marketCapFilter}
                onChange={(e) => { setMarketCapFilter(e.target.value as MarketCapFilter); setActivePreset(null) }}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                style={selectStyle}
              >
                {MARKET_CAP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* P/E */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>P/E Ratio</label>
              <select
                value={peFilter}
                onChange={(e) => { setPeFilter(e.target.value as PEFilter); setActivePreset(null) }}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                style={selectStyle}
              >
                {PE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Dividend */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Dividend Yield</label>
              <select
                value={divFilter}
                onChange={(e) => { setDivFilter(e.target.value as DividendFilter); setActivePreset(null) }}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                style={selectStyle}
              >
                {DIVIDEND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Sector */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Sector</label>
              <select
                value={sectorFilter}
                onChange={(e) => { setSectorFilter(e.target.value); setActivePreset(null) }}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                style={selectStyle}
              >
                <option value="any">Any</option>
                {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Country */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Country</label>
              <select
                value={countryFilter}
                onChange={(e) => { setCountryFilter(e.target.value); setActivePreset(null) }}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                style={selectStyle}
              >
                <option value="any">Any</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent, var(--spreads-green))' }} />
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32" style={{ color: 'var(--text-muted)' }}>
            <p className="text-base font-medium">No stocks match your filters</p>
            <p className="text-sm mt-1 opacity-60">Try adjusting your criteria</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {[
                        { key: 'symbol' as SortKey, label: 'Stock', align: 'left' },
                        { key: 'price' as SortKey, label: 'Price', align: 'right' },
                        { key: 'changesPercentage' as SortKey, label: 'Change%', align: 'right' },
                        { key: 'marketCap' as SortKey, label: 'Market Cap', align: 'right' },
                        { key: 'pe' as SortKey, label: 'P/E', align: 'right' },
                        { key: 'dividendYield' as SortKey, label: 'Div Yield', align: 'right' },
                        { key: 'yearRange' as SortKey, label: '52W Range', align: 'center' },
                      ].map((col) => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className={`px-4 py-3 font-semibold text-[11px] uppercase tracking-widest cursor-pointer select-none whitespace-nowrap transition-colors hover:opacity-80 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {col.label}<SortIcon col={col.key} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((stock, i) => (
                      <tr
                        key={stock.symbol}
                        onClick={() => router.push(`/stock/${stock.symbol}`)}
                        className="cursor-pointer transition-colors"
                        style={{
                          borderBottom: i < paged.length - 1 ? '1px solid var(--border-color)' : undefined,
                          animation: `fadeUp 0.2s ease-out ${Math.min(i * 15, 400)}ms both`,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <StockLogo symbol={stock.symbol} name={stock.name} logo={stock.logo} size="sm" />
                            <div>
                              <div className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{stock.symbol}</div>
                              <div className="text-[11px] max-w-[160px] truncate" style={{ color: 'var(--text-muted)' }}>{stock.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{formatPrice(stock.price)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-xs">
                          <span style={{ color: stock.changesPercentage >= 0 ? '#22c55e' : '#ef4444' }}>
                            {formatPct(stock.changesPercentage)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>{formatMarketCap(stock.marketCap)}</td>
                        <td className="px-4 py-2.5 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>{formatPE(stock.pe)}</td>
                        <td className="px-4 py-2.5 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDivYield(stock.dividendYield)}</td>
                        <td className="px-4 py-2.5">
                          <RangeBar low={stock.yearLow} high={stock.yearHigh} current={stock.price} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-2">
              {paged.map((stock, i) => (
                <button
                  key={stock.symbol}
                  onClick={() => router.push(`/stock/${stock.symbol}`)}
                  className="w-full rounded-xl p-3 text-left transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    animation: `fadeUp 0.2s ease-out ${Math.min(i * 20, 400)}ms both`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <StockLogo symbol={stock.symbol} name={stock.name} logo={stock.logo} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{stock.symbol}</span>
                        <span className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{formatPrice(stock.price)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[11px] truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>{stock.name}</span>
                        <span className="text-[11px] font-medium" style={{ color: stock.changesPercentage >= 0 ? '#22c55e' : '#ef4444' }}>
                          {formatPct(stock.changesPercentage)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      MCap <span style={{ color: 'var(--text-secondary)' }}>{formatMarketCap(stock.marketCap)}</span>
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      P/E <span style={{ color: 'var(--text-secondary)' }}>{formatPE(stock.pe)}</span>
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Div <span style={{ color: 'var(--text-secondary)' }}>{formatDivYield(stock.dividendYield)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 pb-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                >
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 7) {
                      pageNum = i + 1
                    } else if (page <= 4) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i
                    } else {
                      pageNum = page - 3 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: page === pageNum ? 'var(--accent, var(--spreads-green))' : 'transparent',
                          color: page === pageNum ? '#fff' : 'var(--text-muted)',
                        }}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
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
