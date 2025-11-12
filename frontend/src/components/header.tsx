"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Menu, X, User, LogOut, Upload, BarChart3, LayoutDashboard, Crown, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { userProfileService } from "@/lib/api/userProfile"

export function Header() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [userAvatar, setUserAvatar] = useState('')
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  // Check if a route is active
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Update avatar when profile changes
  useEffect(() => {
    const profile = userProfileService.getProfile()
    setUserAvatar(profile.avatar || '')

    const handleProfileUpdate = () => {
      const profile = userProfileService.getProfile()
      setUserAvatar(profile.avatar || '')
    }

    window.addEventListener('userProfileUpdated', handleProfileUpdate)
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate)
  }, [])

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background backdrop-blur supports-[backdrop-filter]:bg-background/95" style={{ transform: 'translateZ(0)', isolation: 'isolate' }}>
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8 xl:px-12">
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
        <nav className="hidden lg:flex items-center space-x-8 flex-1 justify-center">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  isActive('/dashboard')
                    ? 'text-purple-600'
                    : 'text-muted-foreground hover:text-primary'
                }`}
                style={isActive('/dashboard') ? { textShadow: '0 0 8px rgba(168,85,247,0.3)' } : {}}
              >
                Dashboard
              </Link>
              <Link
                href="/genie"
                className={`text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  isActive('/genie')
                    ? 'text-purple-600'
                    : 'text-muted-foreground hover:text-primary'
                }`}
                style={isActive('/genie') ? { textShadow: '0 0 8px rgba(168,85,247,0.3)' } : {}}
              >
                Genie Wishes
              </Link>
              <Link
                href="/opportunities"
                className={`text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  isActive('/opportunities')
                    ? 'text-purple-600'
                    : 'text-muted-foreground hover:text-primary'
                }`}
                style={isActive('/opportunities') ? { textShadow: '0 0 8px rgba(168,85,247,0.3)' } : {}}
              >
                Job Opportunities
              </Link>
            </>
          ) : (
            <>
            <Link
                href="/genie"
                className={`text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  isActive('/genie')
                    ? 'text-purple-600'
                    : 'text-muted-foreground hover:text-primary'
                }`}
                style={isActive('/genie') ? { textShadow: '0 0 8px rgba(168,85,247,0.3)' } : {}}
              >
                Demo
              </Link>
            <Link
                href="/guides"
                className={`text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  isActive('/guides')
                    ? 'text-purple-600'
                    : 'text-muted-foreground hover:text-primary'
                }`}
                style={isActive('/guides') ? { textShadow: '0 0 8px rgba(168,85,247,0.3)' } : {}}
              >
                Guides
              </Link>
              <Link
                href="/pricing"
                className={`text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  isActive('/pricing')
                    ? 'text-purple-600'
                    : 'text-muted-foreground hover:text-primary'
                }`}
                style={isActive('/pricing') ? { textShadow: '0 0 8px rgba(168,85,247,0.3)' } : {}}
              >
                Pricing
              </Link>
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <ThemeToggle />
          
          {user ? (
            <>
              {/* Quick Action Button for Desktop */}
              <Button variant="outline" size="sm" asChild className="hidden md:flex hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300 transition-all duration-200">
                <Link href="/genie">
                  <Sparkles className="h-4 w-4 mr-2" />
                  New Wish
                </Link>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8 bg-primary/10">
                      {userAvatar ? (
                        <AvatarImage 
                          src={userAvatar}
                          alt="User avatar"
                          className="object-cover"
                        />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <div className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full border border-background"></div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">
                        {user?.email ? 
                          user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) 
                          : 'User'}
                      </p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                      {user?.is_verified && (
                        <p className="text-xs text-green-600 font-medium">✓ Verified</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/genie" className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Genie Wishes
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/opportunities" className="cursor-pointer">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Job Opportunities
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden lg:flex items-center space-x-2">
              <Button variant="ghost" asChild className="whitespace-nowrap hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-900/30 dark:hover:text-purple-300 transition-all duration-200">
                <Link href="/auth">Log In</Link>
              </Button>
              <Button asChild className="whitespace-nowrap hover:bg-purple-700 hover:shadow-lg transition-all duration-200">
                <Link href="/genie">Get Started</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
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

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="border-t bg-background/95 backdrop-blur lg:hidden"
        >
          <div className="container mx-auto px-4 py-6 space-y-1 max-w-7xl">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block px-4 py-3 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/genie"
                  className="block px-4 py-3 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Genie Wishes
                </Link>
                <Link
                  href="/opportunities"
                  className="block px-4 py-3 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Job Opportunities
                </Link>

                <div className="border-t pt-4 mt-4">
                  <div className="px-4 py-2">
                    <p className="text-sm font-medium text-foreground">
                      {user?.email ? 
                        user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) 
                        : 'User'}
                    </p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    {user?.is_verified && (
                      <p className="text-xs text-green-600 font-medium">✓ Verified</p>
                    )}
                  </div>
                  <Link
                    href="/profile"
                    className="block px-4 py-3 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="block w-full text-left px-4 py-3 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                  >
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <>
              <Link
                  href="/genie"
                  className="block px-4 py-3 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Demo
                </Link>
                <Link
                  href="/guides"
                  className="block px-4 py-3 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Guides
                </Link>
                <Link
                  href="/pricing"
                  className="block px-4 py-3 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </Link>
                <div className="border-t pt-4 mt-4 space-y-2">
                  <Button variant="ghost" asChild className="w-full justify-start h-12 text-base hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-900/30 dark:hover:text-purple-300 transition-all duration-200">
                    <Link href="/auth" onClick={() => setIsMenuOpen(false)}>
                      Log In
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start h-12 text-base hover:bg-purple-700 hover:shadow-lg transition-all duration-200">
                    <Link href="/genie" onClick={() => setIsMenuOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </header>
  )
}