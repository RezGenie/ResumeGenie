"""
Subscription API endpoints for Stripe integration
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.subscription import Subscription, SubscriptionTier
from app.services.stripe_service import StripeService
from app.core.config import settings

router = APIRouter(tags=["subscriptions"])


# Pydantic models
class CheckoutRequest(BaseModel):
    tier: SubscriptionTier


class CheckoutResponse(BaseModel):
    session_id: str
    url: str


class SubscriptionResponse(BaseModel):
    tier: SubscriptionTier
    status: str
    current_period_end: Optional[str]
    cancel_at_period_end: bool
    daily_wish_limit: int


class PortalResponse(BaseModel):
    url: str


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Stripe Checkout session for subscription
    """
    # Get or create Stripe customer
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription or not subscription.stripe_customer_id:
        # Create Stripe customer
        customer_id = await StripeService.create_customer(
            email=current_user.email,
            user_id=str(current_user.id)
        )
        
        if not subscription:
            subscription = Subscription(
                user_id=current_user.id,
                stripe_customer_id=customer_id
            )
            db.add(subscription)
            await db.commit()
        else:
            subscription.stripe_customer_id = customer_id
            await db.commit()
    else:
        customer_id = subscription.stripe_customer_id

    # Get price ID based on tier
    price_mapping = {
        SubscriptionTier.PRO: settings.stripe_pro_price_id,
        SubscriptionTier.UNLIMITED: settings.stripe_unlimited_price_id,
    }
    
    price_id = price_mapping.get(request.tier)
    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid subscription tier")

    # Create checkout session
    frontend_url = "http://localhost:3000"  # TODO: Get from settings
    session_data = await StripeService.create_checkout_session(
        customer_id=customer_id,
        price_id=price_id,
        success_url=f"{frontend_url}/dashboard?subscription=success",
        cancel_url=f"{frontend_url}/pricing?subscription=canceled",
        user_id=str(current_user.id)
    )

    return CheckoutResponse(**session_data)


@router.get("/status", response_model=SubscriptionResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's subscription status
    """
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        # Create free subscription
        subscription = Subscription(
            user_id=current_user.id,
            tier=SubscriptionTier.FREE
        )
        db.add(subscription)
        await db.commit()
        await db.refresh(subscription)

    return SubscriptionResponse(
        tier=subscription.tier,
        status=subscription.status.value,
        current_period_end=subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        cancel_at_period_end=subscription.cancel_at_period_end,
        daily_wish_limit=subscription.daily_wish_limit
    )


@router.post("/portal", response_model=PortalResponse)
async def create_portal_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Stripe Customer Portal session
    """
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription or not subscription.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No subscription found")

    frontend_url = "http://localhost:3000"  # TODO: Get from settings
    portal_data = await StripeService.create_customer_portal_session(
        customer_id=subscription.stripe_customer_id,
        return_url=f"{frontend_url}/dashboard"
    )

    return PortalResponse(**portal_data)


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel subscription at period end
    """
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription or not subscription.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription found")

    success = await StripeService.cancel_subscription(subscription.stripe_subscription_id)
    
    if success:
        subscription.cancel_at_period_end = True
        await db.commit()
        return {"message": "Subscription will be canceled at period end"}
    else:
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: AsyncSession = Depends(get_db)
):
    """
    Handle Stripe webhook events
    """
    payload = await request.body()
    
    # Verify webhook signature
    event = StripeService.verify_webhook_signature(payload, stripe_signature)
    if not event:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]

    # Handle different event types
    if event_type == "customer.subscription.created":
        # New subscription created
        user_id = data.get("metadata", {}).get("user_id")
        if user_id:
            await StripeService.sync_subscription_from_stripe(db, user_id, data)

    elif event_type == "customer.subscription.updated":
        # Subscription updated (status change, plan change, etc.)
        user_id = data.get("metadata", {}).get("user_id")
        if user_id:
            await StripeService.sync_subscription_from_stripe(db, user_id, data)

    elif event_type == "customer.subscription.deleted":
        # Subscription canceled/expired
        user_id = data.get("metadata", {}).get("user_id")
        if user_id:
            result = await db.execute(
                select(Subscription).where(Subscription.user_id == user_id)
            )
            subscription = result.scalar_one_or_none()
            if subscription:
                subscription.tier = SubscriptionTier.FREE
                subscription.status = "canceled"
                await db.commit()

    elif event_type == "invoice.payment_failed":
        # Payment failed
        user_id = data.get("metadata", {}).get("user_id")
        # TODO: Send email notification to user

    return {"status": "success"}
