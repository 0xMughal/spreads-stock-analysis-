-- ===============================================
-- Database Schema for Stock Data Infrastructure
-- ===============================================
-- This schema supports storing all stock data locally
-- to eliminate dependency on external APIs

-- ===============================================
-- 1. STOCKS TABLE (Metadata)
-- ===============================================
CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  sector VARCHAR(100),
  industry VARCHAR(100),
  market_cap BIGINT,
  exchange VARCHAR(50),
  country VARCHAR(50),
  dataset VARCHAR(50) NOT NULL, -- 'sp500', 'nasdaq100', 'international'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- 2. STOCK_PRICES TABLE (Daily Prices)
-- ===============================================
CREATE TABLE IF NOT EXISTS stock_prices (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  open DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  close DECIMAL(10,2),
  volume BIGINT,
  change DECIMAL(10,2),
  change_percent DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(symbol, date)
);

-- ===============================================
-- 3. STOCK_FUNDAMENTALS TABLE (P/E, EPS, etc.)
-- ===============================================
CREATE TABLE IF NOT EXISTS stock_fundamentals (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  pe_ratio DECIMAL(10,2),
  eps DECIMAL(10,4),
  dividend_yield DECIMAL(10,4),
  market_cap BIGINT,
  week_52_high DECIMAL(10,2),
  week_52_low DECIMAL(10,2),
  avg_volume BIGINT,
  beta DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(symbol, date)
);

-- ===============================================
-- 4. STOCK_QUOTES TABLE (Real-time/Latest Quotes)
-- ===============================================
-- This table stores the latest quote for each stock
-- Updated frequently throughout the trading day
CREATE TABLE IF NOT EXISTS stock_quotes (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  change DECIMAL(10,2),
  change_percent DECIMAL(10,4),
  volume BIGINT,
  avg_volume BIGINT,
  day_high DECIMAL(10,2),
  day_low DECIMAL(10,2),
  year_high DECIMAL(10,2),
  year_low DECIMAL(10,2),
  market_cap BIGINT,
  pe_ratio DECIMAL(10,2),
  timestamp TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- INDEXES (for fast queries)
-- ===============================================

-- Stock prices indexes
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol ON stock_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON stock_prices(date);
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_date ON stock_prices(symbol, date DESC);

-- Stock fundamentals indexes
CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_symbol ON stock_fundamentals(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_date ON stock_fundamentals(date);

-- Stock quotes indexes
CREATE INDEX IF NOT EXISTS idx_stock_quotes_symbol ON stock_quotes(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_quotes_updated ON stock_quotes(updated_at);

-- Stocks metadata indexes
CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_stocks_dataset ON stocks(dataset);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);

-- ===============================================
-- FUNCTIONS (for automatic timestamp updates)
-- ===============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===============================================
-- TRIGGERS (auto-update timestamps)
-- ===============================================
CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON stocks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_quotes_updated_at BEFORE UPDATE ON stock_quotes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
