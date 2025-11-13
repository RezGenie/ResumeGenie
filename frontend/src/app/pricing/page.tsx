"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionService } from "@/lib/api/subscriptions";

const plans = [
  {
    name: "Free",
    tier: "free" as const,
    price: "$0/mo",
    features: ["3 wishes per day", "Basic resume analysis", "Access to guides"],
    cta: "Get Started",
    highlight: false
  },
  {
    name: "Pro",
    tier: "pro" as const,
    price: "$12/mo",
    features: ["10 wishes per day", "Advanced AI analysis", "Priority support", "Job match scoring"],
    cta: "Upgrade to Pro",
    highlight: false
  },
  {
    name: "Unlimited",
    tier: "unlimited" as const,
    price: "$29/mo",
    features: ["Unlimited wishes", "Full AI insights", "Personalized career coaching", "Early access to new features"],
    cta: "Go Unlimited",
    highlight: false
  }
];

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (tier: 'pro' | 'unlimited', planName: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to upgrade", {
        description: "You need to be logged in to subscribe to a plan"
      });
      return;
    }

    setLoadingPlan(planName);
    try {
      const { url } = await subscriptionService.createCheckout(tier);
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: any) {
      // Don't log to console - handle gracefully with toast
      
      // Check if it's a network error
      if (error.name === 'NetworkError' || error.name === 'TypeError' || error.message?.toLowerCase().includes('network')) {
        toast.error("Connection failed", {
          description: "Unable to reach the payment service. Please try again in a moment."
        });
      } 
      // Check if it's a Stripe configuration error
      else if (error.message?.includes('Stripe') || error.message?.includes('price') || error.message?.includes('API key')) {
        toast.error("Payment system not configured", {
          description: "Stripe integration needs to be set up. Please contact support."
        });
      }
      // Generic error
      else {
        toast.error("Failed to start checkout", {
          description: "Please try again or contact support"
        });
      }
      
      setLoadingPlan(null);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">Pricing Plans</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your career goals. All plans include access to Genie guides and resume analysis.
          </p>
        </motion.div>

        {/* Development Notice */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Development Notice
                </h3>
                <p className="text-sm text-muted-foreground">
                  All features are currently free during development. Payment processing will be available soon.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
              className="h-full"
            >
              <Card className={`rounded-2xl p-8 shadow-lg border h-full flex flex-col ${plan.highlight ? 'border-primary' : 'border-muted-foreground/20'} bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 hover:shadow-xl hover:border-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 dark:hover:border-purple-600 transition-all cursor-pointer`}>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold mb-4">{plan.price}</div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="mb-6 space-y-2 text-left flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="text-muted-foreground flex items-center gap-2">
                        <span className="text-lg">✨</span> {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    size="lg" 
                    className="w-full mt-auto"
                    onClick={() => {
                      if (plan.tier === 'free') {
                        window.location.href = isAuthenticated ? '/dashboard' : '/genie';
                      } else {
                        handleUpgrade(plan.tier, plan.name);
                      }
                    }}
                    disabled={loadingPlan === plan.name}
                  >
                    {loadingPlan === plan.name ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      plan.cta
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}