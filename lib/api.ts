import { SP500Constituent, StockQuote, CompanyProfile, IncomeStatement, Stock, EarningsEvent } from './types'

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3'
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'

// Finnhub API key - get your free key at https://finnhub.io
const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

// Cache configuration
const CACHE_KEY = 'finnhub_stocks_cache'
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

// Top 1000 stock symbols (S&P500 + NASDAQ 100 + Russell 2000 sampling)
const TOP_STOCK_SYMBOLS = [
  // S&P 500 Major Components
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'BRK.B', 'TSLA', 'UNH',
  'JNJ', 'JPM', 'V', 'XOM', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV',
  'LLY', 'PEP', 'KO', 'COST', 'BAC', 'PFE', 'WMT', 'TMO', 'CSCO', 'MCD',
  'DIS', 'ABT', 'ACN', 'DHR', 'VZ', 'ADBE', 'NKE', 'CMCSA', 'TXN', 'NEE',
  'PM', 'WFC', 'BMY', 'COP', 'RTX', 'UNP', 'MS', 'UPS', 'ORCL', 'HON',
  'INTC', 'IBM', 'LOW', 'QCOM', 'GE', 'CAT', 'AMGN', 'BA', 'SPGI', 'GS',
  'ELV', 'SBUX', 'DE', 'INTU', 'BLK', 'ISRG', 'GILD', 'AXP', 'MDLZ', 'ADI',
  'SYK', 'TJX', 'BKNG', 'REGN', 'ADP', 'VRTX', 'CVS', 'MMC', 'LMT', 'C',
  'TMUS', 'AMT', 'SCHW', 'CI', 'MO', 'EOG', 'ZTS', 'SO', 'PLD', 'DUK',
  'EQIX', 'BDX', 'SLB', 'NOC', 'CB', 'BSX', 'AON', 'ITW', 'CL', 'CME',
  'LRCX', 'MU', 'ICE', 'SHW', 'PGR', 'FISV', 'MMM', 'FDX', 'PNC', 'APD',
  'WM', 'CSX', 'USB', 'MCK', 'TGT', 'MCO', 'EMR', 'NSC', 'PSA', 'ORLY',
  'CCI', 'ATVI', 'GD', 'FCX', 'SNPS', 'CDNS', 'HCA', 'KLAC', 'APH', 'CTAS',
  'AJG', 'AZO', 'F', 'GM', 'MCHP', 'ANET', 'PCAR', 'TT', 'ADSK', 'NEM',
  'TDG', 'CARR', 'ROP', 'OXY', 'MSI', 'KMB', 'AEP', 'ECL', 'SRE', 'HUM',
  'IDXX', 'GIS', 'PAYX', 'WELL', 'MSCI', 'EW', 'ADM', 'HSY', 'MNST', 'IQV',
  'PSX', 'VLO', 'BIIB', 'A', 'DXCM', 'FAST', 'AFL', 'EXC', 'CTSH', 'YUM',
  'STZ', 'MPC', 'D', 'FTNT', 'DHI', 'CMG', 'LHX', 'AIG', 'HLT', 'PRU',
  'ALL', 'DOW', 'XEL', 'DLTR', 'BK', 'KR', 'ROST', 'O', 'EA', 'VRSK',
  'TEL', 'AME', 'ES', 'CTVA', 'WBD', 'KDP', 'OTIS', 'RMD', 'IFF', 'PEG',
  // NASDAQ 100 additions
  'NFLX', 'AMD', 'PYPL', 'ABNB', 'COIN', 'MELI', 'WDAY', 'TEAM', 'CRWD', 'ZS',
  'DDOG', 'SNOW', 'NET', 'MDB', 'PANW', 'VEEV', 'TTD', 'SPLK', 'OKTA', 'ZM',
  'DOCU', 'ROKU', 'TWLO', 'SQ', 'SNAP', 'PINS', 'UBER', 'LYFT', 'DASH', 'RBLX',
  'U', 'PLTR', 'PATH', 'CPNG', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'BIDU',
  'JD', 'PDD', 'BABA', 'SE', 'GRAB', 'SHOP', 'ETSY', 'W', 'CHWY', 'CVNA',
  'HOOD', 'SOFI', 'AFRM', 'UPST', 'BILL', 'HUBS', 'FIVN', 'RNG', 'TWST', 'EXAS',
  // Russell 2000 sampling (mid/small caps)
  'SMCI', 'APP', 'CELH', 'DUOL', 'IOT', 'SAIA', 'ELF', 'AXON', 'TOST', 'BROS',
  'WING', 'CAVA', 'KRYS', 'RVMD', 'CRSP', 'NTLA', 'BEAM', 'EDIT', 'VCYT', 'NVAX',
  'MRNA', 'VXRT', 'INO', 'OCGN', 'SNDL', 'TLRY', 'CGC', 'ACB', 'CRON', 'OGI',
  'SPCE', 'RKLB', 'ASTR', 'MNTS', 'RDW', 'BKSY', 'ASTS', 'GSAT', 'IRDM', 'VSAT',
  'GILT', 'VNET', 'BGNE', 'ZLAB', 'LEGN', 'BNR', 'RETA', 'RXDX', 'DAWN', 'ARQT',
  'AKRO', 'IONS', 'ALNY', 'SGEN', 'NBIX', 'SRPT', 'RARE', 'BMRN', 'INCY', 'JAZZ',
  'EXEL', 'HALO', 'ARVN', 'KYMR', 'DYN', 'IMVT', 'RCKT', 'GTHX', 'SWTX', 'KRTX',
  'TGTX', 'CYTK', 'PRTA', 'CORT', 'HRMY', 'ETNB', 'CERT', 'IRON', 'RXST', 'ACAD',
  // Financial sector additions
  'SCHW', 'TFC', 'PNC', 'MTB', 'KEY', 'CFG', 'RF', 'HBAN', 'ZION', 'CMA',
  'FRC', 'SIVB', 'PACW', 'WAL', 'EWBC', 'FHN', 'UMBF', 'CBSH', 'PNFP', 'BOKF',
  'FFIN', 'SFBS', 'GBCI', 'IBOC', 'WAFD', 'BANR', 'COLB', 'WSFS', 'HOPE', 'TRMK',
  'HTLF', 'FFBC', 'FULT', 'FIBK', 'PPBI', 'BPOP', 'OFG', 'FBK', 'SBCF', 'TOWN',
  // Healthcare sector additions
  'MRNA', 'BNTX', 'NVAX', 'VXRT', 'INO', 'OCGN', 'SNDX', 'DNLI', 'FOLD', 'CDMO',
  'TARS', 'ASND', 'SMMT', 'AKBA', 'MNKD', 'OMER', 'VNDA', 'CARA', 'AUPH', 'XNCR',
  'ALEC', 'STRO', 'IGMS', 'CGEM', 'ALDX', 'KURA', 'LUNG', 'RLAY', 'ABCL', 'AVXL',
  'NRIX', 'VKTX', 'PRAX', 'ANNX', 'PTGX', 'RXRX', 'SDGR', 'EXAI', 'RGNX', 'APLT',
  // Technology sector additions
  'CRWD', 'ZS', 'NET', 'DDOG', 'SNOW', 'MDB', 'DOCN', 'CFLT', 'ESTC', 'SUMO',
  'DT', 'NEWR', 'RPD', 'TENB', 'QLYS', 'CYBR', 'VRNS', 'SAIL', 'AVLR', 'COUP',
  'MANH', 'NCNO', 'APPN', 'ALTR', 'CALX', 'LITE', 'VIAV', 'INFN', 'CIEN', 'JNPR',
  'ANET', 'FFIV', 'NTAP', 'PSTG', 'NEOG', 'NOVT', 'GNTX', 'CRS', 'HLIT', 'IRDM',
  // Industrial sector additions
  'GWW', 'FTV', 'ROK', 'PH', 'DOV', 'SWK', 'GNRC', 'XYL', 'NDSN', 'IEX',
  'KEYS', 'TDY', 'CPRT', 'J', 'LII', 'RRX', 'ALLE', 'AOS', 'MIDD', 'CFX',
  'FSS', 'ENS', 'AIT', 'GGG', 'RBC', 'ITT', 'MWA', 'ESE', 'NPO', 'CW',
  'HUBB', 'PNR', 'REVG', 'TRN', 'GBX', 'WERN', 'HTLD', 'ARCB', 'XPO', 'ODFL',
  // Consumer sector additions
  'LULU', 'DKS', 'ANF', 'GPS', 'AEO', 'URBN', 'BBWI', 'VSCO', 'RL', 'PVH',
  'HBI', 'GIII', 'COLM', 'SKX', 'CROX', 'DECK', 'WWW', 'SHOO', 'CAL', 'BKE',
  'BOOT', 'RH', 'LOVE', 'ARHS', 'PRPL', 'TPX', 'LEG', 'SNBR', 'ETD', 'VIAV',
  'SIG', 'FOSL', 'MOV', 'TIF', 'WSM', 'FIVE', 'OLLI', 'BIG', 'DLTR', 'DG',
  // Energy sector additions
  'DVN', 'FANG', 'PXD', 'APA', 'HAL', 'BKR', 'NOV', 'CLR', 'OVV', 'CTRA',
  'AR', 'RRC', 'SWN', 'EQT', 'CNX', 'MTDR', 'PDCE', 'CPE', 'TALO', 'CRK',
  'GPOR', 'TELL', 'REI', 'PTEN', 'NBR', 'DRQ', 'TTI', 'CLB', 'OII', 'PUMP',
  'WHD', 'NR', 'DNOW', 'SLCA', 'HP', 'LBRT', 'NEXT', 'NGL', 'ET', 'EPD',
  // Materials sector additions
  'NUE', 'STLD', 'CLF', 'X', 'RS', 'ATI', 'CMC', 'ZEUS', 'CRS', 'HAYN',
  'SON', 'PKG', 'WRK', 'IP', 'GPK', 'SEE', 'BLL', 'CCK', 'SLGN', 'ATR',
  'BERY', 'GEF', 'OI', 'MYE', 'MERC', 'TROX', 'KRO', 'CC', 'HUN', 'OLN',
  'ASH', 'EMN', 'CE', 'AVNT', 'KWR', 'FUL', 'RPM', 'CBT', 'BCPC', 'KOP',
  // Real Estate sector additions
  'AVB', 'EQR', 'ESS', 'MAA', 'UDR', 'CPT', 'INVH', 'AMH', 'SUI', 'ELS',
  'REXR', 'FR', 'STAG', 'TRNO', 'GTY', 'PLYM', 'IIPR', 'COLD', 'SBAC', 'LADR',
  'MPW', 'VTR', 'OHI', 'HR', 'DOC', 'PEAK', 'NHI', 'LTC', 'UHT', 'GMRE',
  'BRX', 'KIM', 'REG', 'FRT', 'AKR', 'ROIC', 'SITC', 'RPAI', 'WSR', 'PINE',
  // Communication Services additions
  'MTCH', 'IAC', 'ANGI', 'ZG', 'Z', 'GRPN', 'YELP', 'CARG', 'CARS', 'TRUE',
  'SPOT', 'TME', 'LYV', 'MSGS', 'DLB', 'SIRI', 'ATUS', 'TGNA', 'GTN', 'SSP',
  'NXST', 'SBGI', 'TEGN', 'GCI', 'GANNETT', 'NYT', 'TRI', 'WMG', 'SONO', 'HEAR',
  'PARA', 'FOXA', 'FOX', 'NWS', 'NWSA', 'DISCA', 'DISCB', 'DISCK', 'VIAC', 'VIACA',
  // Utilities sector additions
  'AES', 'NRG', 'VST', 'OGE', 'POR', 'BKH', 'NWE', 'MDU', 'OGS', 'NJR',
  'SJI', 'SR', 'SWX', 'MGEE', 'AVA', 'PNM', 'IDA', 'OTTR', 'HE', 'CPK',
  'UTL', 'YORW', 'MSEX', 'WTRG', 'SJW', 'CWT', 'AWK', 'CWCO', 'AWR', 'WTR',
  // More diverse additions for 1000
  'NOW', 'CRM', 'WDAY', 'ZEN', 'FROG', 'API', 'MGNI', 'PUBM', 'DSP', 'TTD',
  'APPS', 'MTTR', 'VIEW', 'MKFG', 'DM', 'NNDM', 'XONE', 'DDD', 'SSYS', 'PRLB',
  'HPQ', 'DELL', 'HPE', 'NTAP', 'WDC', 'STX', 'PSTG', 'INFN', 'CIEN', 'JNPR',
  'CSCO', 'MSI', 'ZBRA', 'GRMN', 'TER', 'LSCC', 'MPWR', 'SLAB', 'SWKS', 'QRVO',
  'MRVL', 'ON', 'NXPI', 'STM', 'WOLF', 'DIOD', 'POWI', 'SMTC', 'ACLS', 'COHR',
  'IPGP', 'MKSI', 'ENTG', 'CCMP', 'UCTT', 'FORM', 'ICHR', 'BRKS', 'AMAT', 'KLAC',
  'LRCX', 'ASML', 'TER', 'SNPS', 'CDNS', 'ANSS', 'MTSI', 'SITM', 'PI', 'ALGM',
  'VSH', 'CLS', 'FLEX', 'JBL', 'SANM', 'PLXS', 'TTMI', 'BHE', 'CTS', 'OSIS',
  'PLUS', 'CRUS', 'AOSL', 'MXL', 'SYNA', 'HIMX', 'SGH', 'RMBS', 'PLAB', 'AMKR',
  'CEVA', 'ACMR', 'ONTO', 'NVMI', 'AEHR', 'INDI', 'OUST', 'LAZR', 'VLDR', 'INVZ',
  'MVIS', 'KOPN', 'VUZI', 'IMMR', 'HIMX', 'IDCC', 'III', 'INVE', 'RBBN', 'COMM',
]

