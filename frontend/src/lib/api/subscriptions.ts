/**
 * Subscription API service for Stripe integration
 */
import { apiClient } from './client';

export interface CheckoutResponse {
  session_id: string;
  url: string;
}

export interface SubscriptionStatus {
  tier: 'free' | 'pro' | 'unlimited';
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  daily_wish_limit: number;
}

export interface PortalResponse {
  url: string;
}

export const subscriptionService = {
  /**
   * Create a Stripe Checkout session
   */
  async createCheckout(tier: 'pro' | 'unlimited'): Promise<CheckoutResponse> {
    const response = await apiClient.post<CheckoutResponse>('/subscriptions/checkout', { tier });
    return response;
  },

  /**
   * Get current subscription status
   */
  async getStatus(): Promise<SubscriptionStatus> {
    const response = await apiClient.get<SubscriptionStatus>('/subscriptions/status');
    return response;
  },

  /**
   * Create a Customer Portal session
   */
  async createPortalSession(): Promise<PortalResponse> {
    const response = await apiClient.post<PortalResponse>('/subscriptions/portal');
    return response;
  },

  /**
   * Cancel subscription at period end
   */
  async cancel(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/subscriptions/cancel');
    return response;
  }
};
