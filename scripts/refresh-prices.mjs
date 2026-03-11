#!/usr/bin/env node
/**
 * Standalone price refresher — fetches stock prices from Yahoo v8 (no auth)
 * and writes prices.json. Run via: node scripts/refresh-prices.mjs
 *
 * Sequential with 1 req/sec to avoid Yahoo 429 rate limits.
 * ~20 min for 1200 stocks. Run as background cron.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

async function fetchOne(symbol) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&includePrePost=false`
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000),
    })

    if (res.status === 429) return { _rateLimit: true }
    if (!res.ok) return null

    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta || !meta.regularMarketPrice || meta.regularMarketPrice <= 0) return null

    const price = meta.regularMarketPrice
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price
    const change = price - prevClose
    const changePct = prevClose ? (change / prevClose) * 100 : 0

    return {
      symbol: meta.symbol || symbol,
      price,
      change: parseFloat(change.toFixed(2)),
      changesPercentage: parseFloat(changePct.toFixed(2)),
      marketCap: 0,
      pe: null,
      eps: null,
      dividendYield: null,
      volume: meta.regularMarketVolume ?? 0,
      avgVolume: 0,
      dayHigh: meta.regularMarketDayHigh ?? price,
      dayLow: meta.regularMarketDayLow ?? price,
      yearHigh: meta.fiftyTwoWeekHigh ?? price,
      yearLow: meta.fiftyTwoWeekLow ?? price,
      name: meta.longName || meta.shortName || '',
    }
  } catch {
    return null
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function main() {
  const startTime = Date.now()

  // Read stock index
  const primaryPath = path.join(ROOT, 'public', 'data', 'primary-stocks.json')
  const indexPath = path.join(ROOT, 'public', 'data', 'stocks', 'index.json')
  const source = existsSync(primaryPath) ? primaryPath : indexPath
  const index = JSON.parse(readFileSync(source, 'utf-8'))
  const tickers = index.map(e => e.ticker)

  console.log(`[Prices] Fetching ${tickers.length} stocks from Yahoo v8 (sequential)...`)

  const priceCache = {}
  let success = 0
  let backoffMs = 1000  // Start at 1 req/sec

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i]
    let result = await fetchOne(ticker)

    // Handle rate limiting with exponential backoff
    if (result?._rateLimit) {
      const waitSec = Math.min(backoffMs * 2, 60000) / 1000
      console.log(`  429 at ${ticker} (#${i+1}) — backing off ${waitSec}s...`)
      backoffMs = Math.min(backoffMs * 2, 60000)
      await sleep(backoffMs)
      // Retry once
      result = await fetchOne(ticker)
      if (result?._rateLimit) {
        await sleep(backoffMs)
        continue
      }
    } else {
      // Successful request — gradually reduce backoff
      backoffMs = Math.max(1000, backoffMs * 0.9)
    }

    if (result && !result._rateLimit) {
      const sym = result.symbol
      delete result.symbol
      priceCache[sym] = result
      success++
    }

    if ((i + 1) % 50 === 0 || i === tickers.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      const rate = (success / (Date.now() - startTime) * 1000).toFixed(1)
      console.log(`  ${i+1}/${tickers.length} done (${success} success, ${rate}/s) [${elapsed}s]`)
    }

    // Base delay between requests
    await sleep(backoffMs)
  }

  // Write cache
  const cachePath = path.join(ROOT, 'public', 'data', 'prices.json')
  const cacheData = {
    updatedAt: new Date().toISOString(),
    count: Object.keys(priceCache).length,
    prices: priceCache,
  }
  writeFileSync(cachePath, JSON.stringify(cacheData))

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  console.log(`\n[Prices] Done: ${success}/${tickers.length} stocks cached in ${elapsed}s`)
  console.log(`[Prices] Written to ${cachePath}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
