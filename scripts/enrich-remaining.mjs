import { readFileSync, writeFileSync } from 'fs'

const index = JSON.parse(readFileSync('public/data/stocks/index.json', 'utf8'))

// Fix inconsistent sector names
const SECTOR_FIXES = {
  'Consumer Disc.': 'Consumer Discretionary',
  'Telecom': 'Communication Services',
}

// Manual sector assignments for the ~160 "Other" stocks
const MISSING_SECTORS = {
  'A': 'Healthcare',
  'ACGL': 'Financials',
  'AER': 'Financials',
  'AGI': 'Materials',
  'ALAB': 'Technology',
  'ALC': 'Healthcare',
  'ALNY': 'Healthcare',
  'AMRZ': 'Financials',
  'APG': 'Industrials',
  'ARES': 'Financials',
  'AS': 'Consumer Discretionary',
  'ASTS': 'Communication Services',
  'ATI': 'Materials',
  'AXIA': 'Utilities',
  'BALL': 'Materials',
  'BAP': 'Financials',
  'BBD': 'Financials',
  'BCE': 'Communication Services',
  'BCH': 'Financials',
  'BE': 'Industrials',
  'BEP': 'Utilities',
  'BG': 'Consumer Staples',
  'BIP': 'Utilities',
  'BNTX': 'Healthcare',
  'BURL': 'Consumer Discretionary',
  'BWXT': 'Industrials',
  'CASY': 'Consumer Staples',
  'CG': 'Financials',
  'CLS': 'Technology',
  'CPAY': 'Financials',
  'CPNG': 'Consumer Discretionary',
  'CQP': 'Energy',
  'CRDO': 'Technology',
  'CRS': 'Materials',
  'CRWV': 'Technology',
  'CUK': 'Consumer Discretionary',
  'CVE': 'Energy',
  'CW': 'Industrials',
  'DDOG': 'Technology',
  'DIDIY': 'Technology',
  'DKS': 'Consumer Discretionary',
  'EC': 'Energy',
  'EDPFY': 'Utilities',
  'EME': 'Industrials',
  'ENTG': 'Technology',
  'ESLT': 'Industrials',
  'EXAS': 'Healthcare',
  'EXE': 'Energy',
  'FCNCA': 'Financials',
  'FICO': 'Technology',
  'FLEX': 'Technology',
  'FLUT': 'Consumer Discretionary',
  'FN': 'Technology',
  'FSLR': 'Technology',
  'FTAI': 'Industrials',
  'FTI': 'Energy',
  'FUJIY': 'Technology',
  'FWONA': 'Communication Services',
  'GBTC': 'Financials',
  'GEHC': 'Healthcare',
  'GELHY': 'Consumer Discretionary',
  'GFS': 'Technology',
  'HIG': 'Financials',
  'HUBB': 'Industrials',
  'IHG': 'Consumer Discretionary',
  'INSM': 'Healthcare',
  'JBL': 'Technology',
  'JBS': 'Consumer Staples',
  'KEP': 'Utilities',
  'KGC': 'Materials',
  'KOF': 'Consumer Staples',
  'KVUE': 'Consumer Staples',
  'LII': 'Industrials',
  'LPLA': 'Financials',
  'LULU': 'Consumer Discretionary',
  'MDB': 'Technology',
  'MDLN': 'Healthcare',
  'MKL': 'Financials',
  'MTSI': 'Technology',
  'NBIS': 'Technology',
  'NJDCY': 'Industrials',
  'NMR': 'Financials',
  'NTRA': 'Healthcare',
  'NVT': 'Industrials',
  'ONC': 'Healthcare',
  'PAAS': 'Materials',
  'PALL': 'Financials',
  'PBA': 'Energy',
  'PKX': 'Materials',
  'PSTG': 'Technology',
  'Q': 'Technology',
  'QSR': 'Consumer Discretionary',
  'RBA': 'Industrials',
  'RBC': 'Industrials',
  'RCI': 'Communication Services',
  'RGLD': 'Materials',
  'RKLB': 'Industrials',
  'ROIV': 'Healthcare',
  'RPRX': 'Healthcare',
  'RVMD': 'Healthcare',
  'SATS': 'Communication Services',
  'SBS': 'Utilities',
  'SGI': 'Consumer Discretionary',
  'SMSN': 'Technology',
  'SQM': 'Materials',
  'SSNC': 'Technology',
  'STLA': 'Consumer Discretionary',
  'STLD': 'Materials',
  'SUI': 'Real Estate',
  'SW': 'Materials',
  'SYM': 'Industrials',
  'TCEHY': 'Communication Services',
  'TEAM': 'Technology',
  'TELNY': 'Communication Services',
  'TEVA': 'Healthcare',
  'THC': 'Healthcare',
  'TKO': 'Communication Services',
  'TLK': 'Communication Services',
  'TME': 'Communication Services',
  'TPL': 'Energy',
  'TU': 'Communication Services',
  'TW': 'Financials',
  'TWLO': 'Technology',
  'UMC': 'Technology',
  'USFD': 'Consumer Staples',
  'UTHR': 'Healthcare',
  'VEEV': 'Technology',
  'VG': 'Energy',
  'VIV': 'Communication Services',
  'VLTO': 'Industrials',
  'VOD': 'Communication Services',
  'WDAY': 'Technology',
  'WDS': 'Energy',
  'WSM': 'Consumer Discretionary',
  'WTKWY': 'Technology',
  'WWD': 'Industrials',
  'XPO': 'Industrials',
  'YUMC': 'Consumer Discretionary',
  'ZM': 'Technology',
  'ZS': 'Technology',
  'ZTO': 'Industrials',
  'BF-B': 'Consumer Staples',
  'BRK-B': 'Financials',
  'JBS': 'Consumer Staples',
}

