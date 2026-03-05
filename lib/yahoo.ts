/**
 * Yahoo Finance data fetcher
 *
 * Uses the v8 chart endpoint which still works without auth.
 * Fetches one symbol per request but runs many in parallel.
 */

export interface YahooQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  dayHigh: number
  dayLow: number
  volume: number
  marketCap?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  trailingPE?: number
  epsTrailingTwelveMonths?: number
  dividendYield?: number
  shortName?: string
  longName?: string
}

/**
 * Fetch a single stock quote from Yahoo Finance v8 chart endpoint
 */
async function fetchOne(symbol: string): Promise<YahooQuote | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta
    const indicators = result.indicators?.quote?.[0]

    // Get the most recent trading day's data
    const timestamps = result.timestamp || []
    const lastIdx = timestamps.length - 1

    const price = meta.regularMarketPrice ?? 0
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price
    const change = price - prevClose
    const changePercent = prevClose ? (change / prevClose) * 100 : 0

    return {
      symbol: meta.symbol || symbol,
      price,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      dayHigh: meta.regularMarketDayHigh ?? (indicators?.high?.[lastIdx] || price),
      dayLow: meta.regularMarketDayLow ?? (indicators?.low?.[lastIdx] || price),
      volume: meta.regularMarketVolume ?? (indicators?.volume?.[lastIdx] || 0),
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      shortName: meta.shortName,
      longName: meta.longName,
    }
  } catch {
    return null
  }
}

/**
 * Fetch all symbols in parallel batches
 * Runs BATCH_SIZE concurrent requests at a time
 */
export async function fetchAllQuotes(symbols: string[]): Promise<YahooQuote[]> {
  const BATCH_SIZE = 50 // 50 concurrent requests
  const allQuotes: YahooQuote[] = []
  let failed = 0

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(symbols.length / BATCH_SIZE)

    console.log(`[Yahoo] Batch ${batchNum}/${totalBatches} (${batch.length} symbols)`)

    const results = await Promise.all(batch.map(fetchOne))

    for (const q of results) {
      if (q && q.price > 0) {
        allQuotes.push(q)
      } else {
        failed++
      }
    }

    // Small delay between batches to avoid throttling
    if (i + BATCH_SIZE < symbols.length) {
      await new Promise(r => setTimeout(r, 300))
    }
  }

  console.log(`[Yahoo] Done: ${allQuotes.length} success, ${failed} failed out of ${symbols.length}`)
  return allQuotes
}
