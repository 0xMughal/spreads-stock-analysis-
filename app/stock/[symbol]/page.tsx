'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Stock } from '@/lib/types'
import { formatCurrency, formatLargeCurrency, formatPercent } from '@/lib/utils'
import { useTheme } from '@/app/context/ThemeContext'
import StockLogo from '@/app/components/StockLogo'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, TooltipProps, Cell
} from 'recharts'

// ─── Spreads Brand Palette ───
const SPREADS = {
  bg: '#F0EDE6',
  bgDark: '#0D1F17',
  green: '#1B3A2D',
  greenLight: '#2D5E47',
  greenMuted: '#5A7A6E',
  greenDim: '#9BB5AA',
  accent: '#2ECC71',
  red: '#E74C3C',
  redMuted: '#C0392B',
  cream: '#D4C9A8',
  grid: '#E0DDD6',
  gridDark: '#1B3A2D',
  barActive: '#1B3A2D',
  barMuted: '#A8BFB5',
  text: '#1B3A2D',
  textMuted: '#5A7A6E',
  textDim: '#9BB5AA',
}

declare global {
  interface Window {
    TradingView: {
      widget: new (config: TradingViewConfig) => void
    }
  }
}

interface TradingViewConfig {
  autosize: boolean
  symbol: string
  interval: string
  timezone: string
  theme: string
  style: string
  locale: string
  toolbar_bg: string
  enable_publishing: boolean
  allow_symbol_change: boolean
  container_id: string
  hide_top_toolbar: boolean
  hide_legend: boolean
  save_image: boolean
  studies: string[]
}

interface QuarterData {
  date: string
  revenue: number | null
  eps: number | null
  netIncome: number | null
  grossProfit: number | null
  operatingIncome: number | null
  freeCashFlow: number | null
  sharesOutstanding: number | null
  totalAssets: number | null
  totalLiabilities: number | null
  totalDebt: number | null
  cashAndEquivalents: number | null
  stockholdersEquity: number | null
}

interface FundamentalsData {
  ticker: string
  name: string
  sector: string | null
  exchange: string | null
  quarters: QuarterData[]
}

// ─── Utility Functions ───

function formatCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`
  return `${sign}$${abs.toFixed(0)}`
}

function formatQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const yr = d.getUTCFullYear() % 100
  return `${months[d.getUTCMonth()]} '${yr.toString().padStart(2, '0')}`
}

// ─── TradingView Widget ───

function TradingViewWidget({ symbol, theme }: { symbol: string; theme: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (containerRef.current && window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: 'D',
          timezone: 'America/New_York',
          theme: theme === 'dark' ? 'dark' : 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: theme === 'dark' ? '#0D1F17' : '#F0EDE6',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: 'tradingview_widget',
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
        })
      }
    }
    document.head.appendChild(script)

    return () => {
      const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]')
      if (existingScript) existingScript.remove()
    }
  }, [symbol, theme])

  return (
    <div className="w-full h-full min-h-[400px] lg:min-h-[500px]">
      <div id="tradingview_widget" ref={containerRef} className="w-full h-full" />
    </div>
  )
}

// ─── Spreads-Styled Chart Tooltip ───

function SpreadsTooltip({ active, payload, label, valueFormatter }: TooltipProps<number, string> & { valueFormatter: (v: number) => string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      className="rounded-lg px-4 py-2.5 shadow-xl"
      style={{ backgroundColor: SPREADS.green, border: `1px solid ${SPREADS.greenLight}` }}
    >
      <p className="text-xs font-medium mb-0.5" style={{ color: SPREADS.greenDim }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-bold" style={{ color: '#fff' }}>
          {entry.name && entry.name !== 'value' ? `${entry.name}: ` : ''}
          {valueFormatter((entry.value as number) ?? 0)}
        </p>
      ))}
    </div>
  )
}

// ─── Spreads Chart Card ───
// Matches the Spreads content bot aesthetic: cream bg, dark green text,
// company logo + title header, animated bars, watermark

interface SpreadsChartProps {
  title: string
  subtitle?: string
  symbol: string
  companyName: string
  logo?: string
  data: Array<{ quarter: string; value: number }>
  type?: 'bar' | 'line'
  color?: string
  valueFormatter?: (v: number) => string
  animationDelay?: number
}

