/**
 * Download stock logos — Finnhub (clean icons) as primary, CMC as fallback
 * Saves to public/data/logos/{TICKER}.png
 * Run: node scripts/download-logos.mjs
 */

import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'fs'

const LOGO_DIR = 'public/data/logos'
const FINNHUB = 'https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo'
const CMC = 'https://companiesmarketcap.com/img/company-logos/256'
const CONCURRENCY = 10
const DELAY_MS = 150

mkdirSync(LOGO_DIR, { recursive: true })

const stocks = JSON.parse(readFileSync('public/data/primary-stocks.json', 'utf-8'))
const tickers = [...new Set(stocks.map(s => s.ticker))]
// Also track base tickers for suffixed symbols
const baseTickers = [...new Set(stocks.map(s => s.ticker.split('.')[0]))]

console.log(`Downloading logos for ${tickers.length} tickers (${baseTickers.length} unique base)...\n`)

let finnhub = 0
let cmc = 0
let failed = 0
const failures = []

async function tryFetch(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('image')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 200) return null
    return buf
  } catch {
    return null
  }
}

async function fetchLogo(ticker) {
  const base = ticker.split('.')[0]
  const outPath = `${LOGO_DIR}/${base}.png`

  if (existsSync(outPath)) return 'skip'

  // 1. Try Finnhub (clean icon logos)
  let buf = await tryFetch(`${FINNHUB}/${ticker}.png`)
  if (!buf && base !== ticker) {
    buf = await tryFetch(`${FINNHUB}/${base}.png`)
  }
  if (buf) {
    writeFileSync(outPath, buf)
    finnhub++
    return 'finnhub'
  }

  // 2. Try CMC (fallback — may have text logos)
  buf = await tryFetch(`${CMC}/${base}.png`)
  if (!buf) buf = await tryFetch(`${CMC}/${ticker}.png`)
  if (buf) {
    writeFileSync(outPath, buf)
    cmc++
    return 'cmc'
  }

  failed++
  failures.push(ticker)
  return 'failed'
}

let skipped = 0
const seen = new Set()

for (let i = 0; i < tickers.length; i += CONCURRENCY) {
  const batch = tickers.slice(i, i + CONCURRENCY).filter(t => {
    const base = t.split('.')[0]
    if (seen.has(base)) { skipped++; return false }
    seen.add(base)
    return true
  })

  await Promise.all(batch.map(async (t) => {
    const result = await fetchLogo(t)
    if (result === 'skip') skipped++
  }))

  const total = finnhub + cmc + failed + skipped
  if (total % 100 === 0 || i + CONCURRENCY >= tickers.length) {
    console.log(`Progress: ${total}/${tickers.length} — Finnhub: ${finnhub}, CMC: ${cmc}, Failed: ${failed}, Skip: ${skipped}`)
  }

  if (i + CONCURRENCY < tickers.length) {
    await new Promise(r => setTimeout(r, DELAY_MS))
  }
}

console.log(`\nDone!`)
console.log(`  Finnhub (clean icons): ${finnhub}`)
console.log(`  CMC (fallback):        ${cmc}`)
console.log(`  Failed:                ${failed}`)
console.log(`  Skipped (existing):    ${skipped}`)
if (failures.length > 0) {
  console.log(`\nFailed: ${failures.join(', ')}`)
}
