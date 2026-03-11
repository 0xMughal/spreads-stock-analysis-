#!/usr/bin/env python3
"""
Fetch balance sheet data from SEC EDGAR and update SQLite database.
Fills in: total_assets, total_liabilities, total_debt, cash_and_equivalents, stockholders_equity

Same safety features as fetch-edgar-data.py:
  - Conservative 0.3s delay between requests (well under SEC's 10/sec limit)
  - Exponential backoff on 429/5xx errors
  - Progress checkpointing for resume support
  - Dry-run mode
  - Graceful Ctrl+C shutdown
"""

import json
import sqlite3
import os
import sys
import time
import signal
import argparse
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Set

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    import urllib.request
    import urllib.error
    HAS_REQUESTS = False

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.path.normpath(os.path.join(
    SCRIPT_DIR, "..", "..", "..",
    "Marketing", "Spreads TG Content Bot", "data", "financial_data.db"
))

TICKERS_JSON = os.path.normpath(os.path.join(
    SCRIPT_DIR, "..", "..", "..",
    "Marketing", "Spreads TG Content Bot", "data", "all_tickers.json"
))

CHECKPOINT_FILE = os.path.join(SCRIPT_DIR, ".edgar-balance-sheet-checkpoint.json")

USER_AGENT = "Spreads App admin@spreads.app"
EDGAR_BASE = "https://data.sec.gov/api/xbrl/companyconcept"

REQUEST_DELAY = 0.3
MAX_RETRIES = 3
INITIAL_BACKOFF = 2
MAX_BACKOFF = 60

shutdown_requested = False

def signal_handler(sig, frame):
    global shutdown_requested
    print("\n[!] Shutdown requested. Finishing current ticker and saving checkpoint...")
    shutdown_requested = True

signal.signal(signal.SIGINT, signal_handler)


# ---------------------------------------------------------------------------
# HTTP Client
# ---------------------------------------------------------------------------

class EdgarClient:
    def __init__(self, user_agent, delay):
        self.user_agent = user_agent
        self.delay = delay
        self.last_request_time = 0.0
        self.total_requests = 0
        self.total_errors = 0

        if HAS_REQUESTS:
            self.session = requests.Session()
            self.session.headers.update({
                "User-Agent": user_agent,
                "Accept-Encoding": "gzip, deflate",
                "Accept": "application/json",
            })
        else:
            self.session = None

    def _wait_for_rate_limit(self):
        elapsed = time.time() - self.last_request_time
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def fetch_json(self, url):
        # type: (str) -> Optional[dict]
        for attempt in range(MAX_RETRIES):
            self._wait_for_rate_limit()
            self.last_request_time = time.time()
            self.total_requests += 1

            try:
                if HAS_REQUESTS:
                    resp = self.session.get(url, timeout=30)
                    if resp.status_code == 404:
                        return None
                    if resp.status_code == 429:
                        wait = min(MAX_BACKOFF, INITIAL_BACKOFF * (2 ** attempt) * 5)
                        print(f"  [429] Rate limited! Waiting {wait}s...")
                        time.sleep(wait)
                        continue
                    if resp.status_code >= 500:
                        wait = min(MAX_BACKOFF, INITIAL_BACKOFF * (2 ** attempt))
                        print(f"  [{resp.status_code}] Server error. Retrying in {wait}s...")
                        time.sleep(wait)
                        continue
                    resp.raise_for_status()
                    return resp.json()
                else:
                    req = urllib.request.Request(url, headers={
                        "User-Agent": self.user_agent,
                        "Accept": "application/json",
                    })
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        return json.loads(resp.read().decode("utf-8"))

            except Exception as e:
                error_str = str(e)
                if "404" in error_str:
                    return None
                if "429" in error_str:
                    wait = min(MAX_BACKOFF, INITIAL_BACKOFF * (2 ** attempt) * 5)
                    print(f"  [429] Rate limited! Waiting {wait}s...")
                    time.sleep(wait)
                    continue
                self.total_errors += 1
                wait = min(MAX_BACKOFF, INITIAL_BACKOFF * (2 ** attempt))
                if attempt < MAX_RETRIES - 1:
                    print(f"  Error: {e}. Retrying in {wait}s...")
                    time.sleep(wait)
                else:
                    print(f"  Failed after {MAX_RETRIES} attempts: {e}")
                    return None
        return None


