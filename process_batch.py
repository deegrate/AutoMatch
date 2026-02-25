import json
import logging
import os
import glob
import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
from agent_c import AgentC
from agent_d import append_product_row

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

RUNS_LOG_PATH = Path("runs_log.csv")

RUNS_HEADERS = [
    "run_id",
    "started_at",
    "finished_at",
    "supplier_name",
    "total_products",
    "matched_products",
    "needs_review_yes",
    "needs_review_no",
    "avg_match_confidence",
    "min_match_confidence",
    "max_match_confidence",
    "discover_limit"
]

def ensure_runs_log_headers() -> None:
    if not RUNS_LOG_PATH.exists() or RUNS_LOG_PATH.stat().st_size == 0:
        with RUNS_LOG_PATH.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(RUNS_HEADERS)

def write_run_stats(
    run_id: str,
    started_at: datetime,
    finished_at: datetime,
    supplier_name: str,
    results: List[Dict[str, Any]],
    discover_limit: Optional[int] = None
) -> None:
    ensure_runs_log_headers()

    total_products = len(results)
    matched_products = sum(1 for r in results if r.get("match_found"))
    needs_review_yes = sum(1 for r in results if r.get("needs_review") == "YES")
    needs_review_no = sum(1 for r in results if r.get("needs_review") == "NO")

    confidences: List[float] = [
        float(r["match_confidence"])
        for r in results
        if r.get("match_confidence") is not None
    ]

    if confidences:
        avg_conf = sum(confidences) / len(confidences)
        min_conf = min(confidences)
        max_conf = max(confidences)
    else:
        avg_conf = 0.0
        min_conf = 0.0
        max_conf = 0.0

    row = [
        run_id,
        started_at.astimezone(timezone.utc).isoformat(),
        finished_at.astimezone(timezone.utc).isoformat(),
        supplier_name,
        total_products,
        matched_products,
        needs_review_yes,
        needs_review_no,
        f"{avg_conf:.4f}",
        f"{min_conf:.4f}",
        f"{max_conf:.4f}",
        discover_limit or ""
    ]

    with RUNS_LOG_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(row)
    logger.info(f"Run {run_id} logged to {RUNS_LOG_PATH}")

def process_checkpoints(discover_limit: Optional[int] = None):
    started_at = datetime.now(timezone.utc)
    limit_suffix = f"-limit{discover_limit}" if discover_limit else ""
    run_id = started_at.strftime(f"qiqiyg-%Y%m%dT%H%M%S{limit_suffix}")
    
    agent_c = AgentC()
    checkpoints = glob.glob("checkpoint_*.json")
    
    if not checkpoints:
        logger.info("No checkpoints found.")
        return

    results = []
    for cp_file in checkpoints:
        logger.info(f"Processing {cp_file}...")
        try:
            with open(cp_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            raw = data["raw"]
            inference = data["inference"]
            
            # Agent C: Search & Match using Gemini with Google Search grounding
            # Agent C now handles web searching internally via google_search tool
            match_result = agent_c.find_match(raw, inference)
            logger.info(f"Match result for {raw['product_internal_id']}: {match_result.get('match_found')}")
            
            match_file = f"match_{raw['product_internal_id']}.json"
            with open(match_file, "w", encoding="utf-8") as f:
                json.dump(match_result, f, indent=2)
            
            # Agent D: Append to CSV and get review signal
            review_flag = append_product_row(raw, match_result, inference)
            
            # Record result for run stats
            results.append({
                "match_found": match_result.get("match_found", False),
                "match_confidence": match_result.get("match_confidence"),
                "needs_review": review_flag
            })
            
        except Exception as e:
            logger.error(f"Error processing {cp_file}: {e}")

    finished_at = datetime.now(timezone.utc)
    write_run_stats(
        run_id=run_id,
        started_at=started_at,
        finished_at=finished_at,
        supplier_name="QiQiYG",
        results=results,
        discover_limit=discover_limit
    )

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, help="Processing limit used for the run")
    args = parser.parse_args()
    
    process_checkpoints(discover_limit=args.limit)
