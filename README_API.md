# S&P 500 Stock Price API - Developer Guide

## Overview

The **S&P 500 Stock Price API** is a monetizable API product that allows developers to fetch all 500 S&P 500 stock prices in a single API call, eliminating the need for 500 separate requests to competitor APIs.

### Key Features

- 🚀 **Bulk Endpoint**: Get all 500 S&P 500 stocks in one call
- 💰 **Cost Effective**: 25,000× cheaper than making 500 individual API calls
- ⚡ **Fast**: Sub-second response times with aggressive caching
- 📊 **Rich Data**: 18 fields per stock (price, fundamentals, technicals)
- 🔒 **Secure**: API key authentication with rate limiting
- 📈 **Tiered Plans**: Free, Starter ($19/mo), Pro ($79/mo), Enterprise (custom)

---

## Quick Start

### 1. Get Your API Key

```bash
curl -X POST https://your-domain.com/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "keyType": "live"
  }'
```

Response:
```json
{
  "success": true,
  "apiKey": "sk_live_abc123...",
  "tier": "free"
}
```

### 2. Make Your First Request

```bash
curl https://your-domain.com/api/v1/sp500 \
  -H "Authorization: Bearer sk_live_abc123..."
```

---

## API Endpoints

### 1. Bulk S&P 500 (Core Differentiator)

**GET /api/v1/sp500**

Fetch all 500 S&P 500 stocks with 18 data fields per stock.

**Query Parameters:**
- `fields` (optional): Filter response fields (e.g., `?fields=symbol,price,change`)
- `sectors` (optional): Filter by sector (e.g., `?sectors=Technology,Healthcare`)

**Example Request:**
```bash
curl "https://your-domain.com/api/v1/sp500?fields=symbol,price,change&sectors=Technology" \
  -H "Authorization: Bearer sk_live_abc123..."
```

**Example Response:**
```json
{
  "data": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "price": 178.25,
      "change": 2.15,
      "changesPercentage": 1.22,
      "marketCap": 2800000000000,
      "pe": 29.5,
      "eps": 6.05,
      "dividendYield": 0.52,
      "sector": "Technology",
      "industry": "Consumer Electronics",
      "exchange": "US",
      "volume": 52000000,
      "avgVolume": 48500000,
      "dayHigh": 179.50,
      "dayLow": 176.20,
      "yearHigh": 199.62,
      "yearLow": 124.17,
      "logo": "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png"
    }
    // ... 499 more stocks
  ],
  "meta": {
    "cached": true,
    "cacheAge": 45,
    "source": "live",
    "responseTime": 234,
    "stockCount": 500,
    "rateLimit": {
      "limit": 10,
      "remaining": 9,
      "reset": 1704067260
    }
  }
}
```

---

### 2. Single Stock Quote

**GET /api/v1/quote/{symbol}**

Fetch a single stock's data.

**Example:**
```bash
curl https://your-domain.com/api/v1/quote/AAPL \
  -H "Authorization: Bearer sk_live_abc123..."
```

**Response:**
```json
{
  "data": {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "price": 178.25,
    // ... full stock object
  },
  "meta": {
    "cached": true,
    "cacheAge": 45,
    "source": "live",
    "responseTime": 12
  }
}
```

---

### 3. Batch Quotes

**GET /api/v1/batch?symbols=AAPL,MSFT,GOOGL**

Fetch up to 50 stocks per request.

**Query Parameters:**
- `symbols` (required): Comma-separated list of stock symbols (max 50)

**Example:**
```bash
curl "https://your-domain.com/api/v1/batch?symbols=AAPL,MSFT,GOOGL,AMZN" \
  -H "Authorization: Bearer sk_live_abc123..."
```

**Response:**
```json
{
  "data": [
    { "symbol": "AAPL", "price": 178.25, ... },
    { "symbol": "MSFT", "price": 378.50, ... },
    { "symbol": "GOOGL", "price": 140.25, ... },
    { "symbol": "AMZN", "price": 152.80, ... }
  ],
  "meta": {
    "cached": true,
    "stockCount": 4,
    "requested": 4,
    "responseTime": 18
  }
}
```

---

### 4. Sector Performance

**GET /api/v1/sectors**

Get aggregated sector metrics (avg change, total market cap, top gainers/losers).

**Example:**
```bash
curl https://your-domain.com/api/v1/sectors \
  -H "Authorization: Bearer sk_live_abc123..."
```

**Response:**
```json
{
  "data": [
    {
      "sector": "Technology",
      "stockCount": 75,
      "totalMarketCap": 8500000000000,
      "avgChange": 1.25,
      "avgChangesPercentage": 0.85,
      "topGainers": [
        { "symbol": "NVDA", "changesPercentage": 5.2, ... },
        { "symbol": "AMD", "changesPercentage": 3.8, ... },
        { "symbol": "AVGO", "changesPercentage": 2.9, ... }
      ],
      "topLosers": [
        { "symbol": "INTC", "changesPercentage": -2.1, ... }
      ]
    }
    // ... other sectors
  ],
  "meta": {
    "sectorCount": 11,
    "responseTime": 45
  }
}
```

---

### 5. Usage Stats

**GET /api/v1/usage**

Get usage statistics for your API key.

**Query Parameters:**
- `days` (optional): Number of days to retrieve (default: 30, max: 90)

**Example:**
```bash
curl "https://your-domain.com/api/v1/usage?days=7" \
  -H "Authorization: Bearer sk_live_abc123..."
```

