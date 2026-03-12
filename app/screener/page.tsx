'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import StockLogo from '../components/StockLogo'
import { Stock } from '@/lib/types'
import { useTheme } from '../context/ThemeContext'
import { INDEXES } from '@/lib/data/indexes'

// --- Metric definitions ---
interface MetricDef {
  key: string
  label: string
  category: 'valuation' | 'price' | 'fundamentals' | 'dividends' | 'volume' | 'classification'
  type: 'number' | 'select'
  getValue: (s: Stock) => number | string | null
  format?: (v: number) => string
  options?: string[] // for select type
}

const METRICS: MetricDef[] = [
  // Price
  { key: 'price', label: 'Price', category: 'price', type: 'number', getValue: (s) => s.price, format: (v) => `$${v.toFixed(2)}` },
  { key: 'changesPercentage', label: 'Change %', category: 'price', type: 'number', getValue: (s) => s.changesPercentage, format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` },
  { key: 'dayHigh', label: 'Day High', category: 'price', type: 'number', getValue: (s) => s.dayHigh, format: (v) => `$${v.toFixed(2)}` },
  { key: 'dayLow', label: 'Day Low', category: 'price', type: 'number', getValue: (s) => s.dayLow, format: (v) => `$${v.toFixed(2)}` },
  { key: 'yearHigh', label: '52W High', category: 'price', type: 'number', getValue: (s) => s.yearHigh, format: (v) => `$${v.toFixed(2)}` },
  { key: 'yearLow', label: '52W Low', category: 'price', type: 'number', getValue: (s) => s.yearLow, format: (v) => `$${v.toFixed(2)}` },
  { key: 'distFromHigh', label: '% From 52W High', category: 'price', type: 'number', getValue: (s) => s.yearHigh > 0 ? ((s.price - s.yearHigh) / s.yearHigh) * 100 : null, format: (v) => `${v.toFixed(1)}%` },
  { key: 'distFromLow', label: '% From 52W Low', category: 'price', type: 'number', getValue: (s) => s.yearLow > 0 ? ((s.price - s.yearLow) / s.yearLow) * 100 : null, format: (v) => `+${v.toFixed(1)}%` },
  // Valuation
  { key: 'marketCap', label: 'Market Cap', category: 'valuation', type: 'number', getValue: (s) => s.marketCap, format: formatMarketCap },
  { key: 'pe', label: 'P/E Ratio', category: 'valuation', type: 'number', getValue: (s) => s.pe, format: (v) => v.toFixed(1) },
  { key: 'eps', label: 'EPS', category: 'fundamentals', type: 'number', getValue: (s) => s.eps, format: (v) => `$${v.toFixed(2)}` },
  { key: 'ebitda', label: 'EBITDA', category: 'fundamentals', type: 'number', getValue: (s) => s.ebitda, format: formatMarketCap },
  // Dividends
  { key: 'dividendYield', label: 'Dividend Yield %', category: 'dividends', type: 'number', getValue: (s) => s.dividendYield, format: (v) => `${v.toFixed(2)}%` },
  // Volume
  { key: 'volume', label: 'Volume', category: 'volume', type: 'number', getValue: (s) => s.volume, format: formatLargeNum },
  { key: 'avgVolume', label: 'Avg Volume', category: 'volume', type: 'number', getValue: (s) => s.avgVolume, format: formatLargeNum },
  { key: 'relVolume', label: 'Relative Volume', category: 'volume', type: 'number', getValue: (s) => s.avgVolume > 0 ? s.volume / s.avgVolume : null, format: (v) => `${v.toFixed(2)}x` },
  // Classification
  { key: 'market', label: 'Market', category: 'classification', type: 'select', getValue: (s) => SPREADS_TICKERS.has(s.symbol) ? 'Spreads' : 'Other', options: ['Spreads', 'Other'] },
  { key: 'sector', label: 'Sector', category: 'classification', type: 'select', getValue: (s) => s.sector },
  { key: 'country', label: 'Country', category: 'classification', type: 'select', getValue: (s) => s.country },
  { key: 'exchange', label: 'Exchange', category: 'classification', type: 'select', getValue: (s) => s.exchange },
  { key: 'industry', label: 'Industry', category: 'classification', type: 'select', getValue: (s) => s.industry },
]

type NumericOp = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between'
type SelectOp = 'is' | 'isNot'

interface ActiveFilter {
  id: string
  metricKey: string
  op: NumericOp | SelectOp
  value: string
  value2?: string // for 'between'
}

const NUMERIC_OPS: { value: NumericOp; label: string }[] = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' },
  { value: 'between', label: 'Between' },
]

const SELECT_OPS: { value: SelectOp; label: string }[] = [
  { value: 'is', label: 'Is' },
  { value: 'isNot', label: 'Is Not' },
]

const CATEGORY_LABELS: Record<string, string> = {
  price: 'Price',
  valuation: 'Valuation',
  fundamentals: 'Fundamentals',
  dividends: 'Dividends',
  volume: 'Volume',
  classification: 'Classification',
}

const AI_TECH_TICKERS = new Set([
  'NVDA', 'AMD', 'MSFT', 'GOOGL', 'GOOG', 'META', 'AMZN', 'PLTR', 'ARM', 'SNOW',
  'CRM', 'NOW', 'SMCI', 'MRVL', 'AVGO', 'INTC', 'IBM', 'ORCL', 'CDNS', 'SNPS',
  'APP', 'SOUN', 'QBTS', 'RGTI', 'BBAI', 'CRWD', 'PANW', 'DDOG', 'NET', 'ZS',
  'FTNT', 'ADBE', 'INTU', 'SHOP', 'WDAY',
])

const SPREADS_TICKERS = INDEXES.find((idx) => idx.key === 'spreads')?.tickers || new Set<string>()

type PresetKey = 'spreads' | 'undervalued' | 'highDiv' | 'aiTech' | 'oversold' | 'megaCaps' | 'highVolume' | null

const PRESETS: { key: PresetKey; label: string; filters: Omit<ActiveFilter, 'id'>[] }[] = [
  {
    key: 'spreads', label: 'Spreads',
    filters: [{ metricKey: 'market', op: 'is', value: 'Spreads' }],
  },
  {
    key: 'undervalued', label: 'Undervalued Large Caps',
    filters: [
      { metricKey: 'marketCap', op: 'gte', value: '10000000000' },
      { metricKey: 'pe', op: 'between', value: '0', value2: '15' },
    ],
  },
  {
    key: 'highDiv', label: 'High Dividend',
    filters: [{ metricKey: 'dividendYield', op: 'gte', value: '3' }],
  },
  {
    key: 'aiTech', label: 'AI & Tech',
    filters: [{ metricKey: 'sector', op: 'is', value: 'Technology' }],
  },
  {
    key: 'oversold', label: 'Oversold (Near 52W Low)',
    filters: [{ metricKey: 'distFromHigh', op: 'lte', value: '-30' }],
  },
  {
    key: 'megaCaps', label: 'Mega Caps',
    filters: [{ metricKey: 'marketCap', op: 'gte', value: '200000000000' }],
  },
  {
    key: 'highVolume', label: 'High Relative Volume',
    filters: [{ metricKey: 'relVolume', op: 'gte', value: '2' }],
  },
]

type SortKey = string
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 50

// --- Helpers ---
function formatMarketCap(mc: number): string {
  const abs = Math.abs(mc)
  if (abs >= 1e12) return `$${(mc / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(mc / 1e6).toFixed(1)}M`
  return `$${mc.toLocaleString()}`
}

function formatLargeNum(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toLocaleString()
}

function formatPrice(p: number): string {
  return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPct(val: number | null | undefined): string {
  if (val == null) return '--'
  const sign = val >= 0 ? '+' : ''
  return `${sign}${val.toFixed(2)}%`
}

let nextId = 1

// --- Component ---
export default function ScreenerPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filters, setFilters] = useState<ActiveFilter[]>([])
  const [showAddFilter, setShowAddFilter] = useState(false)
  const [activePreset, setActivePreset] = useState<PresetKey>(null)

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('marketCap')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Pagination
  const [page, setPage] = useState(1)

  // Search within add-filter menu
  const [metricSearch, setMetricSearch] = useState('')

  useEffect(() => {
    fetch('/api/stocks')
      .then((r) => r.json())
      .then((data) => setStocks(data.data || []))
      .catch(() => setStocks([]))
      .finally(() => setLoading(false))
  }, [])

  // Get unique values for select-type metrics
  const selectOptions = useMemo(() => {
    const map: Record<string, string[]> = {}
    METRICS.filter((m) => m.type === 'select').forEach((m) => {
      if (m.options) {
        map[m.key] = m.options
        return
      }
      const set = new Set<string>()
      stocks.forEach((s) => {
        const v = m.getValue(s)
        if (v && typeof v === 'string' && v.trim()) set.add(v)
      })
      map[m.key] = Array.from(set).sort()
    })
    return map
  }, [stocks])

  // Apply preset
  const applyPreset = useCallback((key: PresetKey) => {
    if (activePreset === key) {
      setFilters([])
      setActivePreset(null)
      return
    }
    const preset = PRESETS.find((p) => p.key === key)
    if (!preset) return
    setActivePreset(key)
    setFilters(preset.filters.map((f) => ({ ...f, id: `preset-${nextId++}` })))
  }, [activePreset])

  // Add a new filter
  const addFilter = (metricKey: string) => {
    const metric = METRICS.find((m) => m.key === metricKey)
    if (!metric) return
    const defaultOp = metric.type === 'select' ? 'is' : 'gte'
    const defaultVal = metric.type === 'select' ? (selectOptions[metricKey]?.[0] || '') : ''
    setFilters((prev) => [...prev, { id: `f-${nextId++}`, metricKey, op: defaultOp, value: defaultVal }])
    setShowAddFilter(false)
    setMetricSearch('')
    setActivePreset(null)
  }

  // Update filter
  const updateFilter = (id: string, updates: Partial<ActiveFilter>) => {
    setFilters((prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f))
    setActivePreset(null)
  }

  // Remove filter
  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id))
    setActivePreset(null)
  }

  // Filter logic
  const filtered = useMemo(() => {
    let result = stocks

    for (const filter of filters) {
      const metric = METRICS.find((m) => m.key === filter.metricKey)
      if (!metric) continue

      // Special case: AI & Tech preset
      if (filter.metricKey === 'sector' && filter.value === '__ai_tech__') {
        result = result.filter((s) => AI_TECH_TICKERS.has(s.symbol))
        continue
      }

      result = result.filter((s) => {
        const raw = metric.getValue(s)

        if (metric.type === 'select') {
          if (raw == null) return filter.op === 'isNot'
          const strVal = String(raw)
          if (filter.op === 'is') return strVal === filter.value
          if (filter.op === 'isNot') return strVal !== filter.value
          return true
        }

        // Numeric
        const numVal = typeof raw === 'number' ? raw : null
        if (numVal == null) return false
        const target = parseFloat(filter.value)
        if (isNaN(target)) return true

        switch (filter.op) {
          case 'gt': return numVal > target
          case 'gte': return numVal >= target
          case 'lt': return numVal < target
          case 'lte': return numVal <= target
          case 'eq': return Math.abs(numVal - target) < 0.01
          case 'between': {
            const t2 = parseFloat(filter.value2 || '')
            if (isNaN(t2)) return numVal >= target
            return numVal >= Math.min(target, t2) && numVal <= Math.max(target, t2)
          }
          default: return true
        }
      })
    }

    return result
  }, [stocks, filters])

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered]
    const metric = METRICS.find((m) => m.key === sortKey)

    arr.sort((a, b) => {
      if (!metric) {
        // Default: market cap
        return sortDir === 'asc' ? (a.marketCap || 0) - (b.marketCap || 0) : (b.marketCap || 0) - (a.marketCap || 0)
      }

      const va = metric.getValue(a)
      const vb = metric.getValue(b)

      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }

      const na = typeof va === 'number' ? va : (sortDir === 'asc' ? Infinity : -Infinity)
      const nb = typeof vb === 'number' ? vb : (sortDir === 'asc' ? Infinity : -Infinity)
      return sortDir === 'asc' ? na - nb : nb - na
    })

    return arr
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [filters, sortKey, sortDir])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  // Table columns — always show these + any filtered metrics
  const baseColumns = ['symbol', 'price', 'changesPercentage', 'marketCap']
  const filterMetricKeys = filters.map((f) => f.metricKey).filter((k) => !baseColumns.includes(k) && k !== 'symbol')
  const uniqueFilterKeys = [...new Set(filterMetricKeys)]
  const displayColumns = [...baseColumns, ...uniqueFilterKeys]

  const getMetricDisplay = (stock: Stock, metricKey: string): string => {
    const metric = METRICS.find((m) => m.key === metricKey)
    if (!metric) return '--'
    const val = metric.getValue(stock)
    if (val == null) return '--'
    if (typeof val === 'string') return val
    if (metric.format) return metric.format(val)
    return val.toFixed(2)
  }

  const getColumnLabel = (key: string): string => {
    if (key === 'symbol') return 'Stock'
    const metric = METRICS.find((m) => m.key === key)
    return metric?.label || key
  }

  const selectStyle = {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
  }

  // Grouped metrics for the add-filter menu
  const groupedMetrics = useMemo(() => {
    const q = metricSearch.toLowerCase()
    const filtered = METRICS.filter((m) => m.label.toLowerCase().includes(q) || m.key.toLowerCase().includes(q))
    const groups: Record<string, MetricDef[]> = {}
    filtered.forEach((m) => {
      if (!groups[m.category]) groups[m.category] = []
      groups[m.category].push(m)
    })
    return groups
  }, [metricSearch])

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
              <Image src="/spreads-logo.jpg" alt="Spreads" width={28} height={28} className="rounded-lg sm:w-8 sm:h-8" />
              <span className="text-sm sm:text-base font-semibold tracking-tight hidden sm:block" style={{ color: 'var(--accent, var(--spreads-green))' }}>Spreads</span>
            </button>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>Screener</span>
            <div className="flex-1" />
            <span className="text-[11px] sm:text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
              {sorted.length.toLocaleString()} results
            </span>
            <button
              onClick={toggleTheme}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
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
        </div>

        {/* Active Filters */}
        <div className="rounded-xl p-3 sm:p-4 mb-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {filters.length > 0 && (
            <div className="space-y-2 mb-3">
              {filters.map((filter) => {
                const metric = METRICS.find((m) => m.key === filter.metricKey)
                if (!metric) return null
                return (
                  <div key={filter.id} className="flex items-center gap-2 flex-wrap">
                    {/* Metric label */}
                    <span className="text-xs font-semibold shrink-0 min-w-[100px]" style={{ color: 'var(--text-primary)' }}>
                      {metric.label}
                    </span>

                    {/* Operator */}
                    {metric.type === 'number' ? (
                      <select
                        value={filter.op}
                        onChange={(e) => updateFilter(filter.id, { op: e.target.value as NumericOp })}
                        className="px-2 py-1 rounded-lg text-xs outline-none cursor-pointer"
                        style={selectStyle}
                      >
                        {NUMERIC_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <select
                        value={filter.op}
                        onChange={(e) => updateFilter(filter.id, { op: e.target.value as SelectOp })}
                        className="px-2 py-1 rounded-lg text-xs outline-none cursor-pointer"
                        style={selectStyle}
                      >
                        {SELECT_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    )}

                    {/* Value */}
                    {metric.type === 'number' ? (
                      <>
                        <input
                          type="number"
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          placeholder="Value"
                          className="w-28 px-2 py-1 rounded-lg text-xs outline-none"
                          style={selectStyle}
                        />
                        {filter.op === 'between' && (
                          <>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>and</span>
                            <input
                              type="number"
                              value={filter.value2 || ''}
                              onChange={(e) => updateFilter(filter.id, { value2: e.target.value })}
                              placeholder="Max"
                              className="w-28 px-2 py-1 rounded-lg text-xs outline-none"
                              style={selectStyle}
                            />
                          </>
                        )}
                      </>
                    ) : (
                      <select
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        className="px-2 py-1 rounded-lg text-xs outline-none cursor-pointer max-w-[200px]"
                        style={selectStyle}
                      >
                        {(selectOptions[filter.metricKey] || []).map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    )}

                    {/* Remove */}
                    <button
                      onClick={() => removeFilter(filter.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors hover:opacity-80"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add Filter Button + Menu */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddFilter((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: showAddFilter ? 'var(--accent, var(--spreads-green))' : 'var(--bg-tertiary)',
                  color: showAddFilter ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${showAddFilter ? 'var(--accent, var(--spreads-green))' : 'var(--border-color)'}`,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                Add Filter
              </button>
              {filters.length > 0 && (
                <button
                  onClick={() => { setFilters([]); setActivePreset(null) }}
                  className="text-[11px] font-medium px-2 py-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Add Filter Dropdown */}
            {showAddFilter && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setShowAddFilter(false); setMetricSearch('') }} />
                <div
                  className="absolute top-full left-0 mt-2 z-50 rounded-xl shadow-2xl overflow-hidden"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    width: 'min(320px, calc(100vw - 32px))',
                  }}
                >
                  {/* Search */}
                  <div className="p-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <input
                      type="text"
                      value={metricSearch}
                      onChange={(e) => setMetricSearch(e.target.value)}
                      placeholder="Search metrics..."
                      className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                      style={selectStyle}
                      autoFocus
                    />
                  </div>

                  {/* Grouped Metrics */}
                  <div className="max-h-[300px] overflow-y-auto py-1">
                    {Object.entries(groupedMetrics).map(([category, metrics]) => (
                      <div key={category}>
                        <div className="px-3 pt-2 pb-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                            {CATEGORY_LABELS[category] || category}
                          </span>
                        </div>
                        {metrics.map((m) => (
                          <button
                            key={m.key}
                            onClick={() => addFilter(m.key)}
                            className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:opacity-80"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                          >
                            {m.label}
                            <span className="ml-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {m.type === 'select' ? '(select)' : '(numeric)'}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                    {Object.keys(groupedMetrics).length === 0 && (
                      <div className="px-3 py-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No metrics match</div>
                    )}
                  </div>
                </div>
              </>
            )}
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
                      {displayColumns.map((col) => (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          className={`px-4 py-3 font-semibold text-[11px] uppercase tracking-widest cursor-pointer select-none whitespace-nowrap transition-colors hover:opacity-80 ${col === 'symbol' ? 'text-left' : 'text-right'}`}
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {getColumnLabel(col)}
                          {sortKey === col && <span className="ml-1">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                          {sortKey !== col && <span className="ml-1 opacity-30">{'\u2195'}</span>}
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
                        {displayColumns.map((col) => {
                          if (col === 'symbol') {
                            return (
                              <td key={col} className="px-4 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <StockLogo symbol={stock.symbol} name={stock.name} logo={stock.logo} size="sm" />
                                  <div>
                                    <div className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{stock.symbol}</div>
                                    <div className="text-[11px] max-w-[160px] truncate" style={{ color: 'var(--text-muted)' }}>{stock.name}</div>
                                  </div>
                                </div>
                              </td>
                            )
                          }
                          if (col === 'changesPercentage') {
                            return (
                              <td key={col} className="px-4 py-2.5 text-right font-medium text-xs">
                                <span style={{ color: stock.changesPercentage >= 0 ? '#22c55e' : '#ef4444' }}>
                                  {formatPct(stock.changesPercentage)}
                                </span>
                              </td>
                            )
                          }
                          return (
                            <td key={col} className="px-4 py-2.5 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {getMetricDisplay(stock, col)}
                            </td>
                          )
                        })}
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
                  {/* Show filtered metrics */}
                  <div className="flex items-center gap-3 mt-2 pt-2 flex-wrap" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      MCap <span style={{ color: 'var(--text-secondary)' }}>{formatMarketCap(stock.marketCap)}</span>
                    </div>
                    {uniqueFilterKeys.slice(0, 3).map((key) => (
                      <div key={key} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {getColumnLabel(key)} <span style={{ color: 'var(--text-secondary)' }}>{getMetricDisplay(stock, key)}</span>
                      </div>
                    ))}
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

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
