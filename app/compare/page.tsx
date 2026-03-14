'use client'

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Stock } from '@/lib/types'
import { formatLargeCurrency } from '@/lib/utils'
import StockLogo from '@/app/components/StockLogo'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const BRAND_COLORS = ['#1B3A2D', '#2ECC71', '#E67E22', '#3498DB']

interface QuarterData {
  date: string
  revenue?: number | null
  netIncome?: number | null
  eps?: number | null
  grossProfit?: number | null
  operatingIncome?: number | null
}

interface FundamentalsData {
  quarters: QuarterData[]
}

function fmtB(v: number | null | undefined): string {
  if (v == null) return 'N/A'
  const abs = Math.abs(v)
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  return `$${v.toFixed(0)}`
}

export default function ComparePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: '#9BB5AA', borderTopColor: '#1B3A2D' }} />
      </div>
    }>
      <ComparePage />
    </Suspense>
  )
}

function ComparePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const symbolsParam = searchParams.get('symbols') || ''

  const [allStocks, setAllStocks] = useState<Stock[]>([])
  const [fundamentalsMap, setFundamentalsMap] = useState<Record<string, FundamentalsData>>({})
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [suggestions, setSuggestions] = useState<Stock[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const selectedSymbols = useMemo(() => {
    return symbolsParam
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 4)
  }, [symbolsParam])

  const selectedStocks = useMemo(() => {
    return selectedSymbols
      .map(sym => allStocks.find(s => s.symbol === sym))
      .filter((s): s is Stock => s != null)
  }, [selectedSymbols, allStocks])

  // Fetch all stocks
  useEffect(() => {
    fetch('/api/stocks')
      .then(r => r.json())
      .then(result => setAllStocks(result.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Fetch fundamentals for selected symbols
  useEffect(() => {
    if (selectedSymbols.length === 0) return
    selectedSymbols.forEach(sym => {
      if (fundamentalsMap[sym]) return
      fetch(`/data/stocks/${sym}.json`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) setFundamentalsMap(prev => ({ ...prev, [sym]: data }))
        })
        .catch(() => {})
    })
  }, [selectedSymbols]) // eslint-disable-line react-hooks/exhaustive-deps

  // Search suggestions
  const handleSearch = useCallback((q: string) => {
    setSearchInput(q)
    if (q.length < 1) { setSuggestions([]); setShowSuggestions(false); return }
    const lower = q.toLowerCase()
    const matches = allStocks
      .filter(s =>
        !selectedSymbols.includes(s.symbol) &&
        (s.symbol.toLowerCase().includes(lower) || s.name.toLowerCase().includes(lower))
      )
      .slice(0, 8)
    setSuggestions(matches)
    setShowSuggestions(true)
  }, [allStocks, selectedSymbols])

  const addSymbol = useCallback((sym: string) => {
    const newSymbols = [...selectedSymbols, sym].slice(0, 4)
    router.push(`/compare?symbols=${newSymbols.join(',')}`)
    setSearchInput('')
    setShowSuggestions(false)
  }, [selectedSymbols, router])

  const removeSymbol = useCallback((sym: string) => {
    const newSymbols = selectedSymbols.filter(s => s !== sym)
    if (newSymbols.length === 0) router.push('/compare')
    else router.push(`/compare?symbols=${newSymbols.join(',')}`)
  }, [selectedSymbols, router])

  // Compute TTM stats
  const ttmMap = useMemo(() => {
    const map: Record<string, { revenue: number; netIncome: number; eps: number | null; grossMargin: number | null; netMargin: number | null }> = {}
    for (const sym of selectedSymbols) {
      const fund = fundamentalsMap[sym]
      if (!fund) continue
      const sorted = [...fund.quarters].filter(q => q.revenue != null).sort((a, b) => b.date.localeCompare(a.date))
      const last4 = sorted.slice(0, 4)
      if (last4.length < 4) continue
      const rev = last4.reduce((s, q) => s + (q.revenue || 0), 0)
      const ni = last4.reduce((s, q) => s + (q.netIncome || 0), 0)
      const gp = last4.reduce((s, q) => s + (q.grossProfit || 0), 0)
      const eps = last4.every(q => q.eps != null) ? last4.reduce((s, q) => s + (q.eps || 0), 0) : null
      map[sym] = {
        revenue: rev,
        netIncome: ni,
        eps,
        grossMargin: rev ? (gp / rev) * 100 : null,
        netMargin: rev ? (ni / rev) * 100 : null,
      }
    }
    return map
  }, [selectedSymbols, fundamentalsMap])

  // Revenue comparison chart data
  const revenueChartData = useMemo(() => {
    if (selectedSymbols.length === 0) return []
    const allQuarters = new Set<string>()
    selectedSymbols.forEach(sym => {
      const fund = fundamentalsMap[sym]
      if (fund) fund.quarters.forEach(q => allQuarters.add(q.date))
    })
    const sorted = Array.from(allQuarters).sort().slice(-12)
    return sorted.map(date => {
      const point: Record<string, string | number | null> = {
        date: date.slice(0, 7),
      }
      selectedSymbols.forEach(sym => {
        const fund = fundamentalsMap[sym]
        if (fund) {
          const q = fund.quarters.find(q => q.date === date)
          point[sym] = q?.revenue ? q.revenue / 1e9 : null
        }
      })
      return point
    })
  }, [selectedSymbols, fundamentalsMap])

  const metrics = useMemo(() => {
    type Metric = { label: string; values: (string | number)[] }
    const rows: Metric[] = []

    rows.push({
      label: 'Price',
      values: selectedStocks.map(s => `$${s.price?.toFixed(2) ?? 'N/A'}`),
    })
    rows.push({
      label: 'Change %',
      values: selectedStocks.map(s => `${(s.changesPercentage ?? 0) >= 0 ? '+' : ''}${s.changesPercentage?.toFixed(2) ?? 'N/A'}%`),
    })
    rows.push({
      label: 'Market Cap',
      values: selectedStocks.map(s => formatLargeCurrency(s.marketCap)),
    })
    rows.push({
      label: 'P/E Ratio',
      values: selectedStocks.map(s => s.pe ? s.pe.toFixed(1) + 'x' : 'N/A'),
    })
    rows.push({
      label: 'EPS (TTM)',
      values: selectedStocks.map(s => {
        const ttm = ttmMap[s.symbol]
        return ttm?.eps != null ? `$${ttm.eps.toFixed(2)}` : (s.eps ? `$${s.eps.toFixed(2)}` : 'N/A')
      }),
    })
    rows.push({
      label: 'Revenue (TTM)',
      values: selectedStocks.map(s => {
        const ttm = ttmMap[s.symbol]
        return ttm ? fmtB(ttm.revenue) : 'N/A'
      }),
    })
    rows.push({
      label: 'Net Income (TTM)',
      values: selectedStocks.map(s => {
        const ttm = ttmMap[s.symbol]
        return ttm ? fmtB(ttm.netIncome) : 'N/A'
      }),
    })
    rows.push({
      label: 'Gross Margin',
      values: selectedStocks.map(s => {
        const ttm = ttmMap[s.symbol]
        return ttm?.grossMargin != null ? `${ttm.grossMargin.toFixed(1)}%` : 'N/A'
      }),
    })
    rows.push({
      label: 'Net Margin',
      values: selectedStocks.map(s => {
        const ttm = ttmMap[s.symbol]
        return ttm?.netMargin != null ? `${ttm.netMargin.toFixed(1)}%` : 'N/A'
      }),
    })
    rows.push({
      label: 'Dividend Yield',
      values: selectedStocks.map(s => s.dividendYield ? `${(s.dividendYield * 100).toFixed(2)}%` : 'N/A'),
    })
    rows.push({
      label: 'Sector',
      values: selectedStocks.map(s => s.sector || 'N/A'),
    })
    rows.push({
      label: '52W High',
      values: selectedStocks.map(s => s.yearHigh ? `$${s.yearHigh.toFixed(2)}` : 'N/A'),
    })
    rows.push({
      label: '52W Low',
      values: selectedStocks.map(s => s.yearLow ? `$${s.yearLow.toFixed(2)}` : 'N/A'),
    })

    return rows
  }, [selectedStocks, ttmMap])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: '#9BB5AA', borderTopColor: '#1B3A2D' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Nav */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:opacity-70" style={{ color: 'var(--text-primary)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/spreads-logo.jpg" alt="Spreads" width={24} height={24} className="rounded-md" />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Spreads</span>
          </Link>
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>/</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Compare</span>
        </div>

        {/* Stock Selector */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="flex flex-wrap items-center gap-3">
            {/* Selected chips */}
            {selectedStocks.map((s, i) => (
              <div key={s.symbol} className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--card-border)' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND_COLORS[i] }} />
                <StockLogo symbol={s.symbol} name={s.name} logo={`https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${s.symbol}.png`} size="sm" />
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.symbol}</span>
                <button onClick={() => removeSymbol(s.symbol)} className="ml-1 hover:opacity-60">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}

            {/* Add stock input */}
            {selectedSymbols.length < 4 && (
              <div className="relative">
                <input
                  type="text"
                  placeholder={selectedSymbols.length === 0 ? 'Search stocks to compare...' : 'Add stock...'}
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchInput && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="px-3 py-1.5 rounded-lg text-sm outline-none w-48"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-64 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                    {suggestions.map(s => (
                      <button
                        key={s.symbol}
                        onMouseDown={() => addSymbol(s.symbol)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:opacity-80 text-left"
                        style={{ borderBottom: '1px solid var(--card-border)' }}
                      >
                        <StockLogo symbol={s.symbol} name={s.name} logo={`https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${s.symbol}.png`} size="sm" />
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.symbol}</span>
                        <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Compare up to 4 stocks side by side. {selectedSymbols.length === 0 && 'Start by searching for a stock above.'}
          </p>
        </div>

        {selectedStocks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Stock Comparison Tool</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Search and add stocks above to compare their fundamentals side by side.</p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {['NVDA,AMD', 'AAPL,MSFT,GOOGL', 'LLY,NVO', 'TSLA,F,GM,RIVN'].map(preset => (
                <button
                  key={preset}
                  onClick={() => router.push(`/compare?symbols=${preset}`)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}
                >
                  {preset.split(',').join(' vs ')}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Comparison Table */}
            <div className="rounded-xl overflow-hidden mb-8" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              {/* Header row with logos */}
              <div className="grid gap-0" style={{ gridTemplateColumns: `160px repeat(${selectedStocks.length}, 1fr)` }}>
                <div className="p-3" style={{ borderBottom: '1px solid var(--card-border)', borderRight: '1px solid var(--card-border)' }} />
                {selectedStocks.map((s, i) => (
                  <div key={s.symbol} className="p-3 text-center" style={{ borderBottom: `2px solid ${BRAND_COLORS[i]}` }}>
                    <Link href={`/stock/${s.symbol}`} className="inline-flex flex-col items-center gap-1.5 hover:opacity-80">
                      <StockLogo symbol={s.symbol} name={s.name} logo={`https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${s.symbol}.png`} size="lg" />
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.symbol}</span>
                      <span className="text-[10px] truncate max-w-[100px]" style={{ color: 'var(--text-muted)' }}>{s.name}</span>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Metric rows */}
              {metrics.map((row, ri) => (
                <div
                  key={row.label}
                  className="grid gap-0"
                  style={{
                    gridTemplateColumns: `160px repeat(${selectedStocks.length}, 1fr)`,
                    backgroundColor: ri % 2 === 0 ? 'var(--card-bg)' : 'var(--bg-tertiary)',
                  }}
                >
                  <div className="p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--card-border)' }}>
                    {row.label}
                  </div>
                  {row.values.map((val, vi) => {
                    const isChange = row.label === 'Change %'
                    const numVal = typeof val === 'string' ? parseFloat(val) : val
                    let color = 'var(--text-primary)'
                    if (isChange && !isNaN(numVal)) color = numVal >= 0 ? '#22c55e' : '#ef4444'
                    return (
                      <div key={vi} className="p-3 text-sm font-medium text-center" style={{ color }}>
                        {val}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Revenue Chart */}
            {revenueChartData.length > 0 && (
              <div className="rounded-xl p-4 mb-8" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Quarterly Revenue ($B)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueChartData} barCategoryGap="20%">
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `$${v.toFixed(0)}B`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number, name: string) => [`$${value?.toFixed(1)}B`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {selectedSymbols.map((sym, i) => (
                      <Bar key={sym} dataKey={sym} fill={BRAND_COLORS[i]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* Back */}
        <div className="mt-10 mb-6 flex justify-center">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-80 transition-opacity" style={{ backgroundColor: '#1B3A2D' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
