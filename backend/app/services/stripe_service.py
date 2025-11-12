"""
Stripe service for handling subscription operations
"""
import stripe
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.stripe_config import STRIPE_PRICES, STRIPE_WEBHOOK_SECRET
from app.models.subscription import Subscription, SubscriptionTier, SubscriptionStatus
from app.models.user import User


class StripeService:
    """Service for managing Stripe subscriptions"""

    @staticmethod
    async def create_customer(email: str, user_id: str, name: Optional[str] = None) -> str:
        """
        Create a Stripe customer
        
        Args:
            email: Customer email
            user_id: Internal user ID
            name: Customer name (optional)
            
        Returns:
            Stripe customer ID
        """
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={"user_id": str(user_id)}
        )
        return customer.id

    @staticmethod
    async def create_checkout_session(
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session for subscription
        
        Args:
            customer_id: Stripe customer ID
            price_id: Stripe price ID
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if payment is canceled
            user_id: Internal user ID
            
        Returns:
            Checkout session data
        """
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": str(user_id)},
            subscription_data={
                "metadata": {"user_id": str(user_id)}
            }
        )
        return {
            "session_id": session.id,
            "url": session.url
        }

    @staticmethod
    async def create_customer_portal_session(
        customer_id: str,
        return_url: str
    ) -> Dict[str, str]:
        """
        Create a Stripe Customer Portal session
        
        Args:
            customer_id: Stripe customer ID
            return_url: URL to return to after portal session
            
        Returns:
            Portal session URL
        """
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return {"url": session.url}

    @staticmethod
    async def cancel_subscription(subscription_id: str) -> bool:
        """
        Cancel a subscription at period end
        
        Args:
            subscription_id: Stripe subscription ID
            
        Returns:
            Success status
        """
        try:
            stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
            return True
        except stripe.error.StripeError:
            return False

    @staticmethod
    async def reactivate_subscription(subscription_id: str) -> bool:
        """
        Reactivate a canceled subscription
        
        Args:
            subscription_id: Stripe subscription ID
            
        Returns:
            Success status
        """
        try:
            stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=False
            )
            return True
        except stripe.error.StripeError:
            return False

    @staticmethod
    async def get_subscription(subscription_id: str) -> Optional[Dict[str, Any]]:
        """
        Get subscription details from Stripe
        
        Args:
            subscription_id: Stripe subscription ID
            
        Returns:
            Subscription data or None
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return subscription
        except stripe.error.StripeError:
            return None

    @staticmethod
    async def sync_subscription_from_stripe(
        db: AsyncSession,
        user_id: str,
        stripe_subscription: Dict[str, Any]
    ) -> Subscription:
        """
        Sync subscription data from Stripe to database
        
        Args:
            db: Database session
            user_id: Internal user ID
            stripe_subscription: Stripe subscription object
            
        Returns:
            Updated subscription model
        """
        # Get or create subscription
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()

        # Determine tier from price ID
        tier = SubscriptionTier.FREE
        price_id = stripe_subscription.get("items", {}).get("data", [{}])[0].get("price", {}).get("id")
        
        if price_id == STRIPE_PRICES["pro_monthly"]:
            tier = SubscriptionTier.PRO
        elif price_id == STRIPE_PRICES["unlimited_monthly"]:
            tier = SubscriptionTier.UNLIMITED

        # Map Stripe status to our status
        status_mapping = {
            "active": SubscriptionStatus.ACTIVE,
            "canceled": SubscriptionStatus.CANCELED,
            "past_due": SubscriptionStatus.PAST_DUE,
            "unpaid": SubscriptionStatus.UNPAID,
            "trialing": SubscriptionStatus.TRIALING,
            "incomplete": SubscriptionStatus.INCOMPLETE,
            "incomplete_expired": SubscriptionStatus.INCOMPLETE_EXPIRED,
        }
        status = status_mapping.get(
            stripe_subscription.get("status"),
            SubscriptionStatus.ACTIVE
        )

        if subscription:
            # Update existing subscription
            subscription.stripe_subscription_id = stripe_subscription.get("id")
            subscription.stripe_price_id = price_id
            subscription.tier = tier
            subscription.status = status
            subscription.current_period_start = datetime.fromtimestamp(
                stripe_subscription.get("current_period_start")
            )
            subscription.current_period_end = datetime.fromtimestamp(
                stripe_subscription.get("current_period_end")
            )
            subscription.cancel_at_period_end = stripe_subscription.get("cancel_at_period_end", False)
            if stripe_subscription.get("canceled_at"):
                subscription.canceled_at = datetime.fromtimestamp(
                    stripe_subscription.get("canceled_at")
                )
        else:
            # Create new subscription
            subscription = Subscription(
                user_id=user_id,
                stripe_customer_id=stripe_subscription.get("customer"),
                stripe_subscription_id=stripe_subscription.get("id"),
                stripe_price_id=price_id,
                tier=tier,
                status=status,
                current_period_start=datetime.fromtimestamp(
                    stripe_subscription.get("current_period_start")
                ),
                current_period_end=datetime.fromtimestamp(
                    stripe_subscription.get("current_period_end")
                ),
                cancel_at_period_end=stripe_subscription.get("cancel_at_period_end", False),
            )
            db.add(subscription)

        await db.commit()
        await db.refresh(subscription)
        return subscription

    @staticmethod
    def verify_webhook_signature(payload: bytes, sig_header: str) -> Optional[Dict[str, Any]]:
        """
        Verify Stripe webhook signature
        
        Args:
            payload: Request body
            sig_header: Stripe signature header
            
        Returns:
            Event data or None if verification fails
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
            return event
        except ValueError:
            # Invalid payload
            return None
        except stripe.error.SignatureVerificationError:
            # Invalid signature
            return None
