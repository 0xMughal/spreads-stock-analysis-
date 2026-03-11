'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Stock } from '@/lib/types'
import { formatCurrency, formatLargeCurrency, formatPercent } from '@/lib/utils'
import { useTheme } from '@/app/context/ThemeContext'
import PEHistoricalModal from '@/app/components/PEHistoricalModal'
import RedditSentimentCard from '@/app/components/RedditSentimentCard'
import StockLogo from '@/app/components/StockLogo'
import { getBrandColor } from '@/lib/data/brand-colors'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, TooltipProps
} from 'recharts'

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
          toolbar_bg: theme === 'dark' ? '#1a1d21' : '#f7f8f9',
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
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [symbol, theme])

  return (
    <div className="w-full h-full min-h-[500px] lg:min-h-[600px]">
      <div id="tradingview_widget" ref={containerRef} className="w-full h-full" />
    </div>
  )
}

/**
 * Format large numbers to B/M/K suffix for chart labels
 */
function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

/**
 * Format a date string like "2024-03-31" to "Mar '24" (matching the Spreads card design)
 */
function formatQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const yr = d.getUTCFullYear() % 100
  return `${months[d.getUTCMonth()]} '${yr.toString().padStart(2, '0')}`
}

interface CustomTooltipPayload {
  name: string
  value: number
  color: string
}

function FundamentalTooltip({ active, payload, label, valueFormatter }: TooltipProps<number, string> & { valueFormatter: (v: number) => string }) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0] as unknown as CustomTooltipPayload
  return (
    <div className="rounded-lg px-3 py-2 text-sm shadow-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-semibold" style={{ color: item.color || 'var(--text-primary)' }}>
        {valueFormatter(item.value)}
      </p>
    </div>
  )
}

interface FundamentalsSummary {
  ttmRevenue: number | null
  ttmRevenuePrev: number | null
  ttmNetIncome: number | null
  ttmNetIncomePrev: number | null
  ttmEps: number | null
  ttmEpsPrev: number | null
  latestNetMargin: number | null
}

function computeFundamentalsSummary(data: FundamentalsData): FundamentalsSummary {
  const sorted = [...data.quarters]
    .filter(q => q.revenue != null)
    .sort((a, b) => b.date.localeCompare(a.date))

  const last4 = sorted.slice(0, 4)
  const prev4 = sorted.slice(4, 8)

  const sum = (arr: typeof last4, field: 'revenue' | 'netIncome' | 'eps') =>
    arr.length === 4 && arr.every(q => q[field] != null)
      ? arr.reduce((s, q) => s + (q[field] as number), 0)
      : null

  const ttmRevenue = sum(last4, 'revenue')
  const ttmRevenuePrev = sum(prev4, 'revenue')
  const ttmNetIncome = sum(last4, 'netIncome')
  const ttmNetIncomePrev = sum(prev4, 'netIncome')
  const ttmEps = sum(last4, 'eps')
  const ttmEpsPrev = sum(prev4, 'eps')

  const latest = last4[0]
  const latestNetMargin = latest && latest.revenue && latest.netIncome
    ? (latest.netIncome / latest.revenue) * 100
    : null

  return { ttmRevenue, ttmRevenuePrev, ttmNetIncome, ttmNetIncomePrev, ttmEps, ttmEpsPrev, latestNetMargin }
}

function yoyChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function SummaryStatCard({ label, value, yoyPct }: { label: string; value: string; yoyPct: number | null }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {yoyPct !== null && (
        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
          yoyPct >= 0
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {yoyPct >= 0 ? '+' : ''}{yoyPct.toFixed(1)}% YoY
        </span>
      )}
    </div>
  )
}

