'use client'

import { useState } from 'react'

function symbolColor(symbol: string): string {
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 45%, 35%)`
}

// Clearbit domain map for companies where Finnhub doesn't have logos
const DOMAIN_MAP: Record<string, string> = {
  'META': 'meta.com', 'GOOGL': 'google.com', 'GOOG': 'google.com',
  'AMZN': 'amazon.com', 'AAPL': 'apple.com', 'MSFT': 'microsoft.com',
  'NVDA': 'nvidia.com', 'TSLA': 'tesla.com', 'NFLX': 'netflix.com',
  'CRM': 'salesforce.com', 'ORCL': 'oracle.com', 'ADBE': 'adobe.com',
  'INTC': 'intel.com', 'AMD': 'amd.com', 'AVGO': 'broadcom.com',
  'CSCO': 'cisco.com', 'IBM': 'ibm.com', 'QCOM': 'qualcomm.com',
  'TXN': 'ti.com', 'NOW': 'servicenow.com', 'INTU': 'intuit.com',
  'SHOP': 'shopify.com', 'SNOW': 'snowflake.com', 'PLTR': 'palantir.com',
  'UBER': 'uber.com', 'ABNB': 'airbnb.com', 'SQ': 'squareup.com',
  'COIN': 'coinbase.com', 'HOOD': 'robinhood.com', 'SOFI': 'sofi.com',
  'PYPL': 'paypal.com', 'V': 'visa.com', 'MA': 'mastercard.com',
  'JPM': 'jpmorganchase.com', 'BAC': 'bankofamerica.com', 'GS': 'goldmansachs.com',
  'MS': 'morganstanley.com', 'WFC': 'wellsfargo.com', 'C': 'citigroup.com',
  'BLK': 'blackrock.com', 'SCHW': 'schwab.com',
  'JNJ': 'jnj.com', 'PFE': 'pfizer.com', 'UNH': 'unitedhealthgroup.com',
  'ABBV': 'abbvie.com', 'MRK': 'merck.com', 'LLY': 'lilly.com',
  'TMO': 'thermofisher.com', 'ABT': 'abbott.com', 'BMY': 'bms.com',
  'AMGN': 'amgen.com', 'GILD': 'gilead.com', 'REGN': 'regeneron.com',
  'WMT': 'walmart.com', 'COST': 'costco.com', 'TGT': 'target.com',
  'HD': 'homedepot.com', 'LOW': 'lowes.com', 'NKE': 'nike.com',
  'SBUX': 'starbucks.com', 'MCD': 'mcdonalds.com', 'KO': 'coca-cola.com',
  'PEP': 'pepsico.com', 'PG': 'pg.com', 'PM': 'pmi.com',
  'DIS': 'disney.com', 'CMCSA': 'comcast.com', 'T': 'att.com',
  'VZ': 'verizon.com', 'TMUS': 't-mobile.com',
  'XOM': 'exxonmobil.com', 'CVX': 'chevron.com', 'COP': 'conocophillips.com',
  'BA': 'boeing.com', 'CAT': 'caterpillar.com', 'HON': 'honeywell.com',
  'UPS': 'ups.com', 'FDX': 'fedex.com', 'DE': 'deere.com',
  'GE': 'ge.com', 'MMM': '3m.com', 'RTX': 'rtx.com',
  'LMT': 'lockheedmartin.com', 'NOC': 'northropgrumman.com',
  // International
  'BABA.HK': 'alibaba.com', 'BABA': 'alibaba.com',
  'TCEHY': 'tencent.com', 'TCEHY.HK': 'tencent.com',
  'MEIT.HK': 'meituan.com',
  'SONY.JP': 'sony.com', 'SFTB.JP': 'softbank.com',
  'TM.JP': 'toyota.com', 'KEYN.JP': 'keyence.com',
  'SHEL.UK': 'shell.com', 'AZN.UK': 'astrazeneca.com',
  'ASML.EU': 'asml.com', 'SAP.EU': 'sap.com', 'SIE.EU': 'siemens.com',
  'NVO.EU': 'novonordisk.com', 'NVS.EU': 'novartis.com', 'ALV.EU': 'allianz.com',
  'AIR.EU': 'airbus.com',
  'RY.CA': 'rbc.com', 'TD.CA': 'td.com', 'BN.CA': 'brookfield.com',
  'CSL.AU': 'csl.com',
  'CPNG': 'coupang.com', 'SMSN': 'samsung.com',
  'STLA': 'stellantis.com', 'BNTX': 'biontech.com',
  'TEVA': 'teva.com', 'MELI': 'mercadolibre.com',
  'ABEV': 'ambev.com', 'VOD': 'vodafone.com',
  'ARM': 'arm.com', 'SPOT': 'spotify.com', 'NET': 'cloudflare.com',
  'CRWD': 'crowdstrike.com', 'PANW': 'paloaltonetworks.com',
  'ZS': 'zscaler.com', 'DDOG': 'datadoghq.com', 'FTNT': 'fortinet.com',
  'WDAY': 'workday.com', 'TEAM': 'atlassian.com', 'ZM': 'zoom.us',
  'RDDT': 'reddit.com', 'SNAP': 'snap.com', 'PINS': 'pinterest.com',
  'MSTR': 'microstrategy.com', 'SMCI': 'supermicro.com',
  'APP': 'applovin.com', 'MRVL': 'marvell.com',
  // ETFs & Index funds
  'SPY': 'ssga.com', 'QQQ': 'invesco.com', 'TQQQ': 'proshares.com',
  'VTI': 'vanguard.com', 'VT': 'vanguard.com', 'GLD': 'ssga.com',
  'TBLL': 'jpmorgan.com', 'IEMG': 'ishares.com',
  // MicroStrategy preferred
  'STRK': 'microstrategy.com', 'STRF': 'microstrategy.com',
  // Additional Spreads assets
  'BRK-B': 'berkshirehathaway.com', 'BRK-A': 'berkshirehathaway.com',
  'NVO': 'novonordisk.com', 'AZN': 'astrazeneca.com',
  'LIN': 'linde.com', 'DHR': 'danaher.com',
  'CRCL': 'circle.com', 'GME': 'gamestop.com',
}

function getClearbitUrl(symbol: string, name?: string): string | null {
  const domain = DOMAIN_MAP[symbol]
  if (domain) return `https://logo.clearbit.com/${domain}`

  // For international tickers, try the base symbol too
  const base = symbol.split('.')[0]
  const baseDomain = DOMAIN_MAP[base]
  if (baseDomain) return `https://logo.clearbit.com/${baseDomain}`

  return null
}

