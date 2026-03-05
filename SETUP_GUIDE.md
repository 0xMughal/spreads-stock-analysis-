# Quick Setup Guide - S&P 500 API

## Prerequisites

- Node.js 18+ installed
- Vercel account (free tier works)
- Finnhub API key (free tier works)

---

## Step 1: Install Dependencies

```bash
npm install
```

---

## Step 2: Set Up Vercel KV

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** → **Create Database** → **KV**
3. Name it `sp500-api-cache`
4. Link to your project
5. Environment variables will be auto-populated

---

## Step 3: Configure Environment Variables

Create `.env.local`:

```bash
# Finnhub API (get free key at https://finnhub.io/register)
FINNHUB_API_KEY=your_finnhub_api_key_here

# Vercel KV (auto-populated when you link KV storage)
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_URL=...

# Cron Secret (generate with: openssl rand -base64 32)
CRON_SECRET=your_random_secret_here
```

---

## Step 4: Run Locally

```bash
npm run dev
```

Server will start at `http://localhost:3000`

---

## Step 5: Test API

### Generate API Key

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "keyType": "test"
  }'
```

Save the API key from the response!

### Fetch All Stocks

```bash
curl http://localhost:3000/api/v1/sp500 \
  -H "Authorization: Bearer sk_test_YOUR_KEY_HERE"
```

### Check Usage

```bash
curl http://localhost:3000/api/v1/usage \
  -H "Authorization: Bearer sk_test_YOUR_KEY_HERE"
```

---

## Step 6: Populate Cache (First Time)

The cache starts empty. You need to run the cron job manually once:

```bash
curl http://localhost:3000/api/cron/refresh-stocks-v2 \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

This will take **~25 minutes** to fetch all 500 stocks.

**Note**: Finnhub free tier has 60 calls/min limit. The cron respects this with 1-minute delays between batches.

---

## Step 7: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
# Then deploy to production
vercel --prod
```

### Configure Cron Jobs

Cron jobs are already configured in `vercel.json`:

- **Every 5 min (market hours)**: 9am-4pm EST, Mon-Fri
- **Every 30 min (after hours)**: Outside market hours
- **Every 2 hours (weekends)**: Sat-Sun

Vercel will automatically run these on the production deployment.

---

## Step 8: Verify Deployment

```bash
# Generate production API key
curl -X POST https://your-domain.vercel.app/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "keyType": "live"
  }'

# Test production endpoint
curl https://your-domain.vercel.app/api/v1/sp500 \
  -H "Authorization: Bearer sk_live_YOUR_KEY"
```

---

## Troubleshooting

### Cache is Empty (503 Error)

**Solution**: Run the cron job manually:

```bash
curl https://your-domain.vercel.app/api/cron/refresh-stocks-v2 \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Rate Limit Exceeded (429 Error)

**Solution**: Finnhub free tier is 60 calls/min. Wait 1 minute and try again. The cron job automatically handles this.

### Authentication Failed (401 Error)

**Solution**: Check that:
1. API key is in correct format: `sk_test_xxx` or `sk_live_xxx`
2. Authorization header is set: `Authorization: Bearer sk_test_xxx`
3. KV storage is connected and environment variables are set

### Cron Job Fails

**Solution**:
1. Check Vercel logs: `vercel logs --follow`
2. Verify `CRON_SECRET` is set in environment variables
3. Ensure Finnhub API key is valid

---

## Monitoring

### Check Logs

```bash
# Real-time logs
vercel logs --follow

# Filter by cron
vercel logs --follow | grep CRON
```

### Check Cache Status

```bash
curl https://your-domain.vercel.app/api/v1/sp500 \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  | jq '.meta'
```

Look for:
- `cached: true` - Data is from cache
- `cacheAge: 45` - Cache is 45 seconds old
- `stockCount: 500` - All stocks present

### Check Usage

```bash
curl https://your-domain.vercel.app/api/v1/usage \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  | jq '.data.usage.today'
```

---

## Next Steps

### Phase 2: Monetization

1. **User Dashboard** - `/app/dashboard/page.tsx`
   - Show API keys
   - Display usage stats
   - Upgrade to paid tiers

2. **Stripe Integration**
   - Create Stripe products (Starter $19, Pro $79)
   - Implement checkout flow
   - Set up webhooks for subscription updates

3. **Launch**
   - Beta testing (20-30 users)
   - Product Hunt launch
   - Hacker News Show HN

---

## Support

- **Documentation**: See `README_API.md` for full API reference
- **Implementation Status**: See `IMPLEMENTATION_STATUS.md` for progress
- **GitHub Issues**: Report bugs and request features

---

## Quick Reference

### API Endpoints

- `POST /api/v1/auth/signup` - Generate API key
- `GET /api/v1/sp500` - All 500 stocks
- `GET /api/v1/quote/{symbol}` - Single stock
- `GET /api/v1/batch?symbols=AAPL,MSFT` - Batch quotes
- `GET /api/v1/sectors` - Sector performance
- `GET /api/v1/usage` - Usage stats

### Rate Limits (Free Tier)

- 10 requests/minute
- 100 requests/day
- 3,000 requests/month
- 10-minute cache TTL

### Upgrade Tiers

- **Starter** ($19/mo): 30/min, 10k/month, 5-min cache
- **Pro** ($79/mo): 100/min, 100k/month, 1-min cache
- **Enterprise** (custom): 500/min, 1M/month, 15-sec cache

---

**Happy building! 🚀**
