"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Home, ArrowLeft, CreditCard, BookOpen, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Logo } from "@/components/ui/logo"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="container mx-auto max-w-4xl text-center">
          {/* Animated Genie */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              duration: 0.8, 
              type: "spring", 
              stiffness: 200,
              damping: 20 
            }}
            className="mb-8 flex justify-center"
          >
            <Logo size={120} />
          </motion.div>

          {/* 404 Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6"
          >
            <h1 className="text-6xl md:text-8xl font-bold text-muted-foreground/20 mb-2">
              404
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Oops! This wish couldn&apos;t be granted
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The page you&apos;re looking for seems to have vanished into thin air. 
              Even our genie couldn&apos;t find it! But don&apos;t worry, we&apos;ll help you get back on track.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Button asChild size="lg" className="min-w-[160px]">
              <Link href="/">
                <Home className="mr-2 h-5 w-5" />
                Go Home
              </Link>
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => window.history.back()}
              className="min-w-[160px]"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Go Back
            </Button>
          </motion.div>

          {/* Helpful Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            <Link 
              href="/genie"
              className="group p-6 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4 mx-auto group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Genie Wishes</h3>
              <p className="text-sm text-muted-foreground">
                Upload your resume and get AI-powered insights
              </p>
            </Link>

            <Link 
              href="/pricing"
              className="group p-6 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-500/10 text-green-500 mb-4 mx-auto group-hover:scale-110 transition-transform">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Pricing Plans</h3>
              <p className="text-sm text-muted-foreground">
                Choose the perfect plan for your career goals
              </p>
            </Link>

            <Link 
              href="/guides"
              className="group p-6 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/10 text-blue-500 mb-4 mx-auto group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Career Guides</h3>
              <p className="text-sm text-muted-foreground">
                Learn how to optimize your job search
              </p>
            </Link>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}