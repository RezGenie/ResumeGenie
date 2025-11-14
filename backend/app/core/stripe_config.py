"""
Stripe configuration and initialization
"""
import stripe
from app.core.config import settings

# Initialize Stripe with API key
stripe.api_key = settings.stripe_secret_key

# Stripe product price IDs (set these after creating products in Stripe Dashboard)
STRIPE_PRICES = {
    "pro_monthly": settings.stripe_pro_price_id,
    "unlimited_monthly": settings.stripe_unlimited_price_id,
}

# Webhook secret for verifying webhook signatures
STRIPE_WEBHOOK_SECRET = settings.stripe_webhook_secret
