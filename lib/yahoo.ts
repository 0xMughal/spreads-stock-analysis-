/**
 * Yahoo Finance bulk quote fetcher
 *
 * Uses Yahoo Finance v7 quote endpoint which supports up to ~200 symbols per request.
 * No API key required. Free and reliable for daily refreshes.
 */

export interface YahooQuote {
  symbol: string
  shortName?: string
  longName?: string
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  regularMarketVolume?: number
  averageDailyVolume3Month?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  marketCap?: number
  trailingPE?: number
  epsTrailingTwelveMonths?: number
  trailingAnnualDividendYield?: number
  sector?: string
  industry?: string
}

interface YahooResponse {
  quoteResponse?: {
    result?: YahooQuote[]
    error?: unknown
  }
}

/**
 * Fetch quotes for a batch of symbols from Yahoo Finance
 * Max ~200 symbols per request
 */
async function fetchBatch(symbols: string[]): Promise<YahooQuote[]> {
  const joined = symbols.join(',')
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${joined}&fields=symbol,shortName,longName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,averageDailyVolume3Month,regularMarketDayHigh,regularMarketDayLow,fiftyTwoWeekHigh,fiftyTwoWeekLow,marketCap,trailingPE,epsTrailingTwelveMonths,trailingAnnualDividendYield`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
  })

  if (!res.ok) {
    console.error(`[Yahoo] Batch fetch failed: ${res.status}`)
    return []
  }

  const data: YahooResponse = await res.json()
  return data.quoteResponse?.result || []
}

/**
 * Fetch quotes for all symbols, batching in groups of 150
 */
export async function fetchAllQuotes(symbols: string[]): Promise<YahooQuote[]> {
  const BATCH_SIZE = 150
  const allQuotes: YahooQuote[] = []

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE)
    console.log(`[Yahoo] Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(symbols.length / BATCH_SIZE)} (${batch.length} symbols)`)

    const quotes = await fetchBatch(batch)
    allQuotes.push(...quotes)

    // Small delay between batches to be polite
    if (i + BATCH_SIZE < symbols.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`[Yahoo] Fetched ${allQuotes.length}/${symbols.length} quotes`)
  return allQuotes
}
