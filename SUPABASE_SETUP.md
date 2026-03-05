# 🚀 Supabase Setup Guide

This guide will help you set up your own PostgreSQL database to store stock data locally, eliminating dependency on external APIs.

## Why Supabase?

- ✅ **Free Tier**: 500MB database storage (enough for years of stock data)
- ✅ **PostgreSQL**: Powerful SQL queries and indexes
- ✅ **Real-time**: Live data subscriptions (future feature)
- ✅ **Auto-generated APIs**: REST and GraphQL endpoints
- ✅ **Dashboard**: Easy data management and SQL editor

---

## 📝 Step-by-Step Setup (10 minutes)

### Step 1: Create Supabase Account

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "Start your project"
3. Sign up with GitHub or email
4. Create a new project:
   - **Name**: `spreads-stock-analysis` (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you (e.g., `us-east-1`)
   - **Pricing Plan**: Free (no credit card required)
5. Click "Create new project"
6. Wait 2-3 minutes for database to initialize

### Step 2: Copy Connection Details

Once your project is ready:

1. Go to **Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. Copy these two values:

   **Project URL** (looks like):
   ```
   https://abcdefghijklmnop.supabase.co
   ```

   **Project API Key** - Use the `anon` `public` key (looks like):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMjczODQwMCwiZXhwIjoxOTQ4MzE0NDAwfQ.EXAMPLE_KEY
   ```

### Step 3: Add to .env.local

Add these environment variables to your `.env.local` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.EXAMPLE_KEY
```

### Step 4: Create Database Tables

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy the entire contents of `/lib/db/schema.sql` from your project
4. Paste it into the SQL editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see: ✅ Success. No rows returned

### Step 5: Verify Tables Created

1. Go to **Table Editor** (left sidebar)
2. You should see 4 new tables:
   - `stocks` - Stock metadata (symbol, name, sector, etc.)
   - `stock_prices` - Historical daily prices
   - `stock_fundamentals` - Fundamental data (P/E, EPS, etc.)
   - `stock_quotes` - Latest real-time quotes

---

## 🧪 Test Your Setup

### Test 1: Check Database Connection

```bash
npm run dev
```

Then visit:
```
http://localhost:3000/api/v2/stocks
```

You should see:
```json
{
  "error": "No data available",
  "message": "Run data ingestion first: POST /api/ingest/stocks"
}
```

✅ This means database is connected! (just no data yet)

❌ If you see "Database not configured", check your `.env.local` file

### Test 2: Ingest Stock Data

Run the data ingestion to populate your database:

```bash
curl -X POST http://localhost:3000/api/ingest/stocks \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dataset": "sp500"}'
```

Replace `YOUR_CRON_SECRET` with the value from `.env.local`

This will:
- Fetch all 500 S&P 500 stocks from Finnhub
- Store them in YOUR database
- Take ~25 minutes (respects 60 calls/min rate limit)

### Test 3: Query Your Data

After ingestion completes, query YOUR database:

```bash
curl http://localhost:3000/api/v2/stocks
```

You should see 500 stocks returned from YOUR database! 🎉

Response time should be <50ms (much faster than external APIs)

---

## 📊 Database Structure

### Table: `stocks` (Metadata)
Stores basic information about each stock:
- `symbol`: Stock ticker (AAPL, MSFT, etc.)
- `name`: Company name
- `sector`: Business sector
- `industry`: Specific industry
- `dataset`: Which dataset it belongs to (sp500, nasdaq100, international)

### Table: `stock_quotes` (Latest Prices)
Stores the most recent price for each stock:
- `price`: Current price
- `change`: Dollar change
- `change_percent`: Percentage change
- `volume`: Today's volume
- `avg_volume`: 20-day average volume
- `timestamp`: When this quote was fetched

### Table: `stock_prices` (Historical)
Stores daily OHLCV data:
- `date`: Trading date
- `open`, `high`, `low`, `close`: OHLC prices
- `volume`: Trading volume

### Table: `stock_fundamentals` (Fundamentals)
Stores company fundamentals:
- `pe_ratio`: Price-to-Earnings ratio
- `eps`: Earnings per share
- `dividend_yield`: Dividend yield percentage
- `market_cap`: Market capitalization

---

## 🔄 Data Flow

### Before (External API Dependency)
```
User Request → Your API → Finnhub API → Response
                             ↑
                   (rate limited, slow, costs money)
```

### After (Your Own Database)
```
Background Job (once/day)
   ↓
Finnhub API → Your Database
                    ↓
User Request → Your API → Your Database → Response
                             ↑
                   (unlimited, fast, FREE!)
```

---

## ⚡ API Endpoints

### External API Endpoints (Current)
These fetch from Finnhub/external APIs every time:
- `GET /api/stocks` - S&P 500 (external)
- `GET /api/nasdaq100` - NASDAQ-100 (external)
- `GET /api/international` - International (external)

### Your Own API Endpoints (New!)
These serve from YOUR database (much faster, unlimited):
- `GET /api/v2/stocks` - S&P 500 (from YOUR DB)
- `GET /api/v2/nasdaq100` - NASDAQ-100 (from YOUR DB)
- `GET /api/v2/international` - International (from YOUR DB)

### Data Ingestion Endpoint
Fetches from external APIs and stores in YOUR database:
- `POST /api/ingest/stocks` - Ingest all datasets (requires CRON_SECRET)

Query parameters:
```bash
# Ingest specific dataset
curl -X POST "http://localhost:3000/api/ingest/stocks" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"dataset": "sp500"}'

# Ingest all datasets (default)
curl -X POST "http://localhost:3000/api/ingest/stocks" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"dataset": "all"}'
```

---

## 💰 Cost Comparison

### Current (External APIs Only)
| Usage | Cost |
|-------|------|
| 60 calls/min | $0 (free tier) |
| 200 calls/min | $59/mo |
| 500 calls/min | $149/mo |

### With Your Own Database
| Component | Cost |
|-----------|------|
| Database (500MB) | $0 (Supabase free tier) |
| API Calls | $0 (unlimited queries to YOUR DB) |
| Hosting | $0 (Vercel free tier) |
| **Total** | **$0/month** 🎉 |

**Once you have 6+ months of data:**
- You barely need external APIs
- Serve everything from your DB
- Only fetch new data once per day (60 API calls vs thousands)

---

## 🚀 What You Can Build Now

With your own database, you can build:

1. **Custom Analytics**
   - Moving averages (SMA, EMA)
   - RSI, MACD, Bollinger Bands
   - Custom technical indicators

2. **Advanced Screeners**
   - Multi-factor filtering
   - Custom combinations
   - Real-time results

3. **Portfolio Tracking**
   - Historical performance
   - Gain/loss tracking
   - Risk analysis

4. **Real-Time Features**
   - WebSocket price feeds
   - Live portfolio updates
   - Price alerts

5. **AI Analysis**
   - Pattern recognition
   - Sentiment analysis
   - Automated recommendations

---

## 🔧 Maintenance

### Daily Data Refresh
Set up a cron job to refresh data daily:

```bash
# In vercel.json
{
  "crons": [
    {
      "path": "/api/ingest/stocks",
      "schedule": "0 20 * * 1-5"
    }
  ]
}
```

This runs at 8pm UTC (4pm EST) on weekdays to update all stock data.

### Monitor Database Size
Free tier: 500MB storage

Check usage in Supabase dashboard:
- Settings → Database → Database Size

**Estimated capacity:**
- 660 stocks metadata: ~200KB
- Daily quotes (660 stocks): ~50KB/day
- Historical prices (660 stocks, 1 year): ~50MB
- **Total for 1 year**: ~70MB (well under 500MB limit!)

---

## 🎉 Next Steps

1. ✅ **Set up Supabase** (you just did this!)
2. **Run data ingestion**: Populate your database
3. **Update frontend**: Point to `/api/v2/*` endpoints
4. **Add historical data**: Backfill past 6-12 months
5. **Build custom features**: Technical indicators, screeners, etc.

See `OWN_API_PLAN.md` for the complete roadmap!

---

## ❓ Troubleshooting

### Error: "Database not configured"
- Check `.env.local` has `SUPABASE_URL` and `SUPABASE_KEY`
- Restart dev server: `npm run dev`

### Error: "relation 'stocks' does not exist"
- Run the SQL schema from `/lib/db/schema.sql` in Supabase SQL Editor

### Error: "No data available"
- Run data ingestion: `POST /api/ingest/stocks`
- Wait for completion (~25 minutes for S&P 500)

### Slow ingestion
- Expected! Respects Finnhub 60 calls/min rate limit
- S&P 500: ~25 minutes
- NASDAQ-100: ~5 minutes
- International: ~4 minutes

---

**You're all set! You now own your stock data infrastructure! 🚀**
