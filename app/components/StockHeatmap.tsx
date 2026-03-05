'use client'

import { useState, useMemo, useEffect } from 'react'
import { Stock } from '@/lib/types'

interface StockHeatmapProps {
  stocks: Stock[]
  onSelectStock: (stock: Stock) => void
  datasetName?: string
}

interface HeatmapStock {
  symbol: string
  name: string
  price: number
  change: number
  changesPercentage: number
  marketCap: number
  sector: string
  industry: string
  region: string
  exchange: string
  logo?: string
}

interface TreemapNode {
  stock: HeatmapStock
  x: number
  y: number
  width: number
  height: number
  value: number
}

// Sector categories
const SECTORS = [
  'All Sectors',
  'Technology',
  'Financials',
  'Healthcare',
  'Consumer',
  'Energy',
  'Industrials',
  'Materials',
  'Utilities',
  'Real Estate',
  'Communication',
  'Other'
]

export default function StockHeatmap({ stocks: localStocks, onSelectStock, datasetName = 'S&P 500' }: StockHeatmapProps) {
  const [heatmapStocks, setHeatmapStocks] = useState<HeatmapStock[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSector, setSelectedSector] = useState<string>('All Sectors')
  const [hoveredStock, setHoveredStock] = useState<string | null>(null)

  // Use local stocks data (already fetched from Finnhub)
  useEffect(() => {
    const convertedStocks: HeatmapStock[] = localStocks.map(s => ({
      symbol: s.symbol,
      name: s.name,
      price: s.price,
      change: s.change,
      changesPercentage: s.changesPercentage,
      marketCap: s.marketCap,
      sector: s.sector,
      industry: s.industry,
      region: 'United States',
      exchange: s.exchange,
      logo: s.logo
    }))
    setHeatmapStocks(convertedStocks)
    setLoading(false)
  }, [localStocks])

  // Filter stocks by sector
  const filteredStocks = useMemo(() => {
    return heatmapStocks.filter(stock => {
      // Sector filter
      if (selectedSector !== 'All Sectors') {
        const stockSector = stock.sector || ''
        if (selectedSector === 'Consumer') {
          return stockSector.toLowerCase().includes('consumer')
        }
        if (selectedSector === 'Communication') {
          return stockSector.toLowerCase().includes('communication')
        }
        if (selectedSector === 'Other') {
          const knownSectors = ['technology', 'financials', 'healthcare', 'consumer', 'energy', 'industrials', 'materials', 'utilities', 'real estate', 'communication']
          return !knownSectors.some(s => stockSector.toLowerCase().includes(s))
        }
        return stockSector.toLowerCase().includes(selectedSector.toLowerCase())
      }

      return true
    })
  }, [heatmapStocks, selectedSector])

  // Calculate color based on percentage change
  const getColor = (changePercent: number, min: number, max: number) => {
    const absMax = Math.max(Math.abs(min), Math.abs(max))
    const normalizedChange = changePercent / (absMax || 1)

    if (changePercent > 0) {
      const intensity = Math.min(normalizedChange * 100, 100)
      if (intensity > 66) return 'rgb(22, 163, 74)'
      if (intensity > 33) return 'rgb(34, 197, 94)'
      return 'rgb(74, 222, 128)'
    } else if (changePercent < 0) {
      const intensity = Math.min(Math.abs(normalizedChange) * 100, 100)
      if (intensity > 66) return 'rgb(220, 38, 38)'
      if (intensity > 33) return 'rgb(239, 68, 68)'
      return 'rgb(248, 113, 113)'
    }

    return 'rgb(156, 163, 175)'
  }

  // Treemap layout algorithm
  const treemapLayout = useMemo(() => {
    if (filteredStocks.length === 0) return []

    const containerWidth = 1200
    const containerHeight = 800
    const padding = 2

    const sortedStocks = [...filteredStocks].sort((a, b) => b.marketCap - a.marketCap)
    const totalValue = sortedStocks.reduce((sum, s) => sum + (s.marketCap || 0), 0)

    const nodes: TreemapNode[] = []
    const rows: HeatmapStock[][] = []
    let currentRow: HeatmapStock[] = []
    let rowWidth = 0

    sortedStocks.forEach((stock) => {
      const ratio = stock.marketCap / totalValue
      const area = ratio * containerWidth * containerHeight
      const width = Math.sqrt(area)

      if (rowWidth + width > containerWidth && currentRow.length > 0) {
        rows.push([...currentRow])
        currentRow = [stock]
        rowWidth = width
      } else {
        currentRow.push(stock)
        rowWidth += width
      }
    })
    if (currentRow.length > 0) {
      rows.push(currentRow)
    }

    let currentY = 0
    rows.forEach(row => {
      const rowTotalValue = row.reduce((sum, s) => sum + s.marketCap, 0)
      const rowHeightCalc = (rowTotalValue / totalValue) * containerHeight

      let currentX = 0
      row.forEach(stock => {
        const ratio = stock.marketCap / rowTotalValue
        const width = ratio * containerWidth - padding
        const height = rowHeightCalc - padding

        nodes.push({
          stock,
          x: currentX,
          y: currentY,
          width: Math.max(width, 50),
          height: Math.max(height, 40),
          value: stock.marketCap
        })

        currentX += width + padding
      })

      currentY += rowHeightCalc
    })

    return nodes
  }, [filteredStocks])

  // Get min and max change for coloring
  const { minChange, maxChange } = useMemo(() => {
    const changes = filteredStocks.map(s => s.changesPercentage)
    return {
      minChange: Math.min(...changes, 0),
      maxChange: Math.max(...changes, 0)
    }
  }, [filteredStocks])

  // Convert heatmap stock to local stock format for modal
  const handleStockClick = (heatmapStock: HeatmapStock) => {
    const stock: Stock = {
      symbol: heatmapStock.symbol,
      name: heatmapStock.name,
      price: heatmapStock.price,
      change: heatmapStock.change,
      changesPercentage: heatmapStock.changesPercentage,
      marketCap: heatmapStock.marketCap,
      sector: heatmapStock.sector,
      industry: heatmapStock.industry,
      exchange: heatmapStock.exchange,
      pe: null,
      eps: null,
      ebitda: null,
      dividendYield: null,
      volume: 0,
      avgVolume: 0,
      dayHigh: heatmapStock.price * 1.02,
      dayLow: heatmapStock.price * 0.98,
      yearHigh: heatmapStock.price * 1.2,
      yearLow: heatmapStock.price * 0.8,
      logo: heatmapStock.logo
    }
    onSelectStock(stock)
  }

  if (loading) {
    return (
      <div className="content-panel">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="content-panel">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {datasetName} Stock Market Heatmap
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Visualize {filteredStocks.length} stocks by market cap and daily performance
        </p>
      </div>

      {/* Sector Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {SECTORS.map(sector => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedSector === sector
                  ? 'text-white shadow-md'
                  : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: selectedSector === sector
                  ? 'var(--spreads-green)'
                  : 'var(--bg-tertiary)',
                color: selectedSector === sector
                  ? 'white'
                  : 'var(--text-secondary)',
                border: `1px solid ${selectedSector === sector ? 'var(--spreads-green)' : 'var(--border-color)'}`
              }}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-secondary)' }} className="text-sm font-medium">
            Performance:
          </span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(220, 38, 38)' }}></div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Low</span>
          </div>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(239, 68, 68)' }}></div>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(156, 163, 175)' }}></div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Flat</span>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(74, 222, 128)' }}></div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(22, 163, 74)' }}></div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>High</span>
          </div>
        </div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Size = Market Cap
        </div>
      </div>

      {/* Heatmap */}
      <div className="card overflow-hidden">
        <div className="relative w-full" style={{ paddingTop: '66.67%' }}>
          <div className="absolute inset-0 p-4">
            <div className="relative w-full h-full">
              {treemapLayout.map(node => {
                const { stock, x, y, width, height } = node
                const isHovered = hoveredStock === stock.symbol
                const color = getColor(stock.changesPercentage, minChange, maxChange)
                const isSmall = width < 120 || height < 60

                return (
                  <button
                    key={stock.symbol}
                    onClick={() => handleStockClick(stock)}
                    onMouseEnter={() => setHoveredStock(stock.symbol)}
                    onMouseLeave={() => setHoveredStock(null)}
                    className="absolute transition-all duration-200 overflow-hidden group"
                    style={{
                      left: `${(x / 1200) * 100}%`,
                      top: `${(y / 800) * 100}%`,
                      width: `${(width / 1200) * 100}%`,
                      height: `${(height / 800) * 100}%`,
                      backgroundColor: color,
                      transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                      zIndex: isHovered ? 10 : 1,
                      boxShadow: isHovered
                        ? '0 8px 16px rgba(0, 0, 0, 0.3)'
                        : '0 1px 2px rgba(0, 0, 0, 0.1)',
                      border: '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="w-full h-full p-2 flex flex-col items-center justify-center text-white relative">
                      {/* Logo */}
                      {!isSmall && stock.logo && (
                        <div className="mb-1 bg-white rounded-md p-1 overflow-hidden" style={{
                          width: Math.min(width * 0.25, 40),
                          height: Math.min(width * 0.25, 40)
                        }}>
                          <img
                            src={stock.logo}
                            alt={stock.symbol}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              // Hide image if it fails to load
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}

                      {/* Symbol */}
                      <div className={`font-bold ${isSmall ? 'text-xs' : 'text-sm'} mb-0.5`}>
                        {stock.symbol.split('.')[0]}
                      </div>

                      {/* Company Name */}
                      {!isSmall && (
                        <div className="text-xs opacity-90 text-center line-clamp-1 px-1">
                          {stock.name}
                        </div>
                      )}

                      {/* Percentage Change */}
                      <div className={`font-bold ${isSmall ? 'text-sm' : 'text-lg'} mt-1`}>
                        {stock.changesPercentage > 0 ? '+' : ''}
                        {stock.changesPercentage.toFixed(2)}%
                      </div>

                      {/* Hover Overlay */}
                      {isHovered && (
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                          <div className="text-center p-2">
                            <div className="font-bold text-sm mb-1">{stock.symbol}</div>
                            <div className="text-xs opacity-90 line-clamp-2">{stock.name}</div>
                            <div className="text-xs mt-1">${stock.price.toFixed(2)}</div>
                            <div className="text-xs">
                              {stock.changesPercentage > 0 ? '+' : ''}
                              {stock.changesPercentage.toFixed(2)}%
                            </div>
                            <div className="text-xs opacity-75">{stock.region}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Stocks Shown</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {filteredStocks.length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg Change</div>
          <div className={`text-2xl font-bold ${
            (filteredStocks.reduce((sum, s) => sum + s.changesPercentage, 0) / filteredStocks.length) >= 0
              ? 'positive'
              : 'negative'
          }`}>
            {((filteredStocks.reduce((sum, s) => sum + s.changesPercentage, 0) / filteredStocks.length) || 0).toFixed(2)}%
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Gainers</div>
          <div className="text-2xl font-bold positive">
            {filteredStocks.filter(s => s.changesPercentage > 0).length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Losers</div>
          <div className="text-2xl font-bold negative">
            {filteredStocks.filter(s => s.changesPercentage < 0).length}
          </div>
        </div>
      </div>
    </div>
  )
}
