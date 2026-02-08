"""
Quota enforcement helpers for usage limits.
"""
from fastapi import HTTPException


def raise_quota_exceeded(
    resource: str,
    current: int,
    limit: int,
    reset_at: str | None = None,
):
    """Raise a 429 HTTPException with standardized quota exceeded format."""
    raise HTTPException(
        status_code=429,
        detail={
            "detail": f"{resource} limit reached ({limit})",
            "code": "QUOTA_EXCEEDED",
            "meta": {
                "resource": resource,
                "current": current,
                "limit": limit,
                "reset_at": reset_at,
            },
        },
    )
