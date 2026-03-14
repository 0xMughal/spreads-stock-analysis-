'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAlerts, PriceAlert } from '@/app/hooks/useAlerts'

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function NotificationBell() {
  const { alerts, removeAlert, clearTriggered, checkAlerts, activeCount, triggeredCount } = useAlerts()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Request notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Check alerts every 60s by fetching prices
  useEffect(() => {
    const check = () => {
      fetch('/api/stocks')
        .then(r => r.json())
        .then(result => {
          const prices: Record<string, number> = {}
          for (const s of result.data || []) {
            if (s.price) prices[s.symbol] = s.price
          }
          checkAlerts(prices)
        })
        .catch(() => {})
    }
    check() // check immediately
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [checkAlerts])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const totalBadge = activeCount + triggeredCount

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors relative"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
        title="Price Alerts"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {totalBadge > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5"
            style={{ backgroundColor: triggeredCount > 0 ? '#ef4444' : '#22c55e' }}
          >
            {totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl shadow-xl z-[100] overflow-hidden"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          {/* Header */}
          <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Price Alerts</span>
            {triggeredCount > 0 && (
              <button
                onClick={clearTriggered}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md hover:opacity-80"
                style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)' }}
              >
                Clear triggered
              </button>
            )}
          </div>

          {/* Alert list */}
          <div className="max-h-64 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <div className="text-2xl mb-2">🔔</div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  No alerts yet. Set price alerts on any stock page.
                </p>
              </div>
            ) : (
              alerts.map(alert => (
                <AlertRow key={alert.id} alert={alert} onRemove={removeAlert} />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2" style={{ borderTop: '1px solid var(--card-border)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Alerts check every minute while the app is open.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function AlertRow({ alert, onRemove }: { alert: PriceAlert; onRemove: (id: string) => void }) {
  return (
    <div
      className="px-3 py-2.5 flex items-center gap-2.5"
      style={{
        borderBottom: '1px solid var(--card-border)',
        backgroundColor: alert.triggered ? 'rgba(239,68,68,0.05)' : 'transparent',
      }}
    >
      {/* Direction arrow */}
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{
          backgroundColor: alert.direction === 'above'
            ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          color: alert.direction === 'above' ? '#22c55e' : '#ef4444',
        }}
      >
        {alert.direction === 'above' ? '↑' : '↓'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{alert.symbol}</span>
          {alert.triggered && (
            <span className="text-[9px] font-semibold px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
              TRIGGERED
            </span>
          )}
        </div>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {alert.direction === 'above' ? 'Above' : 'Below'} ${alert.targetPrice.toFixed(2)}
          {' '}&middot;{' '}
          {alert.triggered && alert.triggeredAt
            ? `Fired ${timeAgo(alert.triggeredAt)}`
            : `Set ${timeAgo(alert.createdAt)}`}
        </p>
      </div>

      <button
        onClick={() => onRemove(alert.id)}
        className="p-1 rounded hover:opacity-60 flex-shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>
  )
}