function SpreadsChart({
  title, subtitle, symbol, companyName, logo,
  data, type = 'bar', color,
  valueFormatter = formatCompact,
  animationDelay = 0,
}: SpreadsChartProps) {
  const barColor = color || SPREADS.barActive
  const isLastIndex = data.length - 1

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: SPREADS.bg,
        animation: `fadeUp 0.5s ease-out ${animationDelay}ms both`,
      }}
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <StockLogo symbol={symbol} name={companyName} logo={logo} size="md" />
          <div>
            <h3 className="text-xl font-bold" style={{ color: SPREADS.text }}>{title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: SPREADS.textMuted }}>{companyName}</span>
              <span className="text-sm font-bold" style={{ color: SPREADS.accent }}>${symbol}</span>
            </div>
          </div>
        </div>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: SPREADS.textDim }}>{subtitle}</p>
        )}
      </div>

      {/* Chart */}
      <div className="px-3 pb-2">
        <ResponsiveContainer width="100%" height={280}>
          {type === 'bar' ? (
            <BarChart data={data} margin={{ top: 15, right: 50, bottom: 25, left: 10 }}>
              <XAxis
                dataKey="quarter"
                tick={{ fontSize: 11, fill: SPREADS.textMuted, fontWeight: 500 }}
                axisLine={{ stroke: SPREADS.grid }}
                tickLine={false}
                interval="preserveStartEnd"
                angle={-45}
                textAnchor="end"
              />
              <YAxis
                orientation="right"
                tick={{ fontSize: 11, fill: SPREADS.textMuted, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={valueFormatter}
                width={55}
              />
              <Tooltip content={<SpreadsTooltip valueFormatter={valueFormatter} />} cursor={{ fill: 'rgba(27,58,45,0.06)' }} />
              <Bar
                dataKey="value"
                radius={[3, 3, 0, 0]}
                animationBegin={animationDelay}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={index === isLastIndex ? barColor : SPREADS.barMuted}
                    fillOpacity={index === isLastIndex ? 1 : 0.7 + (index / data.length) * 0.3}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 15, right: 50, bottom: 25, left: 10 }}>
              <XAxis
                dataKey="quarter"
                tick={{ fontSize: 11, fill: SPREADS.textMuted, fontWeight: 500 }}
                axisLine={{ stroke: SPREADS.grid }}
                tickLine={false}
                interval="preserveStartEnd"
                angle={-45}
                textAnchor="end"
              />
              <YAxis
                orientation="right"
                tick={{ fontSize: 11, fill: SPREADS.textMuted, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={valueFormatter}
                width={55}
              />
              <Tooltip content={<SpreadsTooltip valueFormatter={valueFormatter} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={barColor}
                strokeWidth={2.5}
                dot={{ r: 4, fill: barColor, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: barColor, stroke: '#fff', strokeWidth: 2 }}
                animationBegin={animationDelay}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Watermark */}
      <div className="flex justify-end items-center gap-1.5 px-5 pb-3">
        <Image src="/spreads-logo.jpg" alt="" width={14} height={14} className="rounded-sm opacity-40" />
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: SPREADS.textDim }}>
          Spreads
        </span>
      </div>
    </div>
  )
}

// ─── Multi-Series Chart (Balance Sheet, Debt vs Cash) ───

interface MultiBarData {
  quarter: string
  [key: string]: string | number
}

function SpreadsMultiChart({
  title, symbol, companyName, logo,
  data, series, animationDelay = 0,
}: {
  title: string
  symbol: string
  companyName: string
  logo?: string
  data: MultiBarData[]
  series: Array<{ key: string; label: string; color: string }>
  animationDelay?: number
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: SPREADS.bg,
        animation: `fadeUp 0.5s ease-out ${animationDelay}ms both`,
      }}
    >
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <StockLogo symbol={symbol} name={companyName} logo={logo} size="md" />
          <div>
            <h3 className="text-xl font-bold" style={{ color: SPREADS.text }}>{title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: SPREADS.textMuted }}>{companyName}</span>
              <span className="text-sm font-bold" style={{ color: SPREADS.accent }}>${symbol}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 pb-2">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 15, right: 50, bottom: 25, left: 10 }}>
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 11, fill: SPREADS.textMuted, fontWeight: 500 }}
              axisLine={{ stroke: SPREADS.grid }}
              tickLine={false}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
            />
            <YAxis
              orientation="right"
              tick={{ fontSize: 11, fill: SPREADS.textMuted, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCompact}
              width={55}
            />
            <Tooltip content={<SpreadsTooltip valueFormatter={formatCompact} />} cursor={{ fill: 'rgba(27,58,45,0.06)' }} />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={[2, 2, 0, 0]}
                animationBegin={animationDelay + i * 150}
                animationDuration={800}
                animationEasing="ease-out"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-5 pb-2">
        {series.map(s => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: SPREADS.textMuted }}>
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="flex justify-end items-center gap-1.5 px-5 pb-3">
        <Image src="/spreads-logo.jpg" alt="" width={14} height={14} className="rounded-sm opacity-40" />
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: SPREADS.textDim }}>
          Spreads
        </span>
      </div>
    </div>
  )
}

