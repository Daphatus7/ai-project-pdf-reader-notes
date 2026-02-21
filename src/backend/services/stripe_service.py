import logging
import stripe

from src.backend.config.config import settings
from src.backend.schemas.error import AppError, ErrorCode

logger = logging.getLogger(__name__)


class StripeService:
    """Encapsulates all Stripe SDK calls."""

    def start(self):
        stripe.api_key = settings.stripe_secret_key

    def build_checkout_url(self, user_id: str, interval: str, email: str = '') -> str:
        """Return the Payment Link URL with client_reference_id and optional prefilled_email."""
        import urllib.parse
        if interval == 'year':
            base = settings.stripe_payment_link_yearly
        else:
            base = settings.stripe_payment_link_monthly
        url = f"{base}?client_reference_id={user_id}"
        if email:
            url += f"&prefilled_email={urllib.parse.quote(email)}"
        return url

    async def create_portal_session(self, stripe_customer_id: str, return_url: str) -> str:
        """Create a Stripe Customer Portal session, return the portal URL."""
        session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=return_url,
        )
        if not session.url:
            raise AppError(500, ErrorCode.INTERNAL_ERROR, "Failed to create portal session")
        return session.url

    async def cancel_subscription(self, stripe_subscription_id: str) -> None:
        """Set cancel_at_period_end=True — user keeps access until period ends."""
        stripe.Subscription.modify(
            stripe_subscription_id,
            cancel_at_period_end=True,
        )
        logger.info(f"Subscription {stripe_subscription_id} set to cancel at period end")

    async def resume_subscription(self, stripe_subscription_id: str) -> None:
        """Undo cancel_at_period_end — user resumes their subscription."""
        stripe.Subscription.modify(
            stripe_subscription_id,
            cancel_at_period_end=False,
        )
        logger.info(f"Subscription {stripe_subscription_id} resumed")

    def construct_webhook_event(self, payload: bytes, sig_header: str) -> stripe.Event:
        """Verify Stripe webhook signature and return the event object."""
        return stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
