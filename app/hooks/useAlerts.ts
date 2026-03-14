'use client'

import { useState, useEffect, useCallback } from 'react'

export interface PriceAlert {
  id: string
  symbol: string
  targetPrice: number
  direction: 'above' | 'below'
  createdAt: number
  triggered: boolean
  triggeredAt?: number
}

const STORAGE_KEY = 'spreads_price_alerts'

function loadAlerts(): PriceAlert[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveAlerts(alerts: PriceAlert[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
  } catch { /* */ }
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])

  useEffect(() => {
    setAlerts(loadAlerts())
  }, [])

  const addAlert = useCallback((symbol: string, targetPrice: number, direction: 'above' | 'below') => {
    const newAlert: PriceAlert = {
      id: `${symbol}-${direction}-${targetPrice}-${Date.now()}`,
      symbol: symbol.toUpperCase(),
      targetPrice,
      direction,
      createdAt: Date.now(),
      triggered: false,
    }
    setAlerts(prev => {
      const updated = [newAlert, ...prev]
      saveAlerts(updated)
      return updated
    })
  }, [])

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => {
      const updated = prev.filter(a => a.id !== id)
      saveAlerts(updated)
      return updated
    })
  }, [])

  const clearTriggered = useCallback(() => {
    setAlerts(prev => {
      const updated = prev.filter(a => !a.triggered)
      saveAlerts(updated)
      return updated
    })
  }, [])

  const checkAlerts = useCallback((prices: Record<string, number>) => {
    setAlerts(prev => {
      let changed = false
      const updated = prev.map(alert => {
        if (alert.triggered) return alert
        const price = prices[alert.symbol]
        if (price == null) return alert
        const hit = alert.direction === 'above'
          ? price >= alert.targetPrice
          : price <= alert.targetPrice
        if (hit) {
          changed = true
          // Fire browser notification
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`Spreads Price Alert`, {
              body: `${alert.symbol} is now $${price.toFixed(2)} (${alert.direction === 'above' ? 'above' : 'below'} $${alert.targetPrice.toFixed(2)})`,
              icon: '/spreads-logo.jpg',
            })
          }
          return { ...alert, triggered: true, triggeredAt: Date.now() }
        }
        return alert
      })
      if (changed) saveAlerts(updated)
      return changed ? updated : prev
    })
  }, [])

  const activeCount = alerts.filter(a => !a.triggered).length
  const triggeredCount = alerts.filter(a => a.triggered).length

  return { alerts, addAlert, removeAlert, clearTriggered, checkAlerts, activeCount, triggeredCount }
}
