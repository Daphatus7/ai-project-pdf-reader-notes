"""
Subscription state machine tests.

State diagram:
                         checkout.session.completed
  FREE_NEVER_SUBSCRIBED ─────────────────────────────► ACTIVE_PRO
                                                            │    ▲
                         POST /billing/cancel               │    │ POST /billing/resume
                                                            ▼    │
                                                       PENDING_CANCEL
                                                            │
                         customer.subscription.deleted      │
                         (period expires)                   │
                                                            ▼
                                                       EXPIRED_FREE
                                                            │
                         checkout.session.completed         │
                         (re-subscribe, same customer)      │
                                                            ▼
                                                        ACTIVE_PRO

Additional self-transitions:
  ACTIVE_PRO     ──► ACTIVE_PRO      via subscription.updated (renewal)
  ACTIVE_PRO     ──► ACTIVE_PRO      via stale subscription.updated (ignored)

Each test:
  1. Instantiates StubDB with a known starting state
  2. Fires a transition (HTTP call or webhook payload)
  3. Asserts the resulting DB state

Stripe is fully stubbed — no network, no mock library noise.
"""
import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from src.backend.api.v1.billing import router
from src.backend.api.deps import get_database_service, get_stripe_service, get_user
from src.backend.schemas.error import AppError


# ── Known states ──────────────────────────────────────────────────────────────

FREE_NEVER_SUBSCRIBED = {
    "plan": "free",
    "subscription_status": None,
    "stripe_customer_id": None,
    "stripe_subscription_id": None,
    "plan_interval": None,
    "current_period_end": None,
    "cancel_at_period_end": False,
}

ACTIVE_PRO = {
    "plan": "pro",
    "subscription_status": "active",
    "stripe_customer_id": "cus_abc",
    "stripe_subscription_id": "sub_abc",
    "plan_interval": "month",
    "current_period_end": "2026-03-01T00:00:00",
    "cancel_at_period_end": False,
}

PENDING_CANCEL = {
    **ACTIVE_PRO,
    "cancel_at_period_end": True,
}

EXPIRED_FREE = {
    "plan": "free",
    "subscription_status": "canceled",
    "stripe_customer_id": "cus_abc",   # preserved — critical for re-subscribe
    "stripe_subscription_id": None,
    "plan_interval": None,
    "current_period_end": None,
    "cancel_at_period_end": False,
}


# ── Stubs ─────────────────────────────────────────────────────────────────────

class StubDB:
    """
    In-memory DB stub that mirrors the subscription methods of SupabaseStorage.
    State mutates on each write call — lets tests assert the final state directly.
    """

    def __init__(self, initial: dict):
        self._profile = dict(initial)

    # read -------------------------------------------------------------------

    async def get_stripe_customer_id(self, user_id: str):
        return self._profile.get("stripe_customer_id")

    async def get_profile_by_stripe_customer(self, stripe_customer_id: str):
        if self._profile.get("stripe_customer_id") != stripe_customer_id:
            return None
        return {"id": "user-123", **self._profile}

    async def get_subscription_status(self, user_id: str) -> dict:
        return {
            "plan": self._profile.get("plan", "free"),
            "subscription_status": self._profile.get("subscription_status"),
            "plan_interval": self._profile.get("plan_interval"),
            "current_period_end": self._profile.get("current_period_end"),
            "cancel_at_period_end": self._profile.get("cancel_at_period_end", False),
        }

    # write ------------------------------------------------------------------

    async def update_profile_stripe(self, user_id: str, **fields):
        self._profile.update(fields)

    async def downgrade_to_free(self, stripe_customer_id: str):
        self._profile.update({
            "plan": "free",
            "subscription_status": "canceled",
            "stripe_subscription_id": None,
            "cancel_at_period_end": False,
            "current_period_end": None,
            # stripe_customer_id intentionally NOT cleared
        })

    @property
    def state(self) -> dict:
        return dict(self._profile)


