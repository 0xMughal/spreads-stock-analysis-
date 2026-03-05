'use client'

import { useState, useEffect, useCallback } from 'react'
import TopNav from './components/TopNav'
import StockTable from './components/StockTable'
import StockFilters from './components/StockFilters'
import SectorChart from './components/SectorChart'
import Watchlist from './components/Watchlist'
import StockModal from './components/StockModal'
import StockHeroSection from './components/StockHeroSection'
import PERatioRanking from './components/PERatioRanking'
import EarningsCalendar from './components/EarningsCalendar'
import RevenueGrowth from './components/RevenueGrowth'
import DividendsRanking from './components/DividendsRanking'
import CompoundInterestCalculator from './components/CompoundInterestCalculator'
import Portfolio from './components/Portfolio'
import StockHeatmap from './components/StockHeatmap'
import { Stock, FilterState, TabType } from '@/lib/types'

const WATCHLIST_STORAGE_KEY = 'spreads_watchlist'

interface StockApiResponse {
  data: Stock[]
  source: 'api' | 'mock'
  message: string
}

type DatasetType = 'sp500' | 'nasdaq100' | 'international'

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [activeDataset, setActiveDataset] = useState<DatasetType>('nasdaq100')
  const [stocks, setStocks] = useState<Stock[]>([])
  const [allDatasets, setAllDatasets] = useState<Record<DatasetType, Stock[]>>({
    sp500: [],
    nasdaq100: [],
    international: []
  })
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'api' | 'mock' | 'cache'>('mock')
  const [cacheHoursRemaining, setCacheHoursRemaining] = useState<number | null>(null)
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sector: '',
    marketCapMin: null,
    marketCapMax: null,
    peMin: null,
    peMax: null,
    hasDividend: null,
  })

  useEffect(() => {
    const loadAllDatasets = async () => {
      setLoading(true)

      const fetchDataset = async (url: string) => {
        try {
          const res = await fetch(url)
          const data = await res.json()
          return data
        } catch {
          return { data: [], source: 'mock' }
        }
      }

      const datasetUrl: Record<DatasetType, string> = {
        nasdaq100: '/api/nasdaq100',
        sp500: '/api/stocks',
        international: '/api/international',
      }

      const activeData = await fetchDataset(datasetUrl[activeDataset])
      const activeStocks = activeData.data || []

      setAllDatasets(prev => ({ ...prev, [activeDataset]: activeStocks }))
      setStocks(activeStocks)
      setDataSource(activeData.source === 'mock' ? 'mock' : 'api')
      setCacheHoursRemaining(5)
      setLoading(false)

      const remaining = (Object.keys(datasetUrl) as DatasetType[]).filter(d => d !== activeDataset)
      Promise.all(remaining.map(async (dataset) => {
        const data = await fetchDataset(datasetUrl[dataset])
        setAllDatasets(prev => ({ ...prev, [dataset]: data.data || [] }))
      }))
    }

    loadAllDatasets()
  }, [])

  useEffect(() => {
    setStocks(allDatasets[activeDataset])
  }, [activeDataset, allDatasets])

  const handleRefreshData = useCallback(async () => {
    setLoading(true)

    try {
      const [sp500Response, nasdaq100Response, internationalResponse] = await Promise.all([
        fetch('/api/stocks?refresh=' + Date.now()),
        fetch('/api/nasdaq100?refresh=' + Date.now()),
        fetch('/api/international?refresh=' + Date.now())
      ])

      const sp500Data = await sp500Response.json()
      const nasdaq100Data = await nasdaq100Response.json()
      const internationalData = await internationalResponse.json()

      setAllDatasets({
        sp500: sp500Data.data || [],
        nasdaq100: nasdaq100Data.data || [],
        international: internationalData.data || []
      })

      setStocks(sp500Data.data || [])
      setDataSource(sp500Data.source === 'mock' ? 'mock' : 'api')
      setCacheHoursRemaining(5)
    } catch (error) {
      console.error('Failed to refresh stocks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const savedWatchlist = localStorage.getItem(WATCHLIST_STORAGE_KEY)
    if (savedWatchlist) {
      setWatchlist(JSON.parse(savedWatchlist))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist))
  }, [watchlist])

  const handleToggleWatchlist = useCallback((symbol: string) => {
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    )
  }, [])

  const handleSectorClick = useCallback((sector: string) => {
    setFilters((prev) => ({ ...prev, sector }))
  }, [])

  const handleSelectStock = useCallback((stock: Stock) => {
    setSelectedStock(stock)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedStock(null)
  }, [])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-28 rounded-xl skeleton" />
            <div className="h-28 rounded-xl skeleton" />
            <div className="h-28 rounded-xl skeleton" />
          </div>
          <div className="h-96 rounded-xl skeleton" />
        </div>
      )
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div key="dashboard" className="space-y-6">
            <StockHeroSection stocks={stocks} />

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {activeDataset === 'sp500' && 'S&P 500'}
                    {activeDataset === 'nasdaq100' && 'NASDAQ-100'}
                    {activeDataset === 'international' && 'International'}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {stocks.length} stocks with price, P/E, EPS, and dividend data
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: dataSource === 'api' ? 'rgba(34, 197, 94, 0.1)' :
                        dataSource === 'cache' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                      color: dataSource === 'api' ? 'rgb(34, 197, 94)' :
                        dataSource === 'cache' ? 'rgb(59, 130, 246)' : 'rgb(234, 179, 8)',
                    }}>
                    <span className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: dataSource === 'api' ? 'rgb(34, 197, 94)' :
                          dataSource === 'cache' ? 'rgb(59, 130, 246)' : 'rgb(234, 179, 8)',
                      }} />
                    {dataSource === 'api' ? 'Live' : dataSource === 'cache' ? 'Cached' : 'Demo'}
                  </div>
                  <button
                    onClick={handleRefreshData}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                    title="Refresh data">
                    <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              {/* Dataset Selector */}
              <div className="mt-3 flex gap-1.5">
                {[
                  { key: 'sp500' as DatasetType, label: 'S&P 500' },
                  { key: 'nasdaq100' as DatasetType, label: 'NASDAQ-100' },
                  { key: 'international' as DatasetType, label: 'International' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveDataset(key)}
                    className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
                    style={{
                      backgroundColor: activeDataset === key ? 'var(--spreads-green)' : 'var(--bg-tertiary)',
                      color: activeDataset === key ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${activeDataset === key ? 'var(--spreads-green)' : 'var(--border-color)'}`,
                    }}
                  >
                    {label}
                    <span className="ml-1.5 text-xs opacity-70">({allDatasets[key].length})</span>
                  </button>
                ))}
              </div>
            </div>

            <StockFilters filters={filters} onFilterChange={setFilters} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <StockTable
                  stocks={stocks}
                  filters={filters}
                  watchlist={watchlist}
                  compareList={[]}
                  onToggleWatchlist={handleToggleWatchlist}
                  onToggleCompare={() => {}}
                />
              </div>
              <div className="lg:col-span-1">
                <SectorChart
                  stocks={stocks}
                  onSectorClick={handleSectorClick}
                  selectedSector={filters.sector}
                />
              </div>
            </div>
          </div>
        )

      case 'pe-ratio':
        return (
          <PERatioRanking
            key="pe-ratio"
            stocks={stocks}
            onSelectStock={handleSelectStock}
            onToggleWatchlist={handleToggleWatchlist}
            watchlist={watchlist}
          />
        )

      case 'earnings':
        return <EarningsCalendar key="earnings" />

      case 'portfolio':
        return (
          <Portfolio
            key="portfolio"
            stocks={stocks}
            onSelectStock={handleSelectStock}
          />
        )

      case 'revenue-growth':
        return (
          <RevenueGrowth
            key="revenue-growth"
            stocks={stocks}
            onSelectStock={handleSelectStock}
            onToggleWatchlist={handleToggleWatchlist}
            watchlist={watchlist}
          />
        )

      case 'dividends':
        return (
          <DividendsRanking
            key="dividends"
            stocks={stocks}
            onSelectStock={handleSelectStock}
            onToggleWatchlist={handleToggleWatchlist}
            watchlist={watchlist}
          />
        )

      case 'watchlist':
        return (
          <div key="watchlist" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Watchlist</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Track your favorite stocks</p>
            </div>
            <Watchlist
              stocks={stocks}
              watchlist={watchlist}
              onRemove={handleToggleWatchlist}
              onSelectStock={handleSelectStock}
              onToggleCompare={() => {}}
              compareList={[]}
            />
          </div>
        )

      case 'compound-interest':
        return <CompoundInterestCalculator key="compound-interest" />

      case 'heatmap':
        return (
          <div key="heatmap" className="space-y-6">
            <div className="flex gap-1.5">
              {[
                { key: 'sp500' as DatasetType, label: 'S&P 500' },
                { key: 'nasdaq100' as DatasetType, label: 'NASDAQ-100' },
                { key: 'international' as DatasetType, label: 'International' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveDataset(key)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
                  style={{
                    backgroundColor: activeDataset === key ? 'var(--spreads-green)' : 'var(--bg-tertiary)',
                    color: activeDataset === key ? 'white' : 'var(--text-secondary)',
                    border: `1px solid ${activeDataset === key ? 'var(--spreads-green)' : 'var(--border-color)'}`,
                  }}
                >
                  {label} ({allDatasets[key].length})
                </button>
              ))}
            </div>
            <StockHeatmap
              stocks={stocks}
              onSelectStock={handleSelectStock}
              datasetName={
                activeDataset === 'sp500' ? 'S&P 500' :
                activeDataset === 'nasdaq100' ? 'NASDAQ-100' :
                'International Markets'
              }
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TopNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        watchlistCount={watchlist.length}
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </main>

      <footer className="mt-12 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: 'var(--spreads-green)' }}>S</div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Spreads</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Data provided by Finnhub
            </p>
          </div>
        </div>
      </footer>

      <StockModal
        stock={selectedStock}
        isOpen={selectedStock !== null}
        onClose={handleCloseModal}
        isInWatchlist={selectedStock ? watchlist.includes(selectedStock.symbol) : false}
        onToggleWatchlist={() => selectedStock && handleToggleWatchlist(selectedStock.symbol)}
      />
    </div>
  )
}
