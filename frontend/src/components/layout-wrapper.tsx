"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { MobileNav } from "@/components/mobile-nav"
import { GuestMobileNav } from "@/components/guest-mobile-nav"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  // Initialize from localStorage immediately
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed')
      return savedState === 'true'
    }
    return false
  })

  useEffect(() => {
    // Listen for sidebar collapse events
    const handleSidebarToggle = (e: CustomEvent) => {
      const collapsed = e.detail.collapsed
      setSidebarCollapsed(collapsed)
      localStorage.setItem('sidebarCollapsed', String(collapsed))
    }

    window.addEventListener('sidebarToggle', handleSidebarToggle as EventListener)
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle as EventListener)
  }, [])

  // Sidebar width (16rem = 256px) or collapsed (6rem = 96px) + left margin (left-4 = 16px) + small gap (8px)
  // Mobile/Tablet: pb-24 for bottom nav card (no top padding since header is hidden)
  // Guests: no top padding on mobile (header is in bottom nav), pt-20 on desktop for top header, pb-24 for bottom nav
  const leftPadding = user
    ? `pb-24 lg:pt-0 lg:pb-0 ${sidebarCollapsed ? "lg:pl-28" : "lg:pl-72"}`
    : "pb-24 lg:pt-20 lg:pb-0"

  return (
    <>
      {user ? (
        <>
          <Sidebar />
          <MobileHeader />
          <MobileNav />
        </>
      ) : (
        <GuestMobileNav />
      )}
      <div className={`${leftPadding} transition-all duration-300 ease-in-out`}>
        {children}
      </div>
    </>
  )
}
