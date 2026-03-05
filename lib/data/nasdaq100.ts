// NASDAQ-100 Index - Top 100 Non-Financial Companies
// Source: https://en.wikipedia.org/wiki/Nasdaq-100

export interface NasdaqStock {
  symbol: string
  name: string
  sector: string
  industry: string
}

export const NASDAQ100_STOCKS: NasdaqStock[] = [
  // Technology - Software
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Technology', industry: 'Software' },
  { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.', sector: 'Technology', industry: 'Networking' },
  { symbol: 'INTC', name: 'Intel Corporation', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'QCOM', name: 'Qualcomm Inc.', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'TXN', name: 'Texas Instruments', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'INTU', name: 'Intuit Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'NOW', name: 'ServiceNow Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'PANW', name: 'Palo Alto Networks', sector: 'Technology', industry: 'Software' },
  { symbol: 'AMAT', name: 'Applied Materials', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'MU', name: 'Micron Technology', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'LRCX', name: 'Lam Research', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'KLAC', name: 'KLA Corporation', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'ADSK', name: 'Autodesk Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'SNPS', name: 'Synopsys Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'CDNS', name: 'Cadence Design Systems', sector: 'Technology', industry: 'Software' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings', sector: 'Technology', industry: 'Software' },
  { symbol: 'MRVL', name: 'Marvell Technology', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'FTNT', name: 'Fortinet Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'WDAY', name: 'Workday Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'NXPI', name: 'NXP Semiconductors', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'TEAM', name: 'Atlassian Corporation', sector: 'Technology', industry: 'Software' },
  { symbol: 'DDOG', name: 'Datadog Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'ANSS', name: 'ANSYS Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'MCHP', name: 'Microchip Technology', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'ON', name: 'ON Semiconductor', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'MPWR', name: 'Monolithic Power Systems', sector: 'Technology', industry: 'Semiconductors' },

  // Communication Services
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', sector: 'Communication Services', industry: 'Internet Services' },
  { symbol: 'GOOG', name: 'Alphabet Inc. Class C', sector: 'Communication Services', industry: 'Internet Services' },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', industry: 'Social Media' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services', industry: 'Streaming' },
  { symbol: 'CMCSA', name: 'Comcast Corporation', sector: 'Communication Services', industry: 'Media' },
  { symbol: 'TMUS', name: 'T-Mobile US Inc.', sector: 'Communication Services', industry: 'Telecom' },
  { symbol: 'EA', name: 'Electronic Arts', sector: 'Communication Services', industry: 'Gaming' },
  { symbol: 'TTWO', name: 'Take-Two Interactive', sector: 'Communication Services', industry: 'Gaming' },

  // Consumer Discretionary
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', industry: 'E-Commerce' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
  { symbol: 'BKNG', name: 'Booking Holdings', sector: 'Consumer Discretionary', industry: 'Travel' },
  { symbol: 'ABNB', name: 'Airbnb Inc.', sector: 'Consumer Discretionary', industry: 'Travel' },
  { symbol: 'MCD', name: "McDonald's Corporation", sector: 'Consumer Discretionary', industry: 'Restaurants' },
  { symbol: 'SBUX', name: 'Starbucks Corporation', sector: 'Consumer Discretionary', industry: 'Restaurants' },
  { symbol: 'MAR', name: 'Marriott International', sector: 'Consumer Discretionary', industry: 'Hotels' },
  { symbol: 'ORLY', name: "O'Reilly Automotive", sector: 'Consumer Discretionary', industry: 'Auto Parts' },
  { symbol: 'AZO', name: 'AutoZone Inc.', sector: 'Consumer Discretionary', industry: 'Auto Parts' },
  { symbol: 'ROST', name: 'Ross Stores', sector: 'Consumer Discretionary', industry: 'Retail' },
  { symbol: 'LULU', name: 'Lululemon Athletica', sector: 'Consumer Discretionary', industry: 'Apparel' },
  { symbol: 'EBAY', name: 'eBay Inc.', sector: 'Consumer Discretionary', industry: 'E-Commerce' },

  // Consumer Staples
  { symbol: 'COST', name: 'Costco Wholesale Corp.', sector: 'Consumer Staples', industry: 'Retail' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Staples', industry: 'Beverages' },
  { symbol: 'MDLZ', name: 'Mondelez International', sector: 'Consumer Staples', industry: 'Food Products' },
  { symbol: 'KDP', name: 'Keurig Dr Pepper', sector: 'Consumer Staples', industry: 'Beverages' },
  { symbol: 'MNST', name: 'Monster Beverage', sector: 'Consumer Staples', industry: 'Beverages' },

  // Healthcare
  { symbol: 'AMGN', name: 'Amgen Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
  { symbol: 'GILD', name: 'Gilead Sciences', sector: 'Healthcare', industry: 'Biotechnology' },
  { symbol: 'VRTX', name: 'Vertex Pharmaceuticals', sector: 'Healthcare', industry: 'Biotechnology' },
  { symbol: 'REGN', name: 'Regeneron Pharmaceuticals', sector: 'Healthcare', industry: 'Biotechnology' },
  { symbol: 'ISRG', name: 'Intuitive Surgical', sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'BIIB', name: 'Biogen Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
  { symbol: 'MRNA', name: 'Moderna Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
  { symbol: 'IDXX', name: 'IDEXX Laboratories', sector: 'Healthcare', industry: 'Diagnostics' },
  { symbol: 'ALGN', name: 'Align Technology', sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'DXCM', name: 'DexCom Inc.', sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'ILMN', name: 'Illumina Inc.', sector: 'Healthcare', industry: 'Life Sciences' },

  // Industrials
  { symbol: 'HON', name: 'Honeywell International', sector: 'Industrials', industry: 'Aerospace' },
  { symbol: 'ADP', name: 'Automatic Data Processing', sector: 'Industrials', industry: 'Business Services' },
  { symbol: 'CTAS', name: 'Cintas Corporation', sector: 'Industrials', industry: 'Business Services' },
  { symbol: 'ODFL', name: 'Old Dominion Freight', sector: 'Industrials', industry: 'Logistics' },
  { symbol: 'PAYX', name: 'Paychex Inc.', sector: 'Industrials', industry: 'Business Services' },
  { symbol: 'VRSK', name: 'Verisk Analytics', sector: 'Industrials', industry: 'Data Services' },
  { symbol: 'FAST', name: 'Fastenal Company', sector: 'Industrials', industry: 'Distribution' },
  { symbol: 'PCAR', name: 'PACCAR Inc.', sector: 'Industrials', industry: 'Trucks' },

  // Energy
  { symbol: 'XEL', name: 'Xcel Energy', sector: 'Utilities', industry: 'Utilities' },
  { symbol: 'CEG', name: 'Constellation Energy', sector: 'Utilities', industry: 'Utilities' },

  // Real Estate
  { symbol: 'PDD', name: 'PDD Holdings', sector: 'Consumer Discretionary', industry: 'E-Commerce' },

  // Financials (few in NASDAQ-100 as it excludes most financials)
  { symbol: 'PYPL', name: 'PayPal Holdings', sector: 'Financials', industry: 'Payment Processing' },

  // Additional Tech & Growth Stocks
  { symbol: 'ZS', name: 'Zscaler Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'TTWO', name: 'Take-Two Interactive', sector: 'Communication Services', industry: 'Gaming' },
  { symbol: 'CHTR', name: 'Charter Communications', sector: 'Communication Services', industry: 'Media' },
  { symbol: 'CPRT', name: 'Copart Inc.', sector: 'Industrials', industry: 'Auto Services' },
  { symbol: 'MNST', name: 'Monster Beverage', sector: 'Consumer Staples', industry: 'Beverages' },
  { symbol: 'MELI', name: 'MercadoLibre Inc.', sector: 'Consumer Discretionary', industry: 'E-Commerce' },
  { symbol: 'AEP', name: 'American Electric Power', sector: 'Utilities', industry: 'Utilities' },
  { symbol: 'DASH', name: 'DoorDash Inc.', sector: 'Consumer Discretionary', industry: 'Food Delivery' },
  { symbol: 'RIVN', name: 'Rivian Automotive', sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
  { symbol: 'LCID', name: 'Lucid Group', sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
  { symbol: 'ZM', name: 'Zoom Video Communications', sector: 'Technology', industry: 'Software' },
  { symbol: 'DOCU', name: 'DocuSign Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'OKTA', name: 'Okta Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'SPLK', name: 'Splunk Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'ROKU', name: 'Roku Inc.', sector: 'Communication Services', industry: 'Streaming' },
  { symbol: 'COIN', name: 'Coinbase Global', sector: 'Financials', industry: 'Cryptocurrency' },
]

// Convert to record for quick lookup
export const NASDAQ100_METADATA: Record<string, NasdaqStock> = NASDAQ100_STOCKS.reduce(
  (acc, stock) => {
    acc[stock.symbol] = stock
    return acc
  },
  {} as Record<string, NasdaqStock>
)

// Get just the symbols array
export const NASDAQ100_SYMBOLS = NASDAQ100_STOCKS.map(s => s.symbol)
