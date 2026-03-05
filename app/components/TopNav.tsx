'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { TabType } from '@/lib/types'

interface TopNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  watchlistCount: number
}

interface NavItem {
  id: TabType | 'metrics-dropdown'
  label: string
  children?: { id: TabType; label: string }[]
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  {
    id: 'metrics-dropdown',
    label: 'Metrics',
    children: [
      { id: 'pe-ratio', label: 'P/E Rankings' },
      { id: 'revenue-growth', label: 'Revenue Growth' },
      { id: 'dividends', label: 'Dividends' },
    ],
  },
  { id: 'earnings', label: 'Earnings' },
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'compound-interest', label: 'Calculator' },
]

export default function TopNav({ activeTab, onTabChange, watchlistCount }: TopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [metricsOpen, setMetricsOpen] = useState(false)
  const [mobileMetricsOpen, setMobileMetricsOpen] = useState(false)
  const metricsRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()

  const metricsChildren = navItems.find(i => i.id === 'metrics-dropdown')?.children || []
  const isMetricsActive = metricsChildren.some(c => c.id === activeTab)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (metricsRef.current && !metricsRef.current.contains(e.target as Node)) {
        setMetricsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b"
      style={{
        backgroundColor: theme === 'dark' ? 'rgba(15, 18, 21, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        borderColor: 'var(--border-color)',
      }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <button onClick={() => onTabChange('dashboard')} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: 'var(--spreads-green)' }}>
                S
              </div>
              <span className="text-base font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Spreads
              </span>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                if (item.children) {
                  return (
                    <div key={item.id} className="relative" ref={metricsRef}>
                      <button
                        onClick={() => setMetricsOpen(!metricsOpen)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 flex items-center gap-1 ${
                          isMetricsActive
                            ? 'text-white'
                            : ''
                        }`}
                        style={{
                          color: isMetricsActive ? 'white' : 'var(--text-secondary)',
                          backgroundColor: isMetricsActive ? 'var(--spreads-green)' : 'transparent',
                        }}
                      >
                        {item.label}
                        <svg className={`w-3.5 h-3.5 transition-transform ${metricsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {metricsOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 rounded-lg shadow-lg border overflow-hidden"
                          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                          {item.children.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => {
                                onTabChange(child.id)
                                setMetricsOpen(false)
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                activeTab === child.id ? 'font-medium' : ''
                              }`}
                              style={{
                                color: activeTab === child.id ? 'var(--spreads-green)' : 'var(--text-primary)',
                                backgroundColor: activeTab === child.id
                                  ? theme === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(25, 52, 39, 0.05)'
                                  : 'transparent',
                              }}
                              onMouseEnter={(e) => {
                                if (activeTab !== child.id) {
                                  e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (activeTab !== child.id) {
                                  e.currentTarget.style.backgroundColor = 'transparent'
                                }
                              }}
                            >
                              {child.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id as TabType)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 flex items-center gap-1.5`}
                    style={{
                      color: isActive ? 'white' : 'var(--text-secondary)',
                      backgroundColor: isActive ? 'var(--spreads-green)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {item.label}
                    {item.id === 'watchlist' && watchlistCount > 0 && (
                      <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${
                        isActive ? 'bg-white/20 text-white' : ''
                      }`}
                        style={{
                          backgroundColor: isActive ? undefined : theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                          color: isActive ? undefined : 'var(--text-secondary)',
                        }}
                      >
                        {watchlistCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 space-y-1 animate-fade-in">
            {navItems.map((item) => {
              if (item.children) {
                return (
                  <div key={item.id}>
                    <button
                      onClick={() => setMobileMetricsOpen(!mobileMetricsOpen)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors"
                      style={{
                        color: isMetricsActive ? 'var(--spreads-green)' : 'var(--text-primary)',
                        backgroundColor: isMetricsActive ? (theme === 'dark' ? 'rgba(34,197,94,0.1)' : 'rgba(25,52,39,0.05)') : 'transparent',
                      }}
                    >
                      {item.label}
                      <svg className={`w-4 h-4 transition-transform ${mobileMetricsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {mobileMetricsOpen && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => { onTabChange(child.id); setMobileMenuOpen(false) }}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                            style={{
                              color: activeTab === child.id ? 'var(--spreads-green)' : 'var(--text-secondary)',
                              fontWeight: activeTab === child.id ? 500 : 400,
                            }}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <button
                  key={item.id}
                  onClick={() => { onTabChange(item.id as TabType); setMobileMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors"
                  style={{
                    color: activeTab === item.id ? 'white' : 'var(--text-primary)',
                    backgroundColor: activeTab === item.id ? 'var(--spreads-green)' : 'transparent',
                  }}
                >
                  {item.label}
                  {item.id === 'watchlist' && watchlistCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full font-medium"
                      style={{
                        backgroundColor: activeTab === 'watchlist' ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
                        color: activeTab === 'watchlist' ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {watchlistCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </header>
  )
}
