"use client";

import { useState, useEffect } from "react";
import { Crown, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { subscriptionService, SubscriptionStatus } from "@/lib/api/subscriptions";
import { useAuth } from "@/contexts/AuthContext";

export function SubscriptionCard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Only fetch if user is authenticated and auth is not loading
    if (!authLoading && isAuthenticated) {
      fetchSubscription();
    } else if (!authLoading && !isAuthenticated) {
      // User is not authenticated, stop loading
      setLoading(false);
      setError(true);
    }
  }, [isAuthenticated, authLoading]);

  const fetchSubscription = async () => {
    try {
      const data = await subscriptionService.getStatus();
      setSubscription(data);
      setError(false);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Don't show card if there was an error fetching subscription
  if (error || !subscription) return null;

  const tierColors = {
    free: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    pro: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
    unlimited: "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
  };

  const tierIcons = {
    free: null,
    pro: <Crown className="h-4 w-4" />,
    unlimited: <Crown className="h-4 w-4" />
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg hover:border-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/30 dark:hover:border-purple-600 transition-all" 
      onClick={() => window.location.href = subscription.tier === 'free' ? '/pricing' : '#'}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">My Subscription</p>
            <p className="text-2xl font-bold capitalize">{subscription.tier}</p>
          </div>
          <Crown className="h-8 w-8 text-purple-600" />
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          {subscription.daily_wish_limit === -1 ? 'Unlimited' : subscription.daily_wish_limit} daily wishes • {subscription.status}
        </div>
      </CardContent>
    </Card>
  );
}
