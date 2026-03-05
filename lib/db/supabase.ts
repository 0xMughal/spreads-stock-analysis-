/**
 * Supabase Client Configuration
 *
 * This file sets up the connection to your Supabase PostgreSQL database.
 * Supabase provides a free tier with 500MB storage, perfect for storing
 * all stock data locally.
 */

import { createClient } from '@supabase/supabase-js'

// Environment variables (to be added to .env.local)
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Supabase credentials not found. Database features will be disabled.')
    console.warn('   Add SUPABASE_URL and SUPABASE_KEY to .env.local')
  }
}

// Create Supabase client (with dummy values if not configured, for build-time)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: false, // We don't need session persistence for API usage
    },
  }
)

// Type definitions for database tables
export interface DbStock {
  id: number
  symbol: string
  name: string
  sector: string | null
  industry: string | null
  market_cap: number | null
  exchange: string | null
  country: string | null
  dataset: 'sp500' | 'nasdaq100' | 'international'
  created_at: string
  updated_at: string
}

export interface DbStockPrice {
  id: number
  symbol: string
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
  change: number | null
  change_percent: number | null
  created_at: string
}

export interface DbStockFundamental {
  id: number
  symbol: string
  date: string
  pe_ratio: number | null
  eps: number | null
  dividend_yield: number | null
  market_cap: number | null
  week_52_high: number | null
  week_52_low: number | null
  avg_volume: number | null
  beta: number | null
  created_at: string
}

export interface DbStockQuote {
  id: number
  symbol: string
  price: number
  change: number | null
  change_percent: number | null
  volume: number | null
  avg_volume: number | null
  day_high: number | null
  day_low: number | null
  year_high: number | null
  year_low: number | null
  market_cap: number | null
  pe_ratio: number | null
  timestamp: string
  updated_at: string
}

// Helper function to check if database is configured
export function isDatabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey)
}

// Helper function to test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return false
  }

  try {
    const { error } = await supabase.from('stocks').select('count').limit(1)
    return !error
  } catch (err) {
    console.error('Database connection test failed:', err)
    return false
  }
}
