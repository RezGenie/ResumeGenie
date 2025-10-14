"use client"

import { useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { RefreshCw, Home, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Logo } from "@/components/ui/logo"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="container mx-auto max-w-2xl text-center">
          {/* Animated Error Icon */}
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
              <Logo className="h-8 w-8 mb-2 mx-auto" />
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground p-2 rounded-full"
              >
                <AlertCircle className="h-5 w-5" />
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
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-destructive to-red-600 bg-clip-text text-transparent">
                Oops! Something went wrong
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
              Our genie encountered an unexpected problem while processing your request. 
              But don&apos;t worry, we can try again!
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 p-4 bg-muted rounded-lg text-left">
                <summary className="cursor-pointer font-medium text-sm">
                  Error Details (Development Mode)
                </summary>
                <pre className="mt-2 text-xs text-muted-foreground overflow-auto">
                  {error.message}
                  {error.stack && (
                    <>
                      {'\n\nStack Trace:\n'}
                      {error.stack}
                    </>
                  )}
                </pre>
              </details>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
          >
            <Button onClick={reset} size="lg" className="min-w-[160px]">
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

          {/* Additional Help */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="p-4 bg-muted/50 rounded-lg"
          >
            <p className="text-sm text-muted-foreground">
              If this problem persists, please try refreshing the page or contact our support team.
              We&apos;re here to help make your experience magical! ✨
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}