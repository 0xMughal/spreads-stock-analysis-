import { SP500_STOCKS } from './sp500-full'
import { NASDAQ100_STOCKS } from './nasdaq100'

export type IndexKey = 'all' | 'sp500' | 'nasdaq100' | 'ftse100' | 'nikkei225' | 'dax40' | 'cac40' | 'kospi' | 'asx50' | 'tsx60'

export interface IndexDef {
  key: IndexKey
  label: string
  tickers: Set<string>
}

const SP500_SET = new Set(SP500_STOCKS.map(s => s.symbol))
const NASDAQ100_SET = new Set(NASDAQ100_STOCKS.map(s => s.symbol))

// FTSE 100 — top UK stocks
const FTSE100_SET = new Set([
  'SHEL', 'AZN', 'HSBA', 'BP', 'GSK', 'ULVR', 'RIO', 'DGE', 'LSEG', 'REL',
  'AAL', 'BHP', 'VOD', 'BA', 'GLEN', 'EXPN', 'LLOY', 'NG', 'SSE', 'BARC',
  'ABF', 'PRU', 'CRH', 'CPG', 'IMB', 'ANTO', 'RKT', 'SMT', 'SGE', 'ADM',
  'III', 'AV', 'BT', 'CNA', 'CTEC', 'DARK', 'DCC', 'FLTR', 'FRAS', 'FRES',
  'HLN', 'HWDN', 'IHG', 'INF', 'ITRK', 'JD', 'KGF', 'LAND', 'LGEN', 'MNG',
  'MNDI', 'NWG', 'OCDO', 'PHNX', 'PSH', 'PSON', 'RMV', 'RR', 'RS', 'SBRY',
  'SDR', 'SGRO', 'SHEL.UK', 'AZN.UK', 'SKG', 'SMIN', 'SN', 'SPX', 'STAN',
  'SVT', 'TSCO', 'TW', 'WEIR', 'WPP', 'WTB',
  // US-listed UK companies we track
  'IHG', 'CUK', 'VOD', 'FTI', 'LSEGY', 'BAESY',
])

// Nikkei 225 — top Japanese stocks
const NIKKEI225_SET = new Set([
  'TM', 'SONY', 'HTHIY', 'NTDOY', 'MUFG', 'SMFG', 'NMR', 'FUJIY', 'NJDCY',
  'TM.JP', 'SONY.JP', 'KEYN.JP', 'SFTB.JP',
  // US-listed Japanese ADRs
  'HMC', 'SNE', 'MFG', 'IX', 'NTT', 'CAJ', 'FANUY',
])

// DAX 40 — top German stocks
const DAX40_SET = new Set([
  'SAP', 'SIE', 'ALV', 'DTE', 'BMW', 'MBG', 'BAS', 'BAYN', 'IFX', 'ADS',
  'MUV2', 'RWE', 'EON', 'VOW3', 'HEN3', 'FRE', 'DB1', 'MTX', 'BEI', 'AIR',
  'SAP.EU', 'SIE.EU', 'ALV.EU', 'AIR.EU',
  // US-listed German ADRs
  'BMWKY', 'DTEGY', 'EONGY', 'IFNNY', 'BNTX',
])

// CAC 40 — top French stocks
const CAC40_SET = new Set([
  'MC', 'TTE', 'SAN', 'AIR', 'SU', 'OR', 'BNP', 'AI', 'DG', 'CS',
  'RI', 'KER', 'EL', 'SGO', 'BN', 'SAF', 'ACA', 'VIV', 'ENGI', 'ORA',
  'AIR.EU',
  // US-listed
  'STLA',
])

// KOSPI — top Korean stocks
const KOSPI_SET = new Set([
  'SMSN', 'CPNG', 'PKX', 'KEP', '005930',
  // US-listed Korean ADRs
  'LPL', 'SHG', 'KB',
])

// ASX 50 — top Australian stocks
const ASX50_SET = new Set([
  'CSL', 'BHP', 'CBA', 'NAB', 'WBC', 'ANZ', 'MQG', 'WES', 'WOW', 'TLS',
  'CSL.AU',
  // US-listed
  'CSLLY',
])

// TSX 60 — top Canadian stocks
const TSX60_SET = new Set([
  'RY', 'TD', 'BN', 'ENB', 'CNR', 'BMO', 'CP', 'ATD', 'TRI', 'MFC',
  'RY.CA', 'TD.CA', 'BN.CA',
  // US-listed Canadian companies
  'CLS', 'CVE', 'PBA', 'BCE', 'RCI', 'TU', 'QSR', 'AGI', 'KGC', 'PAAS',
])

export const INDEXES: IndexDef[] = [
  { key: 'all', label: 'All', tickers: new Set() },
  { key: 'sp500', label: 'S&P 500', tickers: SP500_SET },
  { key: 'nasdaq100', label: 'Nasdaq 100', tickers: NASDAQ100_SET },
  { key: 'ftse100', label: 'FTSE 100', tickers: FTSE100_SET },
  { key: 'nikkei225', label: 'Nikkei 225', tickers: NIKKEI225_SET },
  { key: 'dax40', label: 'DAX 40', tickers: DAX40_SET },
  { key: 'cac40', label: 'CAC 40', tickers: CAC40_SET },
  { key: 'kospi', label: 'KOSPI', tickers: KOSPI_SET },
  { key: 'asx50', label: 'ASX 50', tickers: ASX50_SET },
  { key: 'tsx60', label: 'TSX 60', tickers: TSX60_SET },
]
