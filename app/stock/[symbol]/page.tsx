'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Stock, InsiderTrade } from '@/lib/types'
import { formatCurrency, formatLargeCurrency, formatPercent } from '@/lib/utils'
import { useTheme } from '@/app/context/ThemeContext'
import StockLogo from '@/app/components/StockLogo'
import WatchlistButton from '@/app/components/WatchlistButton'
import { getBrandColor } from '@/lib/data/brand-colors'
import { getCompanyDescription } from '@/lib/data/company-descriptions'
import { getSimilarTickers } from '@/lib/data/search-tags'
import { useAlerts } from '@/app/hooks/useAlerts'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, TooltipProps, Cell
} from 'recharts'
import html2canvas from 'html2canvas'

// ─── Spreads Brand Palette ───
const S = {
  bg: '#F0EDE6',
  green: '#1B3A2D',
  greenLight: '#2D5E47',
  greenMuted: '#5A7A6E',
  greenDim: '#9BB5AA',
  accent: '#2ECC71',
  red: '#E74C3C',
  cream: '#D4C9A8',
  grid: '#E0DDD6',
  text: '#1B3A2D',
  textMuted: '#5A7A6E',
  textDim: '#9BB5AA',
}

declare global {
  interface Window {
    TradingView: {
      widget: new (config: Record<string, unknown>) => void
    }
  }
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

// ─── Utils ───

function formatCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`
  return `${sign}$${abs.toFixed(2)}`
}

function formatQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getUTCMonth()]} '${(d.getUTCFullYear() % 100).toString().padStart(2, '0')}`
}

/** Lighten a hex color by a factor (0-1) */
function lightenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.round(r + (255 - r) * factor)
  const lg = Math.round(g + (255 - g) * factor)
  const lb = Math.round(b + (255 - b) * factor)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

// ─── Copy Chart to Clipboard ───

function CopyChartButton({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) {
  const [status, setStatus] = useState<'idle' | 'copying' | 'done' | 'error'>('idle')

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation() // Don't trigger expand modal
    if (!targetRef.current || status === 'copying') return

    setStatus('copying')
    try {
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: S.bg,
        scale: 3, // High-res capture
        useCORS: true,
        logging: false,
      })

      canvas.toBlob(async (blob) => {
        if (!blob) { setStatus('error'); return }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ])
          setStatus('done')
          setTimeout(() => setStatus('idle'), 2000)
        } catch {
          // Fallback: download the image
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'spreads-chart.png'
          a.click()
          URL.revokeObjectURL(url)
          setStatus('done')
          setTimeout(() => setStatus('idle'), 2000)
        }
      }, 'image/png')
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
      style={{
        backgroundColor: status === 'done' ? `${S.accent}20` : `${S.green}10`,
        color: status === 'done' ? S.accent : S.textMuted,
      }}
      title={status === 'done' ? 'Copied!' : 'Copy chart image'}
    >
      {status === 'copying' ? (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: S.textMuted, borderTopColor: 'transparent' }} />
      ) : status === 'done' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  )
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
          symbol,
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
      document.querySelector('script[src="https://s3.tradingview.com/tv.js"]')?.remove()
    }
  }, [symbol, theme])

  return (
    <div className="w-full h-full min-h-[350px]">
      <div id="tradingview_widget" ref={containerRef} className="w-full h-full" />
    </div>
  )
}

// ─── Chart Tooltip ───

function SpreadsTooltip({ active, payload, label, valueFormatter }: TooltipProps<number, string> & { valueFormatter: (v: number) => string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg px-4 py-2.5 shadow-xl" style={{ backgroundColor: S.green, border: `1px solid ${S.greenLight}` }}>
      <p className="text-xs font-medium mb-0.5" style={{ color: S.greenDim }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-bold" style={{ color: '#fff' }}>
          {entry.name && entry.name !== 'value' ? `${entry.name}: ` : ''}
          {valueFormatter((entry.value as number) ?? 0)}
        </p>
      ))}
    </div>
  )
}

// ─── Expandable Chart Modal ───

function ChartModal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl relative"
        onClick={e => e.stopPropagation()}
        style={{ backgroundColor: S.bg, animation: 'scaleIn 0.25s ease-out' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ backgroundColor: `${S.green}15`, color: S.green }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  )
}

// ─── Scrollable Chart Wrapper ───
// Shows ~12-16 bars in view, scrolls horizontally for more. Auto-scrolls to latest data.

const VISIBLE_BARS = 30
const MIN_BAR_WIDTH = 32 // px per data point

