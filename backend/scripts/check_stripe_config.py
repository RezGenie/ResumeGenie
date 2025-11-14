"""
Stripe Configuration Verification Script

This script checks if your Stripe integration is properly configured.
Run this to diagnose connection issues.
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_env_var(name: str, required: bool = True) -> tuple[bool, str]:
    """Check if an environment variable is set and valid."""
    value = os.getenv(name, "")
    
    if not value:
        return False, f"❌ {name}: Not set"
    
    # Check for placeholder values
    placeholders = ["your_", "change", "here", "placeholder", "example"]
    if any(p in value.lower() for p in placeholders):
        return False, f"⚠️  {name}: Still using placeholder value"
    
    # Validate format based on variable name
    if "STRIPE_SECRET_KEY" in name:
        if not value.startswith(("sk_test_", "sk_live_")):
            return False, f"❌ {name}: Invalid format (should start with sk_test_ or sk_live_)"
    
    if "STRIPE_PUBLISHABLE_KEY" in name:
        if not value.startswith(("pk_test_", "pk_live_")):
            return False, f"❌ {name}: Invalid format (should start with pk_test_ or pk_live_)"
    
    if "PRICE_ID" in name:
        if not value.startswith("price_"):
            return False, f"❌ {name}: Invalid format (should start with price_)"
    
    if "WEBHOOK_SECRET" in name:
        if not value.startswith("whsec_"):
            return False, f"⚠️  {name}: Invalid format (should start with whsec_)" if required else f"ℹ️  {name}: Not configured (optional for dev)"
    
    # Mask the value for security
    if len(value) > 20:
        masked = f"{value[:10]}...{value[-4:]}"
    else:
        masked = f"{value[:4]}..."
    
    return True, f"✅ {name}: {masked}"


def test_stripe_connection():
    """Test actual connection to Stripe API."""
    try:
        import stripe
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        
        # Try to list products (this will fail if API key is invalid)
        _ = stripe.Product.list(limit=1)
        return True, "✅ Stripe API connection successful"
    except stripe.error.AuthenticationError:
        return False, "❌ Stripe API authentication failed - check your secret key"
    except stripe.error.StripeError as e:
        return False, f"❌ Stripe API error: {str(e)}"
    except ImportError:
        return False, "⚠️  Stripe library not installed (run: pip install stripe)"
    except Exception as e:
        return False, f"❌ Unexpected error: {str(e)}"


def main():
    print("=" * 60)
    print("Stripe Integration Configuration Check")
    print("=" * 60)
    print()
    
    # Check required environment variables
    checks = [
        ("STRIPE_SECRET_KEY", True),
        ("STRIPE_PUBLISHABLE_KEY", True),
        ("STRIPE_PRO_PRICE_ID", True),
        ("STRIPE_UNLIMITED_PRICE_ID", True),
        ("STRIPE_WEBHOOK_SECRET", False),  # Optional for dev
    ]
    
    all_passed = True
    critical_failed = False
    
    for var_name, required in checks:
        passed, message = check_env_var(var_name, required)
        print(message)
        
        if not passed:
            all_passed = False
            if required:
                critical_failed = True
    
    print()
    print("-" * 60)
    
    # Test Stripe API connection if basic checks pass
    if not critical_failed:
        print("\nTesting Stripe API connection...")
        passed, message = test_stripe_connection()
        print(message)
        
        if not passed:
            all_passed = False
    else:
        print("\n⚠️  Skipping API connection test (fix configuration errors first)")
    
    print()
    print("=" * 60)
    
    if all_passed:
        print("✅ All checks passed! Stripe integration is properly configured.")
        print()
        print("Next steps:")
        print("1. Restart backend: docker-compose restart backend")
        print("2. Test checkout flow in the app")
        print("3. Monitor logs: docker-compose logs backend -f")
    else:
        print("❌ Configuration issues detected!")
        print()
        print("Action required:")
        if critical_failed:
            print("1. Create products in Stripe Dashboard:")
            print("   https://dashboard.stripe.com/test/products")
            print("2. Copy the Price IDs (starts with price_)")
            print("3. Update backend/.env with the actual Price IDs")
            print("4. Restart backend: docker-compose restart backend")
        else:
            print("1. Fix the warnings above (webhook secret is optional)")
            print("2. Restart backend: docker-compose restart backend")
        print()
        print("See docs/STRIPE_SETUP_GUIDE.md for detailed instructions")
    
    print("=" * 60)
    print()
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
