/**
 * Database Operations
 *
 * This file contains all database CRUD operations for stocks.
 * These functions allow you to store and retrieve stock data from your own database
 * instead of relying on external APIs.
 */

import { supabase, DbStock, DbStockPrice, DbStockFundamental, DbStockQuote } from './supabase'
import type { Stock } from '@/lib/types'

// ===============================================
// STOCK METADATA OPERATIONS
// ===============================================

/**
 * Upsert stock metadata
 * Creates or updates stock information
 */
export async function upsertStock(stock: {
  symbol: string
  name: string
  sector?: string
  industry?: string
  market_cap?: number
  exchange?: string
  country?: string
  dataset: 'sp500' | 'nasdaq100' | 'international'
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('stocks')
      .upsert(
        {
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector || null,
          industry: stock.industry || null,
          market_cap: stock.market_cap || null,
          exchange: stock.exchange || null,
          country: stock.country || null,
          dataset: stock.dataset,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'symbol' }
      )

    if (error) {
      console.error('Error upserting stock:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error upserting stock:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Bulk upsert stocks
 * Efficiently inserts/updates multiple stocks at once
 */
export async function bulkUpsertStocks(
  stocks: Array<{
    symbol: string
    name: string
    sector?: string
    industry?: string
    market_cap?: number
    exchange?: string
    country?: string
    dataset: 'sp500' | 'nasdaq100' | 'international'
  }>
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const now = new Date().toISOString()
    const stocksData = stocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector || null,
      industry: stock.industry || null,
      market_cap: stock.market_cap || null,
      exchange: stock.exchange || null,
      country: stock.country || null,
      dataset: stock.dataset,
      updated_at: now,
    }))

    const { error, count } = await supabase
      .from('stocks')
      .upsert(stocksData, { onConflict: 'symbol' })

    if (error) {
      console.error('Error bulk upserting stocks:', error)
      return { success: false, error: error.message }
    }

    return { success: true, count: count || stocksData.length }
  } catch (err) {
    console.error('Error bulk upserting stocks:', err)
    return { success: false, error: String(err) }
  }
}

// ===============================================
// STOCK QUOTE OPERATIONS (Latest Prices)
// ===============================================

/**
 * Upsert latest stock quote
 * Stores the most recent price data for a stock
 */
export async function upsertStockQuote(quote: {
  symbol: string
  price: number
  change?: number
  change_percent?: number
  volume?: number
  avg_volume?: number
  day_high?: number
  day_low?: number
  year_high?: number
  year_low?: number
  market_cap?: number
  pe_ratio?: number
  timestamp: Date
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('stock_quotes')
      .upsert(
        {
          symbol: quote.symbol,
          price: quote.price,
          change: quote.change || null,
          change_percent: quote.change_percent || null,
          volume: quote.volume || null,
          avg_volume: quote.avg_volume || null,
          day_high: quote.day_high || null,
          day_low: quote.day_low || null,
          year_high: quote.year_high || null,
          year_low: quote.year_low || null,
          market_cap: quote.market_cap || null,
          pe_ratio: quote.pe_ratio || null,
          timestamp: quote.timestamp.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'symbol' }
      )

    if (error) {
      console.error('Error upserting stock quote:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error upserting stock quote:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Bulk upsert stock quotes
 * Efficiently stores multiple stock quotes at once
 */
export async function bulkUpsertStockQuotes(
  quotes: Array<{
    symbol: string
    price: number
    change?: number
    change_percent?: number
    volume?: number
    avg_volume?: number
    day_high?: number
    day_low?: number
    year_high?: number
    year_low?: number
    market_cap?: number
    pe_ratio?: number
    timestamp: Date
  }>
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const now = new Date().toISOString()
    const quotesData = quotes.map(quote => ({
      symbol: quote.symbol,
      price: quote.price,
      change: quote.change || null,
      change_percent: quote.change_percent || null,
      volume: quote.volume || null,
      avg_volume: quote.avg_volume || null,
      day_high: quote.day_high || null,
      day_low: quote.day_low || null,
      year_high: quote.year_high || null,
      year_low: quote.year_low || null,
      market_cap: quote.market_cap || null,
      pe_ratio: quote.pe_ratio || null,
      timestamp: quote.timestamp.toISOString(),
      updated_at: now,
    }))

    const { error, count } = await supabase
      .from('stock_quotes')
      .upsert(quotesData, { onConflict: 'symbol' })

    if (error) {
      console.error('Error bulk upserting quotes:', error)
      return { success: false, error: error.message }
    }

    return { success: true, count: count || quotesData.length }
  } catch (err) {
    console.error('Error bulk upserting quotes:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Get latest stock quote
 */
export async function getStockQuote(symbol: string): Promise<DbStockQuote | null> {
  try {
    const { data, error } = await supabase
      .from('stock_quotes')
      .select('*')
      .eq('symbol', symbol)
      .single()

    if (error) {
      console.error('Error fetching stock quote:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Error fetching stock quote:', err)
    return null
  }
}

/**
 * Get latest quotes for multiple stocks
 */
export async function getBulkStockQuotes(symbols: string[]): Promise<DbStockQuote[]> {
  try {
    const { data, error } = await supabase
      .from('stock_quotes')
      .select('*')
      .in('symbol', symbols)

    if (error) {
      console.error('Error fetching bulk quotes:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error fetching bulk quotes:', err)
    return []
  }
}

/**
 * Get all stock quotes for a dataset
 */
export async function getDatasetQuotes(dataset: 'sp500' | 'nasdaq100' | 'international'): Promise<DbStockQuote[]> {
  try {
    // First get all symbols for this dataset
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('symbol')
      .eq('dataset', dataset)

    if (stocksError || !stocks) {
      console.error('Error fetching dataset stocks:', stocksError)
      return []
    }

    const symbols = stocks.map(s => s.symbol)

    // Then get quotes for those symbols
    const { data, error } = await supabase
      .from('stock_quotes')
      .select('*')
      .in('symbol', symbols)

    if (error) {
      console.error('Error fetching dataset quotes:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error fetching dataset quotes:', err)
    return []
  }
}

// ===============================================
// STOCK PRICE HISTORY OPERATIONS
// ===============================================

/**
 * Insert daily stock price
 */
export async function insertStockPrice(price: {
  symbol: string
  date: Date
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
  change?: number
  change_percent?: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('stock_prices').insert({
      symbol: price.symbol,
      date: price.date.toISOString().split('T')[0], // YYYY-MM-DD format
      open: price.open || null,
      high: price.high || null,
      low: price.low || null,
      close: price.close || null,
      volume: price.volume || null,
      change: price.change || null,
      change_percent: price.change_percent || null,
    })

    if (error) {
      // Ignore duplicate key errors (already have this date)
      if (error.code === '23505') {
        return { success: true }
      }
      console.error('Error inserting stock price:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error inserting stock price:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Get stock price history
 */
export async function getStockPriceHistory(
  symbol: string,
  from?: Date,
  to?: Date
): Promise<DbStockPrice[]> {
  try {
    let query = supabase
      .from('stock_prices')
      .select('*')
      .eq('symbol', symbol)
      .order('date', { ascending: false })

    if (from) {
      query = query.gte('date', from.toISOString().split('T')[0])
    }

    if (to) {
      query = query.lte('date', to.toISOString().split('T')[0])
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching price history:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error fetching price history:', err)
    return []
  }
}