function ScrollableChartArea({ dataCount, height, children }: { dataCount: number; height: number; children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const needsScroll = dataCount > VISIBLE_BARS
  const innerWidth = needsScroll ? dataCount * MIN_BAR_WIDTH + 80 : undefined

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }, [])

  useEffect(() => {
    // Auto-scroll to the right (most recent data)
    if (scrollRef.current && needsScroll) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
      // Small delay to let layout settle before checking state
      setTimeout(updateScrollState, 50)
    }
  }, [needsScroll, dataCount, updateScrollState])

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.6
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }, [])

  if (!needsScroll) {
    return (
      <div className="px-3 pb-2">
        <ResponsiveContainer width="100%" height={height}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="relative px-3 pb-2 group/scroll">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={(e) => { e.stopPropagation(); scroll('left') }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ backgroundColor: S.green, color: '#fff' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Scroll hint gradient — left */}
      {canScrollLeft && (
        <div
          className="absolute left-3 top-0 bottom-2 w-12 z-10 pointer-events-none"
          style={{ background: `linear-gradient(to right, ${S.bg}, transparent)` }}
        />
      )}

      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={updateScrollState}
      >
        <div style={{ width: innerWidth, height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scroll hint gradient — right */}
      {canScrollRight && (
        <div
          className="absolute right-3 top-0 bottom-2 w-12 z-10 pointer-events-none"
          style={{ background: `linear-gradient(to left, ${S.bg}, transparent)` }}
        />
      )}

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={(e) => { e.stopPropagation(); scroll('right') }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ backgroundColor: S.green, color: '#fff' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ─── Spreads Chart Card ───

interface ChartConfig {
  title: string
  symbol: string
  companyName: string
  logo?: string
  data: Array<{ quarter: string; value: number }>
  type?: 'bar' | 'line'
  brandColor: string
  valueFormatter?: (v: number) => string
  animationDelay?: number
}

function SpreadsChart({ config, height = 320, expanded = false, onExpand }: { config: ChartConfig; height?: number; expanded?: boolean; onExpand?: () => void }) {
  const { title, symbol, companyName, logo, data, type = 'bar', brandColor, valueFormatter = formatCompact, animationDelay = 0 } = config
  const mutedColor = lightenColor(brandColor, 0.45)
  const lastIdx = data.length - 1
  const captureRef = useRef<HTMLDivElement>(null)

  return (
    <div className={expanded ? 'p-6' : ''} ref={captureRef}>
      {/* Header */}
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <StockLogo symbol={symbol} name={companyName} logo={logo} size="md" />
          <div className="flex-1">
            <h3 className={`font-bold ${expanded ? 'text-2xl' : 'text-lg'}`} style={{ color: S.text }}>{title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: S.textMuted }}>{companyName}</span>
              <span className="text-sm font-bold" style={{ color: brandColor }}>${symbol}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <CopyChartButton targetRef={captureRef} />
            {onExpand && (
              <button
                onClick={onExpand}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{ backgroundColor: `${S.green}10`, color: S.textMuted }}
                title="Expand chart"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <ScrollableChartArea dataCount={data.length} height={expanded ? 450 : height}>
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 15, right: 55, bottom: 30, left: 10 }}>
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: expanded ? 12 : 11, fill: S.textMuted, fontWeight: 500 }}
              axisLine={{ stroke: S.grid }}
              tickLine={false}
              interval={data.length > VISIBLE_BARS ? 0 : 'preserveStartEnd'}
              angle={-45}
              textAnchor="end"
            />
            <YAxis
              orientation="right"
              tick={{ fontSize: 11, fill: S.textMuted, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={valueFormatter}
              width={60}
            />
            <Tooltip content={<SpreadsTooltip valueFormatter={valueFormatter} />} cursor={{ fill: `${brandColor}08` }} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} animationBegin={animationDelay} animationDuration={800} animationEasing="ease-out">
              {data.map((_, index) => (
                <Cell key={index} fill={index === lastIdx ? brandColor : mutedColor} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 15, right: 55, bottom: 30, left: 10 }}>
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: expanded ? 12 : 11, fill: S.textMuted, fontWeight: 500 }}
              axisLine={{ stroke: S.grid }}
              tickLine={false}
              interval={data.length > VISIBLE_BARS ? 0 : 'preserveStartEnd'}
              angle={-45}
              textAnchor="end"
            />
            <YAxis
              orientation="right"
              tick={{ fontSize: 11, fill: S.textMuted, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={valueFormatter}
              width={60}
            />
            <Tooltip content={<SpreadsTooltip valueFormatter={valueFormatter} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={brandColor}
              strokeWidth={2.5}
              dot={{ r: expanded ? 5 : 4, fill: brandColor, strokeWidth: 0 }}
              activeDot={{ r: 7, fill: brandColor, stroke: '#fff', strokeWidth: 2 }}
              animationBegin={animationDelay}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </LineChart>
        )}
      </ScrollableChartArea>

      {/* Watermark */}
      <div className="flex justify-end items-center gap-1.5 px-5 pb-3">
        <Image src="/spreads-logo.jpg" alt="" width={14} height={14} className="rounded-sm opacity-40" />
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: S.textDim }}>Spreads</span>
      </div>
    </div>
  )
}

// Wrapper that adds click-to-expand
function ExpandableChart({ config, height }: { config: ChartConfig; height?: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden transition-shadow hover:shadow-lg"
        style={{ backgroundColor: S.bg, animation: `fadeUp 0.5s ease-out ${config.animationDelay || 0}ms both` }}
      >
        <SpreadsChart config={config} height={height} onExpand={() => setExpanded(true)} />
      </div>
      <ChartModal open={expanded} onClose={() => setExpanded(false)}>
        <SpreadsChart config={config} expanded />
      </ChartModal>
    </>
  )
}

