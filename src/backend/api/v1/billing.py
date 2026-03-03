import logging
from datetime import datetime

import stripe as stripe_lib
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel


class PortalRequest(BaseModel):
    return_url: str

from src.backend.api.deps import get_database_service, get_stripe_service, get_user
from src.backend.schemas.error import AppError, ErrorCode, validation_error

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/billing', tags=['billing'])


# ==================== Checkout ====================

@router.get('/checkout')
async def get_checkout_url(
    interval: str = 'month',
    user=Depends(get_user),
    stripe_service=Depends(get_stripe_service),
):
    """Return a Payment Link URL with client_reference_id for the authenticated user."""
    if interval not in ('month', 'year'):
        validation_error("interval must be 'month' or 'year'")

    user_id = user['sub']
    email = user.get('email', '')
    checkout_url = stripe_service.build_checkout_url(user_id, interval, email)
    return {'checkout_url': checkout_url}


# ==================== Customer Portal ====================

@router.post('/portal')
async def create_portal(
    body: PortalRequest,
    user=Depends(get_user),
    database_service=Depends(get_database_service),
    stripe_service=Depends(get_stripe_service),
):
    """Create a Stripe Customer Portal session for managing an existing subscription."""
    user_id = user['sub']
    return_url = body.return_url

    stripe_customer_id = await database_service.get_stripe_customer_id(user_id)
    if not stripe_customer_id:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "No active subscription found")

    portal_url = await stripe_service.create_portal_session(stripe_customer_id, return_url)
    return {'portal_url': portal_url}


# ==================== Cancel / Resume ====================

@router.post('/cancel')
async def cancel_subscription(
    user=Depends(get_user),
    database_service=Depends(get_database_service),
    stripe_service=Depends(get_stripe_service),
):
    """Set subscription to cancel at period end."""
    user_id = user['sub']
    stripe_customer_id = await database_service.get_stripe_customer_id(user_id)
    profile = await database_service.get_profile_by_stripe_customer(stripe_customer_id or '')
    if not profile or not profile.get('stripe_subscription_id'):
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "No active subscription found")

    await stripe_service.cancel_subscription(profile['stripe_subscription_id'])
    await database_service.update_profile_stripe(user_id, cancel_at_period_end=True)
    return {'message': 'Subscription will cancel at period end'}


@router.post('/resume')
async def resume_subscription(
    user=Depends(get_user),
    database_service=Depends(get_database_service),
    stripe_service=Depends(get_stripe_service),
):
    """Resume a subscription that was set to cancel."""
    user_id = user['sub']
    stripe_customer_id = await database_service.get_stripe_customer_id(user_id)
    profile = await database_service.get_profile_by_stripe_customer(stripe_customer_id or '')
    if not profile or not profile.get('stripe_subscription_id'):
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "No active subscription found")

    await stripe_service.resume_subscription(profile['stripe_subscription_id'])
    await database_service.update_profile_stripe(user_id, cancel_at_period_end=False)
    return {'message': 'Subscription resumed'}


# ==================== Subscription Status ====================

