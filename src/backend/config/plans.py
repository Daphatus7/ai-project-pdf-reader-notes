"""
Plan configuration loader.
Reads free_plan.json and pro_plan.json as the source of truth for quota limits.
"""
import json
from pathlib import Path

_config_dir = Path(__file__).parent

def _load(filename: str) -> dict:
    with open(_config_dir / filename, encoding="utf-8") as f:
        return json.load(f)

PLANS: dict[str, dict] = {
    "free": _load("free_plan.json"),
    "pro":  _load("pro_plan.json"),
}

def get_plan_quotas(plan_id: str) -> dict:
    """Return quotas dict for the given plan. Falls back to free if unknown."""
    return PLANS.get(plan_id, PLANS["free"])["quotas"]
