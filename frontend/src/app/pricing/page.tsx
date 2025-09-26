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
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">Pricing Plans</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your career goals. All plans include access to Genie guides and resume analysis.
          </p>
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