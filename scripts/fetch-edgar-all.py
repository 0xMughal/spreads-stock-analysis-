#!/usr/bin/env python3
"""
Comprehensive EDGAR fetcher — pulls ALL financial fields from a single
companyfacts endpoint per ticker (1 request per company).

Fields pulled:
  - revenue (RevenueFromContractWithCustomerExcludingAssessedTax, Revenues, SalesRevenueNet, etc.)
  - eps_diluted (EarningsPerShareDiluted)
  - net_income (NetIncomeLoss)
  - gross_profit (GrossProfit)
  - operating_income (OperatingIncomeLoss)
  - free_cash_flow (computed: NetCashProvidedByUsedInOperatingActivities - PaymentsToAcquirePropertyPlantAndEquipment)
  - shares_outstanding (EntityCommonStockSharesOutstanding, CommonStockSharesOutstanding)
  - total_assets (Assets)
  - total_liabilities (Liabilities)
  - total_debt (LongTermDebt, LongTermDebtNoncurrent)
  - cash_and_equivalents (CashAndCashEquivalentsAtCarryingValue)
  - stockholders_equity (StockholdersEquity)

Uses UPSERT with COALESCE so EDGAR fills gaps without overwriting macrotrends data.
Uses companyfacts endpoint: 1 API call per ticker (not per concept).

Safety: 0.3s delay (3.3 req/sec, well under SEC's 10/sec limit), backoff, checkpointing.
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
from typing import Optional, Dict, List, Set, Tuple

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

COLLECTOR_STATE = os.path.normpath(os.path.join(
    SCRIPT_DIR, "..", "..", "..",
    "Marketing", "Spreads TG Content Bot", "data", "collector_state.json"
))

EXPANDED_TICKERS = os.path.normpath(os.path.join(
    SCRIPT_DIR, "..", "..", "..",
    "Marketing", "Spreads TG Content Bot", "data", "all_tickers_expanded.json"
))

CHECKPOINT_FILE = os.path.join(SCRIPT_DIR, ".edgar-all-checkpoint.json")

USER_AGENT = "Spreads App admin@spreads.app"
EDGAR_FACTS_BASE = "https://data.sec.gov/api/xbrl/companyfacts"

REQUEST_DELAY = 0.3
MAX_RETRIES = 3
INITIAL_BACKOFF = 2
MAX_BACKOFF = 60

shutdown_requested = False

def signal_handler(sig, frame):
    global shutdown_requested
    print("\n[!] Shutdown requested. Finishing current ticker...")
    shutdown_requested = True

signal.signal(signal.SIGINT, signal_handler)


# ---------------------------------------------------------------------------
# Concept mappings — try in order, first match wins
# ---------------------------------------------------------------------------

# Duration concepts (income statement / cash flow — have start+end dates)
DURATION_CONCEPTS = {
    "revenue": [
        ("us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax"),
        ("us-gaap", "Revenues"),
        ("us-gaap", "SalesRevenueNet"),
        ("us-gaap", "RevenueFromContractWithCustomerIncludingAssessedTax"),
    ],
    "eps_diluted": [
        ("us-gaap", "EarningsPerShareDiluted"),
    ],
    "net_income": [
        ("us-gaap", "NetIncomeLoss"),
    ],
    "gross_profit": [
        ("us-gaap", "GrossProfit"),
    ],
    "operating_income": [
        ("us-gaap", "OperatingIncomeLoss"),
    ],
    "operating_cf": [
        ("us-gaap", "NetCashProvidedByUsedInOperatingActivities"),
    ],
    "capex": [
        ("us-gaap", "PaymentsToAcquirePropertyPlantAndEquipment"),
    ],
}

# Instant concepts (balance sheet — point-in-time, no start date)
INSTANT_CONCEPTS = {
    "shares_outstanding": [
        ("dei", "EntityCommonStockSharesOutstanding"),
        ("us-gaap", "CommonStockSharesOutstanding"),
    ],
    "total_assets": [
        ("us-gaap", "Assets"),
    ],
    "total_liabilities": [
        ("us-gaap", "Liabilities"),
    ],
    "total_debt": [
        ("us-gaap", "LongTermDebt"),
        ("us-gaap", "LongTermDebtNoncurrent"),
    ],
    "cash_and_equivalents": [
        ("us-gaap", "CashAndCashEquivalentsAtCarryingValue"),
        ("us-gaap", "CashCashEquivalentsAndShortTermInvestments"),
    ],
    "stockholders_equity": [
        ("us-gaap", "StockholdersEquity"),
    ],
}


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

    def _wait(self):
        elapsed = time.time() - self.last_request_time
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def fetch_company_facts(self, cik):
        # type: (int) -> Optional[dict]
        """Fetch ALL facts for a company in one request."""
        url = "{}/CIK{}.json".format(EDGAR_FACTS_BASE, str(cik).zfill(10))

        for attempt in range(MAX_RETRIES):
            self._wait()
            self.last_request_time = time.time()
            self.total_requests += 1

            try:
                if HAS_REQUESTS:
                    resp = self.session.get(url, timeout=30)
                    if resp.status_code == 404:
                        return None
                    if resp.status_code == 429:
                        wait = min(MAX_BACKOFF, INITIAL_BACKOFF * (2 ** attempt) * 5)
                        print("  [429] Rate limited! Waiting {}s...".format(wait))
                        time.sleep(wait)
                        continue
                    if resp.status_code >= 500:
                        wait = min(MAX_BACKOFF, INITIAL_BACKOFF * (2 ** attempt))
                        print("  [{}] Server error. Retrying in {}s...".format(resp.status_code, wait))
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
                if "404" in str(e):
                    return None
                if "429" in str(e):
                    wait = min(MAX_BACKOFF, INITIAL_BACKOFF * (2 ** attempt) * 5)
                    print("  [429] Rate limited! Waiting {}s...".format(wait))
                    time.sleep(wait)
                    continue
                self.total_errors += 1
                wait = min(MAX_BACKOFF, INITIAL_BACKOFF * (2 ** attempt))
                if attempt < MAX_RETRIES - 1:
                    print("  Error: {}. Retrying in {}s...".format(e, wait))
                    time.sleep(wait)
                else:
                    print("  Failed after {} attempts: {}".format(MAX_RETRIES, e))
                    return None
        return None


# ---------------------------------------------------------------------------
# Data extraction from companyfacts
# ---------------------------------------------------------------------------

def get_concept_data(facts, taxonomy, concept):
    # type: (dict, str, str) -> Optional[list]
    """Get entries for a specific concept from companyfacts response."""
    tax_data = facts.get("facts", {}).get(taxonomy, {})
    concept_data = tax_data.get(concept, {})
    units = concept_data.get("units", {})
    # Try USD first, then shares, then USD/shares (for EPS)
    for unit_key in ["USD", "shares", "USD/shares"]:
        if unit_key in units:
            return units[unit_key]
    return None


def frame_to_quarter_end(frame):
    # type: (str) -> Optional[str]
    """CY2024Q3I -> 2024-09-30, CY2024Q3 -> 2024-09-30"""
    m = re.match(r"CY(\d{4})Q(\d)I?$", frame)
    if not m:
        return None
    year, q = int(m.group(1)), int(m.group(2))
    ends = {1: "{}-03-31", 2: "{}-06-30", 3: "{}-09-30", 4: "{}-12-31"}
    template = ends.get(q)
    return template.format(year) if template else None


def extract_duration_values(entries):
    # type: (list) -> Dict[str, float]
    """
    Extract quarterly values from duration (income statement) entries.
    Only keeps quarterly periods (< 100 days). Skips annual 10-K totals.
    """
    if not entries:
        return {}

    by_end = {}  # type: Dict[str, Tuple[float, str]]

    for e in entries:
        form = e.get("form", "")
        if form not in ("10-Q", "10-K"):
            continue

        end_date = e.get("end", "")
        start_date = e.get("start")
        filed = e.get("filed", "")
        val = e.get("val")
        frame = e.get("frame", "")

        if val is None or not end_date:
            continue

        # Skip annual cumulative periods (> 100 days)
        if start_date:
            try:
                s = datetime.strptime(start_date, "%Y-%m-%d")
                en = datetime.strptime(end_date, "%Y-%m-%d")
                if (en - s).days > 100:
                    continue
            except ValueError:
                continue

        # Try frame-derived date first, then raw end date
        dates = []
        if frame:
            fd = frame_to_quarter_end(frame)
            if fd:
                dates.append(fd)
        dates.append(end_date)

        for d in dates:
            if d not in by_end or filed > by_end[d][1]:
                by_end[d] = (val, filed)

    return {d: v for d, (v, _) in by_end.items()}


def extract_instant_values(entries):
    # type: (list) -> Dict[str, float]
    """Extract point-in-time (balance sheet) values."""
    if not entries:
        return {}

    by_date = {}  # type: Dict[str, Tuple[float, str]]

    for e in entries:
        form = e.get("form", "")
        if form not in ("10-Q", "10-K"):
            continue

        filed = e.get("filed", "")
        val = e.get("val")
        frame = e.get("frame", "")
        end_date = e.get("end", "")

        if val is None:
            continue

        dates = []
        if frame:
            fd = frame_to_quarter_end(frame)
            if fd:
                dates.append(fd)
        if end_date:
            dates.append(end_date)

        for d in dates:
            if d not in by_date or filed > by_date[d][1]:
                by_date[d] = (val, filed)

    return {d: v for d, (v, _) in by_date.items()}


def extract_all_fields(facts):
    # type: (dict) -> dict
    """Extract all fields from a companyfacts response."""
    result = {}

    # Duration fields
    for field, concept_list in DURATION_CONCEPTS.items():
        for taxonomy, concept in concept_list:
            entries = get_concept_data(facts, taxonomy, concept)
            if entries:
                result[field] = extract_duration_values(entries)
                break
        if field not in result:
            result[field] = {}

    # Instant fields
    for field, concept_list in INSTANT_CONCEPTS.items():
        for taxonomy, concept in concept_list:
            entries = get_concept_data(facts, taxonomy, concept)
            if entries:
                result[field] = extract_instant_values(entries)
                break
        if field not in result:
            result[field] = {}

    # Compute FCF = operating_cf - capex
    ocf = result.pop("operating_cf", {})
    capex = result.pop("capex", {})
    fcf = {}
    for d in set(ocf.keys()) & set(capex.keys()):
        fcf[d] = ocf[d] - capex[d]
    result["free_cash_flow"] = fcf

    return result


# ---------------------------------------------------------------------------
# Date matching
# ---------------------------------------------------------------------------

def normalize_to_quarter_end(date_str):
    # type: (str) -> Optional[str]
    """
    Normalize any date to the nearest calendar quarter-end or month-end.
    Returns the date string as-is if it's already a valid date.
    This is used for creating new DB rows from EDGAR dates.
    """
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return None
    return date_str


def fuzzy_match_date(edgar_date, db_dates, tolerance_days=45):
    # type: (str, List[str], int) -> Optional[str]
    """Match EDGAR date to closest DB date within tolerance."""
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
# Database upsert
# ---------------------------------------------------------------------------

DB_FIELDS = [
    "revenue", "eps_diluted", "net_income", "gross_profit", "operating_income",
    "free_cash_flow", "shares_outstanding", "total_assets", "total_liabilities",
    "total_debt", "cash_and_equivalents", "stockholders_equity",
]

# Tolerance per field type (instant balance sheet fields need wider tolerance)
FIELD_TOLERANCE = {
    "revenue": 5, "eps_diluted": 5, "net_income": 5,
    "gross_profit": 5, "operating_income": 5, "free_cash_flow": 5,
    "shares_outstanding": 45, "total_assets": 45, "total_liabilities": 45,
    "total_debt": 45, "cash_and_equivalents": 45, "stockholders_equity": 45,
}


def upsert_ticker(conn, ticker, edgar_data, dry_run=False):
    # type: (sqlite3.Connection, str, dict, bool) -> Dict[str, int]
    """
    UPSERT edgar data into quarterly_financials.
    Uses COALESCE so EDGAR fills NULLs without overwriting macrotrends data.
    """
    cursor = conn.cursor()

    # Get existing DB dates for fuzzy matching
    cursor.execute(
        "SELECT quarter_end FROM quarterly_financials WHERE ticker = ? ORDER BY quarter_end",
        (ticker,)
    )
    db_dates = [r[0] for r in cursor.fetchall()]

    updates = {f: 0 for f in DB_FIELDS}

    # Collect all quarter dates from EDGAR data (union of all fields)
    all_edgar_dates = set()
    for field in DB_FIELDS:
        all_edgar_dates.update(edgar_data.get(field, {}).keys())

    # Build a mapping: edgar_date -> matched_db_date (or new date for INSERT)
    date_mapping = {}  # type: Dict[str, str]
    for ed in all_edgar_dates:
        if db_dates:
            matched = fuzzy_match_date(ed, db_dates, tolerance_days=45)
            if matched:
                date_mapping[ed] = matched
                continue
        # No match — this date might create a new row
        normalized = normalize_to_quarter_end(ed)
        if normalized:
            date_mapping[ed] = normalized

    # Group edgar data by target DB date
    by_db_date = {}  # type: Dict[str, Dict[str, float]]
    for field in DB_FIELDS:
        tolerance = FIELD_TOLERANCE.get(field, 5)
        for edgar_date, value in edgar_data.get(field, {}).items():
            # Re-match with field-specific tolerance if DB dates exist
            if db_dates:
                target = fuzzy_match_date(edgar_date, db_dates, tolerance_days=tolerance)
            else:
                target = normalize_to_quarter_end(edgar_date)

            if not target:
                continue

            if target not in by_db_date:
                by_db_date[target] = {}
            # Don't overwrite if we already have a value for this field+date
            if field not in by_db_date[target]:
                by_db_date[target][field] = value

    # Execute UPSERTs
    for quarter_date, field_values in by_db_date.items():
        if not field_values:
            continue

        # Build UPSERT
        columns = ["ticker", "quarter_end", "source", "updated_at"]
        placeholders = ["?", "?", "?", "CURRENT_TIMESTAMP"]
        values = [ticker, quarter_date, "edgar"]

        update_parts = []

        for field in DB_FIELDS:
            if field in field_values:
                columns.append(field)
                placeholders.append("?")
                values.append(field_values[field])
                # COALESCE: keep existing non-NULL value, fill NULL with EDGAR
                update_parts.append(
                    "{f} = COALESCE({f}, excluded.{f})".format(f=field)
                )
                updates[field] += 1

        if not update_parts:
            continue

        # Also update source if we're adding data
        update_parts.append(
            "source = CASE WHEN source IS NULL THEN 'edgar' "
            "WHEN source NOT LIKE '%edgar%' THEN source || '+edgar' "
            "ELSE source END"
        )
        update_parts.append("updated_at = CURRENT_TIMESTAMP")

        sql = "INSERT INTO quarterly_financials ({cols}) VALUES ({phs}) ON CONFLICT(ticker, quarter_end) DO UPDATE SET {updates}".format(
            cols=", ".join(columns),
            phs=", ".join(placeholders),
            updates=", ".join(update_parts),
        )

        if not dry_run:
            try:
                cursor.execute(sql, values)
            except Exception as e:
                print("  DB error for {} {}: {}".format(ticker, quarter_date, e))

    if not dry_run:
        conn.commit()

    return updates


# ---------------------------------------------------------------------------
# Checkpoint
# ---------------------------------------------------------------------------

def load_checkpoint():
    # type: () -> Set[str]
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE) as f:
            return set(json.load(f).get("completed", []))
    return set()

def save_checkpoint(completed):
    # type: (Set[str]) -> None
    with open(CHECKPOINT_FILE, "w") as f:
        json.dump({"completed": sorted(completed), "last_updated": datetime.now().isoformat()}, f)

def clear_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Fetch ALL financial data from SEC EDGAR companyfacts (1 req/ticker)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--ticker", type=str, help="Single ticker")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--fresh", action="store_true", help="Ignore checkpoint")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY)
    parser.add_argument("--source", choices=["db", "collector", "expanded"], default="collector",
                        help="Ticker source: 'db' = existing DB, 'collector' = collector_state.json, 'expanded' = all NYSE+Nasdaq")
    args = parser.parse_args()

    if args.dry_run:
        print("[DRY RUN]\n")

    # Load CIK map (merge both sources)
    print("Loading CIK map...")
    with open(TICKERS_JSON) as f:
        cik_map = {e["ticker"]: e["cik"] for e in json.load(f)}
    if os.path.exists(EXPANDED_TICKERS):
        with open(EXPANDED_TICKERS) as f:
            for e in json.load(f):
                if e["ticker"] not in cik_map:
                    cik_map[e["ticker"]] = e["cik"]
    print("  {} tickers with CIK numbers".format(len(cik_map)))

    # Get ticker list
    if args.ticker:
        tickers = [args.ticker.upper()]
    elif args.source == "expanded":
        with open(EXPANDED_TICKERS) as f:
            tickers = [e["ticker"] for e in json.load(f)]
        print("  {} tickers from expanded list (NYSE+Nasdaq+existing)".format(len(tickers)))
    elif args.source == "collector":
        with open(COLLECTOR_STATE) as f:
            tickers = json.load(f).get("tickers_completed", [])
        print("  {} tickers from collector_state.json".format(len(tickers)))
    else:
        conn_tmp = sqlite3.connect(DB_PATH)
        tickers = [r[0] for r in conn_tmp.execute("SELECT DISTINCT ticker FROM quarterly_financials ORDER BY ticker")]
        conn_tmp.close()
        print("  {} tickers from DB".format(len(tickers)))

    if args.limit:
        tickers = tickers[:args.limit]

    # Checkpoint
    completed = set() if args.fresh else load_checkpoint()
    if completed:
        remaining = [t for t in tickers if t not in completed]
        print("  Resuming: {} done, {} remaining".format(len(completed), len(remaining)))
        tickers = remaining

    # Filter to those with CIK
    no_cik = [t for t in tickers if t not in cik_map]
    tickers = [t for t in tickers if t in cik_map]
    if no_cik:
        print("  Skipping {} without CIK (ETFs/indices)".format(len(no_cik)))

    if not tickers:
        print("Nothing to process!")
        return

    print("\nProcessing {} tickers ({} req each, delay {}s)".format(len(tickers), 1, args.delay))
    print("Estimated time: {:.1f} minutes\n".format(len(tickers) * args.delay / 60))

    conn = sqlite3.connect(DB_PATH)
    client = EdgarClient(USER_AGENT, args.delay)

    totals = {f: 0 for f in DB_FIELDS}
    skipped = []
    failed = []
    start_time = time.time()

    for i, ticker in enumerate(tickers):
        if shutdown_requested:
            print("\n[!] Stopping. Progress saved.")
            break

        cik = cik_map[ticker]
        elapsed = time.time() - start_time
        rate = (i + 1) / elapsed if elapsed > 0 else 0
        eta = (len(tickers) - i - 1) / rate / 60 if rate > 0 else 0

        print("[{}/{}] {} (CIK:{}) — {:.0f}% — ETA:{:.1f}m".format(
            i + 1, len(tickers), ticker, cik, (i + 1) / len(tickers) * 100, eta
        ), end="", flush=True)

        try:
            facts = client.fetch_company_facts(cik)
            if not facts or "facts" not in facts:
                skipped.append(ticker)
                print(" — no data")
                completed.add(ticker)
                continue

            edgar_data = extract_all_fields(facts)
            total_points = sum(len(v) for v in edgar_data.values())
            if total_points == 0:
                skipped.append(ticker)
                print(" — no matching concepts")
                completed.add(ticker)
                continue

            updates = upsert_ticker(conn, ticker, edgar_data, dry_run=args.dry_run)
            total_updated = sum(updates.values())
            for k in totals:
                totals[k] += updates[k]

            # Compact summary
            parts = []
            for f in ["revenue", "eps_diluted", "net_income", "shares_outstanding"]:
                if updates[f] > 0:
                    parts.append("{}:{}".format(f.split("_")[0], updates[f]))
            bs_total = sum(updates[f] for f in ["total_assets", "total_liabilities", "total_debt", "cash_and_equivalents", "stockholders_equity"])
            if bs_total > 0:
                parts.append("bs:{}".format(bs_total))
            other = sum(updates[f] for f in ["gross_profit", "operating_income", "free_cash_flow"])
            if other > 0:
                parts.append("other:{}".format(other))

            print(" — {} fields ({})".format(total_updated, ", ".join(parts) if parts else "0"))

            completed.add(ticker)
            if (i + 1) % 25 == 0:
                save_checkpoint(completed)

        except Exception as e:
            print(" — ERROR: {}".format(e))
            failed.append(ticker)

    save_checkpoint(completed)
    conn.close()

    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("EDGAR Comprehensive Fetch Complete")
    print("=" * 60)
    print("Time: {:.1f} min | Requests: {} | Errors: {}".format(
        elapsed / 60, client.total_requests, client.total_errors
    ))
    print("Processed: {} | Skipped: {} | Failed: {}".format(
        len(completed), len(skipped), len(failed)))
    print("\nFields upserted:")
    for f in DB_FIELDS:
        print("  {:<25s} {}".format(f, totals[f]))
    print("  {:<25s} {}".format("TOTAL", sum(totals.values())))

    if failed:
        print("\nFailed: {}".format(failed))

    if not shutdown_requested and not failed and not args.dry_run:
        clear_checkpoint()

    if not args.dry_run:
        print("\nNext: python3 scripts/export-fundamentals.py")


if __name__ == "__main__":
    main()
