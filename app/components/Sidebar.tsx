'use client'

import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { TabType } from '@/lib/types'
import UserButton from './UserButton'

interface SidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  watchlistCount: number
  compareCount: number
  onCollapseChange?: (collapsed: boolean) => void
}

interface TabItem {
  id: TabType
  label: string
  icon: React.ReactNode
}

interface FolderItem {
  id: string
  label: string
  icon: React.ReactNode
  children: TabItem[]
}

type NavItem = TabItem | FolderItem

const isFolder = (item: NavItem): item is FolderItem => {
  return 'children' in item
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'metrics',
    label: 'Metrics',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    children: [
      {
        id: 'pe-ratio',
        label: 'P/E Rankings',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
      },
      {
        id: 'revenue-growth',
        label: 'Revenue Growth',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        id: 'dividends',
        label: 'Dividends',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'earnings',
    label: 'Earnings Calendar',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'heatmap',
    label: 'Market Heatmap',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
      </svg>
    ),
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'compound-interest',
    label: 'Calculator',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
]

export default function Sidebar({ activeTab, onTabChange, watchlistCount, compareCount, onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hoveredTab, setHoveredTab] = useState<TabType | string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['metrics'])
  const { theme, toggleTheme } = useTheme()

  const handleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    onCollapseChange?.(newState)
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    )
  }

  const getBadgeCount = (tabId: TabType): number | null => {
    if (tabId === 'watchlist' && watchlistCount > 0) return watchlistCount
    return null
  }

  const isChildActive = (folder: FolderItem): boolean => {
    return folder.children.some(child => child.id === activeTab)
  }

  const renderNavItem = (item: NavItem, index: number) => {
    if (isFolder(item)) {
      const isExpanded = expandedFolders.includes(item.id)
      const hasActiveChild = isChildActive(item)
      const isHovered = hoveredTab === item.id

      return (
        <div key={item.id}>
          <button
            onClick={() => toggleFolder(item.id)}
            onMouseEnter={() => setHoveredTab(item.id)}
            onMouseLeave={() => setHoveredTab(null)}
            className={`sidebar-tab w-full text-left group ${hasActiveChild ? 'active' : 'text-white'}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="tab-indicator" />
            <span className={`transition-transform duration-200 ${isHovered && !hasActiveChild ? 'scale-110' : ''}`}>
              {item.icon}
            </span>
            <span
              className={`flex-1 whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}
            >
              {item.label}
            </span>
            {!isCollapsed && (
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {/* Folder children */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded && !isCollapsed ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="ml-4 mt-1 space-y-1 border-l border-white/20 pl-2">
              {item.children.map((child, childIndex) => {
                const isActive = activeTab === child.id
                const isChildHovered = hoveredTab === child.id

                return (
                  <button
                    key={child.id}
                    onClick={() => onTabChange(child.id)}
                    onMouseEnter={() => setHoveredTab(child.id)}
                    onMouseLeave={() => setHoveredTab(null)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    style={{ animationDelay: `${(index + childIndex + 1) * 50}ms` }}
                  >
                    <span className={`transition-transform duration-200 ${isChildHovered && !isActive ? 'scale-110' : ''}`}>
                      {child.icon}
                    </span>
                    <span className="whitespace-nowrap">{child.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    // Regular tab item
    const isActive = activeTab === item.id
    const isHovered = hoveredTab === item.id
    const badgeCount = getBadgeCount(item.id as TabType)

    return (
      <button
        key={item.id}
        onClick={() => onTabChange(item.id as TabType)}
        onMouseEnter={() => setHoveredTab(item.id)}
        onMouseLeave={() => setHoveredTab(null)}
        className={`sidebar-tab w-full text-left group ${isActive ? 'active' : 'text-white'}`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <span className="tab-indicator" />
        <span className={`transition-transform duration-200 ${isHovered && !isActive ? 'scale-110' : ''}`}>
          {item.icon}
        </span>
        <span
          className={`flex-1 whitespace-nowrap transition-all duration-300 ${
            isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          }`}
        >
          {item.label}
        </span>
        {badgeCount && !isCollapsed && (
          <span
            className={`px-2 py-0.5 text-xs rounded-full transition-all duration-200 ${
              isActive ? 'bg-gray-900 text-white' : 'bg-white/20 text-white'
            }`}
          >
            {badgeCount}
          </span>
        )}
        {badgeCount && isCollapsed && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>
    )
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{ backgroundColor: 'var(--header-bg)' }}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            <h1 className="text-xl font-bold tracking-tight font-heading text-white">
              SPREADS
            </h1>
            <p className="text-xs font-body" style={{ color: 'var(--spreads-tan)' }}>
              Stock Analysis
            </p>
          </div>
          <button
            onClick={handleCollapse}
            className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`w-5 h-5 text-white transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto">
        {navItems.map((item, index) => renderNavItem(item, index))}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-white/10 space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-tab w-full text-white"
        >
          <span className="tab-indicator" />
          {theme === 'light' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
          <span
            className={`whitespace-nowrap transition-all duration-300 ${
              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}
          >
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        {/* User Button */}
        <UserButton collapsed={isCollapsed} />
      </div>
    </aside>
  )
}
