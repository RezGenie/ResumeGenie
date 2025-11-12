"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Loader2, ExternalLink, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { subscriptionService, SubscriptionStatus } from "@/lib/api/subscriptions";

interface SubscriptionManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const plans = [
  {
    name: "Free",
    tier: "free" as const,
    price: "$0",
    period: "/month",
    features: [
      "3 wishes per day",
      "Basic resume analysis",
      "Access to guides",
      "Job search tools"
    ],
    highlight: false
  },
  {
    name: "Pro",
    tier: "pro" as const,
    price: "$12",
    period: "/month",
    features: [
      "10 wishes per day",
      "Advanced AI analysis",
      "Priority support",
      "Job match scoring",
      "Resume optimization"
    ],
    highlight: true
  },
  {
    name: "Unlimited",
    tier: "unlimited" as const,
    price: "$29",
    period: "/month",
    features: [
      "Unlimited wishes",
      "Full AI insights",
      "Personalized career coaching",
      "Early access to features",
      "Premium support"
    ],
    highlight: false
  }
];

export function SubscriptionManagementDialog({ open, onOpenChange }: SubscriptionManagementDialogProps) {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSubscription();
    }
  }, [open]);

  const fetchSubscription = async () => {
    try {
      const data = await subscriptionService.getStatus();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      toast.error("Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: 'pro' | 'unlimited', planName: string) => {
    setUpgrading(planName);
    try {
      const { url } = await subscriptionService.createCheckout(tier);
      window.location.href = url;
    } catch (error: any) {
      // Don't log to console - handle gracefully with toast
      
      // Check if it's a network error (backend not responding or fetch failed)
      if (error.name === 'NetworkError' || error.name === 'TypeError' || error.message?.toLowerCase().includes('network')) {
        toast.error("Connection failed", {
          description: "Unable to reach the payment service. Please try again in a moment."
        });
      } 
      // Check if it's a Stripe configuration error
      else if (error.message?.includes('Stripe') || error.message?.includes('price') || error.message?.includes('API key')) {
        toast.error("Payment system not configured", {
          description: "Stripe integration needs to be set up. Please add your API keys."
        });
      }
      // Generic error
      else {
        toast.error("Failed to start checkout", {
          description: error.message || "Please try again later"
        });
      }
      
      setUpgrading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { url } = await subscriptionService.createPortalSession();
      window.location.href = url;
    } catch (error: any) {
      // Don't log to console - handle gracefully with toast
      
      if (error.name === 'NetworkError' || error.message?.toLowerCase().includes('network')) {
        toast.error("Connection failed", {
          description: "Unable to reach the payment service. Please try again in a moment."
        });
      } else {
        toast.error("Failed to open subscription portal", {
          description: error.message || "Please try again later"
        });
      }
      
      setPortalLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
          onClick={() => onOpenChange(false)}
        >
          {/* Dialog */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 400,
              duration: 0.3
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full max-w-5xl max-h-[90vh] rounded-lg overflow-hidden shadow-2xl border border-purple-200/50 dark:border-purple-700/50 backdrop-blur-sm flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-purple-100 dark:border-purple-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Crown className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Subscription Management
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose the plan that fits your career goals
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-full h-8 w-8 p-0 transition-colors flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <>
                  {/* Current Plan */}
                  {subscription && (
                    <div className="mb-8 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Plan</p>
                          <p className="text-2xl font-bold capitalize">{subscription.tier}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {subscription.daily_wish_limit === -1 ? 'Unlimited' : subscription.daily_wish_limit} daily wishes
                          </p>
                        </div>
                        {subscription.tier !== 'free' && (
                          <div className="text-right">
                            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="mb-2">
                              {subscription.status}
                            </Badge>
                            {subscription.current_period_end && (
                              <p className="text-sm text-muted-foreground">
                                {subscription.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
                                {new Date(subscription.current_period_end).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {subscription.tier !== 'free' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 hover:bg-purple-100 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20"
                          onClick={handleManageSubscription}
                          disabled={portalLoading}
                        >
                          {portalLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Manage Subscription
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Plans Grid */}
                  <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                      const isCurrentPlan = subscription?.tier === plan.tier;
                      const canUpgrade = subscription?.tier === 'free' && plan.tier !== 'free';
                      
                      return (
                        <div
                          key={plan.name}
                          className={`relative rounded-xl p-6 border-2 transition-all flex flex-col hover:border-purple-400 hover:shadow-xl dark:hover:border-purple-500 ${
                            isCurrentPlan
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20 shadow-lg shadow-purple-500/20'
                              : 'border-gray-200 dark:border-gray-700 bg-card'
                          }`}
                        >
                          {isCurrentPlan && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <Badge className="bg-purple-600 text-white">
                                Current Plan
                              </Badge>
                            </div>
                          )}

                          <div className="text-center mb-6">
                            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-4xl font-bold">{plan.price}</span>
                              <span className="text-muted-foreground">{plan.period}</span>
                            </div>
                          </div>

                          <ul className="space-y-3 mb-6 flex-grow">
                            {plan.features.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <Check className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>

                          <Button
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isCurrentPlan || upgrading === plan.name}
                            onClick={() => {
                              if (plan.tier === 'free') {
                                toast.info("You're already on the free plan");
                              } else if (canUpgrade) {
                                handleUpgrade(plan.tier, plan.name);
                              }
                            }}
                          >
                            {upgrading === plan.name ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                              </>
                            ) : isCurrentPlan ? (
                              'Current Plan'
                            ) : plan.tier === 'free' ? (
                              'Free Forever'
                            ) : (
                              `Upgrade to ${plan.name}`
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Note */}
                  <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground text-center">
                      <Sparkles className="inline h-4 w-4 mr-1" />
                      All plans include access to job search tools, resume uploads, and career guides
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
