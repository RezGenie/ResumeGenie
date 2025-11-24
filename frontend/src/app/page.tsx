"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/ui/logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 md:py-16 lg:py-24 max-w-7xl">
        <div className="text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center mb-8"
          >
            <motion.div 
              className="mr-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Logo size={96} />
            </motion.div>
            <div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Resume Genie
                </span>
              </h1>
            </div>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
          >
            Your AI-powered career genie. Transform your resume and unlock your dream job with personalized insights and recommendations.
          </motion.p>
          
          {/* Announcement Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Left Content */}
                <div className="flex-1 text-center lg:text-left">
                  <h2 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    ✨ Tailor your resume like a pro
                  </h2>
                  <p className="text-muted-foreground text-lg mb-6 max-w-md">
                    Ask for tailored resume fixes and instant job-match nudges.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        size="lg" 
                        className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white border-none shadow-lg"
                        asChild
                      >
                        <Link href="/genie">
                          Make a Wish ✨
                        </Link>
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        size="lg" 
                        variant="outline"
                        className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950/50 dark:hover:text-purple-300"
                        asChild
                      >
                        <Link href="/guides">
                          Show Me the Way
                        </Link>
                      </Button>
                    </motion.div>
                  </div>
                </div>
                
                {/* Right Content - Ticket Card */}
                <div className="flex-shrink-0">
                  <motion.div
                    whileHover={{ rotate: 2, scale: 1.02 }}
                    className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 shadow-lg transform rotate-1 w-48"
                  >
                    <div className="text-center">
                      <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 tracking-wider">
                        CAREER FLIGHT ✈️
                      </div>
                      <div className="text-lg font-bold text-foreground mb-3">
                        CV → JOB
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span className="font-medium">From:</span>
                          <span>Resume</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">To:</span>
                          <span>Dream Job</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Departure:</span>
                          <span>Anytime</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Flight Date:</span>
                          <span>Today</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-border">
                        <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                          BOARDING NOW
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 pt-4 pb-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mb-12"
        >
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            For job seekers at all levels, from fresh graduates to seasoned professionals.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-8 hover:shadow-lg transition-shadow"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/50 dark:via-purple-900/50 dark:to-pink-900/50 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">📄</span>
            </div>
            <h3 className="text-xl font-semibold mb-4">Smart Resume Analysis</h3>
            <p className="text-muted-foreground leading-relaxed">
              Get detailed insights on your resume structure, keywords, and ATS compatibility to maximize your chances.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-8 hover:shadow-lg transition-shadow"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/50 dark:via-purple-900/50 dark:to-pink-900/50 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-semibold mb-4">Job Match Scoring</h3>
            <p className="text-muted-foreground leading-relaxed">
              See how well your resume aligns with job requirements and get personalized recommendations for improvement.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-8 hover:shadow-lg transition-shadow"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/50 dark:via-purple-900/50 dark:to-pink-900/50 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">✨</span>
            </div>
            <h3 className="text-xl font-semibold mb-4">AI-Powered Insights</h3>
            <p className="text-muted-foreground leading-relaxed">
              Receive actionable suggestions to optimize your resume and increase your interview success rate.
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
