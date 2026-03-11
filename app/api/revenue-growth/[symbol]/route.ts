import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const revalidate = 3600

interface QuarterlyRevenue {
  quarter: string // e.g., "Q1 2024"
  year: number
  quarterNum: number
  revenue: number
  revenueGrowthYoY: number | null
}

interface StaticQuarter {
  date: string
  revenue: number | null
  eps: number | null
  netIncome: number | null
  grossProfit: number | null
  operatingIncome: number | null
  freeCashFlow: number | null
  sharesOutstanding: number | null
}

interface StaticStockData {
  ticker: string
  name: string
  sector: string | null
  exchange: string | null
  quarters: StaticQuarter[]
}

function getQuarterFromDate(dateStr: string): { year: number; quarterNum: number } {
  const d = new Date(dateStr)
  const month = d.getUTCMonth() + 1
  let quarterNum: number
  if (month <= 3) quarterNum = 1
  else if (month <= 6) quarterNum = 2
  else if (month <= 9) quarterNum = 3
  else quarterNum = 4
  return { year: d.getUTCFullYear(), quarterNum }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const upperSymbol = symbol.toUpperCase()

  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'stocks', `${upperSymbol}.json`)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'No financial data available for this symbol' },
        { status: 404 }
      )
    }

    const raw = fs.readFileSync(filePath, 'utf-8')
    const stockData: StaticStockData = JSON.parse(raw)

    if (!stockData.quarters || stockData.quarters.length === 0) {
      return NextResponse.json(
        { error: 'No quarterly data available for this symbol' },
        { status: 404 }
      )
    }

    // Parse quarters and sort newest first
    const parsed = stockData.quarters
      .filter(q => q.revenue != null)
      .map(q => {
        const { year, quarterNum } = getQuarterFromDate(q.date)
        return { year, quarterNum, revenue: q.revenue! }
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.quarterNum - a.quarterNum
      })

    // Compute YoY growth
    const revenueHistory: QuarterlyRevenue[] = parsed.map(item => {
      const prev = parsed.find(
        p => p.year === item.year - 1 && p.quarterNum === item.quarterNum
      )
      let revenueGrowthYoY: number | null = null
      if (prev && prev.revenue > 0) {
        revenueGrowthYoY = Math.round(((item.revenue - prev.revenue) / prev.revenue) * 10000) / 100
      }
      return {
        quarter: `Q${item.quarterNum} ${item.year}`,
        year: item.year,
        quarterNum: item.quarterNum,
        revenue: item.revenue,
        revenueGrowthYoY,
      }
    })

    const recent4Quarters = revenueHistory.slice(0, 4)

    const growthRates = revenueHistory
      .filter(q => q.revenueGrowthYoY !== null)
      .map(q => q.revenueGrowthYoY as number)

    const avgGrowthRate = growthRates.length > 0
      ? Math.round((growthRates.reduce((a, b) => a + b, 0) / growthRates.length) * 100) / 100
      : null

    return NextResponse.json({
      symbol: upperSymbol,
      recent4Quarters,
      historicalData: revenueHistory,
      avgGrowthRate,
      dataPoints: revenueHistory.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('[Revenue API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue growth data' },
      { status: 500 }
    )
  }
}