// ─── Multi-Series Expandable Chart ───

interface MultiChartConfig {
  title: string
  symbol: string
  companyName: string
  logo?: string
  data: Array<Record<string, string | number>>
  series: Array<{ key: string; label: string; color: string }>
  animationDelay?: number
}

function SpreadsMultiChartInner({ config, height = 320, expanded = false, onExpand }: { config: MultiChartConfig; height?: number; expanded?: boolean; onExpand?: () => void }) {
  const { title, symbol, companyName, logo, data, series, animationDelay = 0 } = config
  const captureRef = useRef<HTMLDivElement>(null)

  return (
    <div className={expanded ? 'p-6' : ''} ref={captureRef}>
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <StockLogo symbol={symbol} name={companyName} logo={logo} size="md" />
          <div className="flex-1">
            <h3 className={`font-bold ${expanded ? 'text-2xl' : 'text-lg'}`} style={{ color: S.text }}>{title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: S.textMuted }}>{companyName}</span>
              <span className="text-sm font-bold" style={{ color: S.green }}>${symbol}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <CopyChartButton targetRef={captureRef} />
            {onExpand && (
              <button
                onClick={(e) => { e.stopPropagation(); onExpand() }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{ backgroundColor: `${S.green}10`, color: S.textMuted }}
                title="Expand chart"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      <ScrollableChartArea dataCount={data.length} height={expanded ? 450 : height}>
        <BarChart data={data} margin={{ top: 15, right: 55, bottom: 30, left: 10 }}>
          <XAxis dataKey="quarter" tick={{ fontSize: expanded ? 12 : 11, fill: S.textMuted, fontWeight: 500 }} axisLine={{ stroke: S.grid }} tickLine={false} interval={data.length > VISIBLE_BARS ? 0 : 'preserveStartEnd'} angle={-45} textAnchor="end" />
          <YAxis orientation="right" tick={{ fontSize: 11, fill: S.textMuted, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={formatCompact} width={60} />
          <Tooltip content={<SpreadsTooltip valueFormatter={formatCompact} />} cursor={{ fill: 'rgba(27,58,45,0.05)' }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[2, 2, 0, 0]} animationBegin={(animationDelay || 0) + i * 150} animationDuration={800} animationEasing="ease-out" />
          ))}
        </BarChart>
      </ScrollableChartArea>
      <div className="flex justify-center gap-5 pb-2">
        {series.map(s => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: S.textMuted }}>
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="flex justify-end items-center gap-1.5 px-5 pb-3">
        <Image src="/spreads-logo.jpg" alt="" width={14} height={14} className="rounded-sm opacity-40" />
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: S.textDim }}>Spreads</span>
      </div>
    </div>
  )
}

function ExpandableMultiChart({ config, height }: { config: MultiChartConfig; height?: number }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <div
        className="rounded-2xl overflow-hidden transition-shadow hover:shadow-lg relative"
        style={{ backgroundColor: S.bg, animation: `fadeUp 0.5s ease-out ${config.animationDelay || 0}ms both` }}
      >
        <SpreadsMultiChartInner config={config} height={height} onExpand={() => setExpanded(true)} />
      </div>
      <ChartModal open={expanded} onClose={() => setExpanded(false)}>
        <SpreadsMultiChartInner config={config} expanded />
      </ChartModal>
    </>
  )
}

// ─── Fundamentals Section ───

// ─── Mobile Chart Tab Item ───
interface ChartTab {
  label: string
  shortLabel: string
  type: 'single' | 'multi'
  config?: ChartConfig
  multiConfig?: MultiChartConfig
}