function FundamentalsSection({ data, brandColor }: { data: FundamentalsData; brandColor: string }) {
  // Only show the last 12 quarters (3 years) for readability
  const quarters = useMemo(() => {
    const sorted = [...data.quarters].sort((a, b) => a.date.localeCompare(b.date))
    return sorted.slice(-12)
  }, [data.quarters])

  const summary = useMemo(() => computeFundamentalsSummary(data), [data])

  const revenueData = useMemo(() =>
    quarters
      .filter(q => q.revenue != null)
      .map(q => ({ quarter: formatQuarterLabel(q.date), value: q.revenue! })),
    [quarters]
  )

  const epsData = useMemo(() =>
    quarters
      .filter(q => q.eps != null)
      .map(q => ({ quarter: formatQuarterLabel(q.date), value: q.eps! })),
    [quarters]
  )

  const netIncomeData = useMemo(() =>
    quarters
      .filter(q => q.netIncome != null)
      .map(q => ({ quarter: formatQuarterLabel(q.date), value: q.netIncome! })),
    [quarters]
  )

  const fcfData = useMemo(() =>
    quarters
      .filter(q => q.freeCashFlow != null)
      .map(q => ({ quarter: formatQuarterLabel(q.date), value: q.freeCashFlow! })),
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

  if (revenueData.length === 0 && epsData.length === 0 && netIncomeData.length === 0) {
    return null
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-heading mb-4">
        Fundamentals
      </h2>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryStatCard
          label="TTM Revenue"
          value={summary.ttmRevenue != null ? formatCompact(summary.ttmRevenue) : 'N/A'}
          yoyPct={yoyChange(summary.ttmRevenue, summary.ttmRevenuePrev)}
        />
        <SummaryStatCard
          label="TTM Net Income"
          value={summary.ttmNetIncome != null ? formatCompact(summary.ttmNetIncome) : 'N/A'}
          yoyPct={yoyChange(summary.ttmNetIncome, summary.ttmNetIncomePrev)}
        />
        <SummaryStatCard
          label="TTM EPS"
          value={summary.ttmEps != null ? `$${summary.ttmEps.toFixed(2)}` : 'N/A'}
          yoyPct={yoyChange(summary.ttmEps, summary.ttmEpsPrev)}
        />
        <SummaryStatCard
          label="Net Margin"
          value={summary.latestNetMargin != null ? `${summary.latestNetMargin.toFixed(1)}%` : 'N/A'}
          yoyPct={null}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue */}
        {revenueData.length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: '#f0ede6' }}>
            <h3 className="text-base font-bold text-gray-900 mb-3 uppercase tracking-wide">
              Revenue (Quarterly)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueData} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#6b7280' }} interval="preserveStartEnd" angle={-45} textAnchor="end" />
                <YAxis orientation="right" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={formatCompact} width={60} />
                <Tooltip content={<FundamentalTooltip valueFormatter={formatCompact} />} />
                <Bar dataKey="value" fill={brandColor} radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* EPS */}
        {epsData.length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: '#f0ede6' }}>
            <h3 className="text-base font-bold text-gray-900 mb-3 uppercase tracking-wide">
              EPS (Quarterly)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={epsData} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#6b7280' }} interval="preserveStartEnd" angle={-45} textAnchor="end" />
                <YAxis orientation="right" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v: number) => `$${v.toFixed(2)}`} width={55} />
                <Tooltip content={<FundamentalTooltip valueFormatter={(v: number) => `$${v.toFixed(2)}`} />} />
                <Line type="monotone" dataKey="value" stroke={brandColor} strokeWidth={2} dot={{ r: 3, fill: brandColor }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Net Income */}
        {netIncomeData.length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: '#f0ede6' }}>
            <h3 className="text-base font-bold text-gray-900 mb-3 uppercase tracking-wide">
              Net Income (Quarterly)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={netIncomeData} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#6b7280' }} interval="preserveStartEnd" angle={-45} textAnchor="end" />
                <YAxis orientation="right" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={formatCompact} width={60} />
                <Tooltip content={<FundamentalTooltip valueFormatter={formatCompact} />} />
                <Bar dataKey="value" fill={brandColor} radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Free Cash Flow */}
        {fcfData.length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: '#f0ede6' }}>
            <h3 className="text-base font-bold text-gray-900 mb-3 uppercase tracking-wide">
              Free Cash Flow (Quarterly)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fcfData} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#6b7280' }} interval="preserveStartEnd" angle={-45} textAnchor="end" />
                <YAxis orientation="right" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={formatCompact} width={60} />
                <Tooltip content={<FundamentalTooltip valueFormatter={formatCompact} />} />
                <Bar dataKey="value" fill={brandColor} radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Balance Sheet: Assets vs Liabilities vs Equity */}
        {balanceSheetData.length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: '#f0ede6' }}>
            <h3 className="text-base font-bold text-gray-900 mb-3 uppercase tracking-wide">
              Balance Sheet (Quarterly)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={balanceSheetData} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#6b7280' }} interval="preserveStartEnd" angle={-45} textAnchor="end" />
                <YAxis orientation="right" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={formatCompact} width={60} />
                <Tooltip content={<BalanceSheetTooltip />} />
                <Bar dataKey="assets" fill="#3b82f6" name="Assets" radius={[0, 0, 0, 0]} />
                <Bar dataKey="liabilities" fill="#ef4444" name="Liabilities" radius={[0, 0, 0, 0]} />
                <Bar dataKey="equity" fill="#10b981" name="Equity" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <span className="flex items-center gap-1 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Assets</span>
              <span className="flex items-center gap-1 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Liabilities</span>
              <span className="flex items-center gap-1 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Equity</span>
            </div>
          </div>
        )}

        {/* Debt vs Cash */}
        {debtCashData.length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: '#f0ede6' }}>
            <h3 className="text-base font-bold text-gray-900 mb-3 uppercase tracking-wide">
              Debt vs Cash (Quarterly)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={debtCashData} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#6b7280' }} interval="preserveStartEnd" angle={-45} textAnchor="end" />
                <YAxis orientation="right" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={formatCompact} width={60} />
                <Tooltip content={<DebtCashTooltip />} />
                <Bar dataKey="debt" fill="#ef4444" name="Total Debt" radius={[0, 0, 0, 0]} />
                <Bar dataKey="cash" fill="#10b981" name="Cash" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <span className="flex items-center gap-1 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Total Debt</span>
              <span className="flex items-center gap-1 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Cash</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BalanceSheetTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatCompact(entry.value as number)}
        </p>
      ))}
    </div>
  )
}

function DebtCashTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatCompact(entry.value as number)}
        </p>
      ))}
    </div>
  )
}

function FinancialSummaryCard({ data }: { data: FundamentalsData }) {
  const sorted = useMemo(() =>
    [...data.quarters].filter(q => q.revenue != null).sort((a, b) => b.date.localeCompare(a.date)),
    [data.quarters]
  )

  if (sorted.length === 0) return null

  const latest = sorted[0]
  const latestQ = (() => {
    const d = new Date(latest.date)
    const m = d.getUTCMonth() + 1
    const q = m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4
    return { q, year: d.getUTCFullYear() }
  })()

  // Find same quarter previous year
  const prevYearQ = sorted.find(q => {
    const d = new Date(q.date)
    const m = d.getUTCMonth() + 1
    const qn = m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4
    return d.getUTCFullYear() === latestQ.year - 1 && qn === latestQ.q
  })

  const revenueGrowthYoY = latest.revenue != null && prevYearQ?.revenue != null && prevYearQ.revenue !== 0
    ? ((latest.revenue - prevYearQ.revenue) / Math.abs(prevYearQ.revenue)) * 100
    : null

  const epsGrowthYoY = latest.eps != null && prevYearQ?.eps != null && prevYearQ.eps !== 0
    ? ((latest.eps - prevYearQ.eps) / Math.abs(prevYearQ.eps)) * 100
    : null

  const netMargin = latest.revenue && latest.netIncome
    ? (latest.netIncome / latest.revenue) * 100
    : null

  const last4 = sorted.slice(0, 4)
  const ttmRevenue = last4.length === 4 ? last4.reduce((s, q) => s + (q.revenue || 0), 0) : null
  const ttmNetIncome = last4.length === 4 ? last4.reduce((s, q) => s + (q.netIncome || 0), 0) : null
  const ttmEps = last4.length === 4 && last4.every(q => q.eps != null)
    ? last4.reduce((s, q) => s + (q.eps || 0), 0)
    : null

  const growthColor = (val: number | null) =>
    val == null ? '' : val >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'

  const formatGrowth = (val: number | null) =>
    val == null ? 'N/A' : `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
        Financial Summary
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Latest Revenue</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {latest.revenue != null ? formatCompact(latest.revenue) : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Revenue Growth YoY</span>
          <span className={`text-sm font-medium ${growthColor(revenueGrowthYoY)}`}>
            {formatGrowth(revenueGrowthYoY)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Latest Net Income</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {latest.netIncome != null ? formatCompact(latest.netIncome) : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Net Margin</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {netMargin != null ? `${netMargin.toFixed(1)}%` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Latest EPS</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {latest.eps != null ? `$${latest.eps.toFixed(2)}` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">EPS Growth YoY</span>
          <span className={`text-sm font-medium ${growthColor(epsGrowthYoY)}`}>
            {formatGrowth(epsGrowthYoY)}
          </span>
        </div>
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">TTM Revenue</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {ttmRevenue != null ? formatCompact(ttmRevenue) : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">TTM Net Income</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {ttmNetIncome != null ? formatCompact(ttmNetIncome) : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">TTM EPS</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {ttmEps != null ? `$${ttmEps.toFixed(2)}` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Quarters of Data</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {data.quarters.length} quarters
          </span>
        </div>
        {/* Balance Sheet Summary */}
        {(() => {
          const latestBS = sorted.find(q => q.totalAssets != null)
          if (!latestBS) return null
          const debtToEquity = latestBS.totalDebt != null && latestBS.stockholdersEquity != null && latestBS.stockholdersEquity !== 0
            ? (latestBS.totalDebt / latestBS.stockholdersEquity)
            : null
          return (
            <>
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Assets</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {latestBS.totalAssets != null ? formatCompact(latestBS.totalAssets) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Debt</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {latestBS.totalDebt != null ? formatCompact(latestBS.totalDebt) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Cash</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {latestBS.cashAndEquivalents != null ? formatCompact(latestBS.cashAndEquivalents) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Debt/Equity</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {debtToEquity != null ? debtToEquity.toFixed(2) : 'N/A'}
                </span>
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}

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
  const [avgPE5Y, setAvgPE5Y] = useState<number | null>(null)
  const [peModalOpen, setPeModalOpen] = useState(false)

  // Save to recently viewed in localStorage
  useEffect(() => {
    if (!symbol) return
    try {
      const key = 'spreads_recent'
      const stored = localStorage.getItem(key)
      const recent: string[] = stored ? JSON.parse(stored) : []
      const filtered = recent.filter((s: string) => s !== symbol)
      filtered.unshift(symbol)
      const trimmed = filtered.slice(0, 10)
      localStorage.setItem(key, JSON.stringify(trimmed))
    } catch {
      // localStorage unavailable
    }
  }, [symbol])

  // Fetch live price data from /api/stocks
  useEffect(() => {
    const fetchStock = async () => {
      if (!symbol) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/stocks')
        if (!response.ok) {
          throw new Error('Failed to fetch stocks')
        }
        const result = await response.json()
        const allData = result.data || []
        setAllStocks(allData)
        const stockData = allData.find((s: Stock) => s.symbol === symbol)

        if (stockData) {
          setStock(stockData)
        } else {
          setError('Stock not found')
        }
      } catch (err) {
        console.error('Error fetching stock:', err)
        setError('Failed to load stock data')
      } finally {
        setLoading(false)
      }
    }

    fetchStock()
  }, [symbol])

  // Fetch fundamentals from static JSON
  useEffect(() => {
    const fetchFundamentals = async () => {
      if (!symbol) return
      try {
        const res = await fetch(`/data/stocks/${symbol}.json`)
        if (res.ok) {
          const data: FundamentalsData = await res.json()
          setFundamentals(data)
        }
      } catch (err) {
        console.error('Error fetching fundamentals:', err)
      }
    }

    fetchFundamentals()
  }, [symbol])

  // Fetch 5Y average P/E
  useEffect(() => {
    const fetchAvgPE = async () => {
      if (!symbol) return
      try {
        const response = await fetch(`/api/historical-pe/${symbol}`)
        if (response.ok) {
          const data = await response.json()
          setAvgPE5Y(data.avgPE5Y)
        }
      } catch (err) {
        console.error('Error fetching avg P/E:', err)
      }
    }
    fetchAvgPE()
  }, [symbol])

  // Compute sector averages (must be before conditional returns to satisfy React hooks rules)
  const sectorAvg = useMemo(() => {
    if (!stock || allStocks.length === 0) return { pe: null as number | null, divYield: null as number | null }
    const sectorStocks = allStocks.filter(s => s.sector === stock.sector)
    const peValues = sectorStocks.filter(s => s.pe != null && s.pe > 0).map(s => s.pe as number)
    const divValues = sectorStocks.filter(s => s.dividendYield != null && s.dividendYield > 0).map(s => s.dividendYield as number)
    return {
      pe: peValues.length > 0 ? peValues.reduce((a, b) => a + b, 0) / peValues.length : null,
      divYield: divValues.length > 0 ? divValues.reduce((a, b) => a + b, 0) / divValues.length : null,
    }
  }, [stock, allStocks])

  if (loading) {
    return (
      <div className="min-h-screen bg-off-white dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-[500px] bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !stock) {
    return (
      <div className="min-h-screen bg-off-white dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-heading">
            {error || 'Stock Not Found'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Unable to find data for symbol: {symbol}
          </p>
          <Link
            href="/"
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Compute market cap: use stock.marketCap from Yahoo, fallback to price × shares outstanding from fundamentals
  const computedMarketCap = useMemo(() => {
    if (stock?.marketCap && stock.marketCap > 0) return stock.marketCap
    if (!stock || !fundamentals) return 0
    const sorted = [...fundamentals.quarters].sort((a, b) => b.date.localeCompare(a.date))
    const latestShares = sorted.find(q => q.sharesOutstanding != null)?.sharesOutstanding
    if (latestShares && stock.price) return stock.price * latestShares
    return 0
  }, [stock, fundamentals])

  const isPositive = stock.changesPercentage >= 0

  return (
    <div className="min-h-screen bg-off-white dark:bg-dark-bg">
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <StockLogo
                  symbol={stock.symbol}
                  logo={`https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${stock.symbol}.png`}
                  size="lg"
                />
                <h1 className="text-2xl sm:text-3xl font-bold text-spreads-green dark:text-green-400 font-heading">
                  {stock.symbol}
                </h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-spreads-green/10 text-spreads-green dark:bg-green-900/30 dark:text-green-400">
                  {stock.sector}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{stock.name}</p>
            </div>
          </div>

          {/* Price Display - Mobile */}
          <div className="sm:hidden card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Price</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(stock.price)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatPercent(stock.changesPercentage)}
                </p>
                <p className={`text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatCurrency(stock.change)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-heading">
                  Price Chart
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="hidden sm:inline">Powered by</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">TradingView</span>
                </div>
              </div>
              <div className="h-[400px] sm:h-[500px] lg:h-[600px]">
                <TradingViewWidget symbol={stock.symbol} theme={theme} />
              </div>
            </div>

            {/* Fundamentals Charts */}
            {fundamentals && <FundamentalsSection data={fundamentals} brandColor={getBrandColor(symbol, stock.sector)} />}
          </div>

          {/* Info Sidebar */}
          <div className="space-y-4">
            {/* Price Card - Desktop */}
            <div className="hidden sm:block card p-5">
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Price</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(stock.price)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                  isPositive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {isPositive ? '+' : ''}{formatPercent(stock.changesPercentage)}
                </span>
                <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatCurrency(stock.change)}
                </span>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
                Key Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Market Cap</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {computedMarketCap > 0 ? formatLargeCurrency(computedMarketCap) : 'N/A'}
                  </span>
                </div>
                <button
                  onClick={() => setPeModalOpen(true)}
                  className="flex justify-between items-center w-full group hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                >
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    P/E Ratio
                    <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {stock.pe?.toFixed(2) || 'N/A'}
                    </span>
                    {avgPE5Y && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-spreads-tan/20 text-spreads-tan font-medium">
                        5Y Avg: {avgPE5Y.toFixed(1)}
                      </span>
                    )}
                  </div>
                </button>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">EPS</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stock.eps ? formatCurrency(stock.eps) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">EBITDA</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stock.ebitda ? formatLargeCurrency(stock.ebitda) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Dividend Yield</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Summary from Fundamentals */}
            {fundamentals && <FinancialSummaryCard data={fundamentals} />}

            {/* Trading Range */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
                Trading Range
              </h3>
              <div className="space-y-4">
                {/* Day Range */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>Day Range</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{formatCurrency(stock.dayLow)}</span>
                    <span className="text-gray-600 dark:text-gray-400">{formatCurrency(stock.dayHigh)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-spreads-green dark:bg-green-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((stock.price - stock.dayLow) / (stock.dayHigh - stock.dayLow)) * 100))}%`
                      }}
                    />
                  </div>
                </div>

                {/* 52 Week Range */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>52 Week Range</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{formatCurrency(stock.yearLow)}</span>
                    <span className="text-gray-600 dark:text-gray-400">{formatCurrency(stock.yearHigh)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-spreads-tan rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((stock.price - stock.yearLow) / (stock.yearHigh - stock.yearLow)) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Reddit Sentiment */}
            <RedditSentimentCard symbol={symbol} />

            {/* Company Info */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
                Company Info
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Sector</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stock.sector}
                  </span>
                </div>
                {stock.industry && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Industry</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {stock.industry}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Exchange</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stock.exchange}
                  </span>
                </div>
              </div>

              {/* Sector Performance Comparison */}
              {(sectorAvg.pe !== null || sectorAvg.divYield !== null) && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                    Sector Performance
                  </h4>
                  <div className="space-y-3">
                    {sectorAvg.pe !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">P/E vs Sector</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {stock.pe?.toFixed(1) || 'N/A'}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                            vs {sectorAvg.pe.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )}
                    {sectorAvg.divYield !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Div Yield vs Sector</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : 'N/A'}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                            vs {sectorAvg.divYield.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Back to Dashboard Button */}
            <Link
              href="/"
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* P/E Historical Modal */}
      <PEHistoricalModal
        isOpen={peModalOpen}
        onClose={() => setPeModalOpen(false)}
        symbol={stock.symbol}
        companyName={stock.name}
      />
    </div>
  )
}
