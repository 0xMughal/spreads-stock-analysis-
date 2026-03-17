# Spreads Stock App — Full Context Handoff

Use this file to onboard Claude (or yourself) on a new machine. It covers the entire project: stack, structure, features, data flow, env vars, and current status.

---

## What Is This?

A **Bloomberg Terminal for retail investors** — a Next.js web app showing 1,000+ stocks across US, UK, EU, JP, KR, and CN markets. Users browse a logo grid, filter by region/index/sector, view detailed stock pages, compare stocks, screen with custom criteria, track portfolios, and monitor insider trades.

**Live URL:** Deployed on Vercel
**Project path:** `~/Downloads/Claude/Spreads /Product/spreads-stock-analysis/`
*(Note the trailing space in `Spreads /`)*

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | **Next.js 16** (App Router, `use client` pages) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS 3.4** + CSS custom properties (theming) |
| Auth | **NextAuth v5** (beta 30) |
| Database | **Supabase** (Postgres) |
| Cache / KV | **Vercel KV** (Upstash Redis) |
| Charts | **Recharts** |
| Screenshots | **html2canvas** |
| Data APIs | **Finnhub** (primary), **Twelve Data**, **FMP** (legacy) |
| Hosting | **Vercel** (Hobby plan) |

### Key Commands

```bash
npm run dev      # Start dev server (uses --webpack flag)
npm run build    # Production build
npm run lint     # ESLint
```

---

## Project Structure

```
app/
├── page.tsx                    # Home — logo grid + market pulse + top movers (789 lines)
├── layout.tsx                  # Root layout + providers
├── globals.css                 # CSS variables, theming, animations
├── stock/[symbol]/page.tsx     # Stock detail page (1475 lines) — charts, fundamentals, news, insiders
├── screener/page.tsx           # Stock screener with filters (793 lines)
├── compare/page.tsx            # Side-by-side stock comparison (429 lines)
├── insiders/page.tsx           # Insider trading feed (430 lines)
├── watchlist/page.tsx          # User watchlist (406 lines)
├── login/page.tsx              # Auth login page
├── profile/                    # User profile
├── admin/page.tsx              # Admin panel
├── components/
│   ├── StockLogo.tsx           # Logo component with fallback initials + brand colors
│   ├── WatchlistButton.tsx     # Star toggle for watchlist
│   ├── NotificationBell.tsx    # Notification bell component
│   ├── PEHistoricalModal.tsx   # Historical P/E ratio modal
│   └── RedditSentimentCard.tsx # Reddit sentiment analysis card
├── context/
│   └── ThemeContext.tsx         # Dark/light theme provider
├── hooks/                      # Custom React hooks
├── providers/                  # Auth + theme providers
├── api/                        # API routes (see below)
│
lib/
├── types.ts                    # All TypeScript interfaces (Stock, CompanyProfile, KeyMetrics, etc.)
├── utils.ts                    # General utilities
├── yahoo.ts                    # Yahoo Finance helpers
├── api.ts                      # API client helpers
├── portfolio-utils.ts          # Portfolio calculation logic
├── data/
│   ├── stocks-1000.ts          # Full 1000+ stock list
│   ├── sp500-full.ts           # S&P 500 constituents
│   ├── nasdaq100.ts            # NASDAQ 100 tickers
│   ├── international.ts        # International stock data
│   ├── regions.ts              # Region definitions (US, UK, EU, JP, KR, CN)
│   ├── indexes.ts              # Index definitions (S&P 500, NASDAQ, Spreads, etc.)
│   ├── search-tags.ts          # Tag-based search (e.g. "AI" → NVDA, AMD, etc.)
│   ├── brand-colors.ts         # Company brand colors for logo fallbacks
│   ├── company-descriptions.ts # Company description text
│   └── sector-map.ts           # Sector classification mapping
├── db/
│   ├── supabase.ts             # Supabase client init
│   ├── operations.ts           # DB CRUD operations
│   └── schema.sql              # Database schema
├── middleware/
│   ├── auth.ts                 # API key auth middleware
│   └── rateLimit.ts            # Tier-based rate limiting
├── types/
│   └── api.ts                  # API-specific types
└── utils/
    └── crypto.ts               # API key generation (sk_test_/sk_live_ prefixes)

scripts/                        # Python data collection
├── fetch-edgar-data.py
├── fetch-edgar-balance-sheet.py
├── fetch-edgar-all.py
├── export-fundamentals.py
└── update-sectors.py

public/data/                    # Static JSON data files (prices, fundamentals)
```

---

## API Routes

### Public / App Routes
| Route | Purpose |
|-------|---------|
| `GET /api/stocks` | Main stock data endpoint (homepage uses this) |
| `GET /api/news` | Stock news |
| `GET /api/historical-pe` | Historical P/E ratios |
| `GET /api/insider-trades` | Insider trading data |
| `GET /api/reddit-sentiment` | Reddit sentiment scores |
| `GET /api/reddit-trending` | Trending stocks on Reddit |
| `GET /api/dividends` | Dividend data |
| `GET /api/revenue-growth` | Revenue growth metrics |
| `GET /api/compound-calculations` | Compound interest calculator |
| `GET /api/portfolio` | Portfolio management |
| `GET /api/watchlist` | Watchlist CRUD |
| `GET /api/trending` | Trending stocks |
| `GET /api/sp500-pe` | S&P 500 P/E aggregate |
| `GET /api/points` | Gamification points |
| `POST /api/profile` | User profile management |
| `GET /api/international` | International stock data |
| `GET /api/nasdaq100` | NASDAQ 100 data |