# ---------------------------------------------------------------------------
# EDGAR Data Extraction
# ---------------------------------------------------------------------------

def build_concept_url(cik, taxonomy, concept):
    # type: (int, str, str) -> str
    cik_padded = str(cik).zfill(10)
    return f"{EDGAR_BASE}/CIK{cik_padded}/{taxonomy}/{concept}.json"


def frame_to_quarter_end(frame):
    # type: (str) -> Optional[str]
    m = re.match(r"CY(\d{4})Q(\d)I?", frame)
    if not m:
        return None
    year = int(m.group(1))
    q = int(m.group(2))
    quarter_ends = {1: f"{year}-03-31", 2: f"{year}-06-30", 3: f"{year}-09-30", 4: f"{year}-12-31"}
    return quarter_ends.get(q)


def extract_instant_values(concept_data, unit_key="USD"):
    # type: (Optional[dict], str) -> Dict[str, float]
    """
    Parse balance sheet (instant/point-in-time) values from EDGAR.
    Both 10-Q and 10-K are valid. Returns dates from both frame and end fields.
    """
    if not concept_data:
        return {}

    units = concept_data.get("units", {})
    entries = units.get(unit_key, [])
    if not entries:
        return {}

    by_date = {}  # type: Dict[str, tuple]

    for entry in entries:
        form = entry.get("form", "")
        if form not in ("10-Q", "10-K"):
            continue

        filed_date = entry.get("filed", "")
        value = entry.get("val")
        frame = entry.get("frame", "")
        end_date = entry.get("end", "")

        if value is None:
            continue

        dates_to_store = []
        if frame:
            fd = frame_to_quarter_end(frame)
            if fd:
                dates_to_store.append(fd)
        if end_date:
            dates_to_store.append(end_date)

        for date in dates_to_store:
            if date not in by_date or filed_date > by_date[date][1]:
                by_date[date] = (value, filed_date)

    return {date: val for date, (val, _) in by_date.items()}


def fuzzy_match_date(edgar_date, db_dates, tolerance_days=5):
    # type: (str, List[str], int) -> Optional[str]
    try:
        edgar_dt = datetime.strptime(edgar_date, "%Y-%m-%d")
    except ValueError:
        return None

    best_match = None
    best_diff = timedelta(days=tolerance_days + 1)

    for db_date in db_dates:
        try:
            db_dt = datetime.strptime(db_date, "%Y-%m-%d")
            diff = abs(edgar_dt - db_dt)
            if diff < best_diff:
                best_diff = diff
                best_match = db_date
        except ValueError:
            continue

    return best_match if best_diff <= timedelta(days=tolerance_days) else None


# ---------------------------------------------------------------------------
# Fetch balance sheet for a single ticker
# ---------------------------------------------------------------------------

def fetch_ticker_data(client, cik):
    # type: (EdgarClient, int) -> dict
    """
    Fetch 5 balance sheet fields from EDGAR.
    All are instant (point-in-time) balance sheet items in USD.
    """
    result = {
        "total_assets": {},
        "total_liabilities": {},
        "total_debt": {},
        "cash_and_equivalents": {},
        "stockholders_equity": {},
    }

    if shutdown_requested:
        return result

    # 1. Total Assets
    url = build_concept_url(cik, "us-gaap", "Assets")
    data = client.fetch_json(url)
    result["total_assets"] = extract_instant_values(data, "USD")

    if shutdown_requested:
        return result

    # 2. Total Liabilities
    url = build_concept_url(cik, "us-gaap", "Liabilities")
    data = client.fetch_json(url)
    result["total_liabilities"] = extract_instant_values(data, "USD")

    if shutdown_requested:
        return result

    # 3. Total Debt (Long-term)
    # Try LongTermDebt first, fallback to LongTermDebtNoncurrent
    url = build_concept_url(cik, "us-gaap", "LongTermDebt")
    data = client.fetch_json(url)
    result["total_debt"] = extract_instant_values(data, "USD")

    if not result["total_debt"] and not shutdown_requested:
        url = build_concept_url(cik, "us-gaap", "LongTermDebtNoncurrent")
        data = client.fetch_json(url)
        result["total_debt"] = extract_instant_values(data, "USD")

    if shutdown_requested:
        return result

    # 4. Cash and Equivalents
    # Try CashAndCashEquivalentsAtCarryingValue first, then shorter name
    url = build_concept_url(cik, "us-gaap", "CashAndCashEquivalentsAtCarryingValue")
    data = client.fetch_json(url)
    result["cash_and_equivalents"] = extract_instant_values(data, "USD")

    if not result["cash_and_equivalents"] and not shutdown_requested:
        url = build_concept_url(cik, "us-gaap", "CashCashEquivalentsAndShortTermInvestments")
        data = client.fetch_json(url)
        result["cash_and_equivalents"] = extract_instant_values(data, "USD")

    if shutdown_requested:
        return result

    # 5. Stockholders' Equity
    url = build_concept_url(cik, "us-gaap", "StockholdersEquity")
    data = client.fetch_json(url)
    result["stockholders_equity"] = extract_instant_values(data, "USD")

    return result


