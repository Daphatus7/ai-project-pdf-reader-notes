"""
Unit tests for StripeService (src/backend/services/stripe_service.py).

Run:  pytest src/backend/tests/test_stripe_service.py -v
"""
from unittest.mock import MagicMock, patch

import pytest

from src.backend.services.stripe_service import StripeService
from src.backend.schemas.error import AppError


@pytest.fixture
def svc():
    return StripeService()


# ── build_checkout_url ────────────────────────────────────────────────────────

def test_checkout_url_month(svc):
    with patch("src.backend.services.stripe_service.settings") as s:
        s.stripe_payment_link_monthly = "https://buy.stripe.com/monthly"
        url = svc.build_checkout_url("user-1", "month")
    assert url == "https://buy.stripe.com/monthly?client_reference_id=user-1"


def test_checkout_url_year(svc):
    with patch("src.backend.services.stripe_service.settings") as s:
        s.stripe_payment_link_yearly = "https://buy.stripe.com/yearly"
        url = svc.build_checkout_url("user-1", "year")
    assert url == "https://buy.stripe.com/yearly?client_reference_id=user-1"


def test_checkout_url_email_url_encoded(svc):
    """Special characters in email must be percent-encoded."""
    with patch("src.backend.services.stripe_service.settings") as s:
        s.stripe_payment_link_monthly = "https://buy.stripe.com/monthly"
        url = svc.build_checkout_url("user-1", "month", "test+tag@example.com")
    assert "prefilled_email=test%2Btag%40example.com" in url


def test_checkout_url_no_email_omits_param(svc):
    with patch("src.backend.services.stripe_service.settings") as s:
        s.stripe_payment_link_monthly = "https://buy.stripe.com/monthly"
        url = svc.build_checkout_url("user-1", "month", "")
    assert "prefilled_email" not in url


# ── cancel_subscription ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cancel_subscription(svc):
    with patch("src.backend.services.stripe_service.stripe.Subscription.modify") as mock_modify:
        await svc.cancel_subscription("sub_abc")
    mock_modify.assert_called_once_with("sub_abc", cancel_at_period_end=True)


# ── resume_subscription ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_resume_subscription(svc):
    with patch("src.backend.services.stripe_service.stripe.Subscription.modify") as mock_modify:
        await svc.resume_subscription("sub_abc")
    mock_modify.assert_called_once_with("sub_abc", cancel_at_period_end=False)


# ── create_portal_session ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_portal_session_success(svc):
    mock_session = MagicMock()
    mock_session.url = "https://billing.stripe.com/portal/test"
    with patch(
        "src.backend.services.stripe_service.stripe.billing_portal.Session.create",
        return_value=mock_session,
    ):
        url = await svc.create_portal_session("cus_abc", "https://app.test/return")
    assert url == "https://billing.stripe.com/portal/test"


@pytest.mark.asyncio
async def test_create_portal_session_no_url_raises(svc):
    """Stripe returning a session with no URL must raise AppError 500."""
    mock_session = MagicMock()
    mock_session.url = None
    with patch(
        "src.backend.services.stripe_service.stripe.billing_portal.Session.create",
        return_value=mock_session,
    ):
        with pytest.raises(AppError) as exc_info:
            await svc.create_portal_session("cus_abc", "https://app.test/return")
    assert exc_info.value.status_code == 500


# ── construct_webhook_event ───────────────────────────────────────────────────

def test_construct_webhook_event_success(svc):
    mock_event = MagicMock()
    with patch(
        "src.backend.services.stripe_service.stripe.Webhook.construct_event",
        return_value=mock_event,
    ) as mock_construct:
        with patch("src.backend.services.stripe_service.settings") as s:
            s.stripe_webhook_secret = "whsec_test"
            result = svc.construct_webhook_event(b"payload", "sig_header")
        mock_construct.assert_called_once_with(b"payload", "sig_header", "whsec_test")
    assert result is mock_event