interface StockLogoProps {
  symbol: string
  name?: string
  logo?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  className?: string
}

const SIZE_PX: Record<string, number> = {
  sm: 24, md: 32, lg: 48, xl: 64, '2xl': 80, '3xl': 96,
}

export default function StockLogo({ symbol, name, logo, size = 'md', className = '' }: StockLogoProps) {
  const [source, setSource] = useState<'primary' | 'clearbit' | 'fallback'>('primary')
  const px = SIZE_PX[size] || 32

  const clearbitUrl = getClearbitUrl(symbol, name)

  const handlePrimaryError = () => {
    if (clearbitUrl) {
      setSource('clearbit')
    } else {
      setSource('fallback')
    }
  }

  const handleClearbitError = () => {
    setSource('fallback')
  }

  // Color fallback
  if (source === 'fallback' || !logo) {
    const bg = symbolColor(symbol)
    return (
      <div
        className={`rounded-2xl flex items-center justify-center font-bold text-white select-none ${className}`}
        style={{
          width: px,
          height: px,
          backgroundColor: bg,
          fontSize: px * 0.35,
          letterSpacing: '0.02em',
        }}
      >
        {symbol.replace(/\.\w+$/, '').slice(0, 2).toUpperCase()}
      </div>
    )
  }

  const imgSrc = source === 'clearbit' ? clearbitUrl! : logo

  return (
    <div
      className={`rounded-2xl overflow-hidden flex-shrink-0 ${className}`}
      style={{
        width: px,
        height: px,
        backgroundColor: 'var(--logo-bg, white)',
      }}
    >
      <img
        src={imgSrc}
        alt={`${symbol} logo`}
        className="object-contain"
        style={{ width: px, height: px }}
        onError={source === 'primary' ? handlePrimaryError : handleClearbitError}
        loading="lazy"
        draggable={false}
      />
    </div>
  )
}
