#!/usr/bin/env python3
"""
Fetch financial data from SEC EDGAR and update SQLite database.
Fills in: shares_outstanding, gross_profit, operating_income, free_cash_flow

SEC EDGAR Rules (https://www.sec.gov/os/accessing-edgar-data):
  - Max 10 requests/second (we use 4/sec to be very safe)
  - User-Agent MUST include company name + contact email
  - No API key needed
  - Data is public domain

Safety features:
  - Conservative 0.25s delay between requests (4 req/sec, well under 10 limit)
  - Exponential backoff on 429/5xx errors (up to 60s wait)
  - Progress checkpointing — can resume from where it left off
  - Dry-run mode to preview without writing
  - Session reuse with connection pooling
  - Graceful shutdown on Ctrl+C
"""

import json
import sqlite3
import os
import sys
import time
import signal
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Set

# Use requests if available, fall back to urllib
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

# Checkpoint file to track progress (allows resuming)
CHECKPOINT_FILE = os.path.join(SCRIPT_DIR, ".edgar-checkpoint.json")

# SEC EDGAR requires a real contact email in User-Agent
USER_AGENT = "Spreads App admin@spreads.app"

EDGAR_BASE = "https://data.sec.gov/api/xbrl/companyconcept"

# Conservative: 4 requests/sec (SEC allows 10)
REQUEST_DELAY = 0.25

# Backoff settings
MAX_RETRIES = 3
INITIAL_BACKOFF = 2  # seconds
MAX_BACKOFF = 60  # seconds

# Graceful shutdown flag
shutdown_requested = False

def signal_handler(sig, frame):
    global shutdown_requested
    print("\n[!] Shutdown requested. Finishing current ticker and saving checkpoint...")
    shutdown_requested = True

signal.signal(signal.SIGINT, signal_handler)


# ---------------------------------------------------------------------------
# HTTP Client (works with or without `requests` library)
# ---------------------------------------------------------------------------

