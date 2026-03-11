import { NextResponse } from 'next/server'
import { InsiderTrade } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Top stocks to aggregate insider trades for
const TOP_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  'BRK-B', 'JPM', 'V', 'JNJ', 'WMT', 'MA', 'PG', 'UNH',
  'HD', 'DIS', 'BAC', 'XOM', 'NFLX', 'AVGO', 'KO', 'PEP',
  'COST', 'TMO', 'ABBV', 'MRK', 'LLY', 'ORCL', 'CRM',
  'AMD', 'ADBE', 'CSCO', 'ACN', 'INTC', 'QCOM', 'TXN',
  'IBM', 'NOW', 'PYPL', 'UBER', 'SQ', 'SHOP', 'PLTR',
  'COIN', 'ARM', 'SNOW', 'GS', 'MS', 'ABNB',
]

// Company name mapping
const COMPANY_NAMES: Record<string, string> = {
  'AAPL': 'Apple', 'MSFT': 'Microsoft', 'GOOGL': 'Alphabet', 'AMZN': 'Amazon',
  'NVDA': 'NVIDIA', 'META': 'Meta Platforms', 'TSLA': 'Tesla', 'BRK-B': 'Berkshire Hathaway',
  'JPM': 'JPMorgan Chase', 'V': 'Visa', 'JNJ': 'Johnson & Johnson', 'WMT': 'Walmart',
  'MA': 'Mastercard', 'PG': 'Procter & Gamble', 'UNH': 'UnitedHealth', 'HD': 'Home Depot',
  'DIS': 'Disney', 'BAC': 'Bank of America', 'XOM': 'ExxonMobil', 'NFLX': 'Netflix',
  'AVGO': 'Broadcom', 'KO': 'Coca-Cola', 'PEP': 'PepsiCo', 'COST': 'Costco',
  'TMO': 'Thermo Fisher', 'ABBV': 'AbbVie', 'MRK': 'Merck', 'LLY': 'Eli Lilly',
  'ORCL': 'Oracle', 'CRM': 'Salesforce', 'AMD': 'AMD', 'ADBE': 'Adobe',
  'CSCO': 'Cisco', 'ACN': 'Accenture', 'INTC': 'Intel', 'QCOM': 'Qualcomm',
  'TXN': 'Texas Instruments', 'IBM': 'IBM', 'NOW': 'ServiceNow', 'PYPL': 'PayPal',
  'UBER': 'Uber', 'SQ': 'Block', 'SHOP': 'Shopify', 'PLTR': 'Palantir',
  'COIN': 'Coinbase', 'ARM': 'Arm Holdings', 'SNOW': 'Snowflake', 'GS': 'Goldman Sachs',
  'MS': 'Morgan Stanley', 'ABNB': 'Airbnb',
}

interface AggregatedTrade extends InsiderTrade {
  symbol: string
  companyName: string
}

// Cache for the aggregated feed
let feedCache: { data: AggregatedTrade[]; expires: number } | null = null
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

export async function GET(request: Request) {
  const url = new URL(request.url)
  const filterSymbol = url.searchParams.get('symbol')?.toUpperCase()

  // If filtering by symbol, just redirect to per-symbol endpoint
  if (filterSymbol) {
    const baseUrl = url.origin
    const res = await fetch(`${baseUrl}/api/insider-trades/${filterSymbol}`)
    const data = await res.json()
    const trades = (data.trades || []).map((t: InsiderTrade) => ({
      ...t,
      symbol: filterSymbol,
      companyName: COMPANY_NAMES[filterSymbol] || filterSymbol,
    }))
    return NextResponse.json({ trades, fetchedAt: Date.now() })
  }

  // Check cache
  if (feedCache && feedCache.expires > Date.now()) {
    return NextResponse.json({ trades: feedCache.data, fetchedAt: Date.now() })
  }

  // Fetch from all top stocks in parallel (batched to avoid overwhelming)
  const baseUrl = url.origin
  const allTrades: AggregatedTrade[] = []

  // Batch in groups of 10
  const batches: string[][] = []
  for (let i = 0; i < TOP_SYMBOLS.length; i += 10) {
    batches.push(TOP_SYMBOLS.slice(i, i + 10))
  }

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(async (sym) => {
        try {
          const res = await fetch(`${baseUrl}/api/insider-trades/${sym}`, {
            headers: { 'Cache-Control': 'no-cache' },
          })
          if (!res.ok) return []
          const data = await res.json()
          return (data.trades || []).slice(0, 5).map((t: InsiderTrade) => ({
            ...t,
            symbol: sym,
            companyName: COMPANY_NAMES[sym] || sym,
          }))
        } catch {
          return []
        }
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allTrades.push(...result.value)
      }
    }
  }

  // Sort by date descending
  allTrades.sort((a, b) => b.date.localeCompare(a.date))

  // Cache
  feedCache = { data: allTrades, expires: Date.now() + CACHE_TTL }

  return NextResponse.json({ trades: allTrades, fetchedAt: Date.now() })
}