// Finnhub API response types
interface FinnhubQuote {
  c: number  // Current price
  d: number  // Change
  dp: number // Percent change
  h: number  // High price of the day
  l: number  // Low price of the day
  o: number  // Open price of the day
  pc: number // Previous close price
  t: number  // Timestamp
}

interface FinnhubMetrics {
  metric: {
    peBasicExclExtraTTM?: number
    peExclExtraTTM?: number
    peTTM?: number
    epsBasicExclExtraItemsTTM?: number
    epsExclExtraItemsTTM?: number
    epsTTM?: number
    ebitdaTTM?: number
    ebitdaPerShareTTM?: number
    marketCapitalization?: number
    '52WeekHigh'?: number
    '52WeekLow'?: number
    dividendYieldIndicatedAnnual?: number
    dividendPerShareAnnual?: number
    beta?: number
    'revenuePerShareTTM'?: number
  }
  series?: {
    annual?: {
      ebitda?: Array<{ v: number; period: string }>
    }
  }
}

interface CachedStockData {
  stocks: Stock[]
  timestamp: number
}

// Stock metadata for names, sectors, industries
const STOCK_METADATA: Record<string, { name: string; sector: string; industry: string }> = {
  'AAPL': { name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
  'MSFT': { name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
  'GOOGL': { name: 'Alphabet Inc.', sector: 'Communication Services', industry: 'Internet Services' },
  'GOOG': { name: 'Alphabet Inc. Class C', sector: 'Communication Services', industry: 'Internet Services' },
  'AMZN': { name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', industry: 'E-Commerce' },
  'NVDA': { name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors' },
  'META': { name: 'Meta Platforms Inc.', sector: 'Communication Services', industry: 'Social Media' },
  'TSLA': { name: 'Tesla Inc.', sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
  'BRK.B': { name: 'Berkshire Hathaway Inc.', sector: 'Financials', industry: 'Insurance' },
  'UNH': { name: 'UnitedHealth Group Inc.', sector: 'Healthcare', industry: 'Health Insurance' },
  'JNJ': { name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'JPM': { name: 'JPMorgan Chase & Co.', sector: 'Financials', industry: 'Banks' },
  'V': { name: 'Visa Inc.', sector: 'Financials', industry: 'Credit Services' },
  'XOM': { name: 'Exxon Mobil Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  'PG': { name: 'Procter & Gamble Co.', sector: 'Consumer Staples', industry: 'Household Products' },
  'MA': { name: 'Mastercard Inc.', sector: 'Financials', industry: 'Credit Services' },
  'HD': { name: 'The Home Depot Inc.', sector: 'Consumer Discretionary', industry: 'Home Improvement' },
  'CVX': { name: 'Chevron Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  'MRK': { name: 'Merck & Co. Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'ABBV': { name: 'AbbVie Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
  'LLY': { name: 'Eli Lilly and Company', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'PEP': { name: 'PepsiCo Inc.', sector: 'Consumer Staples', industry: 'Beverages' },
  'KO': { name: 'The Coca-Cola Company', sector: 'Consumer Staples', industry: 'Beverages' },
  'COST': { name: 'Costco Wholesale Corp.', sector: 'Consumer Staples', industry: 'Retail' },
  'BAC': { name: 'Bank of America Corp.', sector: 'Financials', industry: 'Banks' },
  'PFE': { name: 'Pfizer Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'WMT': { name: 'Walmart Inc.', sector: 'Consumer Staples', industry: 'Retail' },
  'TMO': { name: 'Thermo Fisher Scientific', sector: 'Healthcare', industry: 'Life Sciences' },
  'CSCO': { name: 'Cisco Systems Inc.', sector: 'Technology', industry: 'Networking' },
  'MCD': { name: "McDonald's Corporation", sector: 'Consumer Discretionary', industry: 'Restaurants' },
  'DIS': { name: 'The Walt Disney Company', sector: 'Communication Services', industry: 'Entertainment' },
  'NFLX': { name: 'Netflix Inc.', sector: 'Communication Services', industry: 'Streaming' },
  'AMD': { name: 'Advanced Micro Devices', sector: 'Technology', industry: 'Semiconductors' },
  'INTC': { name: 'Intel Corporation', sector: 'Technology', industry: 'Semiconductors' },
  'ADBE': { name: 'Adobe Inc.', sector: 'Technology', industry: 'Software' },
  'NKE': { name: 'NIKE Inc.', sector: 'Consumer Discretionary', industry: 'Apparel' },
  'CRM': { name: 'Salesforce Inc.', sector: 'Technology', industry: 'Software' },
  'ORCL': { name: 'Oracle Corporation', sector: 'Technology', industry: 'Software' },
  'ACN': { name: 'Accenture plc', sector: 'Technology', industry: 'IT Services' },
  'IBM': { name: 'IBM Corporation', sector: 'Technology', industry: 'IT Services' },
  'QCOM': { name: 'Qualcomm Inc.', sector: 'Technology', industry: 'Semiconductors' },
  'TXN': { name: 'Texas Instruments', sector: 'Technology', industry: 'Semiconductors' },
  'NOW': { name: 'ServiceNow Inc.', sector: 'Technology', industry: 'Software' },
  'INTU': { name: 'Intuit Inc.', sector: 'Technology', industry: 'Software' },
  'SBUX': { name: 'Starbucks Corporation', sector: 'Consumer Discretionary', industry: 'Restaurants' },
  'LOW': { name: "Lowe's Companies Inc.", sector: 'Consumer Discretionary', industry: 'Home Improvement' },
  'GS': { name: 'Goldman Sachs Group', sector: 'Financials', industry: 'Investment Banking' },
  'MS': { name: 'Morgan Stanley', sector: 'Financials', industry: 'Investment Banking' },
  'AXP': { name: 'American Express', sector: 'Financials', industry: 'Credit Services' },
  'BLK': { name: 'BlackRock Inc.', sector: 'Financials', industry: 'Asset Management' },
  'C': { name: 'Citigroup Inc.', sector: 'Financials', industry: 'Banks' },
  'WFC': { name: 'Wells Fargo & Company', sector: 'Financials', industry: 'Banks' },
  'BMY': { name: 'Bristol-Myers Squibb', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'AMGN': { name: 'Amgen Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
  'GILD': { name: 'Gilead Sciences', sector: 'Healthcare', industry: 'Biotechnology' },
  'MDT': { name: 'Medtronic plc', sector: 'Healthcare', industry: 'Medical Devices' },
  'DHR': { name: 'Danaher Corporation', sector: 'Healthcare', industry: 'Life Sciences' },
  'SYK': { name: 'Stryker Corporation', sector: 'Healthcare', industry: 'Medical Devices' },
  'CVS': { name: 'CVS Health Corporation', sector: 'Healthcare', industry: 'Healthcare Services' },
  'COP': { name: 'ConocoPhillips', sector: 'Energy', industry: 'Oil & Gas' },
  'SLB': { name: 'Schlumberger Limited', sector: 'Energy', industry: 'Oil Services' },
  'EOG': { name: 'EOG Resources Inc.', sector: 'Energy', industry: 'Oil & Gas' },
  'NEE': { name: 'NextEra Energy Inc.', sector: 'Utilities', industry: 'Utilities' },
  'DUK': { name: 'Duke Energy Corporation', sector: 'Utilities', industry: 'Utilities' },
  'SO': { name: 'Southern Company', sector: 'Utilities', industry: 'Utilities' },
  'D': { name: 'Dominion Energy Inc.', sector: 'Utilities', industry: 'Utilities' },
  'UNP': { name: 'Union Pacific Corporation', sector: 'Industrials', industry: 'Railroads' },
  'HON': { name: 'Honeywell International', sector: 'Industrials', industry: 'Aerospace' },
  'RTX': { name: 'RTX Corporation', sector: 'Industrials', industry: 'Aerospace' },
  'BA': { name: 'Boeing Company', sector: 'Industrials', industry: 'Aerospace' },
  'CAT': { name: 'Caterpillar Inc.', sector: 'Industrials', industry: 'Machinery' },
  'GE': { name: 'General Electric', sector: 'Industrials', industry: 'Aerospace' },
  'MMM': { name: '3M Company', sector: 'Industrials', industry: 'Diversified' },
  'LMT': { name: 'Lockheed Martin', sector: 'Industrials', industry: 'Defense' },
  'AMT': { name: 'American Tower Corp.', sector: 'Real Estate', industry: 'REITs' },
  'PLD': { name: 'Prologis Inc.', sector: 'Real Estate', industry: 'REITs' },
  'CCI': { name: 'Crown Castle Inc.', sector: 'Real Estate', industry: 'REITs' },
  'SPG': { name: 'Simon Property Group', sector: 'Real Estate', industry: 'REITs' },
  'LIN': { name: 'Linde plc', sector: 'Materials', industry: 'Chemicals' },
  'APD': { name: 'Air Products', sector: 'Materials', industry: 'Chemicals' },
  'SHW': { name: 'Sherwin-Williams', sector: 'Materials', industry: 'Chemicals' },
  'FCX': { name: 'Freeport-McMoRan', sector: 'Materials', industry: 'Mining' },
  'T': { name: 'AT&T Inc.', sector: 'Communication Services', industry: 'Telecom' },
  'VZ': { name: 'Verizon Communications', sector: 'Communication Services', industry: 'Telecom' },
  'CMCSA': { name: 'Comcast Corporation', sector: 'Communication Services', industry: 'Media' },
  'TMUS': { name: 'T-Mobile US Inc.', sector: 'Communication Services', industry: 'Telecom' },
  'PYPL': { name: 'PayPal Holdings Inc.', sector: 'Financials', industry: 'Payments' },
  'UBER': { name: 'Uber Technologies', sector: 'Technology', industry: 'Ride-Sharing' },
  'SQ': { name: 'Block Inc.', sector: 'Financials', industry: 'Payments' },
  'SHOP': { name: 'Shopify Inc.', sector: 'Technology', industry: 'E-Commerce' },
  'SNOW': { name: 'Snowflake Inc.', sector: 'Technology', industry: 'Cloud Computing' },
  'CRWD': { name: 'CrowdStrike Holdings', sector: 'Technology', industry: 'Cybersecurity' },
  'ZS': { name: 'Zscaler Inc.', sector: 'Technology', industry: 'Cybersecurity' },
  'DDOG': { name: 'Datadog Inc.', sector: 'Technology', industry: 'Software' },
  'NET': { name: 'Cloudflare Inc.', sector: 'Technology', industry: 'Cloud Computing' },
  'MDB': { name: 'MongoDB Inc.', sector: 'Technology', industry: 'Database' },
  'PANW': { name: 'Palo Alto Networks', sector: 'Technology', industry: 'Cybersecurity' },
  'MRNA': { name: 'Moderna Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
  'BNTX': { name: 'BioNTech SE', sector: 'Healthcare', industry: 'Biotechnology' },
  'ABNB': { name: 'Airbnb Inc.', sector: 'Consumer Discretionary', industry: 'Travel' },
  'COIN': { name: 'Coinbase Global', sector: 'Financials', industry: 'Cryptocurrency' },
  'RIVN': { name: 'Rivian Automotive', sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
  'LCID': { name: 'Lucid Group Inc.', sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
  'PLTR': { name: 'Palantir Technologies', sector: 'Technology', industry: 'Software' },
}

/**
 * Fetch helper for Finnhub API
 */
async function rateLimitedFetch(url: string): Promise<Response> {
  return fetch(url)
}

/**
 * Fetch stock quote from Finnhub
 */
async function fetchFinnhubQuote(symbol: string): Promise<FinnhubQuote | null> {
  try {
    const response = await rateLimitedFetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    )
    if (!response.ok) return null
    const data = await response.json()
    // Finnhub returns {c: 0, d: null, dp: null, ...} for invalid symbols
    if (data.c === 0 && data.d === null) return null
    return data
  } catch {
    return null
  }
}

/**
 * Fetch company financials/metrics from Finnhub
 */
async function fetchFinnhubMetrics(symbol: string): Promise<FinnhubMetrics | null> {
  try {
    const response = await rateLimitedFetch(
      `${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`
    )
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

/**
 * Check if localStorage cache is valid
 */
function getCachedStocks(): Stock[] | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data: CachedStockData = JSON.parse(cached)
    const now = Date.now()

    // Check if cache is still valid (24 hours)
    if (now - data.timestamp < CACHE_DURATION_MS) {
      console.log('[Finnhub] Using cached data, age:', Math.round((now - data.timestamp) / 1000 / 60), 'minutes')
      return data.stocks
    }

    console.log('[Finnhub] Cache expired')
    return null
  } catch {
    return null
  }
}

/**
 * Save stocks to localStorage cache
 */
function setCachedStocks(stocks: Stock[]): void {
  if (typeof window === 'undefined') return

  try {
    const data: CachedStockData = {
      stocks,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    console.log('[Finnhub] Cached', stocks.length, 'stocks')
  } catch (e) {
    console.warn('[Finnhub] Failed to cache stocks:', e)
  }
}

/**
 * Main function to fetch stocks using Finnhub API
 * Features:
 * - 24h localStorage caching
 * - Rate-limited API calls (60/min limit)
 * - Batches up to 1000 stocks
 * - Falls back to mock data on failure
 */
export async function fetchStocks(): Promise<Stock[]> {
  console.log('[Finnhub] fetchStocks() called, API key:', FINNHUB_API_KEY ? 'SET' : 'MISSING')

  // Check API key
  if (!FINNHUB_API_KEY) {
    console.warn('[Finnhub] No API key found, using mock data')
    return generateMockStocks()
  }

  // Check cache first (browser only)
  const cached = getCachedStocks()
  if (cached && cached.length > 0) {
    return cached
  }

  console.log('[Finnhub] Fetching live data for', TOP_STOCK_SYMBOLS.length, 'stocks...')

  const stocks: Stock[] = []
  const batchSize = 10 // Process in smaller batches (10 stocks = 20 API calls)
  const delayBetweenBatches = 25000 // 25 second delay between batches to stay under 60 calls/min

  try {
    // Get unique symbols
    const uniqueSymbols = [...new Set(TOP_STOCK_SYMBOLS)]

    for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
      const batch = uniqueSymbols.slice(i, i + batchSize)

      // Fetch quotes and metrics in parallel within batch
      const batchPromises = batch.map(async (symbol) => {
        const [quote, metrics] = await Promise.all([
          fetchFinnhubQuote(symbol),
          fetchFinnhubMetrics(symbol)
        ])

        if (!quote || quote.c === 0) return null

        const metadata = STOCK_METADATA[symbol] || {
          name: symbol,
          sector: 'Unknown',
          industry: ''
        }

        const pe = metrics?.metric?.peTTM ?? metrics?.metric?.peBasicExclExtraTTM ?? null
        const eps = metrics?.metric?.epsTTM ?? metrics?.metric?.epsBasicExclExtraItemsTTM ?? null
        const marketCap = metrics?.metric?.marketCapitalization
          ? metrics.metric.marketCapitalization * 1e6 // Convert from millions
          : null
        const ebitda = metrics?.metric?.ebitdaTTM
          ? metrics.metric.ebitdaTTM * 1e6 // Convert from millions
          : null
        const dividendYield = metrics?.metric?.dividendYieldIndicatedAnnual ?? null
        const yearHigh = metrics?.metric?.['52WeekHigh'] ?? quote.h * 1.1
        const yearLow = metrics?.metric?.['52WeekLow'] ?? quote.l * 0.9

        return {
          symbol,
          name: metadata.name,
          price: quote.c,
          change: quote.d || 0,
          changesPercentage: quote.dp || 0,
          marketCap: marketCap || (quote.c * 1e9), // Estimate if missing
          pe,
          eps,
          ebitda,
          dividendYield,
          sector: metadata.sector,
          industry: metadata.industry,
          exchange: 'US', // Finnhub doesn't return exchange in quote
          country: 'US',
          volume: 0, // Quote endpoint doesn't include volume
          avgVolume: 0,
          dayHigh: quote.h,
          dayLow: quote.l,
          yearHigh,
          yearLow,
        } as Stock
      })

      const batchResults = await Promise.all(batchPromises)
      const validStocks = batchResults.filter((s): s is Stock => s !== null)
      stocks.push(...validStocks)

      console.log(`[Finnhub] Processed batch ${Math.floor(i / batchSize) + 1}, total: ${stocks.length} stocks`)

      // Rate limit between batches
      if (i + batchSize < uniqueSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    if (stocks.length === 0) {
      console.warn('[Finnhub] No stocks fetched, falling back to mock data')
      return generateMockStocks()
    }

    // Sort by market cap (largest first)
    stocks.sort((a, b) => b.marketCap - a.marketCap)

    // Cache the results
    setCachedStocks(stocks)

    console.log('[Finnhub] Successfully fetched', stocks.length, 'stocks')
    return stocks

  } catch (error) {
    console.error('[Finnhub] Error fetching stocks:', error)
    console.warn('[Finnhub] Falling back to mock data')
    return generateMockStocks()
  }
}

/**
 * Clear the Finnhub stock cache (useful for forcing refresh)
 */
export function clearFinnhubCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
  console.log('[Finnhub] Cache cleared')
}

/**
 * Fetch data for a single stock symbol using Finnhub API
 */
export async function getStockBySymbol(symbol: string): Promise<Stock | null> {
  if (!FINNHUB_API_KEY) {
    console.warn('[Finnhub] No API key found')
    return null
  }

  try {
    const [quote, metrics] = await Promise.all([
      fetchFinnhubQuote(symbol),
      fetchFinnhubMetrics(symbol)
    ])

    if (!quote || quote.c === 0) return null

    const metadata = STOCK_METADATA[symbol] || {
      name: symbol,
      sector: 'Unknown',
      industry: ''
    }

    const pe = metrics?.metric?.peTTM ?? metrics?.metric?.peBasicExclExtraTTM ?? null
    const eps = metrics?.metric?.epsTTM ?? metrics?.metric?.epsBasicExclExtraItemsTTM ?? null
    const marketCap = metrics?.metric?.marketCapitalization
      ? metrics.metric.marketCapitalization * 1e6
      : null
    const ebitda = metrics?.metric?.ebitdaTTM
      ? metrics.metric.ebitdaTTM * 1e6
      : null
    const dividendYield = metrics?.metric?.dividendYieldIndicatedAnnual ?? null
    const yearHigh = metrics?.metric?.['52WeekHigh'] ?? quote.h * 1.1
    const yearLow = metrics?.metric?.['52WeekLow'] ?? quote.l * 0.9

    return {
      symbol,
      name: metadata.name,
      price: quote.c,
      change: quote.d || 0,
      changesPercentage: quote.dp || 0,
      marketCap: marketCap || (quote.c * 1e9),
      pe,
      eps,
      forwardPE: null as number | null,
      forwardEps: null as number | null,
      ebitda,
      dividendYield,
      sector: metadata.sector,
      industry: metadata.industry,
      exchange: 'US',
      country: 'US',
      volume: 0,
      avgVolume: 0,
      dayHigh: quote.h,
      dayLow: quote.l,
      yearHigh,
      yearLow,
    }
  } catch (error) {
    console.error('[Finnhub] Error fetching stock:', symbol, error)
    return null
  }
}

// Stock screener response type
interface ScreenerStock {
  symbol: string
  companyName: string
  marketCap: number
  sector: string
  industry: string
  beta: number
  price: number
  lastAnnualDividend: number
  volume: number
  exchange: string
  exchangeShortName: string
  country: string
  isEtf: boolean
  isActivelyTrading: boolean
}

export async function getSP500Constituents(): Promise<SP500Constituent[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    throw new Error('FMP_API_KEY is not set')
  }

  const response = await fetch(
    `${FMP_BASE_URL}/sp500_constituent?apikey=${apiKey}`,
    { next: { revalidate: 86400 } }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch S&P 500 constituents: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get top stocks by market cap using stock screener
 * Cost-efficient: 1 API call for up to 1000 stocks
 */
export async function getTopStocksByMarketCap(limit: number = 1000): Promise<ScreenerStock[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    throw new Error('FMP_API_KEY is not set')
  }

  // Use stock screener to get top stocks by market cap
  // Filter: US exchanges, actively trading, not ETFs, market cap > 1B
  const params = new URLSearchParams({
    apikey: apiKey,
    marketCapMoreThan: '1000000000', // $1B minimum
    isEtf: 'false',
    isActivelyTrading: 'true',
    exchange: 'NYSE,NASDAQ,AMEX',
    limit: limit.toString(),
  })

  const response = await fetch(
    `${FMP_BASE_URL}/stock-screener?${params}`,
    { next: { revalidate: 86400 } }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch stock screener: ${response.statusText}`)
  }

  return response.json()
}

export async function getQuotes(symbols: string[]): Promise<StockQuote[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    throw new Error('FMP_API_KEY is not set')
  }

  const symbolString = symbols.join(',')
  const response = await fetch(
    `${FMP_BASE_URL}/quote/${symbolString}?apikey=${apiKey}`,
    { next: { revalidate: 300 } }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch quotes: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get batch company profiles (for dividend data and additional info)
 * Can batch up to ~50 symbols per request
 */
export async function getBatchProfiles(symbols: string[]): Promise<CompanyProfile[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    throw new Error('FMP_API_KEY is not set')
  }

  const symbolString = symbols.join(',')
  const response = await fetch(
    `${FMP_BASE_URL}/profile/${symbolString}?apikey=${apiKey}`,
    { next: { revalidate: 3600 } }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch company profiles: ${response.statusText}`)
  }

  return response.json()
}

export async function getCompanyProfile(symbol: string): Promise<CompanyProfile[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    throw new Error('FMP_API_KEY is not set')
  }

  const response = await fetch(
    `${FMP_BASE_URL}/profile/${symbol}?apikey=${apiKey}`,
    { next: { revalidate: 3600 } }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch company profile: ${response.statusText}`)
  }

  return response.json()
}

export async function getIncomeStatement(symbol: string, limit = 1): Promise<IncomeStatement[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    throw new Error('FMP_API_KEY is not set')
  }

  const response = await fetch(
    `${FMP_BASE_URL}/income-statement/${symbol}?limit=${limit}&apikey=${apiKey}`,
    { next: { revalidate: 86400 } }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch income statement: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get all stock data for up to 1000 stocks
 * Uses stock screener + batch quotes for cost efficiency
 * API calls: 1 (screener) + ~20 (quotes in batches of 50) + ~20 (profiles in batches of 50) = ~41 total
 */
export async function getAllStockData(): Promise<Stock[]> {
  // Step 1: Get top 1000 stocks by market cap using screener (1 API call)
  const screenerStocks = await getTopStocksByMarketCap(1000)

  if (!screenerStocks || screenerStocks.length === 0) {
    throw new Error('No stocks returned from screener')
  }

  // Create a map of screener data for quick lookup
  const screenerMap = new Map(screenerStocks.map(s => [s.symbol, s]))
  const symbols = screenerStocks.map(s => s.symbol)

  // Step 2: Batch fetch quotes (50 per request for reliability)
  const quoteBatchSize = 50
  const allQuotes: StockQuote[] = []

  for (let i = 0; i < symbols.length; i += quoteBatchSize) {
    const batch = symbols.slice(i, i + quoteBatchSize)
    try {
      const quotes = await getQuotes(batch)
      allQuotes.push(...quotes)
    } catch (error) {
      console.error(`Failed to fetch quotes for batch ${i / quoteBatchSize}:`, error)
    }
  }

  // Step 3: Batch fetch profiles for dividend data (50 per request)
  const profileBatchSize = 50
  const allProfiles: CompanyProfile[] = []

  for (let i = 0; i < symbols.length; i += profileBatchSize) {
    const batch = symbols.slice(i, i + profileBatchSize)
    try {
      const profiles = await getBatchProfiles(batch)
      allProfiles.push(...profiles)
    } catch (error) {
      console.error(`Failed to fetch profiles for batch ${i / profileBatchSize}:`, error)
    }
  }

  // Create maps for quick lookup
  const quoteMap = new Map(allQuotes.map(q => [q.symbol, q]))
  const profileMap = new Map(allProfiles.map(p => [p.symbol, p]))

  // Step 4: Combine all data into Stock objects
  const stocks = symbols
    .map(symbol => {
      const screener = screenerMap.get(symbol)
      const quote = quoteMap.get(symbol)
      const profile = profileMap.get(symbol)

      if (!screener) return null

      // Calculate dividend yield: (lastDiv / price) * 100
      let dividendYield: number | null = null
      if (profile?.lastDiv && quote?.price && quote.price > 0) {
        dividendYield = parseFloat(((profile.lastDiv / quote.price) * 100).toFixed(2))
      }

      return {
        symbol: symbol,
        name: quote?.name || profile?.companyName || screener.companyName,
        price: quote?.price ?? screener.price,
        change: quote?.change ?? 0,
        changesPercentage: quote?.changesPercentage ?? 0,
        marketCap: quote?.marketCap ?? screener.marketCap,
        pe: quote?.pe ?? null,
        eps: quote?.eps ?? null,
        forwardPE: null as number | null,
        forwardEps: null as number | null,
        ebitda: null as number | null,
        dividendYield,
        sector: profile?.sector || screener.sector || 'Unknown',
        industry: profile?.industry || screener.industry || '',
        exchange: quote?.exchange || screener.exchange,
        country: 'US',
        volume: quote?.volume ?? screener.volume,
        avgVolume: quote?.avgVolume ?? screener.volume,
        dayHigh: quote?.dayHigh ?? screener.price,
        dayLow: quote?.dayLow ?? screener.price,
        yearHigh: quote?.yearHigh ?? screener.price * 1.2,
        yearLow: quote?.yearLow ?? screener.price * 0.8,
      }
    })
    .filter((stock): stock is Stock => stock !== null)
    .sort((a, b) => b.marketCap - a.marketCap) // Sort by market cap descending

  return stocks
}

/**
 * Legacy function for S&P 500 only data (fewer API calls)
 */
export async function getSP500StockData(): Promise<Stock[]> {
  const constituents = await getSP500Constituents()

  const batchSize = 50
  const allQuotes: StockQuote[] = []

  for (let i = 0; i < constituents.length; i += batchSize) {
    const batch = constituents.slice(i, i + batchSize)
    const symbols = batch.map(c => c.symbol)
    const quotes = await getQuotes(symbols)
    allQuotes.push(...quotes)
  }

  const constituentMap = new Map(constituents.map(c => [c.symbol, c]))

  const stocks: Stock[] = allQuotes.map(quote => {
    const constituent = constituentMap.get(quote.symbol)
    return {
      symbol: quote.symbol,
      name: quote.name,
      price: quote.price,
      change: quote.change,
      changesPercentage: quote.changesPercentage,
      marketCap: quote.marketCap,
      pe: quote.pe,
      eps: quote.eps,
        forwardPE: null as number | null,
        forwardEps: null as number | null,
      ebitda: null,
      dividendYield: null,
      sector: constituent?.sector || 'Unknown',
      industry: '',
      exchange: quote.exchange,
      country: 'US',
      volume: quote.volume,
      avgVolume: quote.avgVolume,
      dayHigh: quote.dayHigh,
      dayLow: quote.dayLow,
      yearHigh: quote.yearHigh,
      yearLow: quote.yearLow,
    }
  })

  return stocks
}

// S&P 500 constituents list (as of 2024)
// Used to filter earnings calendar to only show major companies
const SP500_SYMBOLS = new Set([
  // Technology
  'AAPL', 'MSFT', 'NVDA', 'AVGO', 'ORCL', 'CRM', 'ADBE', 'AMD', 'CSCO', 'ACN',
  'IBM', 'INTC', 'INTU', 'NOW', 'QCOM', 'TXN', 'AMAT', 'ADI', 'LRCX', 'MU',
  'KLAC', 'SNPS', 'CDNS', 'MCHP', 'FTNT', 'PANW', 'ANET', 'HPQ', 'HPE', 'KEYS',
  'IT', 'MPWR', 'EPAM', 'CTSH', 'AKAM', 'FFIV', 'JNPR', 'NTAP', 'CDW', 'ZBRA',
  'TER', 'SWKS', 'QRVO', 'ON', 'NXPI', 'MRVL', 'GEN', 'ENPH', 'SEDG', 'WDC',
  'STX', 'PAYC', 'PAYX', 'FSLR', 'PTC', 'ANSS',
  // Communication Services
  'GOOGL', 'GOOG', 'META', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS', 'CHTR',
  'EA', 'TTWO', 'WBD', 'PARA', 'FOX', 'FOXA', 'NWS', 'NWSA', 'LYV', 'OMC',
  'IPG', 'MTCH',
  // Consumer Discretionary
  'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG', 'MAR',
  'HLT', 'CMG', 'ORLY', 'AZO', 'ROST', 'YUM', 'DHI', 'LEN', 'GM', 'F',
  'APTV', 'POOL', 'BBY', 'DRI', 'GRMN', 'GPC', 'ULTA', 'EBAY', 'ETSY', 'LVS',
  'WYNN', 'MGM', 'CZR', 'RCL', 'CCL', 'NCLH', 'HAS', 'DG', 'DLTR', 'KMX',
  'BWA', 'PHM', 'NVR', 'WHR', 'TPR', 'RL', 'PVH', 'VFC', 'EXPE', 'LKQ',
  // Consumer Staples
  'PG', 'KO', 'PEP', 'COST', 'WMT', 'PM', 'MO', 'MDLZ', 'CL', 'KMB',
  'GIS', 'K', 'HSY', 'HRL', 'SJM', 'CPB', 'CAG', 'MKC', 'CHD', 'CLX',
  'EL', 'STZ', 'TAP', 'BF.B', 'KR', 'SYY', 'WBA', 'TGT', 'DG', 'DLTR',
  'KHC', 'ADM', 'BG', 'TSN', 'MNST',
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'PXD',
  'DVN', 'HAL', 'BKR', 'FANG', 'HES', 'CTRA', 'MRO', 'APA', 'OKE', 'WMB',
  'KMI', 'TRGP', 'LNG',
  // Financials
  'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'AXP', 'BLK',
  'C', 'SCHW', 'CB', 'MMC', 'PGR', 'AON', 'CME', 'ICE', 'MCO', 'SPGI',
  'MET', 'PRU', 'AIG', 'AFL', 'ALL', 'TRV', 'CINF', 'L', 'GL', 'AIZ',
  'BK', 'STT', 'NTRS', 'USB', 'PNC', 'TFC', 'COF', 'DFS', 'SYF', 'AMP',
  'FITB', 'KEY', 'CFG', 'RF', 'HBAN', 'MTB', 'ZION', 'FRC', 'CMA', 'SIVB',
  'MSCI', 'CBOE', 'NDAQ', 'FDS', 'RE', 'WRB', 'RJF', 'MKTX',
  // Healthcare
  'UNH', 'JNJ', 'LLY', 'MRK', 'ABBV', 'PFE', 'TMO', 'ABT', 'DHR', 'BMY',
  'AMGN', 'GILD', 'VRTX', 'ISRG', 'REGN', 'MDT', 'SYK', 'BSX', 'BDX', 'ZBH',
  'EW', 'IDXX', 'IQV', 'DXCM', 'HCA', 'CI', 'ELV', 'CVS', 'HUM', 'CNC',
  'MOH', 'MCK', 'CAH', 'ABC', 'A', 'WAT', 'MTD', 'HOLX', 'ALGN', 'TECH',
  'TFX', 'XRAY', 'RMD', 'BAX', 'ZTS', 'BIIB', 'MRNA', 'ILMN', 'INCY', 'VTRS',
  'CTLT', 'DGX', 'LH',
  // Industrials
  'UNP', 'HON', 'RTX', 'BA', 'CAT', 'GE', 'DE', 'LMT', 'UPS', 'MMM',
  'NOC', 'GD', 'CSX', 'NSC', 'WM', 'ETN', 'ITW', 'EMR', 'PH', 'ROK',
  'CMI', 'DOV', 'PCAR', 'FAST', 'ODFL', 'JCI', 'CARR', 'OTIS', 'TT', 'XYL',
  'SWK', 'AME', 'FTV', 'GNRC', 'IR', 'IEX', 'PNR', 'AOS', 'VRSK', 'CTAS',
  'CPRT', 'PAYX', 'LDOS', 'J', 'FDX', 'LUV', 'DAL', 'UAL', 'AAL', 'ALK',
  'JBHT', 'EXPD', 'CHRW', 'WAB', 'GWW', 'PWR', 'HUBB', 'ALLE', 'NDSN', 'TDG',
  'HWM', 'HII', 'TXT', 'LHX', 'AXON', 'BLDR', 'WSC',
  // Materials
  'LIN', 'APD', 'SHW', 'FCX', 'NEM', 'DD', 'DOW', 'ECL', 'PPG', 'NUE',
  'VMC', 'MLM', 'CTVA', 'FMC', 'IFF', 'CE', 'ALB', 'CF', 'MOS', 'EMN',
  'IP', 'PKG', 'SEE', 'AVY', 'BLL', 'AMCR', 'WRK', 'BALL',
  // Real Estate
  'AMT', 'PLD', 'CCI', 'EQIX', 'SPG', 'PSA', 'WELL', 'DLR', 'O', 'AVB',
  'EQR', 'VTR', 'ESS', 'MAA', 'UDR', 'ARE', 'SBAC', 'BXP', 'KIM', 'REG',
  'VNO', 'HST', 'PEAK', 'CBRE', 'WY', 'INVH', 'EXR', 'CPT', 'IRM', 'FRT',
  // Utilities
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'SRE', 'EXC', 'XEL', 'ED', 'PEG',
  'WEC', 'ES', 'AWK', 'EIX', 'DTE', 'FE', 'PPL', 'AES', 'ETR', 'CMS',
  'CNP', 'ATO', 'EVRG', 'NI', 'LNT', 'NRG', 'PNW', 'CEG',
])

// Finnhub Earnings Calendar Response Type
interface FinnhubEarningsEvent {
  date: string
  epsActual: number | null
  epsEstimate: number | null
  hour: string // 'bmo' | 'amc' | 'dmh'
  quarter: number
  revenueActual: number | null
  revenueEstimate: number | null
  symbol: string
  year: number
}

// Fetch earnings calendar from Finnhub API
export async function getEarningsCalendar(from: string, to: string): Promise<EarningsEvent[]> {
  if (!FINNHUB_API_KEY) {
    console.warn('FINNHUB_API_KEY is not set, using mock earnings data')
    return generateMockEarnings(from, to)
  }

  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 3600 } }
    )

    if (!response.ok) {
      console.warn('Failed to fetch earnings calendar from Finnhub, using mock data')
      return generateMockEarnings(from, to)
    }

    const data = await response.json()
    const events: FinnhubEarningsEvent[] = data.earningsCalendar || []

    // Filter to only include S&P 500 companies and map to our EarningsEvent type
    return events
      .filter((item) => SP500_SYMBOLS.has(item.symbol))
      .map((item) => {
        // Get company name from metadata if available
        const metadata = STOCK_METADATA[item.symbol]
        const name = metadata?.name || item.symbol

        // Map Finnhub hour format to our time format
        let time: 'bmo' | 'amc' | 'dmh' | '--' = '--'
        if (item.hour === 'bmo') time = 'bmo'
        else if (item.hour === 'amc') time = 'amc'
        else if (item.hour === 'dmh') time = 'dmh'

        return {
          symbol: item.symbol,
          name,
          date: item.date,
          time,
          epsEstimate: item.epsEstimate,
          epsActual: item.epsActual,
          revenueEstimate: item.revenueEstimate,
          revenueActual: item.revenueActual,
          fiscalQuarterEnding: `Q${item.quarter} ${item.year}`,
        }
      })
  } catch (error) {
    console.error('Error fetching earnings calendar from Finnhub:', error)
    return generateMockEarnings(from, to)
  }
}

// Generate mock earnings data for demo
export function generateMockEarnings(from: string, to: string): EarningsEvent[] {
  const companies = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'NFLX', name: 'Netflix Inc.' },
    { symbol: 'DIS', name: 'The Walt Disney Company' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'BAC', name: 'Bank of America Corp.' },
    { symbol: 'HD', name: 'The Home Depot Inc.' },
    { symbol: 'PG', name: 'Procter & Gamble Co.' },
    { symbol: 'MA', name: 'Mastercard Inc.' },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.' },
    { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
    { symbol: 'CVX', name: 'Chevron Corporation' },
  ]

  const fromDate = new Date(from)
  const toDate = new Date(to)
  const events: EarningsEvent[] = []
  const times: Array<'bmo' | 'amc'> = ['bmo', 'amc']

  // Generate 2-4 earnings per day within the date range
  const currentDate = new Date(fromDate)
  while (currentDate <= toDate) {
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      const numEarnings = Math.floor(Math.random() * 3) + 2
      const shuffled = [...companies].sort(() => Math.random() - 0.5)

      for (let i = 0; i < numEarnings && i < shuffled.length; i++) {
        const company = shuffled[i]
        const epsEstimate = parseFloat((Math.random() * 5 + 0.5).toFixed(2))

        events.push({
          symbol: company.symbol,
          name: company.name,
          date: currentDate.toISOString().split('T')[0],
          time: times[Math.floor(Math.random() * times.length)],
          epsEstimate,
          epsActual: null,
          revenueEstimate: Math.floor(Math.random() * 50 + 10) * 1e9,
          revenueActual: null,
          fiscalQuarterEnding: `Q${Math.ceil((currentDate.getMonth() + 1) / 3)} ${currentDate.getFullYear()}`,
        })
      }
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return events
}

export function generateMockStocks(): Stock[] {
  const mockStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 178.72, change: 2.15, changesPercentage: 1.22, marketCap: 2800000000000, pe: 28.5, eps: 6.27, ebitda: 130000000000, dividendYield: 0.5, sector: 'Technology', industry: 'Consumer Electronics', exchange: 'NASDAQ', country: 'US', volume: 52000000, avgVolume: 58000000, dayHigh: 180.12, dayLow: 176.50, yearHigh: 199.62, yearLow: 164.08 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', price: 378.91, change: 4.23, changesPercentage: 1.13, marketCap: 2810000000000, pe: 35.2, eps: 10.76, ebitda: 98000000000, dividendYield: 0.8, sector: 'Technology', industry: 'Software', exchange: 'NASDAQ', country: 'US', volume: 22000000, avgVolume: 25000000, dayHigh: 381.50, dayLow: 375.20, yearHigh: 390.00, yearLow: 275.00 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 141.80, change: 1.95, changesPercentage: 1.39, marketCap: 1780000000000, pe: 25.1, eps: 5.65, ebitda: 85000000000, dividendYield: null, sector: 'Communication Services', industry: 'Internet Services', exchange: 'NASDAQ', country: 'US', volume: 25000000, avgVolume: 27000000, dayHigh: 143.20, dayLow: 140.10, yearHigh: 153.78, yearLow: 102.63 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.25, change: 2.80, changesPercentage: 1.60, marketCap: 1850000000000, pe: 62.4, eps: 2.86, ebitda: 72000000000, dividendYield: null, sector: 'Consumer Discretionary', industry: 'E-Commerce', exchange: 'NASDAQ', country: 'US', volume: 45000000, avgVolume: 50000000, dayHigh: 180.50, dayLow: 175.80, yearHigh: 189.00, yearLow: 118.35 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 495.22, change: 12.50, changesPercentage: 2.59, marketCap: 1220000000000, pe: 65.8, eps: 7.53, ebitda: 18000000000, dividendYield: 0.04, sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ', country: 'US', volume: 42000000, avgVolume: 48000000, dayHigh: 502.00, dayLow: 485.00, yearHigh: 505.00, yearLow: 138.84 },
    { symbol: 'META', name: 'Meta Platforms Inc.', price: 505.95, change: 8.20, changesPercentage: 1.65, marketCap: 1300000000000, pe: 32.5, eps: 15.57, ebitda: 58000000000, dividendYield: null, sector: 'Communication Services', industry: 'Social Media', exchange: 'NASDAQ', country: 'US', volume: 15000000, avgVolume: 18000000, dayHigh: 510.00, dayLow: 498.00, yearHigh: 531.49, yearLow: 274.38 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', price: 363.54, change: -1.20, changesPercentage: -0.33, marketCap: 790000000000, pe: 8.5, eps: 42.77, ebitda: 45000000000, dividendYield: null, sector: 'Financials', industry: 'Insurance', exchange: 'NYSE', country: 'US', volume: 3500000, avgVolume: 4000000, dayHigh: 366.00, dayLow: 362.00, yearHigh: 375.00, yearLow: 294.00 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 195.20, change: 1.85, changesPercentage: 0.96, marketCap: 565000000000, pe: 11.2, eps: 17.43, ebitda: null, dividendYield: 2.4, sector: 'Financials', industry: 'Banks', exchange: 'NYSE', country: 'US', volume: 9000000, avgVolume: 10000000, dayHigh: 197.00, dayLow: 193.50, yearHigh: 200.00, yearLow: 135.00 },
    { symbol: 'V', name: 'Visa Inc.', price: 281.45, change: 2.10, changesPercentage: 0.75, marketCap: 575000000000, pe: 30.5, eps: 9.23, ebitda: 22000000000, dividendYield: 0.8, sector: 'Financials', industry: 'Credit Services', exchange: 'NYSE', country: 'US', volume: 6500000, avgVolume: 7000000, dayHigh: 283.00, dayLow: 279.50, yearHigh: 290.00, yearLow: 220.00 },
    { symbol: 'JNJ', name: 'Johnson & Johnson', price: 156.72, change: -0.45, changesPercentage: -0.29, marketCap: 380000000000, pe: 15.8, eps: 9.92, ebitda: 32000000000, dividendYield: 2.9, sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'NYSE', country: 'US', volume: 7000000, avgVolume: 7500000, dayHigh: 158.00, dayLow: 155.80, yearHigh: 175.00, yearLow: 150.00 },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.', price: 527.30, change: 3.45, changesPercentage: 0.66, marketCap: 490000000000, pe: 22.1, eps: 23.86, ebitda: 35000000000, dividendYield: 1.3, sector: 'Healthcare', industry: 'Health Insurance', exchange: 'NYSE', country: 'US', volume: 3200000, avgVolume: 3500000, dayHigh: 530.00, dayLow: 523.00, yearHigh: 558.10, yearLow: 445.00 },
    { symbol: 'XOM', name: 'Exxon Mobil Corporation', price: 104.52, change: 1.25, changesPercentage: 1.21, marketCap: 420000000000, pe: 10.2, eps: 10.25, ebitda: 75000000000, dividendYield: 3.5, sector: 'Energy', industry: 'Oil & Gas', exchange: 'NYSE', country: 'US', volume: 18000000, avgVolume: 20000000, dayHigh: 106.00, dayLow: 103.20, yearHigh: 120.00, yearLow: 95.00 },
    { symbol: 'PG', name: 'Procter & Gamble Co.', price: 159.85, change: 0.75, changesPercentage: 0.47, marketCap: 380000000000, pe: 26.5, eps: 6.03, ebitda: 22000000000, dividendYield: 2.4, sector: 'Consumer Staples', industry: 'Household Products', exchange: 'NYSE', country: 'US', volume: 6000000, avgVolume: 6500000, dayHigh: 161.00, dayLow: 158.50, yearHigh: 165.00, yearLow: 140.00 },
    { symbol: 'HD', name: 'The Home Depot Inc.', price: 345.20, change: 4.50, changesPercentage: 1.32, marketCap: 345000000000, pe: 21.8, eps: 15.83, ebitda: 25000000000, dividendYield: 2.5, sector: 'Consumer Discretionary', industry: 'Home Improvement', exchange: 'NYSE', country: 'US', volume: 4000000, avgVolume: 4200000, dayHigh: 348.00, dayLow: 341.50, yearHigh: 360.00, yearLow: 275.00 },
    { symbol: 'CVX', name: 'Chevron Corporation', price: 151.80, change: 2.10, changesPercentage: 1.40, marketCap: 285000000000, pe: 11.5, eps: 13.20, ebitda: 55000000000, dividendYield: 4.0, sector: 'Energy', industry: 'Oil & Gas', exchange: 'NYSE', country: 'US', volume: 8000000, avgVolume: 8500000, dayHigh: 153.50, dayLow: 150.00, yearHigh: 165.00, yearLow: 140.00 },
    { symbol: 'ABBV', name: 'AbbVie Inc.', price: 154.30, change: 1.20, changesPercentage: 0.78, marketCap: 275000000000, pe: 13.2, eps: 11.69, ebitda: 28000000000, dividendYield: 3.9, sector: 'Healthcare', industry: 'Biotechnology', exchange: 'NYSE', country: 'US', volume: 5500000, avgVolume: 6000000, dayHigh: 156.00, dayLow: 153.00, yearHigh: 170.00, yearLow: 135.00 },
    { symbol: 'MRK', name: 'Merck & Co. Inc.', price: 108.45, change: 0.85, changesPercentage: 0.79, marketCap: 275000000000, pe: 16.8, eps: 6.46, ebitda: 22000000000, dividendYield: 2.7, sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'NYSE', country: 'US', volume: 9000000, avgVolume: 9500000, dayHigh: 110.00, dayLow: 107.50, yearHigh: 120.00, yearLow: 100.00 },
    { symbol: 'PEP', name: 'PepsiCo Inc.', price: 168.90, change: 0.65, changesPercentage: 0.39, marketCap: 232000000000, pe: 24.5, eps: 6.89, ebitda: 16000000000, dividendYield: 2.7, sector: 'Consumer Staples', industry: 'Beverages', exchange: 'NASDAQ', country: 'US', volume: 4500000, avgVolume: 5000000, dayHigh: 170.00, dayLow: 167.50, yearHigh: 185.00, yearLow: 155.00 },
    { symbol: 'KO', name: 'The Coca-Cola Company', price: 59.85, change: 0.35, changesPercentage: 0.59, marketCap: 258000000000, pe: 23.2, eps: 2.58, ebitda: 14000000000, dividendYield: 3.0, sector: 'Consumer Staples', industry: 'Beverages', exchange: 'NYSE', country: 'US', volume: 12000000, avgVolume: 13000000, dayHigh: 60.20, dayLow: 59.40, yearHigh: 65.00, yearLow: 55.00 },
    { symbol: 'LLY', name: 'Eli Lilly and Company', price: 598.50, change: 8.75, changesPercentage: 1.48, marketCap: 570000000000, pe: 85.5, eps: 7.00, ebitda: 12000000000, dividendYield: 0.8, sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'NYSE', country: 'US', volume: 3000000, avgVolume: 3200000, dayHigh: 605.00, dayLow: 590.00, yearHigh: 620.00, yearLow: 310.00 },
    { symbol: 'WMT', name: 'Walmart Inc.', price: 165.25, change: 1.15, changesPercentage: 0.70, marketCap: 445000000000, pe: 28.5, eps: 5.80, ebitda: 36000000000, dividendYield: 1.4, sector: 'Consumer Staples', industry: 'Retail', exchange: 'NYSE', country: 'US', volume: 7000000, avgVolume: 7500000, dayHigh: 167.00, dayLow: 164.00, yearHigh: 170.00, yearLow: 140.00 },
    { symbol: 'BAC', name: 'Bank of America Corp.', price: 33.85, change: 0.45, changesPercentage: 1.35, marketCap: 265000000000, pe: 10.5, eps: 3.22, ebitda: null, dividendYield: 2.8, sector: 'Financials', industry: 'Banks', exchange: 'NYSE', country: 'US', volume: 35000000, avgVolume: 40000000, dayHigh: 34.20, dayLow: 33.50, yearHigh: 38.00, yearLow: 26.00 },
    { symbol: 'COST', name: 'Costco Wholesale Corp.', price: 572.40, change: 5.80, changesPercentage: 1.02, marketCap: 255000000000, pe: 42.5, eps: 13.47, ebitda: 10000000000, dividendYield: 0.7, sector: 'Consumer Staples', industry: 'Retail', exchange: 'NASDAQ', country: 'US', volume: 2200000, avgVolume: 2400000, dayHigh: 578.00, dayLow: 568.00, yearHigh: 590.00, yearLow: 470.00 },
    { symbol: 'TMO', name: 'Thermo Fisher Scientific', price: 525.60, change: 4.20, changesPercentage: 0.81, marketCap: 205000000000, pe: 32.8, eps: 16.02, ebitda: 12000000000, dividendYield: 0.2, sector: 'Healthcare', industry: 'Life Sciences', exchange: 'NYSE', country: 'US', volume: 1500000, avgVolume: 1700000, dayHigh: 530.00, dayLow: 522.00, yearHigh: 560.00, yearLow: 480.00 },
    { symbol: 'CSCO', name: 'Cisco Systems Inc.', price: 50.25, change: 0.55, changesPercentage: 1.11, marketCap: 205000000000, pe: 15.2, eps: 3.31, ebitda: 18000000000, dividendYield: 3.0, sector: 'Technology', industry: 'Networking', exchange: 'NASDAQ', country: 'US', volume: 18000000, avgVolume: 20000000, dayHigh: 51.00, dayLow: 49.80, yearHigh: 55.00, yearLow: 45.00 },
    { symbol: 'DIS', name: 'The Walt Disney Company', price: 91.45, change: 1.25, changesPercentage: 1.39, marketCap: 168000000000, pe: 72.5, eps: 1.26, ebitda: 15000000000, dividendYield: null, sector: 'Communication Services', industry: 'Entertainment', exchange: 'NYSE', country: 'US', volume: 10000000, avgVolume: 11000000, dayHigh: 93.00, dayLow: 90.20, yearHigh: 123.00, yearLow: 84.00 },
    { symbol: 'ADBE', name: 'Adobe Inc.', price: 575.80, change: 7.50, changesPercentage: 1.32, marketCap: 260000000000, pe: 45.2, eps: 12.74, ebitda: 8500000000, dividendYield: null, sector: 'Technology', industry: 'Software', exchange: 'NASDAQ', country: 'US', volume: 2800000, avgVolume: 3000000, dayHigh: 580.00, dayLow: 570.00, yearHigh: 600.00, yearLow: 430.00 },
    { symbol: 'PFE', name: 'Pfizer Inc.', price: 28.75, change: 0.25, changesPercentage: 0.88, marketCap: 162000000000, pe: 12.5, eps: 2.30, ebitda: 28000000000, dividendYield: 5.6, sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'NYSE', country: 'US', volume: 35000000, avgVolume: 38000000, dayHigh: 29.20, dayLow: 28.50, yearHigh: 45.00, yearLow: 27.00 },
    { symbol: 'NKE', name: 'NIKE Inc.', price: 98.50, change: 1.35, changesPercentage: 1.39, marketCap: 148000000000, pe: 28.5, eps: 3.46, ebitda: 7500000000, dividendYield: 1.4, sector: 'Consumer Discretionary', industry: 'Apparel', exchange: 'NYSE', country: 'US', volume: 6500000, avgVolume: 7000000, dayHigh: 100.00, dayLow: 97.20, yearHigh: 132.00, yearLow: 90.00 },
    { symbol: 'INTC', name: 'Intel Corporation', price: 42.85, change: 0.95, changesPercentage: 2.27, marketCap: 180000000000, pe: 35.5, eps: 1.21, ebitda: 22000000000, dividendYield: 1.2, sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ', country: 'US', volume: 32000000, avgVolume: 35000000, dayHigh: 43.50, dayLow: 42.00, yearHigh: 50.00, yearLow: 35.00 },
  ]

  const additionalStocks = generateAdditionalMockStocks()
  return [...mockStocks.map(s => ({ ...s, forwardPE: null as number | null, forwardEps: null as number | null })), ...additionalStocks]
}

function generateAdditionalMockStocks(): Stock[] {
  const companies = [
    { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Technology' },
    { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology' },
    { symbol: 'ACN', name: 'Accenture plc', sector: 'Technology' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology' },
    { symbol: 'QCOM', name: 'Qualcomm Inc.', sector: 'Technology' },
    { symbol: 'TXN', name: 'Texas Instruments', sector: 'Technology' },
    { symbol: 'IBM', name: 'IBM Corporation', sector: 'Technology' },
    { symbol: 'NOW', name: 'ServiceNow Inc.', sector: 'Technology' },
    { symbol: 'INTU', name: 'Intuit Inc.', sector: 'Technology' },
    { symbol: 'MCD', name: "McDonald's Corporation", sector: 'Consumer Discretionary' },
    { symbol: 'SBUX', name: 'Starbucks Corporation', sector: 'Consumer Discretionary' },
    { symbol: 'TGT', name: 'Target Corporation', sector: 'Consumer Staples' },
    { symbol: 'LOW', name: "Lowe's Companies Inc.", sector: 'Consumer Discretionary' },
    { symbol: 'GS', name: 'Goldman Sachs Group', sector: 'Financials' },
    { symbol: 'MS', name: 'Morgan Stanley', sector: 'Financials' },
    { symbol: 'AXP', name: 'American Express', sector: 'Financials' },
    { symbol: 'BLK', name: 'BlackRock Inc.', sector: 'Financials' },
    { symbol: 'C', name: 'Citigroup Inc.', sector: 'Financials' },
    { symbol: 'WFC', name: 'Wells Fargo & Company', sector: 'Financials' },
    { symbol: 'BMY', name: 'Bristol-Myers Squibb', sector: 'Healthcare' },
    { symbol: 'AMGN', name: 'Amgen Inc.', sector: 'Healthcare' },
    { symbol: 'GILD', name: 'Gilead Sciences', sector: 'Healthcare' },
    { symbol: 'MDT', name: 'Medtronic plc', sector: 'Healthcare' },
    { symbol: 'DHR', name: 'Danaher Corporation', sector: 'Healthcare' },
    { symbol: 'SYK', name: 'Stryker Corporation', sector: 'Healthcare' },
    { symbol: 'CVS', name: 'CVS Health Corporation', sector: 'Healthcare' },
    { symbol: 'COP', name: 'ConocoPhillips', sector: 'Energy' },
    { symbol: 'SLB', name: 'Schlumberger Limited', sector: 'Energy' },
    { symbol: 'EOG', name: 'EOG Resources Inc.', sector: 'Energy' },
    { symbol: 'NEE', name: 'NextEra Energy Inc.', sector: 'Utilities' },
    { symbol: 'DUK', name: 'Duke Energy Corporation', sector: 'Utilities' },
    { symbol: 'SO', name: 'Southern Company', sector: 'Utilities' },
    { symbol: 'D', name: 'Dominion Energy Inc.', sector: 'Utilities' },
    { symbol: 'UNP', name: 'Union Pacific Corporation', sector: 'Industrials' },
    { symbol: 'HON', name: 'Honeywell International', sector: 'Industrials' },
    { symbol: 'RTX', name: 'RTX Corporation', sector: 'Industrials' },
    { symbol: 'BA', name: 'Boeing Company', sector: 'Industrials' },
    { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials' },
    { symbol: 'GE', name: 'General Electric', sector: 'Industrials' },
    { symbol: 'MMM', name: '3M Company', sector: 'Industrials' },
    { symbol: 'LMT', name: 'Lockheed Martin', sector: 'Industrials' },
    { symbol: 'AMT', name: 'American Tower Corp.', sector: 'Real Estate' },
    { symbol: 'PLD', name: 'Prologis Inc.', sector: 'Real Estate' },
    { symbol: 'CCI', name: 'Crown Castle Inc.', sector: 'Real Estate' },
    { symbol: 'SPG', name: 'Simon Property Group', sector: 'Real Estate' },
    { symbol: 'LIN', name: 'Linde plc', sector: 'Materials' },
    { symbol: 'APD', name: 'Air Products', sector: 'Materials' },
    { symbol: 'SHW', name: 'Sherwin-Williams', sector: 'Materials' },
    { symbol: 'FCX', name: 'Freeport-McMoRan', sector: 'Materials' },
    { symbol: 'T', name: 'AT&T Inc.', sector: 'Communication Services' },
    { symbol: 'VZ', name: 'Verizon Communications', sector: 'Communication Services' },
    { symbol: 'CMCSA', name: 'Comcast Corporation', sector: 'Communication Services' },
    { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services' },
    { symbol: 'TMUS', name: 'T-Mobile US Inc.', sector: 'Communication Services' },
  ]

  return companies.map(company => {
    const basePrice = 50 + Math.random() * 450
    const marketCap = (20 + Math.random() * 300) * 1e9
    const change = (Math.random() - 0.5) * 10
    const pe = Math.random() > 0.1 ? 10 + Math.random() * 50 : null
    const eps = pe ? basePrice / pe : null
    const ebitda = Math.random() > 0.2 ? marketCap * (0.1 + Math.random() * 0.2) : null
    const dividendYield = Math.random() > 0.3 ? Math.random() * 5 : null

    return {
      symbol: company.symbol,
      name: company.name,
      price: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changesPercentage: parseFloat((change / basePrice * 100).toFixed(2)),
      marketCap: Math.floor(marketCap),
      pe: pe ? parseFloat(pe.toFixed(2)) : null,
      eps: eps ? parseFloat(eps.toFixed(2)) : null,
        forwardPE: null as number | null,
        forwardEps: null as number | null,
      ebitda: ebitda ? Math.floor(ebitda) : null,
      dividendYield: dividendYield ? parseFloat(dividendYield.toFixed(2)) : null,
      sector: company.sector,
      industry: '',
      exchange: Math.random() > 0.5 ? 'NYSE' : 'NASDAQ',
      country: 'US',
      volume: Math.floor(1000000 + Math.random() * 50000000),
      avgVolume: Math.floor(1000000 + Math.random() * 50000000),
      dayHigh: parseFloat((basePrice * 1.02).toFixed(2)),
      dayLow: parseFloat((basePrice * 0.98).toFixed(2)),
      yearHigh: parseFloat((basePrice * 1.3).toFixed(2)),
      yearLow: parseFloat((basePrice * 0.7).toFixed(2)),
    }
  })
}