### v1 API (Authenticated, rate-limited)
| Route | Purpose |
|-------|---------|
| `POST /api/v1/auth/signup` | Generate API keys |
| `GET /api/v1/sp500` | Bulk S&P 500 data (field/sector filtering) |
| `GET /api/v1/quote/[symbol]` | Single stock quote |
| `GET /api/v1/batch` | Batch quotes (up to 50) |
| `GET /api/v1/sectors` | Sector aggregation |
| `GET /api/v1/usage` | API usage stats |

### Cron Jobs
| Route | Schedule |
|-------|----------|
| `/api/cron/refresh-prices` | Every 5 min (market hours) |
| `/api/cron/refresh-sp500` | S&P 500 refresh |
| `/api/cron/refresh-nasdaq` | NASDAQ 100 refresh |
| `/api/cron/refresh-international` | International stocks refresh |

---

## Key Features

### Homepage (`page.tsx`)
- **Market Pulse** ticker strip — SPY, QQQ, DIA, BTC-USD, GLD with live prices
- **Quick Stats** bar — market open/closed status, stock count, avg daily change
- **Today's Movers** — top 8 gainers and losers with logos
- **Logo Grid** — all stocks as tappable logos with hover effects + watchlist stars
- **Filter Panel** — bottom sheet (mobile) / popover (desktop) with Region, Index, Sector filters
- **Active filter chips** — removable badges in the sticky bottom bar
- **Keyboard shortcuts** — `/` to focus search, `Esc` to clear
- **Priority sorting** — Mag 7 first, then mega-caps, then by market cap

### Stock Detail (`stock/[symbol]/page.tsx`)
- Price chart (Recharts)
- Key metrics (P/E, EPS, market cap, EBITDA, dividend yield)
- Company profile + description
- Historical P/E modal
- Reddit sentiment card
- Insider trading history
- News feed

### Other Pages
- **Screener** — multi-filter stock screener (market cap, P/E, sector, etc.)
- **Compare** — side-by-side stock comparison
- **Insiders** — insider trading feed across all stocks
- **Watchlist** — starred stocks with persistence
- **Portfolio** — holdings tracker with P&L, historical snapshots
- **Admin** — user management panel

---

## Theming

Uses CSS custom properties for dark/light mode. Key variables:
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--border-color`, `--card-bg`, `--card-border`
- `--accent` (defaults to `--spreads-green`)
- `--bg-primary-rgb` (for rgba backdrop blur)

Theme toggle is in the header. State managed via `ThemeContext`.

---

## Data Flow

1. **Cron jobs** run on Vercel, fetching from Finnhub → writing to **Vercel KV** (Redis cache)
2. **`/api/stocks`** reads from KV cache → returns to frontend
3. **Supabase** stores persistent data: user profiles, portfolios, watchlists, historical snapshots
4. **Static JSON** in `public/data/` for fallback/seed data
5. **v1 API** has its own auth (API keys in KV) + tier-based rate limiting

---

## Environment Variables

Copy `.env.example` and fill in values. Required:

```
FINNHUB_API_KEY=         # Primary data source
TWELVE_DATA_API_KEY=     # Secondary data source
KV_REST_API_URL=         # Vercel KV (Upstash Redis)
KV_REST_API_TOKEN=       # Vercel KV auth
CRON_SECRET=             # Secures cron endpoints
AUTH_SECRET=             # NextAuth secret
ADMIN_EMAIL=             # Admin user email
```

Optional (Phase 2):
```
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
FMP_API_KEY=             # Legacy, not currently used
```

**Important:** Your `.env.local` has all these filled in. Copy it to the new machine.

---

## Implementation Status

### Phase 1: Foundation — DONE (100%)
- API key auth system (sk_test_/sk_live_ prefixes)
- Rate limiting (10/30/100/500 req/min by tier)
- All 500 S&P 500 stocks + international
- v1 API endpoints (bulk, single, batch, sectors, usage)
- Background cron refresh
- Usage tracking

### Phase 2: Monetization — NOT STARTED (0%)
- User dashboard
- Stripe integration ($19/$79/custom per month)
- Checkout + webhook flow

### Phase 3: Polish & Launch — NOT STARTED (0%)
- Historical data endpoint
- Interactive API docs
- Beta testing + public launch

---

## Design Principles

- **Mobile-first** — all layouts work on phone, tablet, desktop
- **Logo grid** as primary navigation (not a boring table)
- **Minimal chrome** — sticky header + sticky bottom filter bar, content fills the rest
- **Animations** — `fadeUp` on stock cards, `slideUp` on filter panel, scale on hover
- **Green = Spreads** — accent color is `--spreads-green`, used for active states

---

## Important Conventions

- **Trailing space in path**: The project lives under `Spreads /` (with a space before the slash) — always quote paths
- **CSS variables over Tailwind colors** for theming — most color values use inline `style={{ color: 'var(--text-primary)' }}`
- **No emojis in code** unless user requests
- **Em dashes (—)** only, never hyphens for dashes or tildes for approximation
- All stock data uses the `Stock` interface from `lib/types.ts`
- Logo component (`StockLogo`) handles missing logos with branded initial circles using `brand-colors.ts`