**Response:**
```json
{
  "data": {
    "tier": "free",
    "limits": {
      "requestsPerMinute": 10,
      "requestsPerDay": 100,
      "requestsPerMonth": 3000,
      "cacheTTL": 600
    },
    "usage": {
      "today": {
        "requests": 45,
        "remaining": 55,
        "percentUsed": "45.0"
      },
      "history": {
        "2024-01-15": 45,
        "2024-01-14": 78,
        "2024-01-13": 92
      },
      "period": {
        "days": 7,
        "totalRequests": 425,
        "avgRequestsPerDay": 60.7
      }
    }
  }
}
```

---

## Authentication

All API requests require authentication using an API key in the `Authorization` header:

```
Authorization: Bearer sk_live_abc123...
```

**API Key Formats:**
- Test keys: `sk_test_...` (for development)
- Live keys: `sk_live_...` (for production)

---

## Rate Limits

Rate limits vary by subscription tier:

| Tier | Requests/Min | Requests/Day | Requests/Month | Cache TTL |
|------|--------------|--------------|----------------|-----------|
| **Free** | 10 | 100 | 3,000 | 10 min |
| **Starter** ($19/mo) | 30 | 1,000 | 10,000 | 5 min |
| **Pro** ($79/mo) | 100 | 10,000 | 100,000 | 1 min |
| **Enterprise** (custom) | 500 | 50,000 | 1,000,000 | 15 sec |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1704067260
```

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid or missing API key)
- `404` - Not Found (stock symbol not in S&P 500)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `503` - Service Unavailable

### Error Response Format

```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded your rate limit of 10 requests per minute",
  "limit": 10,
  "remaining": 0,
  "reset": 1704067260
}
```

---

## Code Examples

### JavaScript / Node.js

```javascript
const API_KEY = 'sk_live_abc123...'
const BASE_URL = 'https://your-domain.com/api/v1'

async function getAllStocks() {
  const response = await fetch(`${BASE_URL}/sp500`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  }

  const { data, meta } = await response.json()
  console.log(`Fetched ${meta.stockCount} stocks in ${meta.responseTime}ms`)
  return data
}

getAllStocks()
  .then(stocks => console.log(stocks))
  .catch(err => console.error(err))
```

### Python

```python
import requests

API_KEY = 'sk_live_abc123...'
BASE_URL = 'https://your-domain.com/api/v1'

def get_all_stocks():
    response = requests.get(
        f'{BASE_URL}/sp500',
        headers={'Authorization': f'Bearer {API_KEY}'}
    )

    response.raise_for_status()
    data = response.json()

    print(f"Fetched {data['meta']['stockCount']} stocks in {data['meta']['responseTime']}ms")
    return data['data']

if __name__ == '__main__':
    stocks = get_all_stocks()
    print(stocks)
```

### cURL

```bash
# Get all stocks
curl https://your-domain.com/api/v1/sp500 \
  -H "Authorization: Bearer sk_live_abc123..."

# Get technology stocks only
curl "https://your-domain.com/api/v1/sp500?sectors=Technology" \
  -H "Authorization: Bearer sk_live_abc123..."

# Get specific fields
curl "https://your-domain.com/api/v1/sp500?fields=symbol,price,change,changesPercentage" \
  -H "Authorization: Bearer sk_live_abc123..."
```

---

## Best Practices

### 1. Cache Responses

Respect the cache TTL to minimize API calls:

```javascript
const CACHE_TTL = 600 // 10 minutes for free tier
let cachedData = null
let cacheTimestamp = 0

async function getStocksWithCache() {
  const now = Date.now()

  if (cachedData && (now - cacheTimestamp) < CACHE_TTL * 1000) {
    return cachedData
  }

  const response = await fetch('...')
  cachedData = await response.json()
  cacheTimestamp = now

  return cachedData
}
```

### 2. Handle Rate Limits

Implement exponential backoff for 429 errors:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options)

    if (response.status !== 429) {
      return response
    }

    const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'))
    const waitTime = resetTime - Math.floor(Date.now() / 1000)

    console.log(`Rate limited. Waiting ${waitTime}s...`)
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
  }

  throw new Error('Max retries exceeded')
}
```

### 3. Use Field Filtering

Reduce bandwidth by requesting only needed fields:

```javascript
// Instead of fetching all 18 fields:
const all = await fetch('/api/v1/sp500')

// Fetch only what you need:
const minimal = await fetch('/api/v1/sp500?fields=symbol,price,change')
// This reduces payload size by ~70%
```

---

## Pricing

| Tier | Price | Best For |
|------|-------|----------|
| **Free** | $0 | Testing, personal projects |
| **Starter** | $19/month | Portfolio trackers, hobbyists |
| **Pro** | $79/month | Trading bots, fintech startups |
| **Enterprise** | Custom | Hedge funds, institutional use |

**Annual Discounts:** Save 20% with annual billing

---

## Support

- **Documentation**: [https://your-domain.com/docs](https://your-domain.com/docs)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@your-domain.com
- **Discord**: [Join our community](https://discord.gg/your-invite)

---

## Changelog

### v1.0.0 (2024-01-15)

- ✅ Bulk S&P 500 endpoint
- ✅ Single stock quote endpoint
- ✅ Batch quotes endpoint (up to 50 stocks)
- ✅ Sector performance endpoint
- ✅ Usage tracking endpoint
- ✅ API key authentication
- ✅ Tiered rate limiting
- ✅ Field filtering
- ✅ Sector filtering

---

## License

This API is proprietary. See [Terms of Service](https://your-domain.com/terms) for usage terms.
