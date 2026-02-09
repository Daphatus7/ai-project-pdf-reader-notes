"""
Standardized API error responses.

All errors return flat JSON: {"detail": "...", "code": "...", "meta": {...}}
Caught by AppError handler registered in main.py.
"""


class ErrorCode:
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTH_REQUIRED = "AUTH_REQUIRED"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"


class AppError(Exception):
    """Application error — caught by global handler, returns flat JSON."""
    def __init__(self, status_code: int, code: str, detail: str, meta: dict | None = None):
        self.status_code = status_code
        self.code = code
        self.detail = detail
        self.meta = meta


# ---- Convenience functions (all raise, never return) ----

def validation_error(detail: str):
    raise AppError(400, ErrorCode.VALIDATION_ERROR, detail)


def auth_required(detail: str = "Authentication required"):
    raise AppError(401, ErrorCode.AUTH_REQUIRED, detail)


def not_found(resource: str):
    raise AppError(404, ErrorCode.NOT_FOUND, f"{resource} not found")


def conflict(detail: str):
    raise AppError(409, ErrorCode.CONFLICT, detail)


def quota_exceeded(resource: str, current: int, limit: int):
    messages = {
        "projects": "You have reached the maximum number of projects. Please upgrade your plan.",
        "documents": "You have reached the maximum number of documents. Please upgrade your plan.",
        "notes": "You have reached the maximum number of notes. Please upgrade your plan.",
        "tokens": "You have used all available tokens. Please upgrade your plan.",
    }
    detail = messages.get(resource, f"You have reached the {resource} limit. Please upgrade your plan.")
    raise AppError(429, ErrorCode.QUOTA_EXCEEDED, detail, meta={
        "resource": resource, "current": current, "limit": limit,
    })


def internal_error(detail: str = "Internal server error"):
    raise AppError(500, ErrorCode.INTERNAL_ERROR, detail)


def service_unavailable(service: str):
    raise AppError(503, ErrorCode.SERVICE_UNAVAILABLE, f"{service} is currently unavailable")
