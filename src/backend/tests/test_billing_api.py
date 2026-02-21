"""
Unit tests for billing API endpoints (src/backend/api/v1/billing.py).

Install test deps:  pip install pytest pytest-asyncio httpx
Run:                pytest src/backend/tests/test_billing_api.py -v
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import stripe as stripe_lib
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from src.backend.api.v1.billing import router
from src.backend.api.deps import get_database_service, get_stripe_service, get_user
from src.backend.schemas.error import AppError


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_client(db_mock, stripe_mock, user=None):
    """Build a minimal TestClient with the billing router and overridden deps."""
    app = FastAPI()
    app.include_router(router)

    @app.exception_handler(AppError)
    async def _err(request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "code": exc.code},
        )

    if user is None:
        user = {"sub": "user-123", "email": "test@example.com"}

    app.dependency_overrides[get_user] = lambda: user
    app.dependency_overrides[get_database_service] = lambda: db_mock
    app.dependency_overrides[get_stripe_service] = lambda: stripe_mock
    return TestClient(app)


def make_stripe_event(event_type: str, data_obj):
    event = MagicMock()
    event.type = event_type
    event.id = "evt_test"
    event.data.object = data_obj
    return event


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def db():
    m = AsyncMock()
    m.get_stripe_customer_id = AsyncMock(return_value="cus_abc")
    m.get_profile_by_stripe_customer = AsyncMock(return_value={
        "id": "user-123",
        "stripe_customer_id": "cus_abc",
        "stripe_subscription_id": "sub_abc",
    })
    m.update_profile_stripe = AsyncMock()
    m.downgrade_to_free = AsyncMock()
    m.get_subscription_status = AsyncMock(return_value={
        "plan": "pro",
        "subscription_status": "active",
        "plan_interval": "month",
        "current_period_end": "2026-03-01T00:00:00",
        "cancel_at_period_end": False,
    })
    return m


@pytest.fixture
def stripe_svc():
    m = AsyncMock()
    m.build_checkout_url = MagicMock(
        return_value="https://buy.stripe.com/test?client_reference_id=user-123"
    )
    m.create_portal_session = AsyncMock(
        return_value="https://billing.stripe.com/portal/test"
    )
    m.cancel_subscription = AsyncMock()
    m.resume_subscription = AsyncMock()
    return m


# ── GET /billing/checkout ─────────────────────────────────────────────────────

def test_checkout_month(db, stripe_svc):
    client = make_client(db, stripe_svc)
    resp = client.get("/billing/checkout?interval=month")
    assert resp.status_code == 200
    assert "checkout_url" in resp.json()
    stripe_svc.build_checkout_url.assert_called_once_with("user-123", "month", "test@example.com")


def test_checkout_year(db, stripe_svc):
    client = make_client(db, stripe_svc)
    resp = client.get("/billing/checkout?interval=year")
    assert resp.status_code == 200
    stripe_svc.build_checkout_url.assert_called_once_with("user-123", "year", "test@example.com")


def test_checkout_invalid_interval(db, stripe_svc):
    client = make_client(db, stripe_svc)
    resp = client.get("/billing/checkout?interval=week")
    assert resp.status_code == 400
    assert resp.json()["code"] == "VALIDATION_ERROR"


# ── POST /billing/portal ──────────────────────────────────────────────────────

def test_portal_success(db, stripe_svc):
    client = make_client(db, stripe_svc)
    resp = client.post("/billing/portal", json={"return_url": "https://app.test/settings"})
    assert resp.status_code == 200
    assert resp.json()["portal_url"] == "https://billing.stripe.com/portal/test"
    stripe_svc.create_portal_session.assert_awaited_once_with("cus_abc", "https://app.test/settings")


def test_portal_no_customer(db, stripe_svc):
    db.get_stripe_customer_id = AsyncMock(return_value=None)
    client = make_client(db, stripe_svc)
    resp = client.post("/billing/portal", json={"return_url": "https://app.test/settings"})
    assert resp.status_code == 400
    assert resp.json()["code"] == "VALIDATION_ERROR"


# ── POST /billing/cancel ──────────────────────────────────────────────────────

def test_cancel_success(db, stripe_svc):
    client = make_client(db, stripe_svc)
    resp = client.post("/billing/cancel")
    assert resp.status_code == 200
    stripe_svc.cancel_subscription.assert_awaited_once_with("sub_abc")
    db.update_profile_stripe.assert_awaited_once_with("user-123", cancel_at_period_end=True)


def test_cancel_no_profile(db, stripe_svc):
    db.get_profile_by_stripe_customer = AsyncMock(return_value=None)
    client = make_client(db, stripe_svc)
    resp = client.post("/billing/cancel")
    assert resp.status_code == 400


def test_cancel_missing_subscription_id(db, stripe_svc):
    db.get_profile_by_stripe_customer = AsyncMock(return_value={"id": "user-123"})
    client = make_client(db, stripe_svc)
    resp = client.post("/billing/cancel")
    assert resp.status_code == 400


# ── POST /billing/resume ──────────────────────────────────────────────────────

def test_resume_success(db, stripe_svc):
    client = make_client(db, stripe_svc)
    resp = client.post("/billing/resume")
    assert resp.status_code == 200
    stripe_svc.resume_subscription.assert_awaited_once_with("sub_abc")
    db.update_profile_stripe.assert_awaited_once_with("user-123", cancel_at_period_end=False)


def test_resume_no_profile(db, stripe_svc):
    db.get_profile_by_stripe_customer = AsyncMock(return_value=None)
    client = make_client(db, stripe_svc)
    resp = client.post("/billing/resume")
    assert resp.status_code == 400


# ── GET /billing/subscription — state matrix ──────────────────────────────────
#
#  State                │ plan  │ status    │ cancel_at_period_end │ period_end
#  ─────────────────────┼───────┼───────────┼─────────────────────┼───────────
#  Never subscribed     │ free  │ None      │ False               │ None
#  Active pro           │ pro   │ active    │ False               │ set
#  Pending cancel       │ pro   │ active    │ True                │ set
#  Expired / canceled   │ free  │ canceled  │ False               │ None

@pytest.mark.parametrize("db_row,expected", [
    (
        # 1. never subscribed — fresh free user
        {
            "plan": "free",
            "subscription_status": None,
            "plan_interval": None,
            "current_period_end": None,
            "cancel_at_period_end": False,
        },
        {
            "plan": "free",
            "subscription_status": None,
            "cancel_at_period_end": False,
            "current_period_end": None,
        },
    ),
    (
        # 2. active pro — normal paying user
        {
            "plan": "pro",
            "subscription_status": "active",
            "plan_interval": "month",
            "current_period_end": "2026-03-01T00:00:00",
            "cancel_at_period_end": False,
        },
        {
            "plan": "pro",
            "subscription_status": "active",
            "cancel_at_period_end": False,
            "current_period_end": "2026-03-01T00:00:00",
        },
    ),
    (
        # 3. pending cancel — user clicked cancel, still has access until period end
        {
            "plan": "pro",
            "subscription_status": "active",
            "plan_interval": "month",
            "current_period_end": "2026-03-01T00:00:00",
            "cancel_at_period_end": True,
        },
        {
            "plan": "pro",
            "subscription_status": "active",
            "cancel_at_period_end": True,
            "current_period_end": "2026-03-01T00:00:00",
        },
    ),
    (
        # 4. expired / downgraded — subscription.deleted webhook was processed
        {
            "plan": "free",
            "subscription_status": "canceled",
            "plan_interval": None,
            "current_period_end": None,
            "cancel_at_period_end": False,
        },
        {
            "plan": "free",
            "subscription_status": "canceled",
            "cancel_at_period_end": False,
            "current_period_end": None,
        },
    ),
])
def test_get_subscription_states(db, stripe_svc, db_row, expected):
    db.get_subscription_status = AsyncMock(return_value=db_row)
    client = make_client(db, stripe_svc)
    resp = client.get("/billing/subscription")

    assert resp.status_code == 200
    data = resp.json()
    for key, value in expected.items():
        assert data[key] == value, f"Field '{key}': expected {value!r}, got {data[key]!r}"


# ── POST /billing/webhook ─────────────────────────────────────────────────────

def test_webhook_invalid_signature(db, stripe_svc):
    stripe_svc.construct_webhook_event = MagicMock(
        side_effect=stripe_lib.SignatureVerificationError("bad sig", "header")
    )
    client = make_client(db, stripe_svc)
    resp = client.post(
        "/billing/webhook", content=b"payload",
        headers={"stripe-signature": "bad"},
    )
    assert resp.status_code == 400
    assert resp.json()["code"] == "VALIDATION_ERROR"


def test_webhook_checkout_completed(db, stripe_svc):
    session = {
        "client_reference_id": "user-123",
        "subscription": "sub_new",
        "customer": "cus_abc",
    }
    event = make_stripe_event("checkout.session.completed", session)
    stripe_svc.construct_webhook_event = MagicMock(return_value=event)

    sub_mock = {
        "items": {"data": [{"price": {"recurring": {"interval": "month"}}}]}
    }
    with patch("src.backend.api.v1.billing.stripe_lib.Subscription.retrieve", return_value=sub_mock):
        client = make_client(db, stripe_svc)
        resp = client.post("/billing/webhook", content=b"payload", headers={"stripe-signature": "sig"})

    assert resp.status_code == 200
    db.update_profile_stripe.assert_awaited_once()
    kwargs = db.update_profile_stripe.call_args.kwargs
    assert kwargs["plan"] == "pro"
    assert kwargs["subscription_status"] == "active"
    assert kwargs["plan_interval"] == "month"
    assert kwargs["cancel_at_period_end"] is False


def test_webhook_checkout_completed_missing_client_reference_id(db, stripe_svc):
    """Missing client_reference_id → logged + skipped, not a 500."""
    event = make_stripe_event("checkout.session.completed", {})
    stripe_svc.construct_webhook_event = MagicMock(return_value=event)

    client = make_client(db, stripe_svc)
    resp = client.post("/billing/webhook", content=b"payload", headers={"stripe-signature": "sig"})

    assert resp.status_code == 200
    db.update_profile_stripe.assert_not_awaited()


def test_webhook_subscription_updated(db, stripe_svc):
    sub = {
        "customer": "cus_abc",
        "status": "active",
        "cancel_at_period_end": True,
        "current_period_end": 1772000000,  # future Unix timestamp
    }
    event = make_stripe_event("customer.subscription.updated", sub)
    stripe_svc.construct_webhook_event = MagicMock(return_value=event)
    db.get_profile_by_stripe_customer = AsyncMock(return_value={
        "id": "user-123",
        "subscription_status": "active",
        "current_period_end": None,
    })

    client = make_client(db, stripe_svc)
    resp = client.post("/billing/webhook", content=b"payload", headers={"stripe-signature": "sig"})

    assert resp.status_code == 200
    db.update_profile_stripe.assert_awaited_once()
    kwargs = db.update_profile_stripe.call_args.kwargs
    assert kwargs["cancel_at_period_end"] is True
    assert kwargs["subscription_status"] == "active"


def test_webhook_subscription_updated_stale_event_skipped(db, stripe_svc):
    """Out-of-order event with older period_end must be silently skipped."""
    sub = {
        "customer": "cus_abc",
        "status": "active",
        "cancel_at_period_end": False,
        "current_period_end": 1000000000,  # 2001-09-09 — older than DB
    }
    event = make_stripe_event("customer.subscription.updated", sub)
    stripe_svc.construct_webhook_event = MagicMock(return_value=event)
    db.get_profile_by_stripe_customer = AsyncMock(return_value={
        "id": "user-123",
        "subscription_status": "active",
        "current_period_end": "2050-01-01T00:00:00",  # far future in DB
    })

    client = make_client(db, stripe_svc)
    resp = client.post("/billing/webhook", content=b"payload", headers={"stripe-signature": "sig"})

    assert resp.status_code == 200
    db.update_profile_stripe.assert_not_awaited()


def test_webhook_subscription_updated_no_profile(db, stripe_svc):
    """No profile found for customer → skipped, not a crash."""
    sub = {"customer": "cus_ghost", "status": "active", "cancel_at_period_end": False}
    event = make_stripe_event("customer.subscription.updated", sub)
    stripe_svc.construct_webhook_event = MagicMock(return_value=event)
    db.get_profile_by_stripe_customer = AsyncMock(return_value=None)

    client = make_client(db, stripe_svc)
    resp = client.post("/billing/webhook", content=b"payload", headers={"stripe-signature": "sig"})

    assert resp.status_code == 200
    db.update_profile_stripe.assert_not_awaited()


def test_webhook_subscription_deleted(db, stripe_svc):
    sub = {"customer": "cus_abc", "id": "sub_abc"}
    event = make_stripe_event("customer.subscription.deleted", sub)
    stripe_svc.construct_webhook_event = MagicMock(return_value=event)

    client = make_client(db, stripe_svc)
    resp = client.post("/billing/webhook", content=b"payload", headers={"stripe-signature": "sig"})

    assert resp.status_code == 200
    db.downgrade_to_free.assert_awaited_once_with("cus_abc")


def test_webhook_unknown_event_type_ignored(db, stripe_svc):
    event = make_stripe_event("invoice.payment_succeeded", {})
    stripe_svc.construct_webhook_event = MagicMock(return_value=event)

    client = make_client(db, stripe_svc)
    resp = client.post("/billing/webhook", content=b"payload", headers={"stripe-signature": "sig"})

    assert resp.status_code == 200
    db.downgrade_to_free.assert_not_awaited()
    db.update_profile_stripe.assert_not_awaited()