function FundamentalsSection({ data, symbol, companyName, logo, brandColor, currentPrice }: {
  data: FundamentalsData; symbol: string; companyName: string; logo?: string; brandColor: string; currentPrice?: number
}) {
  const [mobileTab, setMobileTab] = useState(0)

  const quarters = useMemo(() => {
    return [...data.quarters].sort((a, b) => a.date.localeCompare(b.date))
  }, [data.quarters])

  const mkData = useCallback((field: keyof QuarterData) =>
    quarters.filter(q => q[field] != null).map(q => ({ quarter: formatQuarterLabel(q.date), value: q[field] as number })),
    [quarters]
  )

  const revenueData = useMemo(() => mkData('revenue'), [mkData])
  const epsData = useMemo(() => mkData('eps'), [mkData])
  const netIncomeData = useMemo(() => mkData('netIncome'), [mkData])
  const fcfData = useMemo(() => mkData('freeCashFlow'), [mkData])

  // TTM EPS (trailing 4 quarters) at each quarter point
  const ttmEpsData = useMemo(() => {
    const withEps = quarters.filter(q => q.eps != null)
    if (withEps.length < 4) return []
    const result: Array<{ quarter: string; value: number }> = []
    for (let i = 3; i < withEps.length; i++) {
      const ttm = (withEps[i].eps || 0) + (withEps[i - 1].eps || 0) + (withEps[i - 2].eps || 0) + (withEps[i - 3].eps || 0)
      result.push({ quarter: formatQuarterLabel(withEps[i].date), value: parseFloat(ttm.toFixed(2)) })
    }
    return result
  }, [quarters])

  // P/E Ratio over time (using current price / TTM EPS at each quarter)
  const peRatioData = useMemo(() => {
    if (!currentPrice || currentPrice <= 0 || ttmEpsData.length === 0) return []
    const raw = ttmEpsData
      .filter(d => d.value > 0) // P/E only meaningful for positive earnings
      .map(d => ({
        quarter: d.quarter,
        value: parseFloat((currentPrice / d.value).toFixed(1)),
      }))
    if (raw.length === 0) return raw
    // Clip outliers: cap at 3x the median to keep the chart readable
    const sorted = [...raw].sort((a, b) => a.value - b.value)
    const median = sorted[Math.floor(sorted.length / 2)].value
    const cap = Math.max(median * 3, 100) // at least 100x cap
    return raw.map(d => ({ ...d, value: Math.min(d.value, cap) }))
  }, [currentPrice, ttmEpsData])

  // Gross Margin % per quarter
  const grossMarginData = useMemo(() => {
    return quarters
      .filter(q => q.grossProfit != null && q.revenue != null && q.revenue > 0)
      .map(q => ({
        quarter: formatQuarterLabel(q.date),
        value: parseFloat(((q.grossProfit! / q.revenue!) * 100).toFixed(1)),
      }))
  }, [quarters])

  // Operating Margin % per quarter
  const operatingMarginData = useMemo(() => {
    return quarters
      .filter(q => q.operatingIncome != null && q.revenue != null && q.revenue > 0)
      .map(q => ({
        quarter: formatQuarterLabel(q.date),
        value: parseFloat(((q.operatingIncome! / q.revenue!) * 100).toFixed(1)),
      }))
  }, [quarters])

  // Net Margin % per quarter
  const netMarginData = useMemo(() => {
    return quarters
      .filter(q => q.netIncome != null && q.revenue != null && q.revenue > 0)
      .map(q => ({
        quarter: formatQuarterLabel(q.date),
        value: parseFloat(((q.netIncome! / q.revenue!) * 100).toFixed(1)),
      }))
  }, [quarters])

  // Margins multi-chart
  const marginsData = useMemo(() => {
    return quarters
      .filter(q => q.revenue != null && q.revenue > 0 && (q.grossProfit != null || q.operatingIncome != null || q.netIncome != null))
      .map(q => ({
        quarter: formatQuarterLabel(q.date),
        gross: q.grossProfit != null ? parseFloat(((q.grossProfit / q.revenue!) * 100).toFixed(1)) : 0,
        operating: q.operatingIncome != null ? parseFloat(((q.operatingIncome / q.revenue!) * 100).toFixed(1)) : 0,
        net: q.netIncome != null ? parseFloat(((q.netIncome / q.revenue!) * 100).toFixed(1)) : 0,
      }))
  }, [quarters])

  const balanceSheetData = useMemo(() =>
    quarters.filter(q => q.totalAssets != null || q.totalLiabilities != null).map(q => ({
      quarter: formatQuarterLabel(q.date), assets: q.totalAssets ?? 0, liabilities: q.totalLiabilities ?? 0, equity: q.stockholdersEquity ?? 0,
    })), [quarters])

  const debtCashData = useMemo(() =>
    quarters.filter(q => q.totalDebt != null || q.cashAndEquivalents != null).map(q => ({
      quarter: formatQuarterLabel(q.date), debt: q.totalDebt ?? 0, cash: q.cashAndEquivalents ?? 0,
    })), [quarters])

  // Build list of all available chart tabs
  const tabs = useMemo(() => {
    const t: ChartTab[] = []
    if (revenueData.length > 0)
      t.push({ label: 'Quarterly Revenue', shortLabel: 'Revenue', type: 'single', config: { title: 'Quarterly Revenue', symbol, companyName, logo, data: revenueData, brandColor, animationDelay: 0 } })
    if (peRatioData.length > 0)
      t.push({ label: 'P/E Ratio (TTM)', shortLabel: 'P/E', type: 'single', config: { title: 'P/E Ratio (TTM)', symbol, companyName, logo, data: peRatioData, type: 'line', brandColor, valueFormatter: (v: number) => `${v.toFixed(1)}x`, animationDelay: 0 } })
    if (epsData.length > 0)
      t.push({ label: 'Earnings Per Share', shortLabel: 'EPS', type: 'single', config: { title: 'Earnings Per Share', symbol, companyName, logo, data: epsData, type: 'line', brandColor, valueFormatter: (v: number) => `$${v.toFixed(2)}`, animationDelay: 0 } })
    if (netIncomeData.length > 0)
      t.push({ label: 'Net Income', shortLabel: 'Net Income', type: 'single', config: { title: 'Net Income', symbol, companyName, logo, data: netIncomeData, brandColor, animationDelay: 0 } })
    if (fcfData.length > 0)
      t.push({ label: 'Free Cash Flow', shortLabel: 'FCF', type: 'single', config: { title: 'Free Cash Flow', symbol, companyName, logo, data: fcfData, brandColor, animationDelay: 0 } })
    if (ttmEpsData.length > 0)
      t.push({ label: 'TTM Earnings Per Share', shortLabel: 'TTM EPS', type: 'single', config: { title: 'TTM Earnings Per Share', symbol, companyName, logo, data: ttmEpsData, type: 'line', brandColor, valueFormatter: (v: number) => `$${v.toFixed(2)}`, animationDelay: 0 } })
    if (marginsData.length > 3)
      t.push({
        label: 'Profit Margins', shortLabel: 'Margins', type: 'multi',
        multiConfig: {
          title: 'Profit Margins (%)', symbol, companyName, logo, data: marginsData,
          series: [
            { key: 'gross', label: 'Gross', color: '#3b82f6' },
            { key: 'operating', label: 'Operating', color: '#f59e0b' },
            { key: 'net', label: 'Net', color: S.accent },
          ],
        },
      })
    if (balanceSheetData.length > 0)
      t.push({
        label: 'Assets vs Liabilities', shortLabel: 'Balance Sheet', type: 'multi',
        multiConfig: {
          title: 'Assets vs Liabilities', symbol, companyName, logo, data: balanceSheetData,
          series: [
            { key: 'assets', label: 'Assets', color: '#3b82f6' },
            { key: 'liabilities', label: 'Liabilities', color: S.red },
            { key: 'equity', label: 'Equity', color: S.accent },
          ],
        },
      })
    if (debtCashData.length > 0)
      t.push({
        label: 'Debt vs Cash', shortLabel: 'Debt/Cash', type: 'multi',
        multiConfig: {
          title: 'Debt vs Cash', symbol, companyName, logo, data: debtCashData,
          series: [
            { key: 'debt', label: 'Total Debt', color: S.red },
            { key: 'cash', label: 'Cash', color: S.accent },
          ],
        },
      })
    return t
  }, [revenueData, epsData, netIncomeData, fcfData, peRatioData, ttmEpsData, marginsData, balanceSheetData, debtCashData, symbol, companyName, logo, brandColor])

  if (tabs.length === 0) return null

  const chartHeight = 350
  const activeTab = tabs[mobileTab] || tabs[0]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold" style={{ color: S.text }}>Fundamentals</h2>

      {/* ─── Desktop: Grid layout ─── */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-2 gap-6">
          {tabs.map((t, i) =>
            t.type === 'single' ? (
              <ExpandableChart key={i} config={{ ...t.config!, animationDelay: i * 150 }} height={chartHeight} />
            ) : (
              <ExpandableMultiChart key={i} config={{ ...t.multiConfig!, animationDelay: i * 150 }} height={chartHeight} />
            )
          )}
        </div>
      </div>

      {/* ─── Mobile: Single chart with tab bar ─── */}
      <div className="lg:hidden">
        {/* Chart display */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: S.bg, animation: 'fadeUp 0.4s ease-out both' }}
        >
          {activeTab.type === 'single' && activeTab.config ? (
            <SpreadsChart config={activeTab.config} height={300} />
          ) : activeTab.multiConfig ? (
            <SpreadsMultiChartInner config={activeTab.multiConfig} height={300} />
          ) : null}
        </div>

        {/* Tab bar */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 px-0.5">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setMobileTab(i)}
              className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0"
              style={{
                backgroundColor: mobileTab === i ? brandColor : S.bg,
                color: mobileTab === i ? '#fff' : S.textMuted,
                boxShadow: mobileTab === i ? `0 2px 8px ${brandColor}40` : 'none',
              }}
            >
              {tab.shortLabel}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Similar Stocks Section ───

function SimilarStocksSection({ symbol, allStocks }: { symbol: string; allStocks: Stock[] }) {
  const similarTickers = useMemo(() => getSimilarTickers(symbol, 12), [symbol])
  const similarStocks = useMemo(() => {
    if (!allStocks.length) return []
    return similarTickers
      .map(t => allStocks.find(s => s.symbol === t))
      .filter((s): s is Stock => s != null)
  }, [similarTickers, allStocks])

  if (similarStocks.length === 0) return null

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Similar Stocks</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {similarStocks.map(s => {
          const pos = (s.changesPercentage ?? 0) >= 0
          return (
            <Link
              key={s.symbol}
              href={`/stock/${s.symbol}`}
              className="flex-shrink-0 rounded-xl p-3 hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                minWidth: 140,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <StockLogo
                  symbol={s.symbol}
                  name={s.name}
                  logo={`https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${s.symbol}.png`}
                  size="sm"
                />
                <div>
                  <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{s.symbol}</div>
                  <div className="text-[10px] truncate max-w-[80px]" style={{ color: 'var(--text-muted)' }}>{s.name}</div>
                </div>
              </div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                ${s.price?.toFixed(2)}
              </div>
              <div className="text-xs font-medium" style={{ color: pos ? '#22c55e' : '#ef4444' }}>
                {pos ? '+' : ''}{s.changesPercentage?.toFixed(2)}%
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Insider Activity Section ───

function InsiderActivitySection({ symbol }: { symbol: string }) {
  const [trades, setTrades] = useState<InsiderTrade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/insider-trades/${symbol}`)
      .then((r) => r.json())
      .then((data) => setTrades((data.trades || []).slice(0, 10)))
      .catch(() => setTrades([]))
      .finally(() => setLoading(false))
  }, [symbol])

  if (loading) {
    return (
      <div className="mt-8" style={{ animation: 'fadeUp 0.4s ease-out 400ms both' }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: S.text }}>Insider Activity</h2>
        <div className="rounded-2xl p-8 flex items-center justify-center" style={{ backgroundColor: S.bg }}>
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: S.greenDim, borderTopColor: S.green }} />
        </div>
      </div>
    )
  }

  if (trades.length === 0) return null

  const formatInsiderValue = (value: number): string => {
    const abs = Math.abs(value)
    if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
    return `$${value.toFixed(2)}`
  }

  const formatInsiderShares = (n: number): string => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
    return n.toLocaleString()
  }

  const formatInsiderDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="mt-8" style={{ animation: 'fadeUp 0.4s ease-out 400ms both' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: S.text }}>Insider Activity</h2>
        <Link
          href={`/insiders?symbol=${symbol}`}
          className="text-xs font-medium flex items-center gap-1 hover:opacity-70 transition-opacity"
          style={{ color: S.greenLight }}
        >
          View all insider trades
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.bg }}>
        {/* Desktop table */}
        <div className="hidden sm:block">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.grid}` }}>
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: S.textDim }}>Date</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: S.textDim }}>Name</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: S.textDim }}>Title</th>
                <th className="text-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: S.textDim }}>Type</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: S.textDim }}>Shares</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: S.textDim }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, i) => {
                const isBuy = trade.type === 'buy'
                const isSell = trade.type === 'sell'
                return (
                  <tr key={`${trade.name}-${trade.date}-${i}`} style={{ borderBottom: i < trades.length - 1 ? `1px solid ${S.grid}` : 'none' }}>
                    <td className="px-5 py-3 text-xs font-medium" style={{ color: S.textMuted }}>{formatInsiderDate(trade.date)}</td>
                    <td className="px-5 py-3 text-xs font-medium" style={{ color: S.text }}>{trade.name}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: S.textMuted }}>{trade.title}</td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: isBuy ? `${S.accent}20` : isSell ? `${S.red}20` : '#eab30820',
                          color: isBuy ? S.accent : isSell ? S.red : '#eab308',
                        }}
                      >
                        {trade.type === 'buy' ? 'Buy' : trade.type === 'sell' ? 'Sell' : 'Exercise'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-right" style={{ color: S.text }}>{formatInsiderShares(trade.shares)}</td>
                    <td className="px-5 py-3 text-xs font-bold text-right" style={{ color: isBuy ? S.accent : isSell ? S.red : S.text }}>
                      {trade.totalValue > 0 ? formatInsiderValue(trade.totalValue) : 'N/A'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y" style={{ borderColor: S.grid }}>
          {trades.map((trade, i) => {
            const isBuy = trade.type === 'buy'
            const isSell = trade.type === 'sell'
            return (
              <div key={`m-${trade.name}-${trade.date}-${i}`} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium" style={{ color: S.text }}>{trade.name}</span>
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: isBuy ? `${S.accent}20` : isSell ? `${S.red}20` : '#eab30820',
                      color: isBuy ? S.accent : isSell ? S.red : '#eab308',
                    }}
                  >
                    {trade.type === 'buy' ? 'Buy' : trade.type === 'sell' ? 'Sell' : 'Exercise'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: S.textMuted }}>{trade.title} &middot; {formatInsiderDate(trade.date)}</span>
                  <span className="text-xs font-bold" style={{ color: isBuy ? S.accent : isSell ? S.red : S.text }}>
                    {trade.totalValue > 0 ? formatInsiderValue(trade.totalValue) : formatInsiderShares(trade.shares) + ' shares'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Company Overview + News ───

interface NewsArticle {
  headline: string
  summary: string
  source: string
  url: string
  datetime: number
  image: string
}

function CompanyOverviewSection({ symbol, name, sector, brandColor }: {
  symbol: string; name: string; sector: string; brandColor: string
}) {
  const [news, setNews] = useState<NewsArticle[]>([])
  const [newsLoading, setNewsLoading] = useState(true)

  const description = getCompanyDescription(symbol)

  useEffect(() => {
    fetch(`/api/news/${symbol}`)
      .then(r => r.json())
      .then(data => setNews(data.articles || []))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false))
  }, [symbol])

  const formatNewsDate = (ts: number): string => {
    const d = new Date(ts * 1000)
    const now = new Date()
    const diffH = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60))
    if (diffH < 1) return 'Just now'
    if (diffH < 24) return `${diffH}h ago`
    const diffD = Math.floor(diffH / 24)
    if (diffD === 1) return 'Yesterday'
    if (diffD < 7) return `${diffD}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ animation: 'fadeUp 0.4s ease-out 200ms both' }}>
      {/* About */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: S.bg }}>
        <h3 className="text-base font-bold mb-3" style={{ color: S.text }}>About {name.split(/[\s,]+/).slice(0, 3).join(' ')}</h3>
        {description ? (
          <p className="text-sm leading-relaxed" style={{ color: S.textMuted }}>{description}</p>
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: S.textMuted }}>
            {name} operates in the {sector} sector. Detailed company information will be available soon.
          </p>
        )}
        <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: `1px solid ${S.grid}` }}>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${brandColor}15`, color: brandColor }}>
            {sector}
          </span>
          <span className="text-[11px]" style={{ color: S.textDim }}>${symbol}</span>
        </div>
      </div>

      {/* Latest News */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: S.bg }}>
        <h3 className="text-base font-bold mb-3" style={{ color: S.text }}>Latest News</h3>
        {newsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: S.greenDim, borderTopColor: S.green }} />
          </div>
        ) : news.length === 0 ? (
          <p className="text-sm py-4" style={{ color: S.textDim }}>No recent news available</p>
        ) : (
          <div className="space-y-0 divide-y" style={{ borderColor: S.grid }}>
            {news.slice(0, 5).map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-3 first:pt-0 group"
              >
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:opacity-70 transition-opacity" style={{ color: S.text }}>
                      {article.headline}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-semibold uppercase" style={{ color: brandColor }}>{article.source}</span>
                      <span className="text-[10px]" style={{ color: S.textDim }}>{formatNewsDate(article.datetime)}</span>
                    </div>
                  </div>
                  {article.image && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 hidden sm:block">
                      <img src={article.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
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

  useEffect(() => {
    if (!symbol) return
    setLoading(true); setError(null)
    fetch('/api/stocks')
      .then(r => r.json())
      .then(result => {
        const data = result.data || []
        setAllStocks(data)
        const found = data.find((s: Stock) => s.symbol === symbol)
        if (found) setStock(found)
        else setError('Stock not found')
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [symbol])

  useEffect(() => {
    if (!symbol) return
    fetch(`/data/stocks/${symbol}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setFundamentals(data) })
      .catch(() => {})
  }, [symbol])

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
    const sorted = [...fundamentals.quarters].filter(q => q.revenue != null).sort((a, b) => b.date.localeCompare(a.date))
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

  const brandColor = useMemo(() => getBrandColor(symbol, stock?.sector), [symbol, stock?.sector])
  const isPositive = (stock?.changesPercentage ?? 0) >= 0
  const { addAlert } = useAlerts()
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertPrice, setAlertPrice] = useState('')
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above')
  const [alertSet, setAlertSet] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: S.greenDim, borderTopColor: S.green }} />
      </div>
    )
  }

  if (error || !stock) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: S.green }}>{error || 'Stock Not Found'}</h1>
          <p className="mb-6" style={{ color: S.textMuted }}>Unable to find data for: {symbol}</p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white" style={{ backgroundColor: S.green }}>Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  const logoUrl = `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${stock.symbol}.png`

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Nav */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:opacity-70" style={{ color: S.green }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/spreads-logo.jpg" alt="Spreads" width={24} height={24} className="rounded-md" />
            <span className="text-sm font-semibold" style={{ color: S.green }}>Spreads</span>
          </Link>
        </div>

        {/* ─── Price Widget (left) + Chart (right) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 mb-8">
          {/* Price Widget — Square Card */}
          <div
            className="rounded-2xl p-5 sm:p-6 flex flex-col justify-between lg:aspect-square"
            style={{ backgroundColor: S.bg, animation: 'fadeUp 0.4s ease-out both' }}
          >
            {/* Top: Logo + Name */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <StockLogo symbol={stock.symbol} name={stock.name} logo={logoUrl} size="xl" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold" style={{ color: S.text }}>{stock.symbol}</h1>
                    <WatchlistButton symbol={stock.symbol} size="md" />
                    <button
                      onClick={() => { setAlertPrice(stock.price?.toFixed(2) || ''); setShowAlertModal(true); setAlertSet(false) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                      style={{ backgroundColor: `${S.green}15`, color: S.green }}
                      title="Set price alert"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm" style={{ color: S.textMuted }}>{stock.name}</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${brandColor}18`, color: brandColor }}>
                {stock.sector}
              </span>
            </div>

            {/* Middle: Price */}
            <div className="my-4">
              <p className="text-4xl font-bold" style={{ color: S.text }}>
                {stock.price > 0 ? formatCurrency(stock.price) : 'N/A'}
              </p>
              {stock.price > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-bold px-2.5 py-0.5 rounded-lg" style={{ backgroundColor: isPositive ? `${S.accent}20` : `${S.red}20`, color: isPositive ? S.accent : S.red }}>
                    {isPositive ? '+' : ''}{formatPercent(stock.changesPercentage)}
                  </span>
                  <span className="text-sm font-medium" style={{ color: isPositive ? S.accent : S.red }}>
                    {isPositive ? '+' : ''}{formatCurrency(stock.change)}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom: Key Stats */}
            <div className="grid grid-cols-2 gap-3" style={{ borderTop: `1px solid ${S.grid}`, paddingTop: '16px' }}>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: S.textDim }}>Market Cap</p>
                <p className="text-sm font-bold" style={{ color: S.text }}>{computedMarketCap > 0 ? formatLargeCurrency(computedMarketCap) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: S.textDim }}>P/E Ratio</p>
                <p className="text-sm font-bold" style={{ color: S.text }}>{stock.pe?.toFixed(1) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: S.textDim }}>TTM Revenue</p>
                <p className="text-sm font-bold" style={{ color: S.text }}>{ttmStats?.ttmRev ? formatCompact(ttmStats.ttmRev) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: S.textDim }}>Net Margin</p>
                <p className="text-sm font-bold" style={{ color: S.text }}>{ttmStats?.margin != null ? `${ttmStats.margin.toFixed(1)}%` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: S.textDim }}>TTM EPS</p>
                <p className="text-sm font-bold" style={{ color: S.text }}>{ttmStats?.ttmEps != null ? `$${ttmStats.ttmEps.toFixed(2)}` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: S.textDim }}>Dividend</p>
                <p className="text-sm font-bold" style={{ color: S.text }}>{stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : 'N/A'}</p>
              </div>
              {balanceSheet && (
                <>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: S.textDim }}>Total Debt</p>
                    <p className="text-sm font-bold" style={{ color: S.text }}>{balanceSheet.totalDebt != null ? formatCompact(balanceSheet.totalDebt) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: S.textDim }}>Cash</p>
                    <p className="text-sm font-bold" style={{ color: S.text }}>{balanceSheet.cashAndEquivalents != null ? formatCompact(balanceSheet.cashAndEquivalents) : 'N/A'}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* TradingView Chart — hidden on mobile for cleaner experience */}
          <div className="rounded-2xl overflow-hidden hidden sm:block" style={{ backgroundColor: S.bg, animation: 'fadeUp 0.4s ease-out 100ms both' }}>
            <div className="px-6 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: S.text }}>Price Chart</h2>
              <span className="text-xs font-medium" style={{ color: S.textDim }}>TradingView</span>
            </div>
            <div className="h-[380px] lg:h-full lg:min-h-[400px]">
              <TradingViewWidget symbol={stock.symbol} theme={theme} />
            </div>
          </div>
        </div>

        {/* ─── Company Overview + News ─── */}
        <CompanyOverviewSection symbol={stock.symbol} name={stock.name} sector={stock.sector} brandColor={brandColor} />

        {/* ─── Fundamentals Charts ─── */}
        {fundamentals && (
          <FundamentalsSection
            data={fundamentals}
            symbol={stock.symbol}
            companyName={stock.name}
            logo={logoUrl}
            brandColor={brandColor}
            currentPrice={stock.price}
          />
        )}

        {/* ─── Insider Activity ─── */}
        <InsiderActivitySection symbol={stock.symbol} />

        {/* ─── Similar Stocks ─── */}
        <SimilarStocksSection symbol={stock.symbol} allStocks={allStocks} />

        {/* Back */}
        <div className="mt-10 mb-6 flex justify-center">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity" style={{ backgroundColor: S.green, color: '#fff' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* ─── Price Alert Modal ─── */}
      {showAlertModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAlertModal(false)}>
          <div
            className="rounded-2xl p-5 w-[320px] shadow-2xl"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Set Price Alert</h3>
              <button onClick={() => setShowAlertModal(false)} className="p-1 hover:opacity-60" style={{ color: 'var(--text-muted)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <StockLogo symbol={stock.symbol} name={stock.name} logo={logoUrl} size="sm" />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{stock.symbol}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Current: ${stock.price?.toFixed(2)}</span>
            </div>

            {/* Direction toggle */}
            <div className="flex gap-2 mb-3">
              {(['above', 'below'] as const).map(dir => (
                <button
                  key={dir}
                  onClick={() => setAlertDirection(dir)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: alertDirection === dir
                      ? (dir === 'above' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)')
                      : 'var(--bg-tertiary)',
                    color: alertDirection === dir
                      ? (dir === 'above' ? '#22c55e' : '#ef4444')
                      : 'var(--text-muted)',
                    border: `1px solid ${alertDirection === dir
                      ? (dir === 'above' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)')
                      : 'var(--card-border)'}`,
                  }}
                >
                  {dir === 'above' ? '↑ Above' : '↓ Below'}
                </button>
              ))}
            </div>

            {/* Price input */}
            <div className="mb-4">
              <label className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                Target Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={alertPrice}
                  onChange={e => setAlertPrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg text-sm font-semibold outline-none"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            {alertSet ? (
              <div className="flex items-center justify-center gap-2 py-2 rounded-lg" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>Alert set!</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  const price = parseFloat(alertPrice)
                  if (!isNaN(price) && price > 0) {
                    addAlert(stock.symbol, price, alertDirection)
                    setAlertSet(true)
                    setTimeout(() => setShowAlertModal(false), 1200)
                  }
                }}
                className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: S.green }}
              >
                Set Alert
              </button>
            )}

            <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
              Alerts check every minute while the app is open.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
