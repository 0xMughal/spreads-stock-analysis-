/**
 * Keyword tags for semantic stock search.
 * Maps keywords/phrases to ticker sets so users can search by concept
 * e.g. "car" → Tesla, Ford, GM; "AI chip" → NVDA, AMD, etc.
 */

// Each stock can have multiple tags; each tag can match multiple stocks
const TAG_MAP: Record<string, string[]> = {
  // Automotive
  'car': ['TSLA', 'F', 'GM', 'TM', 'HMC', 'STLA', 'RIVN', 'LCID', 'NIO', 'LI', 'XPEV', 'RACE', 'BMW.EU', 'MBG.EU', 'VOW3.EU', '7203.JP'],
  'cars': ['TSLA', 'F', 'GM', 'TM', 'HMC', 'STLA', 'RIVN', 'LCID', 'NIO', 'LI', 'XPEV', 'RACE', 'BMW.EU', 'MBG.EU', 'VOW3.EU', '7203.JP'],
  'auto': ['TSLA', 'F', 'GM', 'TM', 'HMC', 'STLA', 'RIVN', 'LCID', 'NIO', 'LI', 'XPEV', 'RACE', 'BMW.EU', 'MBG.EU', 'VOW3.EU', '7203.JP'],
  'automobile': ['TSLA', 'F', 'GM', 'TM', 'HMC', 'STLA', 'RIVN', 'LCID', 'NIO', 'LI', 'XPEV', 'RACE', 'BMW.EU', 'MBG.EU', 'VOW3.EU', '7203.JP'],
  'ev': ['TSLA', 'RIVN', 'LCID', 'NIO', 'LI', 'XPEV', 'F', 'GM', 'BMW.EU', 'VOW3.EU', 'CHPT', 'QS'],
  'electric vehicle': ['TSLA', 'RIVN', 'LCID', 'NIO', 'LI', 'XPEV', 'F', 'GM', 'CHPT', 'QS'],
  'vehicle': ['TSLA', 'F', 'GM', 'TM', 'RIVN', 'LCID', 'NIO', 'STLA', 'BMW.EU', 'MBG.EU'],
  'truck': ['TSLA', 'F', 'GM', 'PCAR', 'CMI', 'RIVN'],
  'ferrari': ['RACE'],

  // AI & Chips
  'ai': ['NVDA', 'AMD', 'MSFT', 'GOOGL', 'META', 'AMZN', 'PLTR', 'ARM', 'SNOW', 'CRM', 'NOW', 'SMCI', 'MRVL', 'AVGO', 'INTC', 'IBM', 'ORCL', 'CDNS', 'SNPS', 'APP', 'SOUN', 'QBTS', 'RGTI', 'BBAI', 'TSM'],
  'ai chip': ['NVDA', 'AMD', 'AVGO', 'INTC', 'MRVL', 'ARM', 'TSM', 'QCOM', 'SMCI'],
  'artificial intelligence': ['NVDA', 'AMD', 'MSFT', 'GOOGL', 'META', 'AMZN', 'PLTR', 'ARM', 'IBM', 'CRM', 'NOW', 'SOUN', 'QBTS', 'RGTI'],
  'chip': ['NVDA', 'AMD', 'INTC', 'AVGO', 'QCOM', 'TXN', 'MRVL', 'ARM', 'TSM', 'MU', 'LRCX', 'KLAC', 'AMAT', 'ASML', 'ON', 'NXPI', 'SMCI', 'ADI', 'MCHP'],
  'semiconductor': ['NVDA', 'AMD', 'INTC', 'AVGO', 'QCOM', 'TXN', 'MRVL', 'ARM', 'TSM', 'MU', 'LRCX', 'KLAC', 'AMAT', 'ASML', 'ON', 'NXPI', 'ADI', 'MCHP', 'SMCI'],
  'gpu': ['NVDA', 'AMD', 'INTC'],
  'processor': ['NVDA', 'AMD', 'INTC', 'QCOM', 'ARM', 'AVGO'],
  'data center': ['NVDA', 'AMD', 'AVGO', 'SMCI', 'EQIX', 'DLR', 'MSFT', 'AMZN', 'GOOGL'],

  // Food & Restaurants
  'restaurant': ['SBUX', 'MCD', 'CMG', 'YUM', 'DRI', 'DENN', 'QSR', 'WEN', 'DPZ', 'WING', 'CAVA', 'BROS', 'SHAK', 'JACK', 'TXRH'],
  'food': ['SBUX', 'MCD', 'CMG', 'YUM', 'KO', 'PEP', 'MDLZ', 'KHC', 'GIS', 'K', 'HSY', 'SJM', 'CAG', 'CPB', 'TSN', 'HRL', 'WEN', 'DPZ', 'WING', 'CAVA'],
  'fast food': ['MCD', 'YUM', 'QSR', 'WEN', 'DPZ', 'JACK', 'CMG', 'WING', 'SHAK'],
  'burger': ['MCD', 'WEN', 'JACK', 'SHAK', 'QSR'],
  'pizza': ['DPZ', 'YUM'],
  'coffee': ['SBUX', 'BROS', 'KDP'],
  'snack': ['PEP', 'MDLZ', 'HSY', 'KDP'],
  'beverage': ['KO', 'PEP', 'MNST', 'KDP', 'SAM', 'STZ', 'BF-B', 'DEO', 'SBUX'],
  'drink': ['KO', 'PEP', 'MNST', 'KDP', 'SAM', 'STZ', 'SBUX'],
  'beer': ['SAM', 'STZ', 'BF-B', 'TAP', 'DEO', 'BUD'],
  'alcohol': ['STZ', 'BF-B', 'DEO', 'SAM', 'TAP', 'BUD', 'PRNDY'],

  // Cloud & Software
  'cloud': ['MSFT', 'AMZN', 'GOOGL', 'CRM', 'SNOW', 'NOW', 'ORCL', 'IBM', 'DDOG', 'NET', 'WDAY', 'MDB', 'ESTC', 'CFLT'],
  'saas': ['CRM', 'NOW', 'ADBE', 'INTU', 'SNOW', 'SHOP', 'WDAY', 'PAYC', 'HUBS', 'ZS', 'CRWD', 'NET', 'PANW', 'FTNT', 'DDOG', 'SPOT', 'RDDT'],
  'software': ['MSFT', 'ORCL', 'CRM', 'ADBE', 'NOW', 'INTU', 'SNOW', 'WDAY', 'HUBS', 'SHOP', 'DDOG', 'NET', 'PANW', 'ZS', 'CRWD'],
  'cybersecurity': ['CRWD', 'PANW', 'ZS', 'FTNT', 'NET', 'S', 'OKTA', 'CYBR', 'TENB', 'RPD'],
  'security': ['CRWD', 'PANW', 'ZS', 'FTNT', 'NET', 'S', 'OKTA', 'CYBR', 'TENB', 'RPD'],

  // Social Media & Streaming
  'social media': ['META', 'SNAP', 'PINS', 'RDDT', 'GOOGL', 'SPOT'],
  'social': ['META', 'SNAP', 'PINS', 'RDDT', 'GOOGL'],
  'streaming': ['NFLX', 'DIS', 'PARA', 'WBD', 'SPOT', 'ROKU', 'AMZN', 'AAPL'],
  'video': ['NFLX', 'GOOGL', 'ROKU', 'DIS', 'PARA', 'WBD'],
  'music': ['SPOT', 'AAPL', 'AMZN', 'WMG', 'UMG.EU'],
  'gaming': ['MSFT', 'SONY', 'EA', 'TTWO', 'RBLX', 'U', 'NTDOY', 'ATVI', 'TCEHY'],
  'game': ['MSFT', 'SONY', 'EA', 'TTWO', 'RBLX', 'U', 'NTDOY', 'TCEHY'],

  // Banking & Finance
  'bank': ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TFC', 'SCHW', 'HSBA.UK', 'BARC.UK', 'LLOY.UK', 'NWG.UK'],
  'banking': ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TFC', 'SCHW', 'HSBA.UK'],
  'investment bank': ['GS', 'MS', 'JPM', 'C', 'BAC'],
  'payment': ['V', 'MA', 'PYPL', 'SQ', 'FIS', 'FISV', 'GPN', 'ADYEN.EU'],
  'fintech': ['SQ', 'PYPL', 'SOFI', 'HOOD', 'COIN', 'AFRM', 'UPST', 'NU'],
  'insurance': ['BRK-B', 'UNH', 'AIG', 'MET', 'PRU', 'ALL', 'TRV', 'CB', 'AFL', 'PGR', 'HIG'],
  'credit card': ['V', 'MA', 'AXP', 'DFS', 'COF'],
  'card': ['V', 'MA', 'AXP', 'DFS', 'COF'],
  'wealth': ['BLK', 'BX', 'KKR', 'APO', 'ARES', 'SCHW', 'GS', 'MS'],
  'asset management': ['BLK', 'BX', 'KKR', 'APO', 'ARES', 'TROW', 'IVZ', 'BEN'],

  // Crypto
  'crypto': ['COIN', 'MARA', 'RIOT', 'MSTR', 'CIFR', 'WULF', 'IREN', 'OKLO', 'HOOD', 'SOFI', 'SQ'],
  'bitcoin': ['COIN', 'MARA', 'RIOT', 'MSTR', 'CIFR', 'WULF', 'IREN'],
  'blockchain': ['COIN', 'MARA', 'RIOT', 'MSTR', 'IBM', 'SQ'],
  'mining': ['MARA', 'RIOT', 'CIFR', 'WULF', 'IREN', 'NEM', 'GOLD', 'FCX', 'BHP', 'RIO', 'RIO.UK', 'AAL.UK', 'GLEN.UK'],

  // Pharma & Healthcare
  'pharma': ['PFE', 'MRK', 'LLY', 'ABBV', 'JNJ', 'BMY', 'AMGN', 'GILD', 'REGN', 'VRTX', 'AZN', 'NVO', 'GSK.UK', 'AZN.UK', 'SNY.EU', 'ROG.EU'],
  'drug': ['PFE', 'MRK', 'LLY', 'ABBV', 'JNJ', 'BMY', 'AMGN', 'GILD', 'REGN', 'VRTX', 'AZN', 'NVO'],
  'vaccine': ['PFE', 'MRNA', 'JNJ', 'AZN', 'NVAX', 'BNTX', 'GSK.UK'],
  'biotech': ['AMGN', 'GILD', 'REGN', 'VRTX', 'MRNA', 'BIIB', 'ILMN', 'SGEN', 'ALNY', 'BMRN'],
  'hospital': ['HCA', 'UHS', 'THC', 'CYH', 'SEM'],
  'medical device': ['ABT', 'MDT', 'SYK', 'ISRG', 'BSX', 'EW', 'ZBH', 'BAX', 'BDX'],
  'weight loss': ['LLY', 'NVO', 'AMGN', 'VKTX'],
  'ozempic': ['NVO', 'LLY'],
  'health': ['UNH', 'CVS', 'CI', 'HUM', 'ELV', 'CNC', 'MOH', 'ABT', 'JNJ', 'PFE', 'MRK', 'LLY'],

  // Retail & E-commerce
  'retail': ['AMZN', 'WMT', 'COST', 'TGT', 'HD', 'LOW', 'SHOP', 'EBAY', 'ETSY', 'BABA', 'JD', 'PDD', 'MELI'],
  'ecommerce': ['AMZN', 'SHOP', 'EBAY', 'ETSY', 'BABA', 'JD', 'PDD', 'MELI', 'SE'],
  'shopping': ['AMZN', 'WMT', 'COST', 'TGT', 'SHOP', 'EBAY', 'ETSY', 'BABA', 'JD', 'PDD'],
  'grocery': ['WMT', 'COST', 'KR', 'TGT', 'ACI', 'SFM'],
  'luxury': ['RACE', 'MC.EU', 'OR.EU', 'LVMH', 'RMS.EU', 'BRBY.UK', 'TPR', 'RL', 'CPRI'],
  'fashion': ['NKE', 'LULU', 'TJX', 'ROST', 'GPS', 'RL', 'TPR', 'CPRI', 'VFC', 'PVH', 'BRBY.UK', 'MC.EU'],
  'clothing': ['NKE', 'LULU', 'TJX', 'ROST', 'GPS', 'RL', 'VFC', 'PVH', 'UAA'],
  'shoes': ['NKE', 'DECK', 'ONON', 'CROX', 'SKX'],
  'sneaker': ['NKE', 'DECK', 'ONON'],
  'sport': ['NKE', 'LULU', 'UAA', 'DECK', 'ONON', 'DIS', 'DKNG', 'PENN', 'FWONK'],
  'sports': ['NKE', 'LULU', 'UAA', 'DECK', 'ONON', 'DIS', 'DKNG', 'PENN', 'FWONK'],

  // Energy & Oil
  'oil': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'OXY', 'MPC', 'VLO', 'PSX', 'DVN', 'HAL', 'BP.UK', 'SHEL', 'TTE.EU'],
  'gas': ['XOM', 'CVX', 'COP', 'EOG', 'DVN', 'EQT', 'SWN', 'LNG', 'BP.UK', 'SHEL'],
  'petroleum': ['XOM', 'CVX', 'COP', 'SLB', 'OXY', 'BP.UK', 'SHEL', 'TTE.EU'],
  'solar': ['ENPH', 'SEDG', 'FSLR', 'RUN', 'NOVA', 'ARRY', 'NEE'],
  'renewable': ['ENPH', 'SEDG', 'FSLR', 'NEE', 'RUN', 'NOVA', 'BEP', 'AES'],
  'clean energy': ['ENPH', 'SEDG', 'FSLR', 'NEE', 'RUN', 'PLUG', 'BE', 'TSLA'],
  'nuclear': ['CCJ', 'OKLO', 'VST', 'CEG', 'SMR', 'NNE', 'LEU'],
  'uranium': ['CCJ', 'LEU', 'NNE', 'UEC', 'DNN'],

  // Aerospace & Defense
  'aerospace': ['BA', 'RTX', 'LMT', 'NOC', 'GD', 'HWM', 'TDG', 'HEI', 'AXON'],
  'defense': ['LMT', 'RTX', 'NOC', 'GD', 'LHX', 'HII', 'BWXT', 'KTOS', 'PLTR', 'BAE.UK'],
  'military': ['LMT', 'RTX', 'NOC', 'GD', 'LHX', 'HII', 'BWXT', 'KTOS', 'PLTR', 'BAE.UK'],
  'missile': ['LMT', 'RTX', 'NOC'],
  'jet': ['BA', 'RTX', 'GE', 'HWM'],
  'plane': ['BA', 'RTX', 'GE', 'HWM', 'TDG'],
  'airplane': ['BA', 'RTX', 'GE', 'HWM'],
  'airline': ['DAL', 'UAL', 'LUV', 'AAL', 'ALK', 'JBLU', 'SAVE', 'RYAAY', 'IAG.UK'],
  'flight': ['BA', 'DAL', 'UAL', 'LUV', 'AAL', 'ALK'],
  'travel': ['BKNG', 'ABNB', 'EXPE', 'MAR', 'HLT', 'H', 'DAL', 'UAL', 'CCL', 'RCL', 'NCLH', 'TRIP'],
  'hotel': ['MAR', 'HLT', 'H', 'WH', 'IHG.UK'],
  'cruise': ['CCL', 'RCL', 'NCLH'],
  'vacation': ['BKNG', 'ABNB', 'EXPE', 'MAR', 'HLT', 'CCL', 'RCL', 'DIS'],

  // Space & Aerospace
  'space': ['RKLB', 'ASTS', 'LUNR', 'RDW', 'SPCE', 'BKSY', 'MNTS', 'BA', 'LMT', 'NOC', 'RTX', 'KTOS', 'LDOS', 'SARO'],
  'spacex': ['RKLB', 'ASTS', 'LUNR', 'RDW', 'SPCE', 'BKSY', 'BA'],
  'rocket': ['RKLB', 'RDW', 'LUNR', 'BA', 'LMT', 'NOC'],
  'satellite': ['ASTS', 'BKSY', 'VSAT', 'GSAT', 'SARO'],
  'orbit': ['RKLB', 'ASTS', 'LUNR', 'RDW', 'SPCE', 'BKSY'],
  'launch': ['RKLB', 'RDW', 'LUNR', 'BA', 'LMT'],
  'lunar': ['LUNR', 'RKLB'],
  'moon': ['LUNR', 'RKLB'],
  'mars': ['RKLB', 'BA', 'LMT'],
  'ipo spacex': ['RKLB', 'ASTS', 'LUNR', 'RDW', 'SPCE', 'BKSY'],
  'drone': ['KTOS', 'AVAV', 'JOBY', 'RKLB'],

  // Telecom
  'telecom': ['T', 'VZ', 'TMUS', 'CMCSA', 'CHTR', 'VOD.UK', 'BT.UK', 'DTE.EU'],
  'phone': ['AAPL', 'GOOG', 'T', 'VZ', 'TMUS', 'QCOM'],
  'smartphone': ['AAPL', 'GOOG', 'QCOM', 'SAMSUNG.KR', '005930.KR'],
  'iphone': ['AAPL'],
  '5g': ['T', 'VZ', 'TMUS', 'QCOM', 'ERICSSON', 'NOK'],
  'internet': ['CMCSA', 'CHTR', 'T', 'VZ', 'TMUS', 'GOOGL', 'META', 'NET'],

  // Real Estate
  'real estate': ['AMT', 'PLD', 'CCI', 'EQIX', 'DLR', 'SPG', 'PSA', 'O', 'WELL', 'AVB', 'EQR', 'VICI'],
  'reit': ['AMT', 'PLD', 'CCI', 'EQIX', 'DLR', 'SPG', 'PSA', 'O', 'WELL', 'AVB', 'EQR', 'VICI'],
  'housing': ['DHI', 'LEN', 'NVR', 'PHM', 'TOL', 'KBH', 'MTH', 'Z', 'RDFN'],
  'home': ['DHI', 'LEN', 'NVR', 'PHM', 'TOL', 'KBH', 'HD', 'LOW', 'Z', 'RDFN'],
  'homebuilder': ['DHI', 'LEN', 'NVR', 'PHM', 'TOL', 'KBH', 'MTH'],
  'mortgage': ['RKT', 'UWMC', 'PFSI', 'COOP'],

  // Construction & Infrastructure
  'construction': ['CAT', 'DE', 'URI', 'VMC', 'MLM', 'SHW', 'JCI'],
  'infrastructure': ['CAT', 'DE', 'URI', 'VMC', 'MLM', 'PWR', 'EME', 'FIX'],

  // Logistics & Shipping
  'shipping': ['FDX', 'UPS', 'XPO', 'ODFL', 'SAIA', 'CHRW', 'JBHT', 'ZIM', 'MAERSK.EU'],
  'delivery': ['FDX', 'UPS', 'AMZN', 'UBER', 'DASH', 'XPO'],
  'logistics': ['FDX', 'UPS', 'XPO', 'ODFL', 'SAIA', 'CHRW', 'JBHT', 'UBER', 'AMZN'],

  // Ride-hailing & Delivery apps
  'ride': ['UBER', 'LYFT'],
  'rideshare': ['UBER', 'LYFT'],
  'taxi': ['UBER', 'LYFT'],
  'food delivery': ['DASH', 'UBER', 'GRAB'],

  // Gambling & Betting
  'gambling': ['DKNG', 'PENN', 'MGM', 'LVS', 'WYNN', 'CZR', 'BYD', 'FLUT'],
  'betting': ['DKNG', 'PENN', 'FLUT', 'MGM'],
  'casino': ['MGM', 'LVS', 'WYNN', 'CZR', 'BYD'],
  'sports betting': ['DKNG', 'PENN', 'FLUT', 'MGM', 'CZR'],

  // Media & Entertainment
  'media': ['DIS', 'NFLX', 'CMCSA', 'WBD', 'PARA', 'FOX', 'FOXA', 'NYT', 'GOOGL', 'META'],
  'movie': ['DIS', 'NFLX', 'WBD', 'PARA', 'AMC', 'IMAX', 'LGF-A'],
  'film': ['DIS', 'NFLX', 'WBD', 'PARA', 'AMC', 'IMAX'],
  'entertainment': ['DIS', 'NFLX', 'LYV', 'CMCSA', 'WBD', 'PARA', 'SPOT', 'RBLX', 'EA', 'TTWO'],
  'theme park': ['DIS', 'CMCSA', 'SIX', 'FUN', 'SEAS'],
  'news': ['NYT', 'FOX', 'FOXA', 'CMCSA', 'NWS', 'NWSA', 'GOOGL'],
  'advertising': ['GOOGL', 'META', 'TTD', 'MGNI', 'DIS', 'CMCSA', 'PARA', 'SNAP', 'PINS', 'RDDT', 'APP'],

  // Consumer Goods
  'cosmetics': ['EL', 'COTY', 'ULTA', 'OR.EU'],
  'beauty': ['EL', 'COTY', 'ULTA', 'OR.EU'],
  'skincare': ['EL', 'COTY', 'OR.EU'],
  'soap': ['PG', 'CL', 'CHD'],
  'cleaning': ['PG', 'CL', 'CHD', 'CLX'],
  'toothpaste': ['PG', 'CL'],
  'diaper': ['PG', 'KMB'],
  'tobacco': ['PM', 'MO', 'BTI', 'BATS.UK', 'IMB.UK'],
  'cigarette': ['PM', 'MO', 'BTI', 'BATS.UK', 'IMB.UK'],
  'weed': ['CGC', 'TLRY', 'ACB', 'CRON'],
  'cannabis': ['CGC', 'TLRY', 'ACB', 'CRON'],
  'marijuana': ['CGC', 'TLRY', 'ACB', 'CRON'],
  'pet': ['CHWY', 'IDXX', 'ZTS', 'WOOF'],

  // Tech Giants
  'big tech': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'],
  'mag 7': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'],
  'magnificent 7': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'],
  'faang': ['META', 'AAPL', 'AMZN', 'NFLX', 'GOOGL'],
  'search engine': ['GOOGL', 'GOOG', 'MSFT', 'BIDU'],
  'search': ['GOOGL', 'GOOG', 'MSFT', 'BIDU'],
  'advertising tech': ['GOOGL', 'META', 'TTD', 'MGNI', 'APP'],
  'robot': ['ISRG', 'IRBT', 'TER', 'FANUY', 'ABB.EU'],
  'robotics': ['ISRG', 'IRBT', 'TER', 'FANUY', 'ABB.EU', 'NVDA', 'TSLA'],
  'quantum': ['GOOG', 'GOOGL', 'IBM', 'IONQ', 'QBTS', 'RGTI'],
  'quantum computing': ['GOOG', 'GOOGL', 'IBM', 'IONQ', 'QBTS', 'RGTI'],
  'autonomous': ['TSLA', 'GOOGL', 'GM', 'UBER', 'MBLY', 'LAZR', 'INVZ'],
  'self driving': ['TSLA', 'GOOGL', 'GM', 'UBER', 'MBLY', 'LAZR'],
  'driverless': ['TSLA', 'GOOGL', 'GM', 'UBER', 'MBLY'],

  // Metals & Commodities
  'gold': ['NEM', 'GOLD', 'GFI', 'AEM', 'WPM', 'FNV', 'RGLD'],
  'silver': ['WPM', 'PAAS', 'AG', 'SLV', 'HL'],
  'copper': ['FCX', 'SCCO', 'TECK', 'RIO', 'BHP'],
  'lithium': ['ALB', 'SQM', 'LTHM', 'LAC', 'PLL'],
  'steel': ['NUE', 'STLD', 'X', 'CLF', 'MT'],
  'metal': ['NEM', 'GOLD', 'FCX', 'BHP', 'RIO', 'NUE', 'STLD', 'SCCO', 'RIO.UK', 'AAL.UK', 'GLEN.UK'],
  'commodity': ['XOM', 'CVX', 'NEM', 'GOLD', 'FCX', 'BHP', 'RIO', 'NUE', 'ADM', 'BG'],

  // Agriculture
  'agriculture': ['DE', 'AGCO', 'ADM', 'BG', 'CF', 'MOS', 'NTR', 'FMC', 'CTVA'],
  'farm': ['DE', 'AGCO', 'ADM', 'BG', 'CF', 'MOS', 'NTR', 'CTVA'],
  'fertilizer': ['CF', 'MOS', 'NTR', 'FMC'],

  // Consulting & Professional Services
  'consulting': ['ACN', 'IBM', 'INFY', 'WIT', 'CTSH'],
  'outsourcing': ['ACN', 'INFY', 'WIT', 'CTSH', 'GPN'],

  // Education
  'education': ['DUOL', 'CHGG', 'LRN', 'STRA', 'LOPE'],
  'learning': ['DUOL', 'CHGG', 'LRN', 'COUR'],

  // Fitness
  'fitness': ['PTON', 'NKE', 'LULU', 'UAA'],
  'gym': ['PTON', 'NKE', 'LULU', 'PLNT'],
  'workout': ['PTON', 'NKE', 'LULU'],

  // Meme / Popular culture stocks
  'meme': ['GME', 'AMC', 'BBBY', 'BB', 'PLTR', 'SOFI', 'RIVN', 'LCID', 'HOOD'],
  'reddit': ['RDDT', 'GME', 'AMC'],
  'wallstreetbets': ['GME', 'AMC', 'PLTR', 'SOFI', 'HOOD'],

  // Dividend
  'dividend': ['JNJ', 'PG', 'KO', 'PEP', 'MCD', 'T', 'VZ', 'XOM', 'CVX', 'ABBV', 'O', 'SCHD', 'PM', 'MO'],

  // Chinese tech
  'chinese tech': ['BABA', 'TCEHY', 'PDD', 'JD', 'BIDU', 'NIO', 'LI', 'XPEV', 'BILI', 'ZTO'],
  'china': ['BABA', 'TCEHY', 'PDD', 'JD', 'BIDU', 'NIO', 'LI', 'XPEV', 'BILI', 'ZTO', 'BEKE', 'TAL', 'FUTU'],
  'japanese': ['7203.JP', '6758.JP', '9984.JP', 'SFTBMB.JP', 'NTDOY', 'SONY', 'TM', 'HMC', 'MUFG'],
  'india': ['INFY', 'WIT', 'IBN', 'HDB', 'TTM', 'SIFY', 'RELI.IN'],
  'indian': ['INFY', 'WIT', 'IBN', 'HDB', 'TTM', 'RELI.IN'],
  'korean': ['SAMSUNG.KR', '005930.KR', '000660.KR', 'LG.KR'],
  'british': ['HSBA.UK', 'ULVR.UK', 'BP.UK', 'GSK.UK', 'AZN.UK', 'SHEL', 'RIO.UK', 'BATS.UK', 'VOD.UK', 'BT.UK', 'BARC.UK', 'LLOY.UK', 'BAE.UK', 'BRBY.UK'],

  // GLP-1 / Obesity / Weight loss (hot sector)
  'glp': ['LLY', 'NVO', 'AMGN', 'VKTX', 'PFE'],
  'glp-1': ['LLY', 'NVO', 'AMGN', 'VKTX'],
  'obesity': ['LLY', 'NVO', 'AMGN', 'VKTX'],
  'wegovy': ['NVO'],
  'mounjaro': ['LLY'],
  'tirzepatide': ['LLY'],
  'semaglutide': ['NVO'],
  'diabetes': ['NVO', 'LLY', 'DXCM', 'ABT', 'PODD', 'TNDM'],

  // eVTOL / Flying cars / Air taxi
  'evtol': ['JOBY', 'ACHR', 'LILM', 'BA'],
  'flying car': ['JOBY', 'ACHR', 'LILM'],
  'air taxi': ['JOBY', 'ACHR', 'LILM'],

  // Semiconductor Equipment
  'semiconductor equipment': ['LRCX', 'KLAC', 'AMAT', 'ASML', 'ONTO', 'TER', 'ENTG', 'COHR'],
  'chip equipment': ['LRCX', 'KLAC', 'AMAT', 'ASML'],
  'wafer': ['LRCX', 'KLAC', 'AMAT', 'ASML', 'TSM'],
  'fab': ['TSM', 'INTC', 'LRCX', 'AMAT', 'ASML', 'GFS'],
  'foundry': ['TSM', 'INTC', 'GFS', 'UMC'],

  // Storage / Memory / Hard drives
  'memory': ['MU', 'WDC', 'STX'],
  'storage': ['MU', 'WDC', 'STX', 'NTAP', 'PSTG', 'DELL'],
  'hard drive': ['WDC', 'STX'],
  'ssd': ['WDC', 'MU', 'STX'],
  'flash': ['MU', 'WDC'],
  'dram': ['MU', 'SAMSUNG.KR'],
  'nand': ['MU', 'WDC'],

  // Networking / Enterprise IT
  'networking': ['CSCO', 'ANET', 'JNPR', 'HPE', 'CIEN', 'FFIV'],
  'switch': ['CSCO', 'ANET', 'JNPR'],
  'router': ['CSCO', 'JNPR'],
  'wifi': ['CSCO', 'UBNT'],
  'server': ['DELL', 'HPE', 'SMCI', 'NVDA'],

  // Industrial / Conglomerates
  'industrial': ['HON', 'GE', 'MMM', 'EMR', 'ETN', 'ROK', 'ITW', 'DOV', 'PH', 'IR'],
  'conglomerate': ['HON', 'GE', 'MMM', 'BRK-B', 'JNJ'],
  'automation': ['ROK', 'EMR', 'ABB.EU', 'HON', 'FANUY', 'TER'],
  'manufacturing': ['HON', 'GE', 'MMM', 'CAT', 'DE', 'EMR', 'ITW'],

  // BNPL / Buy Now Pay Later
  'bnpl': ['AFRM', 'SQ', 'PYPL'],
  'buy now pay later': ['AFRM', 'SQ', 'PYPL'],
  'lending': ['AFRM', 'UPST', 'SOFI', 'RKT', 'LC'],
  'loan': ['SOFI', 'UPST', 'RKT', 'LC', 'SLM'],

  // Hydrogen / Fuel Cell / Clean tech
  'hydrogen': ['PLUG', 'BE', 'FCEL', 'APD', 'LIN'],
  'fuel cell': ['PLUG', 'BE', 'FCEL'],

  // Rare Earth / Critical Minerals
  'rare earth': ['MP', 'UUUU'],
  'critical minerals': ['MP', 'ALB', 'LAC', 'UUUU'],

  // Data / Analytics / AI Infrastructure
  'data analytics': ['PLTR', 'SNOW', 'DDOG', 'ESTC', 'MDB', 'CFLT', 'SPLK'],
  'analytics': ['PLTR', 'SNOW', 'DDOG', 'CRWD', 'MSCI', 'VRSK'],
  'database': ['MDB', 'ORCL', 'SNOW', 'ESTC'],
  'big data': ['PLTR', 'SNOW', 'DDOG', 'MDB', 'ESTC'],
  'observability': ['DDOG', 'DT', 'ESTC', 'SPLK', 'NET'],

  // Utilities / Power
  'utility': ['NEE', 'SO', 'DUK', 'AEP', 'SRE', 'D', 'EXC', 'ED', 'XEL', 'WEC', 'CEG', 'VST'],
  'power': ['NEE', 'SO', 'DUK', 'CEG', 'VST', 'GEV', 'GE'],
  'grid': ['NEE', 'GE', 'GEV', 'ETN', 'PWR', 'EME'],
  'electricity': ['NEE', 'SO', 'DUK', 'CEG', 'VST', 'AEP'],

  // Private Equity / Alternative Assets
  'private equity': ['BX', 'KKR', 'APO', 'ARES', 'CG', 'TPG', 'OWL'],
  'hedge fund': ['BX', 'KKR', 'APO', 'ARES'],
  'alternative': ['BX', 'KKR', 'APO', 'ARES', 'CG', 'TPG'],

  // Psychedelics / Mental Health
  'psychedelic': ['ATAI', 'CMPS', 'MNMD'],
  'mental health': ['ATAI', 'CMPS', 'TDOC', 'HIMS'],
  'telehealth': ['TDOC', 'HIMS', 'AMWL'],

  // Smart Home / IoT / Connected Devices
  'smart home': ['AMZN', 'GOOGL', 'AAPL'],
  'iot': ['CSCO', 'HON', 'KEYS', 'TER'],

  // 3D Printing
  '3d printing': ['DDD', 'XONE'],
  'additive': ['DDD', 'XONE'],

  // Climate / ESG / Carbon
  'climate': ['ENPH', 'SEDG', 'FSLR', 'NEE', 'PLUG', 'TSLA', 'BE'],
  'esg': ['NEE', 'ENPH', 'TSLA', 'FSLR'],
  'carbon': ['KRBN'],
  'green energy': ['ENPH', 'SEDG', 'FSLR', 'NEE', 'RUN', 'PLUG', 'BE'],

  // Apparel / Athleisure (expanding existing)
  'athleisure': ['LULU', 'NKE', 'UAA', 'ONON', 'DECK'],
  'activewear': ['LULU', 'NKE', 'UAA', 'ONON'],

  // Aging Population / Senior Living
  'aging': ['WELL', 'UNH', 'ABT', 'MDT', 'SYK'],
  'senior': ['WELL', 'UNH', 'HCA'],

  // Autonomous / Self-driving (expanding)
  'lidar': ['LAZR', 'INVZ', 'OUST', 'AEVA'],
  'adas': ['MBLY', 'LAZR', 'QCOM', 'NVDA'],

  // Cybersecurity (expanding with more keywords)
  'hacking': ['CRWD', 'PANW', 'ZS', 'FTNT', 'S'],
  'firewall': ['PANW', 'FTNT', 'ZS'],
  'antivirus': ['CRWD', 'S', 'GEN'],
  'identity': ['OKTA', 'CYBR', 'PING'],

  // Streaming / Content (expanding)
  'podcast': ['SPOT', 'AAPL', 'AMZN', 'SiriusXM'],
  'anime': ['SONY', 'CRNC', 'BILI'],

  // Fintech / Neobank
  'neobank': ['SOFI', 'NU', 'HOOD'],
  'brokerage': ['SCHW', 'HOOD', 'IBKR', 'FUTU'],
  'trading': ['HOOD', 'IBKR', 'SCHW', 'CME', 'ICE', 'COIN'],
  'exchange': ['CME', 'ICE', 'NDAQ', 'CBOE', 'COIN'],
  'stock exchange': ['CME', 'ICE', 'NDAQ', 'CBOE'],

  // Defense Tech / GovTech
  'govtech': ['PLTR', 'BAH', 'SAIC', 'LDOS', 'CACI'],
  'intelligence': ['PLTR', 'BAH', 'LDOS', 'CACI'],
  'spy': ['PLTR', 'BAH', 'LDOS', 'LMT', 'NOC'],

  // Biotech / Gene Therapy / CRISPR
  'crispr': ['CRSP', 'EDIT', 'NTLA', 'BEAM'],
  'gene therapy': ['CRSP', 'EDIT', 'NTLA', 'BEAM', 'ALNY'],
  'gene editing': ['CRSP', 'EDIT', 'NTLA', 'BEAM'],
  'cancer': ['MRNA', 'REGN', 'BMY', 'MRK', 'GILD', 'EXAS'],
  'oncology': ['MRK', 'BMY', 'REGN', 'MRNA', 'GILD'],

  // Payments / Digital Wallet
  'digital wallet': ['SQ', 'PYPL', 'AAPL', 'GOOGL'],
  'mobile payment': ['SQ', 'PYPL', 'V', 'MA'],
  'contactless': ['V', 'MA', 'SQ', 'PYPL'],

  // Staffing / HR / Workforce
  'staffing': ['RHI', 'MAN', 'HEIDRICK', 'KELYA'],
  'hr': ['WDAY', 'PAYC', 'PAYX', 'ADP'],
  'payroll': ['ADP', 'PAYX', 'PAYC'],

  // Subscription Economy
  'saas subscription': ['CRM', 'NOW', 'ADBE', 'INTU', 'WDAY', 'HUBS', 'ZS'],

  // Testing / Quality
  'testing': ['A', 'TMO', 'DHR', 'KEYS'],
  'lab': ['A', 'TMO', 'DHR', 'ILMN', 'BIO'],
  'diagnostics': ['A', 'TMO', 'DHR', 'EXAS', 'DXCM', 'HOLX'],

  // Misc
  'subscription': ['NFLX', 'SPOT', 'AAPL', 'MSFT', 'AMZN', 'DIS', 'CRM', 'ADBE'],
  'marketplace': ['AMZN', 'EBAY', 'ETSY', 'SHOP', 'ABNB', 'BKNG', 'UBER', 'DASH'],
  'electric': ['TSLA', 'RIVN', 'LCID', 'NIO', 'ENPH', 'NEE', 'SO', 'DUK'],
  'battery': ['TSLA', 'QS', 'ALB', 'ENVX', 'PCRFY'],
  'vr': ['META', 'AAPL', 'MSFT', 'SONY', 'RBLX', 'U'],
  'metaverse': ['META', 'RBLX', 'U', 'MSFT', 'NVDA'],
  'wearable': ['AAPL', 'GOOG', 'GRMN'],
  'watch': ['AAPL', 'GRMN'],
  'headphone': ['AAPL', 'SONY', 'HEAR'],
  'laptop': ['AAPL', 'DELL', 'HPQ', 'LNVGY'],
  'computer': ['AAPL', 'DELL', 'HPQ', 'MSFT', 'LNVGY'],
  'printer': ['HPQ', 'RICOY', 'XRX'],
  'container': ['AMZN', 'MSFT', 'GOOGL', 'DKNG'],
  'dating': ['MTCH', 'BMBL'],
  'ride hailing': ['UBER', 'LYFT', 'GRAB'],
  'electric utility': ['NEE', 'SO', 'DUK', 'AEP', 'SRE', 'D', 'EXC', 'ED', 'XEL', 'WEC'],
  'water': ['AWK', 'WTR', 'XYL', 'ECL'],
  'waste': ['WM', 'RSG', 'WCN', 'CLH', 'SRCL'],
  'railroad': ['UNP', 'CSX', 'NSC', 'CP', 'CNI'],
  'train': ['UNP', 'CSX', 'NSC', 'CP', 'CNI', 'WAB'],
}