class EdgarClient:
    """Rate-limited HTTP client for SEC EDGAR with retry + backoff."""

    def __init__(self, user_agent: str, delay: float):
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
        """Ensure minimum delay between requests."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def fetch_json(self, url: str) -> Optional[dict]:
        """
        Fetch JSON from URL with rate limiting and retry.
        Returns parsed JSON or None on 404/permanent failure.
        """
        for attempt in range(MAX_RETRIES):
            self._wait_for_rate_limit()
            self.last_request_time = time.time()
            self.total_requests += 1

            try:
                if HAS_REQUESTS:
                    resp = self.session.get(url, timeout=30)
                    if resp.status_code == 404:
                        return None  # Concept not reported — normal
                    if resp.status_code == 429:
                        # Rate limited — back off significantly
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

def build_concept_url(cik: int, taxonomy: str, concept: str) -> str:
    """Build EDGAR company-concept API URL."""
    cik_padded = str(cik).zfill(10)
    return f"{EDGAR_BASE}/CIK{cik_padded}/{taxonomy}/{concept}.json"


def extract_quarterly_values(
    concept_data: Optional[dict],
    unit_key: str = "USD"
) -> Dict[str, float]:
    """
    Parse EDGAR concept response into {quarter_end_date: value}.
    Filters for 10-Q and 10-K filings only.
    For income/cash flow items from 10-K, we skip them (they're annual cumulative).
    For balance sheet items (instant), 10-K values are point-in-time and usable.
    """
    if not concept_data:
        return {}

    units = concept_data.get("units", {})
    entries = units.get(unit_key, [])

    if not entries:
        # Try "shares" if USD didn't work
        if unit_key == "USD":
            entries = units.get("shares", [])
        if not entries:
            return {}

    results = {}
    # Group by end date, prefer most recent filing (amendments override originals)
    by_end_date = {}

    for entry in entries:
        form = entry.get("form", "")
        if form not in ("10-Q", "10-K"):
            continue

        end_date = entry.get("end", "")
        start_date = entry.get("start")
        filed_date = entry.get("filed", "")
        value = entry.get("val")

        if not end_date or value is None:
            continue

        # For duration items (income/cash flow), skip 10-K because they report
        # annual totals, not quarterly. We only want 10-Q for these.
        # Duration items have a "start" date; instant items (balance sheet) do not.
        if start_date and form == "10-K":
            # Check if this covers more than one quarter (> 100 days)
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                if (end_dt - start_dt).days > 100:
                    continue  # Annual cumulative, skip
            except ValueError:
                continue

        # Keep most recently filed version for each end date
        if end_date not in by_end_date or filed_date > by_end_date[end_date][1]:
            by_end_date[end_date] = (value, filed_date)

    return {date: val for date, (val, _) in by_end_date.items()}


def frame_to_quarter_end(frame: str) -> Optional[str]:
    """
    Convert EDGAR frame like 'CY2024Q3I' to calendar quarter end date '2024-09-30'.
    Frames: CY2024Q1I -> Q1 -> Mar 31, CY2024Q2I -> Jun 30, CY2024Q3I -> Sep 30, CY2024Q4I -> Dec 31
    """
    import re
    m = re.match(r"CY(\d{4})Q(\d)I?", frame)
    if not m:
        return None
    year = int(m.group(1))
    q = int(m.group(2))
    quarter_ends = {1: f"{year}-03-31", 2: f"{year}-06-30", 3: f"{year}-09-30", 4: f"{year}-12-31"}
    return quarter_ends.get(q)


def extract_instant_values(concept_data: Optional[dict], unit_key: str = "shares") -> Dict[str, float]:
    """
    Parse EDGAR concept response for instant/point-in-time values (like shares outstanding).
    Returns both frame-derived dates AND raw end dates, so the caller can
    fuzzy-match against DB dates with a wider tolerance.
    """
    if not concept_data:
        return {}

    units = concept_data.get("units", {})
    entries = units.get(unit_key, [])

    if not entries:
        return {}

    by_date = {}

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

        # Store under both frame-derived date AND raw end date
        # This maximizes matching chances for companies with non-standard fiscal years
        dates_to_store = []

        if frame:
            frame_date = frame_to_quarter_end(frame)
            if frame_date:
                dates_to_store.append(frame_date)

        if end_date:
            dates_to_store.append(end_date)

        for date in dates_to_store:
            if date not in by_date or filed_date > by_date[date][1]:
                by_date[date] = (value, filed_date)

    return {date: val for date, (val, _) in by_date.items()}


def fuzzy_match_date(edgar_date: str, db_dates: List[str], tolerance_days: int = 5) -> Optional[str]:
    """
    Match an EDGAR filing end date to the closest DB quarter_end date.
    Fiscal year ends may differ by a few days from calendar quarter ends.
    """
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
# Fetch all concepts for a single ticker
# ---------------------------------------------------------------------------

def fetch_ticker_data(client: EdgarClient, cik: int) -> dict:
    """
    Fetch all 4 missing data fields from EDGAR for one company.
    Returns dict with keys: shares_outstanding, gross_profit, operating_income, free_cash_flow
    Each value is a dict of {date: value}.
    """
    result = {
        "shares_outstanding": {},
        "gross_profit": {},
        "operating_income": {},
        "free_cash_flow": {},
    }

    if shutdown_requested:
        return result

    # 1. Shares Outstanding — try multiple concepts
    # Try dei taxonomy first (cover page, most consistent)
    url = build_concept_url(cik, "dei", "EntityCommonStockSharesOutstanding")
    data = client.fetch_json(url)
    result["shares_outstanding"] = extract_instant_values(data, "shares")

    if not result["shares_outstanding"] and not shutdown_requested:
        # Fallback: us-gaap balance sheet
        url = build_concept_url(cik, "us-gaap", "CommonStockSharesOutstanding")
        data = client.fetch_json(url)
        result["shares_outstanding"] = extract_instant_values(data, "shares")

    if not result["shares_outstanding"] and not shutdown_requested:
        # Last resort: weighted average diluted shares (income statement)
        url = build_concept_url(cik, "us-gaap", "WeightedAverageNumberOfDilutedSharesOutstanding")
        data = client.fetch_json(url)
        result["shares_outstanding"] = extract_quarterly_values(data, "shares")

    if shutdown_requested:
        return result

    # 2. Gross Profit
    url = build_concept_url(cik, "us-gaap", "GrossProfit")
    data = client.fetch_json(url)
    result["gross_profit"] = extract_quarterly_values(data, "USD")

    if shutdown_requested:
        return result

    # 3. Operating Income
    url = build_concept_url(cik, "us-gaap", "OperatingIncomeLoss")
    data = client.fetch_json(url)
    result["operating_income"] = extract_quarterly_values(data, "USD")

    if shutdown_requested:
        return result

    # 4. Free Cash Flow = Operating CF - CapEx
    url = build_concept_url(cik, "us-gaap", "NetCashProvidedByUsedInOperatingActivities")
    operating_cf_data = client.fetch_json(url)
    operating_cf = extract_quarterly_values(operating_cf_data, "USD")

    if shutdown_requested:
        return result

    url = build_concept_url(cik, "us-gaap", "PaymentsToAcquirePropertyPlantAndEquipment")
    capex_data = client.fetch_json(url)
    capex = extract_quarterly_values(capex_data, "USD")

    # FCF = operating CF - capex (capex is reported as positive, so subtract)
    all_dates = set(operating_cf.keys()) & set(capex.keys())
    for date in all_dates:
        result["free_cash_flow"][date] = operating_cf[date] - capex[date]

    return result


# ---------------------------------------------------------------------------
# Database Updates
# ---------------------------------------------------------------------------

def update_ticker_in_db(
    conn: sqlite3.Connection,
    ticker: str,
    edgar_data: dict,
    dry_run: bool = False
) -> dict:
    """
    Update NULL fields in quarterly_financials for one ticker.
    Returns counts of updates per field.
    """
    cursor = conn.cursor()

    # Get existing quarter dates for this ticker
    cursor.execute(
        "SELECT quarter_end FROM quarterly_financials WHERE ticker = ? ORDER BY quarter_end",
        (ticker,)
    )
    db_dates = [row[0] for row in cursor.fetchall()]

    if not db_dates:
        return {"shares": 0, "gross_profit": 0, "operating_income": 0, "fcf": 0}

    updates = {"shares": 0, "gross_profit": 0, "operating_income": 0, "fcf": 0}

    field_map = {
        "shares_outstanding": ("shares_outstanding", "shares", 45),
        "gross_profit": ("gross_profit", "gross_profit", 5),
        "operating_income": ("operating_income", "operating_income", 5),
        "free_cash_flow": ("free_cash_flow", "fcf", 5),
    }

    for edgar_field, (db_column, count_key, tolerance) in field_map.items():
        for edgar_date, value in edgar_data.get(edgar_field, {}).items():
            matched_date = fuzzy_match_date(edgar_date, db_dates, tolerance_days=tolerance)
            if not matched_date:
                continue

            # Only update if currently NULL
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
# Checkpoint (resume support)
# ---------------------------------------------------------------------------

def load_checkpoint() -> Set[str]:
    """Load set of already-processed tickers."""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, "r") as f:
            data = json.load(f)
            return set(data.get("completed", []))
    return set()


def save_checkpoint(completed: Set[str]):
    """Save set of completed tickers."""
    with open(CHECKPOINT_FILE, "w") as f:
        json.dump({
            "completed": sorted(completed),
            "last_updated": datetime.now().isoformat(),
        }, f, indent=2)


def clear_checkpoint():
    """Remove checkpoint file."""
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Fetch SEC EDGAR data to fill missing financial fields")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing to DB")
    parser.add_argument("--ticker", type=str, help="Process only this ticker (for testing)")
    parser.add_argument("--limit", type=int, help="Process only first N tickers")
    parser.add_argument("--fresh", action="store_true", help="Ignore checkpoint, start from scratch")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY, help=f"Delay between requests in seconds (default: {REQUEST_DELAY})")
    args = parser.parse_args()

    if args.dry_run:
        print("[DRY RUN] No changes will be written to database\n")

    # Load CIK map
    print("Loading CIK map...")
    with open(TICKERS_JSON, "r") as f:
        cik_map = {e["ticker"]: e["cik"] for e in json.load(f)}
    print(f"  {len(cik_map)} tickers with CIK numbers")

    # Connect to DB
    print(f"Connecting to DB: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)

    # Get tickers to process
    if args.ticker:
        tickers = [args.ticker.upper()]
    else:
        cursor = conn.execute("SELECT DISTINCT ticker FROM quarterly_financials ORDER BY ticker")
        tickers = [row[0] for row in cursor]

    if args.limit:
        tickers = tickers[:args.limit]

    # Load checkpoint (skip already processed unless --fresh)
    completed = set() if args.fresh else load_checkpoint()
    if completed:
        remaining = [t for t in tickers if t not in completed]
        print(f"  Resuming: {len(completed)} already done, {len(remaining)} remaining")
        tickers = remaining

    if not tickers:
        print("Nothing to process!")
        conn.close()
        return

    # Filter to tickers with CIK
    no_cik = [t for t in tickers if t not in cik_map]
    tickers = [t for t in tickers if t in cik_map]
    if no_cik:
        print(f"  Skipping {len(no_cik)} tickers without CIK: {no_cik}")

    print(f"\nProcessing {len(tickers)} tickers (delay: {args.delay}s between requests)")
    print(f"Estimated time: {len(tickers) * 6 * args.delay / 60:.1f} minutes\n")

    # Initialize client
    client = EdgarClient(USER_AGENT, args.delay)

    # Stats
    total_updates = {"shares": 0, "gross_profit": 0, "operating_income": 0, "fcf": 0}
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

            # Check if we got any data at all (foreign companies often return nothing)
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

            print(f" — updated {total_updated} fields (shares:{updates['shares']}, gp:{updates['gross_profit']}, oi:{updates['operating_income']}, fcf:{updates['fcf']})")

            completed.add(ticker)

            # Save checkpoint every 25 tickers
            if (i + 1) % 25 == 0:
                save_checkpoint(completed)

        except Exception as e:
            print(f" — ERROR: {e}")
            failed.append(ticker)

    # Final checkpoint save
    save_checkpoint(completed)

    conn.close()

    # Summary
    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"EDGAR Data Fetch Complete")
    print(f"{'='*60}")
    print(f"Time: {elapsed/60:.1f} minutes")
    print(f"Requests made: {client.total_requests}")
    print(f"Request errors: {client.total_errors}")
    print(f"Tickers processed: {len(completed)}")
    print(f"Skipped (no EDGAR data): {len(skipped_foreign)}")
    print(f"Failed: {len(failed)}")
    print(f"\nFields updated:")
    print(f"  Shares Outstanding: {total_updates['shares']}")
    print(f"  Gross Profit:       {total_updates['gross_profit']}")
    print(f"  Operating Income:   {total_updates['operating_income']}")
    print(f"  Free Cash Flow:     {total_updates['fcf']}")
    print(f"  Total:              {sum(total_updates.values())}")

    if failed:
        print(f"\nFailed tickers: {failed}")
    if skipped_foreign:
        print(f"\nNo EDGAR data (foreign/IFRS): {skipped_foreign}")

    if args.dry_run:
        print("\n[DRY RUN] No changes were written. Run without --dry-run to apply.")
    else:
        print(f"\nNext step: Run export-fundamentals.py to regenerate static JSON files")
        print(f"  python3 {os.path.join(SCRIPT_DIR, 'export-fundamentals.py')}")

    # Clean up checkpoint if fully complete
    if not shutdown_requested and not failed and not args.dry_run:
        clear_checkpoint()
        print("\nCheckpoint cleared (all tickers complete)")


if __name__ == "__main__":
    main()