# ---------------------------------------------------------------------------
# Database Updates
# ---------------------------------------------------------------------------

def update_ticker_in_db(conn, ticker, edgar_data, dry_run=False):
    # type: (sqlite3.Connection, str, dict, bool) -> dict
    cursor = conn.cursor()

    cursor.execute(
        "SELECT quarter_end FROM quarterly_financials WHERE ticker = ? ORDER BY quarter_end",
        (ticker,)
    )
    db_dates = [row[0] for row in cursor.fetchall()]

    if not db_dates:
        return {"assets": 0, "liabilities": 0, "debt": 0, "cash": 0, "equity": 0}

    updates = {"assets": 0, "liabilities": 0, "debt": 0, "cash": 0, "equity": 0}

    # All balance sheet items — use 45-day tolerance (instant values, non-standard fiscal years)
    field_map = {
        "total_assets": ("total_assets", "assets"),
        "total_liabilities": ("total_liabilities", "liabilities"),
        "total_debt": ("total_debt", "debt"),
        "cash_and_equivalents": ("cash_and_equivalents", "cash"),
        "stockholders_equity": ("stockholders_equity", "equity"),
    }

    for edgar_field, (db_column, count_key) in field_map.items():
        for edgar_date, value in edgar_data.get(edgar_field, {}).items():
            matched_date = fuzzy_match_date(edgar_date, db_dates, tolerance_days=45)
            if not matched_date:
                continue

            cursor.execute(
                f"SELECT {db_column} FROM quarterly_financials WHERE ticker = ? AND quarter_end = ?",
                (ticker, matched_date)
            )
            row = cursor.fetchone()
            if row and row[0] is None:
                if not dry_run:
                    cursor.execute(
                        f"""UPDATE quarterly_financials
                            SET {db_column} = ?,
                                source = CASE
                                    WHEN source IS NULL THEN 'edgar'
                                    WHEN source NOT LIKE '%edgar%' THEN source || '+edgar'
                                    ELSE source
                                END,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE ticker = ? AND quarter_end = ?""",
                        (value, ticker, matched_date)
                    )
                updates[count_key] += 1

    if not dry_run:
        conn.commit()

    return updates


# ---------------------------------------------------------------------------
# Checkpoint
# ---------------------------------------------------------------------------

def load_checkpoint():
    # type: () -> Set[str]
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, "r") as f:
            data = json.load(f)
            return set(data.get("completed", []))
    return set()


def save_checkpoint(completed):
    # type: (Set[str]) -> None
    with open(CHECKPOINT_FILE, "w") as f:
        json.dump({
            "completed": sorted(completed),
            "last_updated": datetime.now().isoformat(),
        }, f, indent=2)


