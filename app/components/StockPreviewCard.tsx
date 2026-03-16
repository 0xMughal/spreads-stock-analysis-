'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Stock } from '@/lib/types'
import { formatLargeCurrency } from '@/lib/utils'
import { getCompanyDescription } from '@/lib/data/company-descriptions'
import StockLogo from './StockLogo'
import WatchlistButton from './WatchlistButton'

interface StockPreviewCardProps {
  stock: Stock
  anchor: { x: number; y: number }
  mobile?: boolean
  onClose: () => void
}

export default function StockPreviewCard({ stock, anchor, mobile, onClose }: StockPreviewCardProps) {
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (mobile) { setPosition({ top: 0, left: 0 }); return }

    const card = cardRef.current
    if (!card) return

    const cardW = 320
    const cardH = card.offsetHeight || 280
    const pad = 12
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = anchor.x - cardW / 2
    let top = anchor.y - cardH - pad

    if (top < pad) top = anchor.y + pad
    if (left < pad) left = pad
    if (left + cardW > vw - pad) left = vw - cardW - pad
    if (top + cardH > vh - pad) top = vh - cardH - pad

    setPosition({ top, left })
  }, [anchor, mobile])

  const positive = stock.changesPercentage >= 0
  const description = getCompanyDescription(stock.symbol)
  const truncatedDesc = description
    ? description.length > 120 ? description.slice(0, 120).replace(/\s\S*$/, '') + '...' : description
    : null

  const rangePercent = stock.yearHigh !== stock.yearLow
    ? ((stock.price - stock.yearLow) / (stock.yearHigh - stock.yearLow)) * 100
    : 50

  const stats = [
    { label: 'Mkt Cap', value: formatLargeCurrency(stock.marketCap) },
    { label: 'P/E', value: stock.pe != null ? stock.pe.toFixed(1) : 'N/A' },
    { label: 'Div Yield', value: stock.dividendYield != null ? `${stock.dividendYield.toFixed(2)}%` : 'N/A' },
  ]

  const navigate = () => router.push(`/stock/${stock.symbol}`)

  // Shared card inner content
  const cardContent = (
    <>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <StockLogo symbol={stock.symbol} name={stock.name} logo={stock.logo} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {stock.symbol}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
            }}>
              {stock.sector}
            </span>
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {stock.name}
          </div>
        </div>
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <WatchlistButton symbol={stock.symbol} size="sm" />
        </div>
      </div>

      {/* Price */}
      <div className="px-4 pb-3 flex items-baseline gap-2.5">
        <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          ${stock.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-sm font-semibold" style={{ color: positive ? '#22c55e' : '#ef4444' }}>
          {positive ? '+' : ''}{stock.changesPercentage?.toFixed(2)}%
        </span>
        <span className="text-xs" style={{ color: positive ? '#22c55e' : '#ef4444' }}>
          {positive ? '+' : ''}${Math.abs(stock.change)?.toFixed(2)}
        </span>
      </div>

      {/* 52-Week Range */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            52W: ${stock.yearLow?.toFixed(2)}
          </span>
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            52-Week Range
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            ${stock.yearHigh?.toFixed(2)}
          </span>
        </div>
        <div className="relative h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              width: `${Math.max(2, Math.min(98, rangePercent))}%`,
              backgroundColor: positive ? '#22c55e' : '#ef4444',
              transition: 'width 0.3s ease-out',
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2"
            style={{
              left: `${Math.max(2, Math.min(98, rangePercent))}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--card-bg)',
              borderColor: positive ? '#22c55e' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 pb-3 flex gap-1">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex-1 rounded-lg px-2.5 py-2 text-center"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
              {stat.label}
            </div>
            <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Description */}
      {truncatedDesc && (
        <div className="px-4 pb-3">
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {truncatedDesc}
          </p>
        </div>
      )}

      {/* Footer hint */}
      <div
        className="px-4 py-2.5 text-center"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          {mobile ? 'Tap to view full details' : 'Click to view full details'}
        </span>
      </div>
    </>
  )

  // Mobile: bottom sheet
  if (mobile) {
    return (
      <>
        <div
          className="fixed inset-0 z-[80]"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={onClose}
        />
        <div
          ref={cardRef}
          className="fixed z-[90] inset-x-0 bottom-0 rounded-t-2xl shadow-2xl overflow-hidden safe-pb"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            animation: 'slideUp 0.25s ease-out',
          }}
          onClick={navigate}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
          </div>
          {cardContent}
        </div>
      </>
    )
  }

  // Desktop: floating popover
  return (
    <>
      <div className="fixed inset-0 z-[80]" onClick={onClose} />
      <div
        ref={cardRef}
        className="fixed z-[90] w-[320px] rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          top: position?.top ?? -9999,
          left: position?.left ?? -9999,
          opacity: position ? 1 : 0,
          transform: position ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
          transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
          pointerEvents: position ? 'auto' : 'none',
        }}
        onMouseLeave={onClose}
        onClick={navigate}
      >
        {cardContent}
      </div>
    </>
  )
}

// ─── Hook for managing preview state ───

export function useStockPreview() {
  const [preview, setPreview] = useState<{ stock: Stock; anchor: { x: number; y: number }; mobile?: boolean } | null>(null)
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null)
  const leaveTimeout = useRef<NodeJS.Timeout | null>(null)
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null)
  const touchMoved = useRef(false)

  // Desktop: hover with 300ms delay
  const handleMouseEnter = useCallback((stock: Stock, e: React.MouseEvent) => {
    if (leaveTimeout.current) { clearTimeout(leaveTimeout.current); leaveTimeout.current = null }
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)

    hoverTimeout.current = setTimeout(() => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setPreview({
        stock,
        anchor: { x: rect.left + rect.width / 2, y: rect.top },
      })
    }, 300)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) { clearTimeout(hoverTimeout.current); hoverTimeout.current = null }
    leaveTimeout.current = setTimeout(() => {
      setPreview(null)
    }, 150)
  }, [])

  // Mobile: long-press (400ms)
  const handleTouchStart = useCallback((stock: Stock, e: React.TouchEvent) => {
    touchMoved.current = false
    const target = e.currentTarget as HTMLElement

    longPressTimeout.current = setTimeout(() => {
      if (touchMoved.current) return
      if (navigator.vibrate) navigator.vibrate(20)
      const rect = target.getBoundingClientRect()
      setPreview({
        stock,
        anchor: { x: rect.left + rect.width / 2, y: rect.top },
        mobile: true,
      })
    }, 400)
  }, [])

  const handleTouchMove = useCallback(() => {
    touchMoved.current = true
    if (longPressTimeout.current) { clearTimeout(longPressTimeout.current); longPressTimeout.current = null }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimeout.current) { clearTimeout(longPressTimeout.current); longPressTimeout.current = null }
  }, [])

  const closePreview = useCallback(() => {
    if (hoverTimeout.current) { clearTimeout(hoverTimeout.current); hoverTimeout.current = null }
    if (leaveTimeout.current) { clearTimeout(leaveTimeout.current); leaveTimeout.current = null }
    setPreview(null)
  }, [])

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
      if (leaveTimeout.current) clearTimeout(leaveTimeout.current)
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current)
    }
  }, [])

  return { preview, handleMouseEnter, handleMouseLeave, handleTouchStart, handleTouchMove, handleTouchEnd, closePreview }
}
