# Spreads Premium — Product Plan

## Vision
The Bloomberg Terminal for retail investors. Clean, fast, opinionated.
Worth $20/month because it surfaces insights that take hours to find elsewhere — in seconds.

---

## What Competitors Get Wrong

**Qualtrim / Fiscal AI / Finviz / Simply Wall St:**
- Overwhelming UIs with 50+ tabs
- Same data everyone has (Yahoo Finance repackaged)
- No real-time actionable signals
- No social/alternative data
- Desktop-only design, mobile is an afterthought
- No personality — feels like a spreadsheet

**Spreads Advantage:**
- Beautiful, mobile-first, opinionated design
- Novel data sources (insider trades, congress trades, dark pool, social sentiment)
- AI-powered insights (not just data display)
- Curated signals > raw data dumps
- Ondo Global Markets integration (tokenized stocks angle)

---

## Feature Roadmap

### Phase 1: Core Premium Features (THIS SPRINT)

#### 1. Market Dashboard (Homepage Upgrade)
- **Market Pulse bar** — S&P 500, Nasdaq, Dow, VIX, 10Y yield, BTC, Gold as a live ticker strip
- **Top Movers** — Biggest gainers/losers today (top 5 each)
- **Sector Heatmap** — Visual treemap of sector performance
- Current logo grid stays but becomes the "Browse" section below

#### 2. Stock Screener
- Filter by: Market Cap, P/E, Dividend Yield, Revenue Growth, Sector, Country
- Preset screens: "Undervalued Large Caps", "High Dividend Growers", "AI Plays", "Cash Rich"
- Sort by any metric
- Save custom screens (logged-in users)

#### 3. Insider Trading Tracker
- **Source:** SEC EDGAR Form 4 filings (free, public)
- Show: Who bought/sold, how many shares, at what price, when
- Cluster buys (multiple insiders buying = strong signal)
- Dashboard: "Latest Insider Buys" feed
- Per-stock: Insider activity timeline on stock detail page

#### 4. Congress Trading Tracker
- **Source:** House/Senate financial disclosures (public data)
- Show: Which politicians bought/sold which stocks
- Notable because politicians often trade ahead of legislation
- Feed: "Latest Congress Trades"

#### 5. Watchlist & Alerts
- Save stocks to watchlist (Supabase, per user)
- Watchlist view on dashboard with live prices
- Price alerts: "Alert me when NVDA drops below $100"
- Email digest: Daily summary of watchlist movers

#### 6. AI Stock Brief
- One-click AI summary for any stock
- Covers: What the company does, recent catalysts, bull/bear case, key metrics
- Generated on-demand using Claude API
- Cached for 24 hours per stock

### Phase 2: Advanced Analytics

#### 7. Comparison Tool
- Side-by-side compare 2-4 stocks
- Metrics table: P/E, revenue growth, margins, debt, dividends
- Overlay charts: Price performance, revenue, EPS

#### 8. DCF Valuation Calculator
- Input assumptions: Growth rate, discount rate, terminal multiple
- Auto-populated with company's actual financials
- Shows intrinsic value vs current price
- "Margin of safety" indicator

#### 9. Earnings Intelligence
- Earnings calendar with countdown timers
- Historical earnings surprises (beat/miss streak)
- Post-earnings price moves (how stock reacted last 8 quarters)
- AI earnings call summary (key quotes, guidance changes)

#### 10. Dividend Dashboard
- Dividend calendar (ex-dates, pay dates)
- Dividend safety score (payout ratio, FCF coverage, debt levels)
- DRIP calculator
- Dividend growth rate tracking (1Y, 3Y, 5Y, 10Y)
- Yield on cost calculator

### Phase 3: Alternative Data

#### 11. Dark Pool & Institutional Flow
- **Source:** FINRA ADF data (free, delayed)
- Large block trades
- Institutional accumulation/distribution signals
- "Smart money" indicator

#### 12. Social Sentiment Aggregator
- Reddit (already have), Twitter/X, StockTwits
- Sentiment score 0-100
- Mention velocity (acceleration = potential catalyst)
- Word cloud of discussion themes

#### 13. Economic Calendar
- FOMC meetings, CPI, Jobs, GDP releases
- Impact ratings (high/medium/low)
- Historical market reaction to each event type

