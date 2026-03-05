// Major International Stocks - Top companies from global markets
// Covers: Europe, Asia, Australia, Canada, emerging markets

export interface InternationalStock {
  symbol: string
  name: string
  country: string
  sector: string
  industry: string
  exchange: string
}

export const INTERNATIONAL_STOCKS: InternationalStock[] = [
  // UNITED KINGDOM (London Stock Exchange)
  { symbol: 'SHEL', name: 'Shell plc', country: 'United Kingdom', sector: 'Energy', industry: 'Oil & Gas', exchange: 'LSE' },
  { symbol: 'HSBC', name: 'HSBC Holdings', country: 'United Kingdom', sector: 'Financials', industry: 'Banks', exchange: 'LSE' },
  { symbol: 'AZN', name: 'AstraZeneca', country: 'United Kingdom', sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'LSE' },
  { symbol: 'BP', name: 'BP plc', country: 'United Kingdom', sector: 'Energy', industry: 'Oil & Gas', exchange: 'LSE' },
  { symbol: 'GSK', name: 'GSK plc', country: 'United Kingdom', sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'LSE' },
  { symbol: 'ULVR.L', name: 'Unilever', country: 'United Kingdom', sector: 'Consumer Staples', industry: 'Personal Products', exchange: 'LSE' },
  { symbol: 'DGE.L', name: 'Diageo', country: 'United Kingdom', sector: 'Consumer Staples', industry: 'Beverages', exchange: 'LSE' },
  { symbol: 'RIO', name: 'Rio Tinto', country: 'United Kingdom', sector: 'Materials', industry: 'Mining', exchange: 'LSE' },

  // GERMANY (Frankfurt Stock Exchange)
  { symbol: 'SAP', name: 'SAP SE', country: 'Germany', sector: 'Technology', industry: 'Software', exchange: 'XETRA' },
  { symbol: 'ASML', name: 'ASML Holding', country: 'Netherlands', sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ' },
  { symbol: 'IDEXY', name: 'Infineon Technologies', country: 'Germany', sector: 'Technology', industry: 'Semiconductors', exchange: 'XETRA' },
  { symbol: 'DDAIF', name: 'Daimler Truck', country: 'Germany', sector: 'Consumer Discretionary', industry: 'Automotive', exchange: 'XETRA' },
  { symbol: 'BAYRY', name: 'Bayer AG', country: 'Germany', sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'XETRA' },
  { symbol: 'SIEGY', name: 'Siemens AG', country: 'Germany', sector: 'Industrials', industry: 'Conglomerates', exchange: 'XETRA' },
  { symbol: 'BASFY', name: 'BASF SE', country: 'Germany', sector: 'Materials', industry: 'Chemicals', exchange: 'XETRA' },

  // FRANCE (Euronext Paris)
  { symbol: 'LVMUY', name: 'LVMH', country: 'France', sector: 'Consumer Discretionary', industry: 'Luxury Goods', exchange: 'EPA' },
  { symbol: 'SNY', name: 'Sanofi', country: 'France', sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'EPA' },
  { symbol: 'TOTF', name: 'TotalEnergies', country: 'France', sector: 'Energy', industry: 'Oil & Gas', exchange: 'EPA' },
  { symbol: 'LRLCY', name: "L'Oréal", country: 'France', sector: 'Consumer Staples', industry: 'Personal Products', exchange: 'EPA' },
  { symbol: 'AIR.PA', name: 'Airbus', country: 'France', sector: 'Industrials', industry: 'Aerospace', exchange: 'EPA' },

  // SWITZERLAND
  { symbol: 'NESN.SW', name: 'Nestlé', country: 'Switzerland', sector: 'Consumer Staples', industry: 'Food Products', exchange: 'SIX' },
  { symbol: 'NOVN.SW', name: 'Novartis', country: 'Switzerland', sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'SIX' },
  { symbol: 'ROG.SW', name: 'Roche', country: 'Switzerland', sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'SIX' },
  { symbol: 'UHR.SW', name: 'Richemont', country: 'Switzerland', sector: 'Consumer Discretionary', industry: 'Luxury Goods', exchange: 'SIX' },

  // JAPAN (Tokyo Stock Exchange)
  { symbol: 'TM', name: 'Toyota Motor', country: 'Japan', sector: 'Consumer Discretionary', industry: 'Automotive', exchange: 'TSE' },
  { symbol: 'SONY', name: 'Sony Group', country: 'Japan', sector: 'Consumer Discretionary', industry: 'Electronics', exchange: 'TSE' },
  { symbol: 'NTDOY', name: 'Nintendo', country: 'Japan', sector: 'Communication Services', industry: 'Gaming', exchange: 'TSE' },
  { symbol: 'SMFG', name: 'Sumitomo Mitsui', country: 'Japan', sector: 'Financials', industry: 'Banks', exchange: 'TSE' },
  { symbol: 'MUFG', name: 'Mitsubishi UFJ', country: 'Japan', sector: 'Financials', industry: 'Banks', exchange: 'TSE' },
  { symbol: 'HMC', name: 'Honda Motor', country: 'Japan', sector: 'Consumer Discretionary', industry: 'Automotive', exchange: 'TSE' },

  // CHINA (Hong Kong / ADR)
  { symbol: 'BABA', name: 'Alibaba Group', country: 'China', sector: 'Consumer Discretionary', industry: 'E-Commerce', exchange: 'NYSE' },
  { symbol: 'BIDU', name: 'Baidu Inc.', country: 'China', sector: 'Communication Services', industry: 'Internet Services', exchange: 'NASDAQ' },
  { symbol: 'JD', name: 'JD.com', country: 'China', sector: 'Consumer Discretionary', industry: 'E-Commerce', exchange: 'NASDAQ' },
  { symbol: 'PDD', name: 'PDD Holdings', country: 'China', sector: 'Consumer Discretionary', industry: 'E-Commerce', exchange: 'NASDAQ' },
  { symbol: 'NIO', name: 'NIO Inc.', country: 'China', sector: 'Consumer Discretionary', industry: 'Electric Vehicles', exchange: 'NYSE' },
  { symbol: 'BEKE', name: 'KE Holdings', country: 'China', sector: 'Real Estate', industry: 'Real Estate Services', exchange: 'NYSE' },

  // SOUTH KOREA
  { symbol: 'SSNLF', name: 'Samsung Electronics', country: 'South Korea', sector: 'Technology', industry: 'Consumer Electronics', exchange: 'KRX' },

  // TAIWAN
  { symbol: 'TSM', name: 'Taiwan Semiconductor', country: 'Taiwan', sector: 'Technology', industry: 'Semiconductors', exchange: 'NYSE' },

  // AUSTRALIA (ASX)
  { symbol: 'BHP', name: 'BHP Group', country: 'Australia', sector: 'Materials', industry: 'Mining', exchange: 'ASX' },
  { symbol: 'CBA.AX', name: 'Commonwealth Bank', country: 'Australia', sector: 'Financials', industry: 'Banks', exchange: 'ASX' },
  { symbol: 'CSL.AX', name: 'CSL Limited', country: 'Australia', sector: 'Healthcare', industry: 'Biotechnology', exchange: 'ASX' },

  // CANADA (TSX)
  { symbol: 'SHOP', name: 'Shopify Inc.', country: 'Canada', sector: 'Technology', industry: 'E-Commerce', exchange: 'TSX' },
  { symbol: 'RY', name: 'Royal Bank of Canada', country: 'Canada', sector: 'Financials', industry: 'Banks', exchange: 'TSX' },
  { symbol: 'TD', name: 'Toronto-Dominion Bank', country: 'Canada', sector: 'Financials', industry: 'Banks', exchange: 'TSX' },
  { symbol: 'ENB', name: 'Enbridge Inc.', country: 'Canada', sector: 'Energy', industry: 'Pipelines', exchange: 'TSX' },
  { symbol: 'CNQ', name: 'Canadian Natural Resources', country: 'Canada', sector: 'Energy', industry: 'Oil & Gas', exchange: 'TSX' },

  // BRAZIL
  { symbol: 'VALE', name: 'Vale S.A.', country: 'Brazil', sector: 'Materials', industry: 'Mining', exchange: 'B3' },
  { symbol: 'PBR', name: 'Petrobras', country: 'Brazil', sector: 'Energy', industry: 'Oil & Gas', exchange: 'B3' },
  { symbol: 'NU', name: 'Nu Holdings', country: 'Brazil', sector: 'Financials', industry: 'Fintech', exchange: 'NYSE' },

  // INDIA
  { symbol: 'INFY', name: 'Infosys Limited', country: 'India', sector: 'Technology', industry: 'IT Services', exchange: 'NYSE' },
  { symbol: 'WIT', name: 'Wipro Limited', country: 'India', sector: 'Technology', industry: 'IT Services', exchange: 'NYSE' },
  { symbol: 'HDB', name: 'HDFC Bank', country: 'India', sector: 'Financials', industry: 'Banks', exchange: 'NYSE' },

  // SOUTH AFRICA
  { symbol: 'NPN.JO', name: 'Naspers', country: 'South Africa', sector: 'Communication Services', industry: 'Internet Services', exchange: 'JSE' },

  // MEXICO
  { symbol: 'MELI', name: 'MercadoLibre', country: 'Argentina/Mexico', sector: 'Consumer Discretionary', industry: 'E-Commerce', exchange: 'NASDAQ' },

  // SPAIN
  { symbol: 'ITUB', name: 'Itaú Unibanco', country: 'Brazil', sector: 'Financials', industry: 'Banks', exchange: 'NYSE' },

  // NETHERLANDS
  { symbol: 'HEIA.AS', name: 'Heineken', country: 'Netherlands', sector: 'Consumer Staples', industry: 'Beverages', exchange: 'AEX' },
  { symbol: 'ASML', name: 'ASML Holding', country: 'Netherlands', sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ' },

  // ITALY
  { symbol: 'RACE', name: 'Ferrari N.V.', country: 'Italy', sector: 'Consumer Discretionary', industry: 'Automotive', exchange: 'NYSE' },

  // DENMARK
  { symbol: 'NVO', name: 'Novo Nordisk', country: 'Denmark', sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'NYSE' },

  // SWEDEN
  { symbol: 'VOLV-B.ST', name: 'Volvo', country: 'Sweden', sector: 'Industrials', industry: 'Automotive', exchange: 'OMX' },
  { symbol: 'SPOTIFY', name: 'Spotify', country: 'Sweden', sector: 'Communication Services', industry: 'Streaming', exchange: 'NYSE' },
]

// Convert to record for quick lookup
export const INTERNATIONAL_METADATA: Record<string, InternationalStock> = INTERNATIONAL_STOCKS.reduce(
  (acc, stock) => {
    acc[stock.symbol] = stock
    return acc
  },
  {} as Record<string, InternationalStock>
)

// Get just the symbols array
export const INTERNATIONAL_SYMBOLS = INTERNATIONAL_STOCKS.map(s => s.symbol)

// Group by country for easy filtering
export const STOCKS_BY_COUNTRY = INTERNATIONAL_STOCKS.reduce((acc, stock) => {
  if (!acc[stock.country]) {
    acc[stock.country] = []
  }
  acc[stock.country].push(stock)
  return acc
}, {} as Record<string, InternationalStock[]>)

// Group by exchange
export const STOCKS_BY_EXCHANGE = INTERNATIONAL_STOCKS.reduce((acc, stock) => {
  if (!acc[stock.exchange]) {
    acc[stock.exchange] = []
  }
  acc[stock.exchange].push(stock)
  return acc
}, {} as Record<string, InternationalStock[]>)
