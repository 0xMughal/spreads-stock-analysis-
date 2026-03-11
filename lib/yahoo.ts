/**
 * Yahoo Finance data fetcher
 *
 * Uses the v8 chart endpoint which works without authentication.
 * Fetches quotes with controlled concurrency for bulk operations.
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

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/**
 * Fetch a single stock quote from Yahoo Finance v8 chart endpoint.
 * This endpoint works without crumb/cookie authentication.
 */
async function fetchOne(symbol: string): Promise<YahooQuote | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&includePrePost=false`
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta

    const price = meta.regularMarketPrice ?? 0
    if (price <= 0) {
      console.warn(`[Yahoo] ${symbol}: price is ${price}`)
      return null
    }

    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price
    const change = price - prevClose
    const changePercent = prevClose ? (change / prevClose) * 100 : 0

    return {
      symbol: meta.symbol || symbol,
      price,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      dayHigh: meta.regularMarketDayHigh ?? price,
      dayLow: meta.regularMarketDayLow ?? price,
      volume: meta.regularMarketVolume ?? 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      shortName: meta.shortName,
      longName: meta.longName,
    }
  } catch (err) {
    console.warn(`[Yahoo] fetchOne ${symbol} error:`, (err as Error).message)
    return null
  }
}

/**
 * Fetch all symbols using Yahoo v8 chart endpoint with controlled concurrency.
 * Each symbol requires 1 request, so we use parallel batches to speed things up.
 */
export async function fetchAllQuotes(symbols: string[]): Promise<YahooQuote[]> {
  const CONCURRENCY = 30
  const allQuotes: YahooQuote[] = []
  let completed = 0

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY)

    const results = await Promise.all(batch.map(fetchOne))

    for (const q of results) {
      if (q && q.price > 0) {
        allQuotes.push(q)
      }
    }

    completed += batch.length
    if (completed % 300 === 0 || completed === symbols.length) {
      console.log(`[Yahoo] Progress: ${completed}/${symbols.length} (${allQuotes.length} success)`)
    }

    // Small delay to avoid rate limits
    if (i + CONCURRENCY < symbols.length) {
      await new Promise(r => setTimeout(r, 150))
    }
  }

  console.log(`[Yahoo] Done: ${allQuotes.length}/${symbols.length} quotes fetched`)
  return allQuotes
}
