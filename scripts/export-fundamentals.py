#!/usr/bin/env python3
"""
Export SQLite financial data to static JSON files for the Next.js app.
Creates:
  - public/data/stocks/{TICKER}.json  (one per ticker with quarterly data)
  - public/data/stocks/index.json     (master list of all tickers + names)
"""

import json
import sqlite3
import os
from pathlib import Path

DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "..",
    "Marketing", "Spreads TG Content Bot", "data", "financial_data.db"
)

TICKERS_JSON = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "..",
    "Marketing", "Spreads TG Content Bot", "data", "all_tickers.json"
)

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data", "stocks")

def main():
    db_path = os.path.normpath(DB_PATH)
    out_dir = os.path.normpath(OUT_DIR)
    os.makedirs(out_dir, exist_ok=True)

    # Load company names from all_tickers.json
    ticker_names = {}
    with open(os.path.normpath(TICKERS_JSON), "r") as f:
        for entry in json.load(f):
            ticker_names[entry["ticker"]] = entry["name"]

    # Load company_meta for sector info
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    meta_map = {}
    for row in conn.execute("SELECT * FROM company_meta"):
        meta_map[row["ticker"]] = {
            "sector": row["sector"],
            "exchange": row["exchange"],
            "market": row["market"],
            "currency": row["currency"],
        }

    # Get all unique tickers from financials
    tickers = [r[0] for r in conn.execute(
        "SELECT DISTINCT ticker FROM quarterly_financials ORDER BY ticker"
    )]

    print(f"Exporting {len(tickers)} tickers...")

    index = []

    for ticker in tickers:
        rows = conn.execute(
            """SELECT quarter_end, revenue, eps_diluted, net_income,
                      gross_profit, operating_income, free_cash_flow,
                      shares_outstanding, total_assets, total_liabilities,
                      total_debt, cash_and_equivalents, stockholders_equity
               FROM quarterly_financials
               WHERE ticker = ?
               ORDER BY quarter_end""",
            (ticker,)
        ).fetchall()

        quarters = []
        for r in rows:
            q = {
                "date": r["quarter_end"],
                "revenue": r["revenue"],
                "eps": r["eps_diluted"],
                "netIncome": r["net_income"],
                "grossProfit": r["gross_profit"],
                "operatingIncome": r["operating_income"],
                "freeCashFlow": r["free_cash_flow"],
                "sharesOutstanding": r["shares_outstanding"],
                "totalAssets": r["total_assets"],
                "totalLiabilities": r["total_liabilities"],
                "totalDebt": r["total_debt"],
                "cashAndEquivalents": r["cash_and_equivalents"],
                "stockholdersEquity": r["stockholders_equity"],
            }
            quarters.append(q)

        name = ticker_names.get(ticker, meta_map.get(ticker, {}).get("company_name", ticker))
        meta = meta_map.get(ticker, {})

        stock_data = {
            "ticker": ticker,
            "name": name,
            "sector": meta.get("sector"),
            "exchange": meta.get("exchange"),
            "quarters": quarters,
        }

        # Write individual ticker file
        filepath = os.path.join(out_dir, f"{ticker}.json")
        with open(filepath, "w") as f:
            json.dump(stock_data, f, separators=(",", ":"))

        # Find latest shares outstanding for index
        latest_shares = None
        for q in reversed(quarters):
            if q.get("sharesOutstanding"):
                latest_shares = q["sharesOutstanding"]
                break

        index.append({
            "ticker": ticker,
            "name": name,
            "sector": meta.get("sector"),
            "quarters": len(quarters),
            "sharesOutstanding": latest_shares,
        })

    # Write index
    index.sort(key=lambda x: x["ticker"])
    with open(os.path.join(out_dir, "index.json"), "w") as f:
        json.dump(index, f, separators=(",", ":"))

    conn.close()

    total_size = sum(
        os.path.getsize(os.path.join(out_dir, f))
        for f in os.listdir(out_dir)
    )
    print(f"Done! {len(tickers)} tickers exported to {out_dir}")
    print(f"Total size: {total_size / 1024 / 1024:.1f} MB")
    print(f"Index: {len(index)} entries")

if __name__ == "__main__":
    main()
