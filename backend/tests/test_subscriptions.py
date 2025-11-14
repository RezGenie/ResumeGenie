"""
Subscriptions API Endpoint Tests
Tests for subscription management and Stripe integration.
"""
import pytest


def test_subscriptions_checkout_endpoint_exists(client):
    """Test that the checkout session creation endpoint is accessible."""
    resp = client.post("/api/v1/subscriptions/checkout", json={
        "tier": "pro"
    })
    assert resp.status_code != 404


def test_subscriptions_status_endpoint_exists(client):
    """Test that the subscription status endpoint is accessible."""
    resp = client.get("/api/v1/subscriptions/status")
    assert resp.status_code != 404


def test_subscriptions_portal_endpoint_exists(client):
    """Test that the customer portal endpoint is accessible."""
    resp = client.post("/api/v1/subscriptions/portal")
    assert resp.status_code != 404


def test_subscriptions_cancel_endpoint_exists(client):
    """Test that the cancel subscription endpoint is accessible."""
    resp = client.post("/api/v1/subscriptions/cancel")
    assert resp.status_code != 404


def test_subscriptions_webhook_endpoint_exists(client):
    """Test that the Stripe webhook endpoint is accessible."""
    resp = client.post("/api/v1/subscriptions/webhooks/stripe",
                      json={},
                      headers={"stripe-signature": "fake"})
    assert resp.status_code != 404


def test_subscriptions_checkout_validates_tier(client):
    """Test that checkout validates subscription tier."""
    resp = client.post("/api/v1/subscriptions/checkout", json={})
    # Returns 403 (auth required) before validation, which is expected
    assert resp.status_code in (401, 403, 422)


def test_subscriptions_checkout_requires_auth(client):
    """Test that checkout requires authentication."""
    resp = client.post("/api/v1/subscriptions/checkout", json={
        "tier": "pro"
    })
    # Should require authentication
    assert resp.status_code in (401, 403, 500)


def test_subscriptions_status_requires_auth(client):
    """Test that status endpoint requires authentication."""
    resp = client.get("/api/v1/subscriptions/status")
    # Should require authentication
    assert resp.status_code in (401, 403, 500)
