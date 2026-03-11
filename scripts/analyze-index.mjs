import { readFileSync } from 'fs'
const idx = JSON.parse(readFileSync('public/data/stocks/index.json', 'utf8'))

const countries = {}
idx.forEach(s => { const c = s.country || 'null'; countries[c] = (countries[c] || 0) + 1 })
console.log('By country:')
Object.entries(countries).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
console.log('\nTotal:', idx.length)

const other = idx.filter(s => !s.sector || s.sector === 'Other')
console.log('Other/null sector:', other.length)

// How many have quarters data (financial data available)
const withQuarters = idx.filter(s => s.quarters > 0)
console.log('With quarterly data:', withQuarters.length)

// Suffixed tickers
const suffixed = idx.filter(s => /\.\w{2,3}$/.test(s.ticker))
console.log('Suffixed (exchange duplicates):', suffixed.length)

const plain = idx.filter(s => !/\.\w{2,3}$/.test(s.ticker))
console.log('Plain tickers:', plain.length)