def clear_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Fetch SEC EDGAR balance sheet data")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--ticker", type=str, help="Process only this ticker")
    parser.add_argument("--limit", type=int, help="Process first N tickers")
    parser.add_argument("--fresh", action="store_true", help="Ignore checkpoint")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY, help=f"Request delay (default: {REQUEST_DELAY}s)")
    args = parser.parse_args()

    if args.dry_run:
        print("[DRY RUN] No changes will be written\n")

    print("Loading CIK map...")
    with open(TICKERS_JSON, "r") as f:
        cik_map = {e["ticker"]: e["cik"] for e in json.load(f)}
    print(f"  {len(cik_map)} tickers with CIK numbers")

    print(f"Connecting to DB: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)

    if args.ticker:
        tickers = [args.ticker.upper()]
    else:
        cursor = conn.execute("SELECT DISTINCT ticker FROM quarterly_financials ORDER BY ticker")
        tickers = [row[0] for row in cursor]

    if args.limit:
        tickers = tickers[:args.limit]

    completed = set() if args.fresh else load_checkpoint()
    if completed:
        remaining = [t for t in tickers if t not in completed]
        print(f"  Resuming: {len(completed)} already done, {len(remaining)} remaining")
        tickers = remaining

    if not tickers:
        print("Nothing to process!")
        conn.close()
        return

    no_cik = [t for t in tickers if t not in cik_map]
    tickers = [t for t in tickers if t in cik_map]
    if no_cik:
        print(f"  Skipping {len(no_cik)} tickers without CIK: {no_cik}")

    # ~6 requests per ticker (5 concepts + 1 fallback avg)
    print(f"\nProcessing {len(tickers)} tickers (delay: {args.delay}s)")
    print(f"Estimated time: {len(tickers) * 6 * args.delay / 60:.1f} minutes\n")

    client = EdgarClient(USER_AGENT, args.delay)

    total_updates = {"assets": 0, "liabilities": 0, "debt": 0, "cash": 0, "equity": 0}
    skipped_foreign = []
    failed = []
    start_time = time.time()

    for i, ticker in enumerate(tickers):
        if shutdown_requested:
            print(f"\n[!] Stopping at ticker {i}/{len(tickers)}. Progress saved.")
            break

        cik = cik_map[ticker]
        pct = (i + 1) / len(tickers) * 100
        elapsed = time.time() - start_time
        rate = (i + 1) / elapsed if elapsed > 0 else 0
        eta_min = (len(tickers) - i - 1) / rate / 60 if rate > 0 else 0

        print(f"[{i+1}/{len(tickers)}] {ticker} (CIK: {cik}) — {pct:.0f}% — ETA: {eta_min:.1f}min", end="", flush=True)

        try:
            edgar_data = fetch_ticker_data(client, cik)

            total_points = sum(len(v) for v in edgar_data.values())
            if total_points == 0:
                skipped_foreign.append(ticker)
                print(f" — no EDGAR data (likely foreign/IFRS)")
                completed.add(ticker)
                continue

            updates = update_ticker_in_db(conn, ticker, edgar_data, dry_run=args.dry_run)

            total_updated = sum(updates.values())
            for k in total_updates:
                total_updates[k] += updates[k]

            print(f" — updated {total_updated} fields (assets:{updates['assets']}, liab:{updates['liabilities']}, debt:{updates['debt']}, cash:{updates['cash']}, equity:{updates['equity']})")

            completed.add(ticker)

            if (i + 1) % 25 == 0:
                save_checkpoint(completed)

        except Exception as e:
            print(f" — ERROR: {e}")
            failed.append(ticker)

    save_checkpoint(completed)
    conn.close()

    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"EDGAR Balance Sheet Fetch Complete")
    print(f"{'='*60}")
    print(f"Time: {elapsed/60:.1f} minutes")
    print(f"Requests made: {client.total_requests}")
    print(f"Request errors: {client.total_errors}")
    print(f"Tickers processed: {len(completed)}")
    print(f"Skipped (no EDGAR data): {len(skipped_foreign)}")
    print(f"Failed: {len(failed)}")
    print(f"\nFields updated:")
    print(f"  Total Assets:         {total_updates['assets']}")
    print(f"  Total Liabilities:    {total_updates['liabilities']}")
    print(f"  Total Debt:           {total_updates['debt']}")
    print(f"  Cash & Equivalents:   {total_updates['cash']}")
    print(f"  Stockholders Equity:  {total_updates['equity']}")
    print(f"  Total:                {sum(total_updates.values())}")

    if failed:
        print(f"\nFailed tickers: {failed}")
    if skipped_foreign:
        print(f"\nNo EDGAR data (foreign/IFRS): {skipped_foreign}")

    if args.dry_run:
        print("\n[DRY RUN] No changes were written.")
    else:
        print(f"\nNext step: Run export-fundamentals.py to regenerate static JSON files")

    if not shutdown_requested and not failed and not args.dry_run:
        clear_checkpoint()
        print("Checkpoint cleared (all tickers complete)")


if __name__ == "__main__":
    main()
