import { readFileSync, writeFileSync } from 'fs'

// Read all data sources
const sectorMapRaw = readFileSync('lib/data/sector-map.ts', 'utf8')
const intlRaw = readFileSync('lib/data/international.ts', 'utf8')
const stocks1000Raw = readFileSync('lib/data/stocks-1000.ts', 'utf8')
const idx = JSON.parse(readFileSync('public/data/stocks/index.json', 'utf8'))

// Parse sector map (~660 entries)
const sectorMap = {}
let m
const sectorRegex = /(\w[\w-]*):\s*'([^']+)'/g
while ((m = sectorRegex.exec(sectorMapRaw)) !== null) {
  sectorMap[m[1]] = m[2]
}
console.log('Sector map:', Object.keys(sectorMap).length)

// Parse stocks-1000 for industry data
const industryMap = {}
const stockRegex = /symbol:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*sector:\s*"([^"]+)",\s*industry:\s*"([^"]+)"/g
while ((m = stockRegex.exec(stocks1000Raw)) !== null) {
  industryMap[m[1]] = { name: m[2], sector: m[3], industry: m[4] }
}
console.log('Industry map:', Object.keys(industryMap).length)

// Parse international stocks
const intlStocks = {}
const intlRegex = /\{\s*symbol:\s*'([^']+)',\s*name:\s*'([^']+)',\s*country:\s*'([^']+)',\s*sector:\s*'([^']+)',\s*industry:\s*'([^']+)',\s*exchange:\s*'([^']+)'\s*\}/g
while ((m = intlRegex.exec(intlRaw)) !== null) {
  intlStocks[m[1]] = { name: m[2], country: m[3], sector: m[4], industry: m[5], exchange: m[6] }
}
console.log('International:', Object.keys(intlStocks).length)

// Country overrides for non-US tickers
const COUNTRY_OVERRIDES = {
  'DIDIY': 'China', 'GELHY': 'China', 'TCEHY': 'China', 'TME': 'China', 'YUMC': 'China',
  'ZTO': 'China', 'CPNG': 'South Korea', 'KEP': 'South Korea', 'PKX': 'South Korea',
  'SMSN': 'South Korea', 'UMC': 'Taiwan', 'FUJIY': 'Japan', 'NJDCY': 'Japan', 'NMR': 'Japan',
  'BNTX': 'Germany', 'STLA': 'Netherlands', 'NBIS': 'Netherlands', 'FLUT': 'Ireland',
  'IHG': 'United Kingdom', 'CUK': 'United Kingdom', 'VOD': 'United Kingdom', 'FTI': 'United Kingdom',
  'SW': 'Ireland', 'NVT': 'Ireland', 'AER': 'Ireland', 'TEVA': 'Israel', 'ESLT': 'Israel',
  'ONC': 'China', 'BBD': 'Brazil', 'AXIA': 'Brazil', 'SBS': 'Brazil', 'VIV': 'Brazil',
  'JBS': 'Brazil', 'SQM': 'Chile', 'BAP': 'Peru', 'BCH': 'Chile', 'EC': 'Colombia',
  'KOF': 'Mexico', 'CLS': 'Canada', 'CVE': 'Canada', 'PBA': 'Canada', 'BCE': 'Canada',
  'RCI': 'Canada', 'TU': 'Canada', 'QSR': 'Canada', 'EDPFY': 'Portugal', 'TELNY': 'Norway',
  'TLK': 'Indonesia', 'AGI': 'Canada', 'KGC': 'Canada', 'PAAS': 'Canada', 'FLEX': 'Singapore',
  'FN': 'Thailand', 'ABEV': 'Brazil', 'MELI': 'Argentina',
}

// Suffix-based countries
const SUFFIX_COUNTRIES = {
  '.UK': 'United Kingdom', '.JP': 'Japan', '.HK': 'China',
  '.CA': 'Canada', '.AU': 'Australia', '.EU': null,
}
const EU_COUNTRIES = {
  'AIR.EU': 'France', 'ALV.EU': 'Germany', 'ASML.EU': 'Netherlands',
  'NVO.EU': 'Denmark', 'NVS.EU': 'Switzerland', 'SAP.EU': 'Germany', 'SIE.EU': 'Germany',
}

// Additional sector assignments for stocks we know
const EXTRA_SECTORS = {
  'A': 'Healthcare', 'AA': 'Materials', 'ACGL': 'Financials', 'AER': 'Financials',
  'AGI': 'Materials', 'ALAB': 'Technology', 'ALC': 'Healthcare', 'ALNY': 'Healthcare',
  'APG': 'Industrials', 'ARES': 'Financials', 'AS': 'Consumer Discretionary',
  'ASTS': 'Communication Services', 'ATI': 'Materials', 'AXIA': 'Utilities',
  'BALL': 'Materials', 'BAP': 'Financials', 'BBD': 'Financials', 'BCE': 'Communication Services',
  'BCH': 'Financials', 'BE': 'Industrials', 'BEP': 'Utilities', 'BG': 'Consumer Staples',
  'BIP': 'Utilities', 'BNTX': 'Healthcare', 'BURL': 'Consumer Discretionary',
  'BWXT': 'Industrials', 'CASY': 'Consumer Staples', 'CG': 'Financials', 'CLS': 'Technology',
  'CPAY': 'Financials', 'CPNG': 'Consumer Discretionary', 'CQP': 'Energy',
  'CRDO': 'Technology', 'CRS': 'Materials', 'CRWV': 'Technology', 'CUK': 'Consumer Discretionary',
  'CVE': 'Energy', 'CW': 'Industrials', 'DDOG': 'Technology', 'DIDIY': 'Technology',
  'DKS': 'Consumer Discretionary', 'EC': 'Energy', 'EDPFY': 'Utilities', 'EME': 'Industrials',
  'ENTG': 'Technology', 'ESLT': 'Industrials', 'EXAS': 'Healthcare', 'EXE': 'Energy',
  'FCNCA': 'Financials', 'FICO': 'Technology', 'FLEX': 'Technology', 'FLUT': 'Consumer Discretionary',
  'FN': 'Technology', 'FSLR': 'Technology', 'FTAI': 'Industrials', 'FTI': 'Energy',
  'FUJIY': 'Technology', 'FWONA': 'Communication Services', 'GBTC': 'Financials',
  'GEHC': 'Healthcare', 'GELHY': 'Consumer Discretionary', 'GFS': 'Technology',
  'HIG': 'Financials', 'HUBB': 'Industrials', 'IHG': 'Consumer Discretionary',
  'INSM': 'Healthcare', 'JBL': 'Technology', 'JBS': 'Consumer Staples', 'KEP': 'Utilities',
  'KGC': 'Materials', 'KOF': 'Consumer Staples', 'KVUE': 'Consumer Staples',
  'LII': 'Industrials', 'LPLA': 'Financials', 'LULU': 'Consumer Discretionary',
  'MDB': 'Technology', 'MDLN': 'Healthcare', 'MKL': 'Financials', 'MTSI': 'Technology',
  'NBIS': 'Technology', 'NJDCY': 'Industrials', 'NMR': 'Financials', 'NTRA': 'Healthcare',
  'NVT': 'Industrials', 'ONC': 'Healthcare', 'PAAS': 'Materials', 'PBA': 'Energy',
  'PKX': 'Materials', 'PSTG': 'Technology', 'QSR': 'Consumer Discretionary',
  'RBA': 'Industrials', 'RBC': 'Industrials', 'RCI': 'Communication Services',
  'RGLD': 'Materials', 'RKLB': 'Industrials', 'ROIV': 'Healthcare', 'RPRX': 'Healthcare',
  'RVMD': 'Healthcare', 'SATS': 'Communication Services', 'SBS': 'Utilities',
  'SGI': 'Consumer Discretionary', 'SMSN': 'Technology', 'SQM': 'Materials',
  'SSNC': 'Technology', 'STLA': 'Consumer Discretionary', 'STLD': 'Materials',
  'SUI': 'Real Estate', 'SW': 'Materials', 'SYM': 'Industrials',
  'TCEHY': 'Communication Services', 'TEAM': 'Technology', 'TELNY': 'Communication Services',
  'TEVA': 'Healthcare', 'THC': 'Healthcare', 'TKO': 'Communication Services',
  'TLK': 'Communication Services', 'TME': 'Communication Services', 'TPL': 'Energy',
  'TU': 'Communication Services', 'TW': 'Financials', 'TWLO': 'Technology',
  'UMC': 'Technology', 'USFD': 'Consumer Staples', 'UTHR': 'Healthcare', 'VEEV': 'Technology',
  'VG': 'Energy', 'VIV': 'Communication Services', 'VLTO': 'Industrials',
  'VOD': 'Communication Services', 'WDAY': 'Technology', 'WDS': 'Energy',
  'WSM': 'Consumer Discretionary', 'WTKWY': 'Technology', 'WWD': 'Industrials',
  'XPO': 'Industrials', 'YUMC': 'Consumer Discretionary', 'ZM': 'Technology',
  'ZS': 'Technology', 'ZTO': 'Industrials', 'BF-B': 'Consumer Staples', 'BRK-B': 'Financials',
  // ETFs & Index Funds (Spreads assets)
  'SPY': 'ETF', 'QQQ': 'ETF', 'TQQQ': 'ETF', 'VTI': 'ETF', 'VT': 'ETF',
  'GLD': 'ETF', 'TBLL': 'ETF', 'IEMG': 'ETF',
  // Additional Spreads assets
  'STRK': 'Financials', 'STRF': 'Financials', 'CRCL': 'Financials', 'GME': 'Consumer Discretionary',
  'AIR.EU': 'Industrials', 'ALV.EU': 'Financials', 'ASML.EU': 'Technology',
  'AZN.UK': 'Healthcare', 'BABA.HK': 'Consumer Discretionary', 'BN.CA': 'Financials',
  'CSL.AU': 'Healthcare', 'KEYN.JP': 'Technology', 'MEIT.HK': 'Technology',
  'NVO.EU': 'Healthcare', 'NVS.EU': 'Healthcare', 'RY.CA': 'Financials',
  'SAP.EU': 'Technology', 'SFTB.JP': 'Technology', 'SHEL.UK': 'Energy',
  'SIE.EU': 'Industrials', 'SONY.JP': 'Consumer Discretionary',
  'TCEHY.HK': 'Communication Services', 'TD.CA': 'Financials', 'TM.JP': 'Consumer Discretionary',
}

// Build the known tickers set from our data files (these are our curated stocks)
const knownTickers = new Set([
  ...Object.keys(sectorMap),
  ...Object.keys(industryMap),
  ...Object.keys(intlStocks),
  ...Object.keys(COUNTRY_OVERRIDES),
  ...Object.keys(EXTRA_SECTORS),
])

console.log('Known curated tickers:', knownTickers.size)

// Build primary list: tickers that are in our curated data
const idxMap = new Map(idx.map(s => [s.ticker, s]))
const primaryList = []

for (const entry of idx) {
  const t = entry.ticker

  // Skip suffixed exchange duplicates (keep the ADR/US-listed version)
  if (/\.\w{2,3}$/.test(t) && !knownTickers.has(t)) continue

  // Only include if we have sector data for it
  const sector = sectorMap[t] || industryMap[t]?.sector || intlStocks[t]?.sector || EXTRA_SECTORS[t]
  if (!sector) continue

  // Enrich with metadata
  const intl = intlStocks[t]
  const ind = industryMap[t]

  entry.sector = sector
  entry.industry = intl?.industry || ind?.industry || ''
  entry.country = intl?.country || COUNTRY_OVERRIDES[t] || 'US'
  entry.exchange = intl?.exchange || 'US'

  // Handle suffix countries
  for (const [suffix, country] of Object.entries(SUFFIX_COUNTRIES)) {
    if (t.endsWith(suffix)) {
      if (suffix === '.EU' && EU_COUNTRIES[t]) {
        entry.country = EU_COUNTRIES[t]
      } else if (country) {
        entry.country = country
      }
      break
    }
  }

  primaryList.push(entry)
}

console.log('\nPrimary list:', primaryList.length, 'stocks')

// Distribution
const sectors = {}
primaryList.forEach(s => { sectors[s.sector] = (sectors[s.sector] || 0) + 1 })
console.log('\nBy sector:')
Object.entries(sectors).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`))

const countries = {}
primaryList.forEach(s => { countries[s.country] = (countries[s.country] || 0) + 1 })
console.log('\nBy country:')
Object.entries(countries).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`))

// Write primary list
writeFileSync('public/data/primary-stocks.json', JSON.stringify(primaryList, null, 2))
console.log('\nWritten public/data/primary-stocks.json')
