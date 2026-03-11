import { readFileSync, writeFileSync } from 'fs'

const index = JSON.parse(readFileSync('public/data/stocks/index.json', 'utf8'))

// Final sector fixes for exchange-listed tickers
const FINAL_SECTORS = {
  'AIR.EU': 'Industrials',
  'ALV.EU': 'Financials',
  'ASML.EU': 'Technology',
  'AZN.UK': 'Healthcare',
  'BABA.HK': 'Consumer Discretionary',
  'BN.CA': 'Financials',
  'CSL.AU': 'Healthcare',
  'KEYN.JP': 'Technology',
  'MEIT.HK': 'Technology',
  'NVO.EU': 'Healthcare',
  'NVS.EU': 'Healthcare',
  'RY.CA': 'Financials',
  'SAP.EU': 'Technology',
  'SFTB.JP': 'Technology',
  'SHEL.UK': 'Energy',
  'SIE.EU': 'Industrials',
  'SONY.JP': 'Consumer Discretionary',
  'TCEHY.HK': 'Communication Services',
  'TD.CA': 'Financials',
  'TM.JP': 'Consumer Discretionary',
}

for (const entry of index) {
  if (FINAL_SECTORS[entry.ticker]) {
    entry.sector = FINAL_SECTORS[entry.ticker]
  }
  // Fix Argentina/Mexico to just Argentina
  if (entry.country === 'Argentina/Mexico') {
    entry.country = 'Argentina'
  }
}

const stillOther = index.filter(s => s.sector === 'Other')
console.log('Remaining Other:', stillOther.length)

writeFileSync('public/data/stocks/index.json', JSON.stringify(index, null, 2))
console.log('Done')