#### 14. Short Interest Tracker
- Current short interest % of float
- Days to cover
- Short squeeze score
- Historical short interest chart

### Phase 4: Portfolio Intelligence

#### 15. Smart Portfolio Analytics
- Sector allocation pie chart
- Geographic diversification
- Correlation matrix (how diversified are you really?)
- Risk metrics: Beta, Sharpe ratio, max drawdown
- "Portfolio X-Ray": Overlap detection if holding similar stocks

#### 16. Performance Attribution
- What drove your returns this month?
- Best/worst performers
- Benchmark comparison (vs S&P 500)
- Tax lot tracking for tax-loss harvesting

---

## Novel Data Sources (Free/Public)

| Source | Data | Update Frequency |
|--------|------|-----------------|
| SEC EDGAR | Insider trades (Form 4), 13F holdings | Daily |
| House/Senate Disclosures | Congress member trades | Weekly |
| FINRA | Short interest, dark pool volume | Bi-weekly |
| Reddit API | Sentiment, mentions, trending | Real-time |
| Yahoo Finance v8 | Prices, fundamentals | Daily |
| TradingView | Charts (embedded widget) | Real-time |
| FRED (Federal Reserve) | Economic indicators | Monthly |
| SEC EDGAR | Earnings transcripts | Quarterly |

---

## Implementation Plan — Phase 1

### Priority Order (what to build first):

#### Step 1: Fix Price Infrastructure
- Switch from filesystem cache to serving prices.json from public/data (committed to git)
- Run local refresh script, commit prices.json before each deploy
- Daily Vercel cron as backup

#### Step 2: Market Pulse Bar + Top Movers
- Add horizontal ticker strip to homepage header
- Show S&P 500, Nasdaq, Dow, VIX changes
- Top 5 gainers/losers cards below header
- Uses existing price data, no new API needed

#### Step 3: Stock Screener Page
- New page: /screener
- Filter UI: Market cap range, P/E range, dividend yield, sector, country
- Preset filters as quick-select chips
- Results as sortable table with key metrics
- Uses existing /api/stocks data

#### Step 4: Insider Trading
- New API: /api/insider-trades/[symbol]
- Fetch from SEC EDGAR RSS feed (free, no API key)
- Parse Form 4 XML filings
- Display on stock detail page + dedicated /insiders feed page
- Cache in Vercel KV (24h TTL)

#### Step 5: Watchlist
- Supabase table: watchlist (user_id, symbol, added_at)
- API: /api/watchlist (GET, POST, DELETE)
- Heart/star icon on each stock in grid + detail page
- Dedicated watchlist view on dashboard
- Requires auth

#### Step 6: AI Stock Brief
- API: /api/ai-brief/[symbol]
- Gathers: price, fundamentals, recent insider trades, Reddit sentiment
- Sends to Claude API for natural language summary
- Cached 24h in Vercel KV
- Button on stock detail page: "AI Brief"

---

## Tech Architecture

```
Frontend (Next.js 16)
├── / (Dashboard - logo grid + market pulse + top movers)
├── /screener (Stock screener with filters)
├── /insiders (Insider trading feed)
├── /stock/[symbol] (Detail + AI brief + insider activity)
├── /watchlist (User's saved stocks)
└── /compare (Side-by-side comparison)

Backend (Next.js API Routes)
├── /api/stocks (prices from committed JSON)
├── /api/screener (filtered + sorted query)
├── /api/insider-trades/[symbol] (SEC EDGAR)
├── /api/watchlist (CRUD, Supabase)
├── /api/ai-brief/[symbol] (Claude API)
└── /api/cron/* (daily data refresh)

Data Layer
├── Supabase (users, watchlist, portfolio)
├── Vercel KV (cache: insider trades, AI briefs, prices)
├── public/data/ (committed JSON: stocks, fundamentals, prices)
└── External APIs (Yahoo, SEC EDGAR, Reddit)
```

---

## Design Principles

1. **Data density without clutter** — Show more info, but with hierarchy and whitespace
2. **Signals over data** — Highlight what matters (insider cluster buy > raw filing)
3. **Mobile-first** — Every feature must work beautifully on phone
4. **Speed** — <1s load times, skeleton loading, optimistic updates
5. **Personality** — Spreads brand voice, opinionated takes, not sterile data
