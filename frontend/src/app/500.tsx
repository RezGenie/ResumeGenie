"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Home, RefreshCw, Wrench } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Logo } from "@/components/ui/logo"

export default function ServerError() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="container mx-auto max-w-2xl text-center">
          {/* Animated Server Error */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              duration: 0.8, 
              type: "spring", 
              stiffness: 200,
              damping: 20 
            }}
            className="mb-8"
          >
            <div className="relative">
              <Logo className="h-6 w-6" />
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-50 p-2 rounded-full"
              >
                <Wrench className="h-5 w-5" />
              </motion.div>
            </div>
          </motion.div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-muted-foreground/20 mb-2">
              500
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              <span className="bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
                Our genie is taking a break
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Something went wrong on our end. Our magical servers are having a moment, 
              but don&apos;t worry - our team is working on it!
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
          >
            <Button 
              onClick={() => window.location.reload()} 
              size="lg" 
              className="min-w-[160px]"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Try Again
            </Button>
            
            <Button variant="outline" asChild size="lg" className="min-w-[160px]">
              <Link href="/">
                <Home className="mr-2 h-5 w-5" />
                Go Home
              </Link>
            </Button>
          </motion.div>

          {/* Status Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
          >
            <p className="text-sm text-muted-foreground">
              We&apos;ve been notified about this issue and are working to fix it. 
              Please try again in a few moments or contact support if the problem persists.
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}