// Country overrides for tickers that are international but not in international.ts
// Suffix-based tickers (.EU, .UK, .JP, .HK, .CA, .AU) indicate exchange
const SUFFIX_COUNTRY_MAP = {
  '.EU': null,  // need per-ticker
  '.UK': 'United Kingdom',
  '.JP': 'Japan',
  '.HK': 'China',
  '.CA': 'Canada',
  '.AU': 'Australia',
}

// Specific country assignments for non-US tickers without suffix
const COUNTRY_OVERRIDES = {
  'DIDIY': 'China',
  'GELHY': 'China',
  'TCEHY': 'China',
  'TME': 'China',
  'YUMC': 'China',
  'ZTO': 'China',
  'CPNG': 'South Korea',
  'KEP': 'South Korea',
  'PKX': 'South Korea',
  'SMSN': 'South Korea',
  'UMC': 'Taiwan',
  'FUJIY': 'Japan',
  'NJDCY': 'Japan',
  'NMR': 'Japan',
  'BNTX': 'Germany',
  'STLA': 'Netherlands',
  'NBIS': 'Netherlands',
  'FLUT': 'Ireland',
  'IHG': 'United Kingdom',
  'CUK': 'United Kingdom',
  'VOD': 'United Kingdom',
  'FTI': 'United Kingdom',
  'SW': 'Ireland',
  'NVT': 'Ireland',
  'AER': 'Ireland',
  'TEVA': 'Israel',
  'ESLT': 'Israel',
  'ONC': 'China',
  'BBD': 'Brazil',
  'AXIA': 'Brazil',
  'SBS': 'Brazil',
  'VIV': 'Brazil',
  'JBS': 'Brazil',
  'SQM': 'Chile',
  'BAP': 'Peru',
  'BCH': 'Chile',
  'EC': 'Colombia',
  'KOF': 'Mexico',
  'CLS': 'Canada',
  'CVE': 'Canada',
  'PBA': 'Canada',
  'BCE': 'Canada',
  'RCI': 'Canada',
  'TU': 'Canada',
  'QSR': 'Canada',
  'EDPFY': 'Portugal',
  'TELNY': 'Norway',
  'TLK': 'Indonesia',
  'AGI': 'Canada',
  'KGC': 'Canada',
  'PAAS': 'Canada',
  'FLEX': 'Singapore',
  'FN': 'Thailand',
  'CRWV': 'US',
  'GBTC': 'US',
}

// EU suffix -> specific country
const EU_TICKERS = {
  'AIR.EU': { country: 'France', exchange: 'EPA' },
  'ALV.EU': { country: 'Germany', exchange: 'XETRA' },
  'ASML.EU': { country: 'Netherlands', exchange: 'AEX' },
  'NVO.EU': { country: 'Denmark', exchange: 'OMX' },
  'NVS.EU': { country: 'Switzerland', exchange: 'SIX' },
  'SAP.EU': { country: 'Germany', exchange: 'XETRA' },
  'SIE.EU': { country: 'Germany', exchange: 'XETRA' },
}

// Process
for (const entry of index) {
  const t = entry.ticker

  // Fix bad sector names
  if (SECTOR_FIXES[entry.sector]) {
    entry.sector = SECTOR_FIXES[entry.sector]
  }

  // Fill missing sectors
  if (entry.sector === 'Other' && MISSING_SECTORS[t]) {
    entry.sector = MISSING_SECTORS[t]
  }

  // Handle suffix-based exchange tickers
  for (const [suffix, country] of Object.entries(SUFFIX_COUNTRY_MAP)) {
    if (t.endsWith(suffix)) {
      if (suffix === '.EU' && EU_TICKERS[t]) {
        entry.country = EU_TICKERS[t].country
        entry.exchange = EU_TICKERS[t].exchange
      } else if (country) {
        entry.country = country
      }
      break
    }
  }

  // Country overrides for ADRs
  if (COUNTRY_OVERRIDES[t]) {
    entry.country = COUNTRY_OVERRIDES[t]
  }

  // Also handle .HK, .JP, .CA, .AU, .UK tickers that got country from suffix
  if (t.endsWith('.HK')) entry.exchange = 'HKEX'
  if (t.endsWith('.JP')) entry.exchange = 'TSE'
  if (t.endsWith('.CA')) entry.exchange = 'TSX'
  if (t.endsWith('.AU')) entry.exchange = 'ASX'
  if (t.endsWith('.UK')) entry.exchange = 'LSE'
}

// Final stats
const sectors = {}
index.forEach(s => { sectors[s.sector] = (sectors[s.sector] || 0) + 1 })
console.log('Sector distribution:', JSON.stringify(sectors, null, 2))

const countries = {}
index.forEach(s => { countries[s.country] = (countries[s.country] || 0) + 1 })
console.log('\nCountry distribution:', JSON.stringify(countries, null, 2))

const stillOther = index.filter(s => s.sector === 'Other')
if (stillOther.length > 0) {
  console.log('\nStill "Other":', stillOther.map(s => s.ticker).join(', '))
}

writeFileSync('public/data/stocks/index.json', JSON.stringify(index, null, 2))
console.log('\nWritten updated index.json')
