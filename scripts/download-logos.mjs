/**
 * Download stock logos from companiesmarketcap.com (256px crisp)
 * Saves to public/data/logos/{TICKER}.png
 * Run: node scripts/download-logos.mjs
 */

import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'fs'

const LOGO_DIR = 'public/data/logos'
const SOURCE = 'https://companiesmarketcap.com/img/company-logos/256'
const CONCURRENCY = 10
const DELAY_MS = 150

mkdirSync(LOGO_DIR, { recursive: true })

const stocks = JSON.parse(readFileSync('public/data/primary-stocks.json', 'utf-8'))
const tickers = [...new Set(stocks.map(s => s.ticker.split('.')[0]))]

console.log(`Downloading logos for ${tickers.length} unique tickers...`)

let downloaded = 0
let skipped = 0
let failed = 0
const failures = []

async function fetchLogo(ticker) {
  const outPath = `${LOGO_DIR}/${ticker}.png`

  if (existsSync(outPath)) {
    skipped++
    return
  }

  try {
    const res = await fetch(`${SOURCE}/${ticker}.png`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    })

    if (!res.ok || !res.headers.get('content-type')?.includes('image')) {
      failed++
      failures.push(ticker)
      return
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 100) {
      failed++
      failures.push(ticker)
      return
    }

    writeFileSync(outPath, buffer)
    downloaded++
  } catch {
    failed++
    failures.push(ticker)
  }
}

for (let i = 0; i < tickers.length; i += CONCURRENCY) {
  const batch = tickers.slice(i, i + CONCURRENCY)
  await Promise.all(batch.map(fetchLogo))

  const total = downloaded + skipped + failed
  if (total % 100 === 0 || i + CONCURRENCY >= tickers.length) {
    console.log(`Progress: ${total}/${tickers.length} (${downloaded} new, ${skipped} existing, ${failed} failed)`)
  }

  if (i + CONCURRENCY < tickers.length) {
    await new Promise(r => setTimeout(r, DELAY_MS))
  }
}

console.log(`\nDone: ${downloaded} downloaded, ${skipped} already existed, ${failed} failed`)
if (failures.length > 0) {
  console.log(`Failed tickers: ${failures.join(', ')}`)
}
console.log(`Logos saved to ${LOGO_DIR}/`)
