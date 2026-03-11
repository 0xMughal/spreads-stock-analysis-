import { readFileSync, writeFileSync } from 'fs'

// Read all data sources
const sectorMapRaw = readFileSync('lib/data/sector-map.ts', 'utf8')
const intlRaw = readFileSync('lib/data/international.ts', 'utf8')

// Parse sector map
const sectorMap = {}
const sectorRegex = /(\w+):\s*'([^']+)'/g
let m
while ((m = sectorRegex.exec(sectorMapRaw)) !== null) {
  sectorMap[m[1]] = m[2]
}
console.log('Sector map entries:', Object.keys(sectorMap).length)

// Parse international stocks
const intlStocks = {}
const intlRegex = /\{\s*symbol:\s*'([^']+)',\s*name:\s*'([^']+)',\s*country:\s*'([^']+)',\s*sector:\s*'([^']+)',\s*industry:\s*'([^']+)',\s*exchange:\s*'([^']+)'\s*\}/g
while ((m = intlRegex.exec(intlRaw)) !== null) {
  intlStocks[m[1]] = { name: m[2], country: m[3], sector: m[4], industry: m[5], exchange: m[6] }
}
console.log('International entries:', Object.keys(intlStocks).length)

// Read index
const index = JSON.parse(readFileSync('public/data/stocks/index.json', 'utf8'))
console.log('Index entries:', index.length)

// Enrich
let sectorEnriched = 0
let intlCount = 0
for (const entry of index) {
  const t = entry.ticker

  // Sector from sector-map
  if (!entry.sector && sectorMap[t]) {
    entry.sector = sectorMap[t]
    sectorEnriched++
  }

  // International data (overrides sector too, adds country/exchange/industry)
  if (intlStocks[t]) {
    const intl = intlStocks[t]
    entry.country = intl.country
    entry.exchange = intl.exchange
    entry.industry = intl.industry
    if (!entry.sector) entry.sector = intl.sector
    intlCount++
  } else {
    if (!entry.country) entry.country = 'US'
    if (!entry.exchange) entry.exchange = 'US'
  }

  // Fill remaining nulls
  if (!entry.sector) entry.sector = 'Other'
  if (!entry.industry) entry.industry = ''
}

console.log('Sectors enriched from map:', sectorEnriched)
console.log('International tagged:', intlCount)

// Check distributions
const sectors = {}
index.forEach(s => { sectors[s.sector] = (sectors[s.sector] || 0) + 1 })
console.log('\nSector distribution:', JSON.stringify(sectors, null, 2))

const countries = {}
index.forEach(s => { countries[s.country] = (countries[s.country] || 0) + 1 })
console.log('\nCountry distribution:', JSON.stringify(countries, null, 2))

// Write back
writeFileSync('public/data/stocks/index.json', JSON.stringify(index, null, 2))
console.log('\nWritten enriched index.json')