/**
 * Given a search query, returns a set of tickers that match any keyword tags.
 * Supports multi-word queries by checking if the full query matches,
 * then individual words.
 */
export function getTaggedTickers(query: string): Set<string> {
  const q = query.trim().toLowerCase()
  if (!q) return new Set()

  const matches = new Set<string>()

  // 1. Check exact full-phrase match first (e.g. "ai chip", "fast food")
  if (TAG_MAP[q]) {
    TAG_MAP[q].forEach(t => matches.add(t))
  }

  // 2. Check each word individually
  const words = q.split(/\s+/)
  for (const word of words) {
    if (TAG_MAP[word]) {
      TAG_MAP[word].forEach(t => matches.add(t))
    }
  }

  // 3. Check if query matches the START of any tag (prefix match)
  //    e.g. "restaur" matches "restaurant", "semi" matches "semiconductor"
  //    But NOT substring: "car" should NOT match "credit card"
  for (const [tag, tickers] of Object.entries(TAG_MAP)) {
    const tagWords = tag.split(/\s+/)
    // Query is a prefix of the tag or any tag word
    if (tag.startsWith(q) || tagWords.some(tw => tw.startsWith(q))) {
      tickers.forEach(t => matches.add(t))
    }
    // Any query word is an exact match for a tag word (but not prefix/substring)
    // This avoids "card" pulling in "car" results
  }

  return matches
}

/**
 * Given a stock symbol, returns similar tickers ranked by tag overlap.
 * Stocks that share more tags with the input are more "similar".
 */
export function getSimilarTickers(symbol: string, limit = 10): string[] {
  const sym = symbol.toUpperCase()

  // Build reverse index: which tags does this symbol appear in?
  const myTags: string[] = []
  for (const [tag, tickers] of Object.entries(TAG_MAP)) {
    if (tickers.includes(sym)) {
      myTags.push(tag)
    }
  }

  if (myTags.length === 0) return []

  // Score every other ticker by how many tags they share
  const scores = new Map<string, number>()
  for (const tag of myTags) {
    for (const ticker of TAG_MAP[tag]) {
      if (ticker === sym) continue
      scores.set(ticker, (scores.get(ticker) || 0) + 1)
    }
  }

  // Sort by overlap score descending, then alphabetically
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([ticker]) => ticker)
}
