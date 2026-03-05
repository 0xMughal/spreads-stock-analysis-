#!/bin/bash

# Refresh All Stock Datasets
# This script calls all three cron endpoints sequentially

CRON_SECRET="${CRON_SECRET:-DYnoiwULWTQSX5sETgx1jfNpq7cNsyhISW+8El2BSQE=}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🚀 Starting stock data refresh for all datasets..."
echo "=================================================="
echo ""

# S&P 500
echo "📊 [1/3] Fetching S&P 500 stocks..."
echo "   Endpoint: $BASE_URL/api/cron/refresh-sp500"
echo "   Expected: ~413 stocks in ~9 minutes"
echo ""

SP500_RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$BASE_URL/api/cron/refresh-sp500" \
  -H "Authorization: Bearer $CRON_SECRET")

SP500_CODE=$(echo "$SP500_RESPONSE" | tail -n 1)
SP500_BODY=$(echo "$SP500_RESPONSE" | head -n -1)

if [ "$SP500_CODE" = "200" ]; then
  echo "   ✅ S&P 500 completed successfully"
  echo "$SP500_BODY" | jq '.'
else
  echo "   ❌ S&P 500 failed with status $SP500_CODE"
  echo "$SP500_BODY"
fi

echo ""
echo "=================================================="
echo ""

# NASDAQ-100
echo "📈 [2/3] Fetching NASDAQ-100 stocks..."
echo "   Endpoint: $BASE_URL/api/cron/refresh-nasdaq"
echo "   Expected: ~90 stocks in ~2 minutes"
echo ""

NASDAQ_RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$BASE_URL/api/cron/refresh-nasdaq" \
  -H "Authorization: Bearer $CRON_SECRET")

NASDAQ_CODE=$(echo "$NASDAQ_RESPONSE" | tail -n 1)
NASDAQ_BODY=$(echo "$NASDAQ_RESPONSE" | head -n -1)

if [ "$NASDAQ_CODE" = "200" ]; then
  echo "   ✅ NASDAQ-100 completed successfully"
  echo "$NASDAQ_BODY" | jq '.'
else
  echo "   ❌ NASDAQ-100 failed with status $NASDAQ_CODE"
  echo "$NASDAQ_BODY"
fi

echo ""
echo "=================================================="
echo ""

# International
echo "🌍 [3/3] Fetching International stocks..."
echo "   Endpoint: $BASE_URL/api/cron/refresh-international"
echo "   Expected: ~70 stocks in ~2 minutes"
echo ""

INTL_RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$BASE_URL/api/cron/refresh-international" \
  -H "Authorization: Bearer $CRON_SECRET")

INTL_CODE=$(echo "$INTL_RESPONSE" | tail -n 1)
INTL_BODY=$(echo "$INTL_RESPONSE" | head -n -1)

if [ "$INTL_CODE" = "200" ]; then
  echo "   ✅ International completed successfully"
  echo "$INTL_BODY" | jq '.'
else
  echo "   ❌ International failed with status $INTL_CODE"
  echo "$INTL_BODY"
fi

echo ""
echo "=================================================="
echo "🎉 All datasets refreshed!"
echo ""

# Summary
echo "📊 Summary:"
SP500_COUNT=$(echo "$SP500_BODY" | jq -r '.stockCount // 0')
NASDAQ_COUNT=$(echo "$NASDAQ_BODY" | jq -r '.stockCount // 0')
INTL_COUNT=$(echo "$INTL_BODY" | jq -r '.stockCount // 0')
TOTAL=$((SP500_COUNT + NASDAQ_COUNT + INTL_COUNT))

echo "   S&P 500: $SP500_COUNT stocks"
echo "   NASDAQ-100: $NASDAQ_COUNT stocks"
echo "   International: $INTL_COUNT stocks"
echo "   ──────────────────────"
echo "   Total: $TOTAL stocks"
echo ""
