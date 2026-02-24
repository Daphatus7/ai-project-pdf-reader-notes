import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_CONFIG_PATH = Path(__file__).resolve().parent.parent / "server_configuration.json"


@lru_cache(maxsize=1)
def load_server_config() -> dict[str, Any]:
    """Load and cache server_configuration.json."""
    with open(_CONFIG_PATH) as f:
        return json.load(f)


def get_tier_config(tier: str) -> dict[str, Any]:
    return load_server_config()["tiers"][tier]


def get_worker_config() -> dict[str, Any]:
    return load_server_config()["worker"]


def get_policy_config() -> dict[str, Any]:
    return load_server_config()["policy"]
