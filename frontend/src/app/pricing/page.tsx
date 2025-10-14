"use client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const plans = [
  {
    name: "Free",
    price: "$0/mo",
    features: ["3 wishes per day", "Basic resume analysis", "Access to guides"],
    cta: "Get Started",
    highlight: false
  },
  {
    name: "Pro",
    price: "$12/mo",
    features: ["15 wishes per day", "Advanced AI analysis", "Priority support", "Job match scoring"],
    cta: "Upgrade to Pro",
    highlight: true
  },
  {
    name: "Unlimited",
    price: "$29/mo",
    features: ["Unlimited wishes", "Full AI insights", "Personalized career coaching", "Early access to new features"],
    cta: "Go Unlimited",
    highlight: false
  }
];

export default function PricingPage() {
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
          <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-600">
                  Pricing Under Development
                </h3>
                <div className="mt-2 text-sm text-amber-600">
                  <p>
                    All features are currently free during the development phase. Payment processing will be available soon!
                  </p>
                </div>
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
              <Card className={`rounded-2xl p-8 shadow-lg border h-full flex flex-col ${plan.highlight ? 'border-primary' : 'border-muted-foreground/20'} bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20`}>
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
                  <Button size="lg" className="w-full mt-auto">
                    {plan.cta}
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