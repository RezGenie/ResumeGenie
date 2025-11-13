"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  LayoutDashboard, 
  Sparkles, 
  Briefcase, 
  FileText, 
  User, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bookmark
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/AuthContext"
import { userProfileService } from "@/lib/api/userProfile"
import { ThemeToggle } from "@/components/theme-toggle"
import { useEffect } from "react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/genie", label: "Genie Wishes", icon: Sparkles },
  { href: "/opportunities", label: "Job Opportunities", icon: Briefcase },
  { href: "/dashboard/my-jobs", label: "My Jobs", icon: Bookmark },
  { href: "/dashboard/resumes", label: "My Resumes", icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  // Initialize from localStorage immediately
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed')
      return savedState === 'true'
    }
    return false
  })
  const [userAvatar, setUserAvatar] = useState('')

  const isActive = (href: string) => {
    // Exact match for dashboard
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    // For other routes, check if pathname starts with the href
    return pathname === href || pathname.startsWith(href + '/')
  }

  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', String(newState))
    // Emit event for layout wrapper
    window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { collapsed: newState } }))
  }

  // Emit initial state for layout wrapper on mount
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { collapsed: isCollapsed } }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const handleLogout = async () => {
    await logout()
  }

  return (
    <motion.aside
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        width: isCollapsed ? '6rem' : '16rem'
      }}
      transition={{ 
        opacity: { duration: 0.3, ease: "easeOut" },
        width: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
      }}
      className="hidden lg:flex lg:flex-col fixed left-4 top-4 bg-gradient-to-br from-purple-50/60 to-blue-50/60 dark:from-purple-950/30 dark:to-blue-950/30 backdrop-blur-xl border border-purple-200/30 dark:border-purple-800/30 rounded-2xl shadow-lg z-40"
    >
      <div className="flex flex-col p-4">
        {/* Logo & Toggle */}
        <div className="relative mb-8">
          {!isCollapsed ? (
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 overflow-hidden">
                <img src="/logo.png" alt="RezGenie" className="h-8 w-8 flex-shrink-0" />
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                  className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent whitespace-nowrap"
                >
                  RezGenie
                </motion.span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-6 w-6 rounded-full border border-purple-200 dark:border-purple-800 bg-background hover:bg-purple-100 dark:hover:bg-purple-900/40 shadow-sm flex-shrink-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-6 w-6 rounded-full border border-purple-200 dark:border-purple-800 bg-background hover:bg-purple-100 dark:hover:bg-purple-900/40 shadow-sm"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className={`mb-6 pb-6 border-b border-purple-200/30 dark:border-purple-800/30 ${isCollapsed ? 'flex flex-col items-center gap-3' : ''}`}>
          <div className="flex items-center gap-3">
            <Link 
              href="/profile"
              className={`flex items-center gap-3 flex-1 min-w-0 px-3 py-2 rounded-lg transition-colors ${
                isActive('/profile')
                  ? 'bg-purple-100 dark:bg-purple-900/20'
                  : 'hover:bg-purple-100 dark:hover:bg-purple-900/20'
              }`}
            >
              <Avatar className={`h-10 w-10 bg-primary/10 flex-shrink-0 ring transition-all ${
                isActive('/profile')
                  ? 'ring-purple-400 dark:ring-purple-500'
                  : 'ring-transparent hover:ring-purple-300 dark:hover:ring-purple-600'
              }`}>
                {userAvatar ? (
                  <AvatarImage src={userAvatar} alt="User avatar" className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                  className="flex-1 min-w-0"
                >
                  <p className={`text-sm font-medium truncate transition-colors ${
                    isActive('/profile')
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'hover:text-purple-600 dark:hover:text-purple-400'
                  }`}>
                    {user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </motion.div>
              )}
            </Link>
            {!isCollapsed && <ThemeToggle />}
          </div>
          {isCollapsed && <ThemeToggle />}
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={300}>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              const navLink = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors overflow-hidden ${
                    active
                      ? 'text-purple-600 dark:text-purple-400 font-medium'
                      : 'text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: 0.15 }}
                      className="text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </Link>
              )

              return isCollapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {navLink}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              ) : navLink
            })}
          </nav>
        </TooltipProvider>

        {/* Logout Button */}
        <div className="pt-6 mt-6 border-t border-purple-200/30 dark:border-purple-800/30">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className={`w-full justify-start text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors ${
                    isCollapsed ? 'justify-center px-2' : ''
                  }`}
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: 0.15 }}
                      className="ml-3"
                    >
                      Log out
                    </motion.span>
                  )}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>Log out</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </motion.aside>
  )
}
