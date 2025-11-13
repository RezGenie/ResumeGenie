"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/AuthContext"

export function Header() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, isLoading } = useAuth()

  // Check if a route is active
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Close mobile menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  // Don't render anything while loading to prevent flash
  if (isLoading) {
    return null
  }

  // If user is authenticated, don't render header (Sidebar/MobileHeader/MobileNav are in LayoutWrapper)
  if (user) {
    return null
  }

  // For guests, show the header
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full" style={{ transform: 'translateZ(0)', isolation: 'isolate' }}>
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        {/* Card Container */}
        <div 
          className="bg-gradient-to-br from-purple-50/40 to-blue-50/40 dark:from-purple-950/20 dark:to-blue-950/20 backdrop-blur-xl border border-purple-200/30 dark:border-purple-800/30 rounded-2xl transition-colors duration-300 px-6 py-3"
        >
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="flex h-8 w-8 items-center justify-center"
              >
                <img 
                  src="/logo.png" 
                  alt="RezGenie Logo" 
                  className="h-8 w-8 object-contain"
                />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                RezGenie
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-6">
              <Link
                href="/genie"
                className={`text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  isActive('/genie')
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                Demo
              </Link>
              <Link
                href="/guides"
                className={`text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  isActive('/guides')
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                Guides
              </Link>
              <Link
                href="/pricing"
                className={`text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  isActive('/pricing')
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                Pricing
              </Link>
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <ThemeToggle />
              
              <div className="hidden lg:flex items-center space-x-2">
                <Button variant="outline" asChild className="whitespace-nowrap hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300 transition-all duration-200">
                  <Link href="/auth">Log In</Link>
                </Button>
                <Button asChild className="whitespace-nowrap bg-purple-600 hover:bg-purple-700 hover:shadow-lg transition-all duration-200">
                  <Link href="/genie">Get Started</Link>
                </Button>
              </div>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden hover:bg-purple-100 dark:hover:bg-purple-900/40"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="lg:hidden"
          >
            <div className="container mx-auto px-4 pt-3 max-w-7xl">
              <motion.div 
                initial={{ backdropFilter: "blur(0px)" }}
                animate={{ backdropFilter: "blur(12px)" }}
                exit={{ backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="bg-gradient-to-br from-purple-50/40 to-blue-50/40 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200/30 dark:border-purple-800/30 rounded-2xl transition-colors duration-300 px-6 py-4 space-y-1"
                style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
              >
                <Link
                  href="/genie"
                  className="block px-4 py-3 text-base font-medium text-foreground hover:bg-purple-100/50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Demo
                </Link>
                <Link
                  href="/guides"
                  className="block px-4 py-3 text-base font-medium text-foreground hover:bg-purple-100/50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Guides
                </Link>
                <Link
                  href="/pricing"
                  className="block px-4 py-3 text-base font-medium text-foreground hover:bg-purple-100/50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </Link>
                <div className="border-t border-purple-200/30 dark:border-purple-800/30 pt-4 mt-4 space-y-2">
                  <Button variant="ghost" asChild className="w-full justify-start h-12 text-base hover:bg-purple-100/50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200">
                    <Link href="/auth" onClick={() => setIsMenuOpen(false)}>
                      Log In
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start h-12 text-base bg-purple-600 hover:bg-purple-700 hover:shadow-lg transition-all duration-200">
                    <Link href="/genie" onClick={() => setIsMenuOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}