class StubStripe:
    """
    Stripe stub — records calls, never touches the network.
    construct_webhook_event parses the raw JSON payload directly
    instead of verifying a signature.
    """

    def build_checkout_url(self, user_id: str, interval: str, email: str = "") -> str:
        return f"https://checkout.stripe.test/{interval}?user={user_id}"

    async def cancel_subscription(self, sub_id: str) -> None:
        pass  # real effect is applied by the route via update_profile_stripe

    async def resume_subscription(self, sub_id: str) -> None:
        pass

    async def create_portal_session(self, customer_id: str, return_url: str) -> str:
        return "https://billing.stripe.test/portal"

    def construct_webhook_event(self, payload: bytes, sig: str):
        data = json.loads(payload)
        event = MagicMock()
        event.type = data["type"]
        event.id = data.get("id", "evt_test")
        event.data.object = data["data"]["object"]
        return event


# ── Helpers ───────────────────────────────────────────────────────────────────

_USER = {"sub": "user-123", "email": "test@example.com"}


def make_client(db: StubDB, stripe: StubStripe) -> TestClient:
    app = FastAPI()
    app.include_router(router)

    @app.exception_handler(AppError)
    async def _handle_app_error(request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "code": exc.code},
        )

    app.dependency_overrides[get_user] = lambda: _USER
    app.dependency_overrides[get_database_service] = lambda: db
    app.dependency_overrides[get_stripe_service] = lambda: stripe
    return TestClient(app)


def fire_webhook(client: TestClient, event_type: str, data_obj: dict) -> int:
    payload = json.dumps({
        "type": event_type,
        "id": "evt_test",
        "data": {"object": data_obj},
    }).encode()
    resp = client.post(
        "/billing/webhook",
        content=payload,
        headers={"stripe-signature": "stub"},
    )
    return resp.status_code


# ── State machine tests ───────────────────────────────────────────────────────

def test_free_never_subscribed__checkout_completed__becomes_active_pro():
    """
    FREE_NEVER_SUBSCRIBED ──► ACTIVE_PRO
    Trigger: checkout.session.completed (first-time subscriber)
    """
    db = StubDB(FREE_NEVER_SUBSCRIBED)
    client = make_client(db, StubStripe())

    sub_obj = {"items": {"data": [{"price": {"recurring": {"interval": "month"}}}]}}
    with patch("src.backend.api.v1.billing.stripe_lib.Subscription.retrieve", return_value=sub_obj):
        status = fire_webhook(client, "checkout.session.completed", {
            "client_reference_id": "user-123",
            "subscription": "sub_abc",
            "customer": "cus_abc",
        })

    assert status == 200
    s = db.state
    assert s["plan"] == "pro"
    assert s["subscription_status"] == "active"
    assert s["stripe_customer_id"] == "cus_abc"
    assert s["stripe_subscription_id"] == "sub_abc"
    assert s["plan_interval"] == "month"
    assert s["cancel_at_period_end"] is False


def test_active_pro__cancel__becomes_pending_cancel():
    """
    ACTIVE_PRO ──► PENDING_CANCEL
    Trigger: POST /billing/cancel
    User keeps Pro access until period_end — only the flag flips.
    """
    db = StubDB(ACTIVE_PRO)
    client = make_client(db, StubStripe())

    resp = client.post("/billing/cancel")

    assert resp.status_code == 200
    s = db.state
    assert s["plan"] == "pro"                    # still pro
    assert s["subscription_status"] == "active"  # still active — not expired yet
    assert s["cancel_at_period_end"] is True      # flag flipped
    assert s["stripe_subscription_id"] == "sub_abc"  # preserved


def test_pending_cancel__resume__becomes_active_pro():
    """
    PENDING_CANCEL ──► ACTIVE_PRO
    Trigger: POST /billing/resume
    """
    db = StubDB(PENDING_CANCEL)
    client = make_client(db, StubStripe())

    resp = client.post("/billing/resume")

    assert resp.status_code == 200
    s = db.state
    assert s["plan"] == "pro"
    assert s["cancel_at_period_end"] is False
    assert s["stripe_subscription_id"] == "sub_abc"


def test_pending_cancel__period_expires__becomes_expired_free():
    """
    PENDING_CANCEL ──► EXPIRED_FREE
    Trigger: customer.subscription.deleted (Stripe fires when period ends)
    """
    db = StubDB(PENDING_CANCEL)
    client = make_client(db, StubStripe())

    status = fire_webhook(client, "customer.subscription.deleted", {
        "customer": "cus_abc",
        "id": "sub_abc",
    })

    assert status == 200
    s = db.state
    assert s["plan"] == "free"
    assert s["subscription_status"] == "canceled"
    assert s["stripe_subscription_id"] is None
    assert s["cancel_at_period_end"] is False
    assert s["current_period_end"] is None
    assert s["stripe_customer_id"] == "cus_abc"  # preserved for re-subscribe