// ─── Fundamentals Section ───

function FundamentalsSection({ data, symbol, companyName, logo }: {
  data: FundamentalsData
  symbol: string
  companyName: string
  logo?: string
}) {
  const quarters = useMemo(() => {
    const sorted = [...data.quarters].sort((a, b) => a.date.localeCompare(b.date))
    return sorted.slice(-16)
  }, [data.quarters])

  const revenueData = useMemo(() =>
    quarters.filter(q => q.revenue != null).map(q => ({ quarter: formatQuarterLabel(q.date), value: q.revenue! })),
    [quarters]
  )
  const epsData = useMemo(() =>
    quarters.filter(q => q.eps != null).map(q => ({ quarter: formatQuarterLabel(q.date), value: q.eps! })),
    [quarters]
  )
  const netIncomeData = useMemo(() =>
    quarters.filter(q => q.netIncome != null).map(q => ({ quarter: formatQuarterLabel(q.date), value: q.netIncome! })),
    [quarters]
  )
  const fcfData = useMemo(() =>
    quarters.filter(q => q.freeCashFlow != null).map(q => ({ quarter: formatQuarterLabel(q.date), value: q.freeCashFlow! })),
    [quarters]
  )
  const balanceSheetData = useMemo(() =>
    quarters
      .filter(q => q.totalAssets != null || q.totalLiabilities != null)
      .map(q => ({
        quarter: formatQuarterLabel(q.date),
        assets: q.totalAssets ?? 0,
        liabilities: q.totalLiabilities ?? 0,
        equity: q.stockholdersEquity ?? 0,
      })),
    [quarters]
  )
  const debtCashData = useMemo(() =>
    quarters
      .filter(q => q.totalDebt != null || q.cashAndEquivalents != null)
      .map(q => ({
        quarter: formatQuarterLabel(q.date),
        debt: q.totalDebt ?? 0,
        cash: q.cashAndEquivalents ?? 0,
      })),
    [quarters]
  )

  if (revenueData.length === 0 && epsData.length === 0) return null

  const logoUrl = `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${symbol}.png`

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {revenueData.length > 0 && (
          <SpreadsChart
            title="Quarterly Revenue"
            symbol={symbol}
            companyName={companyName}
            logo={logoUrl}
            data={revenueData}
            animationDelay={0}
          />
        )}
        {epsData.length > 0 && (
          <SpreadsChart
            title="Earnings Per Share"
            symbol={symbol}
            companyName={companyName}
            logo={logoUrl}
            data={epsData}
            type="line"
            color={SPREADS.accent}
            valueFormatter={(v) => `$${v.toFixed(2)}`}
            animationDelay={200}
          />
        )}
        {netIncomeData.length > 0 && (
          <SpreadsChart
            title="Net Income"
            symbol={symbol}
            companyName={companyName}
            logo={logoUrl}
            data={netIncomeData}
            animationDelay={400}
          />
        )}
        {fcfData.length > 0 && (
          <SpreadsChart
            title="Free Cash Flow"
            symbol={symbol}
            companyName={companyName}
            logo={logoUrl}
            data={fcfData}
            color={SPREADS.greenLight}
            animationDelay={600}
          />
        )}
        {balanceSheetData.length > 0 && (
          <SpreadsMultiChart
            title="Balance Sheet"
            symbol={symbol}
            companyName={companyName}
            logo={logoUrl}
            data={balanceSheetData}
            series={[
              { key: 'assets', label: 'Assets', color: '#3b82f6' },
              { key: 'liabilities', label: 'Liabilities', color: SPREADS.red },
              { key: 'equity', label: 'Equity', color: SPREADS.accent },
            ]}
            animationDelay={800}
          />
        )}
        {debtCashData.length > 0 && (
          <SpreadsMultiChart
            title="Debt vs Cash"
            symbol={symbol}
            companyName={companyName}
            logo={logoUrl}
            data={debtCashData}
            series={[
              { key: 'debt', label: 'Total Debt', color: SPREADS.red },
              { key: 'cash', label: 'Cash', color: SPREADS.accent },
            ]}
            animationDelay={1000}
          />
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───

export default function StockDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { theme } = useTheme()
  const symbol = typeof params.symbol === 'string' ? params.symbol.toUpperCase() : ''

  const [stock, setStock] = useState<Stock | null>(null)
  const [allStocks, setAllStocks] = useState<Stock[]>([])
  const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Save to recently viewed
  useEffect(() => {
    if (!symbol) return
    try {
      const key = 'spreads_recent'
      const stored = localStorage.getItem(key)
      const recent: string[] = stored ? JSON.parse(stored) : []
      const filtered = recent.filter((s: string) => s !== symbol)
      filtered.unshift(symbol)
      localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)))
    } catch { /* */ }
  }, [symbol])

  // Fetch stock price data
  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    fetch('/api/stocks')
      .then(r => r.json())
      .then(result => {
        const allData = result.data || []
        setAllStocks(allData)
        const found = allData.find((s: Stock) => s.symbol === symbol)
        if (found) setStock(found)
        else setError('Stock not found')
      })
      .catch(() => setError('Failed to load stock data'))
      .finally(() => setLoading(false))
  }, [symbol])

  // Fetch fundamentals
  useEffect(() => {
    if (!symbol) return
    fetch(`/data/stocks/${symbol}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setFundamentals(data) })
      .catch(() => {})
  }, [symbol])

  // All hooks before conditional returns
  const computedMarketCap = useMemo(() => {
    if (stock?.marketCap && stock.marketCap > 0) return stock.marketCap
    if (!stock || !fundamentals) return 0
    const sorted = [...fundamentals.quarters].sort((a, b) => b.date.localeCompare(a.date))
    const latestShares = sorted.find(q => q.sharesOutstanding != null)?.sharesOutstanding
    if (latestShares && stock.price) return stock.price * latestShares
    return 0
  }, [stock, fundamentals])

  const ttmStats = useMemo(() => {
    if (!fundamentals) return null
    const sorted = [...fundamentals.quarters]
      .filter(q => q.revenue != null)
      .sort((a, b) => b.date.localeCompare(a.date))
    const last4 = sorted.slice(0, 4)
    if (last4.length < 4) return null
    const ttmRev = last4.reduce((s, q) => s + (q.revenue || 0), 0)
    const ttmNI = last4.reduce((s, q) => s + (q.netIncome || 0), 0)
    const ttmEps = last4.every(q => q.eps != null) ? last4.reduce((s, q) => s + (q.eps || 0), 0) : null
    const margin = ttmRev ? (ttmNI / ttmRev) * 100 : null
    return { ttmRev, ttmNI, ttmEps, margin }
  }, [fundamentals])

  const balanceSheet = useMemo(() => {
    if (!fundamentals) return null
    const sorted = [...fundamentals.quarters].sort((a, b) => b.date.localeCompare(a.date))
    return sorted.find(q => q.totalAssets != null) || null
  }, [fundamentals])

  const isPositive = (stock?.changesPercentage ?? 0) >= 0

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-10 h-10 rounded-full border-3 border-t-transparent animate-spin" style={{ borderColor: SPREADS.greenDim, borderTopColor: SPREADS.green }} />
      </div>
    )
  }

  // ─── Error State ───
  if (error || !stock) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: SPREADS.green }}>
            {error || 'Stock Not Found'}
          </h1>
          <p className="mb-6" style={{ color: SPREADS.textMuted }}>
            Unable to find data for: {symbol}
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white" style={{ backgroundColor: SPREADS.green }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const logoUrl = `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${stock.symbol}.png`

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* ─── Top Nav ─── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl transition-colors hover:opacity-70"
            style={{ color: SPREADS.green }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/spreads-logo.jpg" alt="Spreads" width={24} height={24} className="rounded-md" />
            <span className="text-sm font-semibold" style={{ color: SPREADS.green }}>Spreads</span>
          </Link>
        </div>

        {/* ─── Stock Header + Price Widget ─── */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: SPREADS.bg,
            animation: 'fadeUp 0.4s ease-out both',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Logo + Name */}
            <div className="flex items-center gap-4">
              <StockLogo symbol={stock.symbol} name={stock.name} logo={logoUrl} size="xl" />
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold" style={{ color: SPREADS.text }}>
                    {stock.symbol}
                  </h1>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: `${SPREADS.green}15`, color: SPREADS.green }}
                  >
                    {stock.sector}
                  </span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: SPREADS.textMuted }}>{stock.name}</p>
              </div>
            </div>

            {/* Right: Price */}
            <div className="text-right">
              <p className="text-3xl sm:text-4xl font-bold" style={{ color: SPREADS.text }}>
                {stock.price > 0 ? formatCurrency(stock.price) : 'N/A'}
              </p>
              {stock.price > 0 && (
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span
                    className="text-sm font-bold px-2.5 py-0.5 rounded-lg"
                    style={{
                      backgroundColor: isPositive ? `${SPREADS.accent}20` : `${SPREADS.red}20`,
                      color: isPositive ? SPREADS.accent : SPREADS.red,
                    }}
                  >
                    {isPositive ? '+' : ''}{formatPercent(stock.changesPercentage)}
                  </span>
                  <span className="text-sm font-medium" style={{ color: isPositive ? SPREADS.accent : SPREADS.red }}>
                    {isPositive ? '+' : ''}{formatCurrency(stock.change)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Key Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5" style={{ borderTop: `1px solid ${SPREADS.grid}` }}>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: SPREADS.textDim }}>Market Cap</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: SPREADS.text }}>
                {computedMarketCap > 0 ? formatLargeCurrency(computedMarketCap) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: SPREADS.textDim }}>P/E Ratio</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: SPREADS.text }}>
                {stock.pe?.toFixed(1) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: SPREADS.textDim }}>TTM Revenue</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: SPREADS.text }}>
                {ttmStats?.ttmRev ? formatCompact(ttmStats.ttmRev) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: SPREADS.textDim }}>Net Margin</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: SPREADS.text }}>
                {ttmStats?.margin != null ? `${ttmStats.margin.toFixed(1)}%` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: SPREADS.textDim }}>TTM EPS</p>
              <p className="text-base font-bold mt-0.5" style={{ color: SPREADS.text }}>
                {ttmStats?.ttmEps != null ? `$${ttmStats.ttmEps.toFixed(2)}` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: SPREADS.textDim }}>Dividend</p>
              <p className="text-base font-bold mt-0.5" style={{ color: SPREADS.text }}>
                {stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : 'N/A'}
              </p>
            </div>
            {balanceSheet && (
              <>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: SPREADS.textDim }}>Total Debt</p>
                  <p className="text-base font-bold mt-0.5" style={{ color: SPREADS.text }}>
                    {balanceSheet.totalDebt != null ? formatCompact(balanceSheet.totalDebt) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: SPREADS.textDim }}>Cash</p>
                  <p className="text-base font-bold mt-0.5" style={{ color: SPREADS.text }}>
                    {balanceSheet.cashAndEquivalents != null ? formatCompact(balanceSheet.cashAndEquivalents) : 'N/A'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Price Chart ─── */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            backgroundColor: SPREADS.bg,
            animation: 'fadeUp 0.4s ease-out 100ms both',
          }}
        >
          <div className="px-6 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: SPREADS.text }}>Price Chart</h2>
            <span className="text-xs font-medium" style={{ color: SPREADS.textDim }}>TradingView</span>
          </div>
          <div className="h-[400px] lg:h-[500px]">
            <TradingViewWidget symbol={stock.symbol} theme={theme} />
          </div>
        </div>

        {/* ─── Trading Range ─── */}
        {stock.price > 0 && (
          <div
            className="rounded-2xl p-6 mb-6"
            style={{
              backgroundColor: SPREADS.bg,
              animation: 'fadeUp 0.4s ease-out 200ms both',
            }}
          >
            <h3 className="text-base font-bold mb-4" style={{ color: SPREADS.text }}>Trading Range</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Day Range */}
              {stock.dayHigh > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-2" style={{ color: SPREADS.textMuted }}>
                    <span>Day Low: {formatCurrency(stock.dayLow)}</span>
                    <span>Day High: {formatCurrency(stock.dayHigh)}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: SPREADS.grid }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        backgroundColor: SPREADS.green,
                        width: `${Math.min(100, Math.max(0, ((stock.price - stock.dayLow) / (stock.dayHigh - stock.dayLow)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {/* 52-Week Range */}
              {stock.yearHigh > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-2" style={{ color: SPREADS.textMuted }}>
                    <span>52W Low: {formatCurrency(stock.yearLow)}</span>
                    <span>52W High: {formatCurrency(stock.yearHigh)}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: SPREADS.grid }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        backgroundColor: SPREADS.cream,
                        width: `${Math.min(100, Math.max(0, ((stock.price - stock.yearLow) / (stock.yearHigh - stock.yearLow)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Fundamentals Charts ─── */}
        {fundamentals && (
          <FundamentalsSection
            data={fundamentals}
            symbol={stock.symbol}
            companyName={stock.name}
            logo={logoUrl}
          />
        )}

        {/* ─── Back Button ─── */}
        <div className="mt-8 mb-4 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: SPREADS.green, color: '#fff' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
