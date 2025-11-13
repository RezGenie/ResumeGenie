"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { MobileNav } from "@/components/mobile-nav"

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

  // Sidebar width (16rem = 256px) or collapsed (6rem = 96px) + left margin (left-4 = 16px) + gap
  // Mobile/Tablet: pt-20 for header card, pb-24 for bottom nav card
  const leftPadding = user 
    ? `pt-20 lg:pt-0 pb-24 lg:pb-0 ${sidebarCollapsed ? "lg:pl-[124px]" : "lg:pl-[272px]"}`
    : "pt-20"

  return (
    <>
      {user && (
        <>
          <Sidebar />
          <MobileHeader />
          <MobileNav />
        </>
      )}
      <div className={`${leftPadding} transition-all duration-300 ease-in-out`}>
        {children}
      </div>
    </>
  )
}