def test_expired_free__resubscribe__becomes_active_pro_same_customer():
    """
    EXPIRED_FREE ──► ACTIVE_PRO
    Trigger: checkout.session.completed (re-subscribe)
    stripe_customer_id must be the SAME — billing history preserved.
    """
    db = StubDB(EXPIRED_FREE)
    client = make_client(db, StubStripe())

    sub_obj = {"items": {"data": [{"price": {"recurring": {"interval": "year"}}}]}}
    with patch("src.backend.api.v1.billing.stripe_lib.Subscription.retrieve", return_value=sub_obj):
        status = fire_webhook(client, "checkout.session.completed", {
            "client_reference_id": "user-123",
            "subscription": "sub_new",
            "customer": "cus_abc",   # same Stripe customer as before
        })

    assert status == 200
    s = db.state
    assert s["plan"] == "pro"
    assert s["subscription_status"] == "active"
    assert s["stripe_customer_id"] == "cus_abc"   # same, not a new one
    assert s["stripe_subscription_id"] == "sub_new"
    assert s["plan_interval"] == "year"
    assert s["cancel_at_period_end"] is False


def test_active_pro__renewal_webhook__period_end_advances():
    """
    ACTIVE_PRO ──► ACTIVE_PRO  (self-transition on monthly renewal)
    Trigger: customer.subscription.updated with newer period_end
    """
    db = StubDB(ACTIVE_PRO)   # current_period_end = 2026-03-01
    client = make_client(db, StubStripe())

    new_ts = 1803600000  # ≈ 2027-02-27 — newer than current DB value

    status = fire_webhook(client, "customer.subscription.updated", {
        "customer": "cus_abc",
        "status": "active",
        "cancel_at_period_end": False,
        "current_period_end": new_ts,
    })

    assert status == 200
    s = db.state
    assert s["plan"] == "pro"
    assert s["subscription_status"] == "active"
    assert s["cancel_at_period_end"] is False
    assert s["current_period_end"] != "2026-03-01T00:00:00"  # advanced


def test_active_pro__stale_webhook__state_unchanged():
    """
    ACTIVE_PRO ──► ACTIVE_PRO  (out-of-order event is a no-op)
    Trigger: subscription.updated with an older period_end than the DB has.
    Guards against event replay / race conditions rolling back the DB.
    """
    db = StubDB(ACTIVE_PRO)   # current_period_end = 2026-03-01
    client = make_client(db, StubStripe())

    old_ts = 1000000000  # 2001-09-09 — far older than DB

    status = fire_webhook(client, "customer.subscription.updated", {
        "customer": "cus_abc",
        "status": "active",
        "cancel_at_period_end": False,
        "current_period_end": old_ts,
    })

    assert status == 200
    assert db.state["current_period_end"] == "2026-03-01T00:00:00"  # unchanged


def test_active_pro__cancel_then_resume__returns_to_active():
    """
    ACTIVE_PRO ──► PENDING_CANCEL ──► ACTIVE_PRO  (two-step round-trip)
    Verifies cancel → resume brings state fully back.
    """
    db = StubDB(ACTIVE_PRO)
    client = make_client(db, StubStripe())

    client.post("/billing/cancel")
    assert db.state["cancel_at_period_end"] is True   # mid-state check

    client.post("/billing/resume")

    s = db.state
    assert s["plan"] == "pro"
    assert s["cancel_at_period_end"] is False
    assert s["subscription_status"] == "active"


def test_pending_cancel__cancel_again__idempotent():
    """
    PENDING_CANCEL ──► PENDING_CANCEL  (calling cancel twice is harmless)
    """
    db = StubDB(PENDING_CANCEL)
    client = make_client(db, StubStripe())

    resp = client.post("/billing/cancel")

    assert resp.status_code == 200
    assert db.state["cancel_at_period_end"] is True
    assert db.state["plan"] == "pro"