@router.get('/subscription')
async def get_subscription(
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """Return current subscription status for the authenticated user."""
    user_id = user['sub']
    profile = await database_service.get_subscription_status(user_id)
    return {
        'plan': profile.get('plan', 'free'),
        'subscription_status': profile.get('subscription_status'),
        'plan_interval': profile.get('plan_interval'),
        'current_period_end': profile.get('current_period_end'),
        'cancel_at_period_end': profile.get('cancel_at_period_end', False),
    }


# ==================== Webhook (high security risks)====================

@router.post('/webhook')
async def stripe_webhook(
    request: Request,
    database_service=Depends(get_database_service),
    stripe_service=Depends(get_stripe_service),
):
    """Receive and process Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature', '')

    try:
        event = stripe_service.construct_webhook_event(payload, sig_header)
    except stripe_lib.SignatureVerificationError:
        logger.warning("Webhook signature verification failed — possible spoofed request")
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Invalid webhook signature")

    event_type = event.type
    event_id = event.id

    if event_type == 'checkout.session.completed':
        logger.info(f"[{event_id}] Received checkout.session.completed event")
        await _handle_checkout_completed(event.data.object, database_service, event_id)
    elif event_type == 'customer.subscription.updated':
        logger.info(f"[{event_id}] Received customer.subscription.updated event")
        await _handle_subscription_updated(event.data.object, database_service, event_id)
    elif event_type == 'customer.subscription.deleted':
        logger.info(f"[{event_id}] Received customer.subscription.deleted event")
        await _handle_subscription_deleted(event.data.object, database_service, event_id)

    # Return 200 only after successful handling
    return {'status': 'ok'}


# ==================== Webhook Handlers ====================

async def _handle_checkout_completed(session, database_service, event_id: str) -> None:
    """Payment succeeded — activate Pro subscription."""

    # Data validation — retrying won't fix missing fields, log and skip
    user_id = session.get('client_reference_id')
    if not user_id:
        logger.warning(f"[{event_id}] checkout.session.completed: missing client_reference_id, skipping")
        return

    subscription_id = session.get('subscription')
    if not subscription_id:
        logger.warning(f"[{event_id}] checkout.session.completed: missing subscription for user={user_id}, skipping")
        return

    stripe_customer_id = session.get('customer')
    if not stripe_customer_id:
        logger.warning(f"[{event_id}] checkout.session.completed: missing customer for user={user_id}, skipping")
        return

    # Network call — let exceptions propagate so Stripe retries
    sub = stripe_lib.Subscription.retrieve(subscription_id)

    items = sub.get('items', {}).get('data', [])
    if not items:
        logger.error(f"[{event_id}] checkout.session.completed: subscription={subscription_id} has no items, skipping")
        return

    interval = items[0]['price']['recurring']['interval']

    # DB write — let exceptions propagate so Stripe retries
    # current_period_end is NOT set here — subscription may not be fully settled yet (race condition).
    # customer.subscription.updated fires immediately after and sets it.
    await database_service.update_profile_stripe(
        user_id,
        stripe_customer_id=stripe_customer_id,
        stripe_subscription_id=subscription_id,
        subscription_status='active',
        plan='pro',
        plan_interval=interval,
        cancel_at_period_end=False,
    )
    logger.info(
        f"[{event_id}] checkout.session.completed: activated pro "
        f"user={user_id} customer={stripe_customer_id} "
        f"subscription={subscription_id} interval={interval}"
    )


async def _handle_subscription_updated(sub, database_service, event_id: str) -> None:
    """Subscription changed — sync status, cancel flag, period end."""
    stripe_customer_id = sub.get('customer')
    if not stripe_customer_id:
        logger.warning(f"[{event_id}] subscription.updated: missing customer, skipping")
        return

    logger.warning(f"[{event_id}] subscription.updated raw keys: { {k: sub.get(k) for k in ['current_period_end', 'status', 'cancel_at_period_end']} }")
    raw_period_end = sub.get('current_period_end')
    new_period_end = datetime.fromtimestamp(raw_period_end) if raw_period_end else None
    new_status = sub.get('status')
    new_cancel_at_period_end = sub.get('cancel_at_period_end')

    # DB read — let exceptions propagate so Stripe retries
    profile = await database_service.get_profile_by_stripe_customer(stripe_customer_id)
    if not profile:
        logger.warning(f"[{event_id}] subscription.updated: no profile for customer={stripe_customer_id}, skipping")
        return

    # Guard against out-of-order events (only when both sides have a period_end)
    existing_end = profile.get('current_period_end')
    if existing_end and new_period_end:
        try:
            existing_dt = datetime.fromisoformat(str(existing_end).replace('Z', '+00:00'))
            if new_period_end.replace(tzinfo=None) < existing_dt.replace(tzinfo=None):
                logger.info(f"[{event_id}] subscription.updated: stale event for customer={stripe_customer_id}, skipping")
                return
        except ValueError:
            logger.warning(f"[{event_id}] subscription.updated: could not parse existing period_end='{existing_end}', proceeding anyway")

    period_end_iso = new_period_end.isoformat() if new_period_end else None

    # DB write — let exceptions propagate so Stripe retries
    await database_service.update_profile_stripe(
        profile['id'],
        subscription_status=new_status,
        cancel_at_period_end=new_cancel_at_period_end,
        current_period_end=period_end_iso,
    )
    logger.info(
        f"[{event_id}] subscription.updated: customer={stripe_customer_id} "
        f"status={profile.get('subscription_status')} → {new_status} "
        f"cancel_at_period_end={new_cancel_at_period_end} "
        f"period_end={period_end_iso}"
    )


async def _handle_subscription_deleted(sub, database_service, event_id: str) -> None:
    """Subscription ended — downgrade to free."""
    stripe_customer_id = sub.get('customer')
    if not stripe_customer_id:
        logger.warning(f"[{event_id}] subscription.deleted: missing customer, skipping")
        return

    subscription_id = sub.get('id')
    # DB write — let exceptions propagate so Stripe retries
    await database_service.downgrade_to_free(stripe_customer_id)
    logger.info(
        f"[{event_id}] subscription.deleted: downgraded to free "
        f"customer={stripe_customer_id} subscription={subscription_id}"
    )


