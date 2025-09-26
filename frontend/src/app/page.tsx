"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 max-w-7xl">
        <div className="text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center mb-8"
          >
            <motion.span 
              className="text-6xl mr-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
            >
              🧞‍♂️
            </motion.span>
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
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link href="/genie">
                  Make a Wish ✨
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 pt-4 pb-8 max-w-7xl">

        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-8 hover:shadow-lg transition-shadow"
          >
            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center mb-6">
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
            className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-8 hover:shadow-lg transition-shadow"
          >
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mb-6">
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
            className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 hover:shadow-lg transition-shadow"
          >
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center mb-6">
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
