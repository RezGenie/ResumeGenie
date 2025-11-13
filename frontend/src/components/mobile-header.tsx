"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/AuthContext"
import { userProfileService } from "@/lib/api/userProfile"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"

export function MobileHeader() {
  const { user } = useAuth()
  const [userAvatar, setUserAvatar] = useState('')

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

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="lg:hidden fixed top-4 left-4 right-4 z-50"
    >
      <div className="bg-gradient-to-br from-purple-50/60 to-blue-50/60 dark:from-purple-950/30 dark:to-blue-950/30 backdrop-blur-xl border border-purple-200/30 dark:border-purple-800/30 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="RezGenie" className="h-8 w-8" />
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              RezGenie
            </span>
          </Link>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/profile">
              <Avatar className="h-9 w-9 bg-primary/10 hover:scale-105 transition-all cursor-pointer">
                {userAvatar ? (
                  <AvatarImage src={userAvatar} alt="User avatar" className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
