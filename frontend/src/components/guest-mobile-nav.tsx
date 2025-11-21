"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { 
  Sparkles, 
  BookOpen, 
  DollarSign,
  LogIn
} from "lucide-react"
import { motion } from "framer-motion"

const navItems = [
  { href: "/genie", label: "Demo", icon: Sparkles },
  { href: "/guides", label: "Guides", icon: BookOpen },
  { href: "/pricing", label: "Pricing", icon: DollarSign },
  { href: "/auth", label: "Login", icon: LogIn },
]

export function GuestMobileNav() {
  const pathname = usePathname()
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    // Set initial viewport height
    setViewportHeight(window.innerHeight)

    // Track viewport changes (browser chrome hide/show)
    const handleResize = () => {
      setViewportHeight(window.innerHeight)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="lg:hidden fixed left-4 right-4 z-50 will-change-transform"
      style={{
        WebkitTouchCallout: 'none',
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        right: '1rem',
      } as React.CSSProperties}
    >
      <div className="bg-gradient-to-br from-purple-50/60 to-blue-50/60 dark:from-purple-950/30 dark:to-blue-950/30 backdrop-blur-xl border border-purple-200/30 dark:border-purple-800/30 rounded-2xl shadow-lg overflow-hidden" style={{ maxHeight: '80px' }}>
        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer select-none ${
                  active
                    ? 'text-purple-600 dark:text-purple-400 scale-105'
                    : 'text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400'
                }`}
                style={{
                  WebkitUserCallout: 'none',
                } as React.CSSProperties}
              >
                <Icon className={`h-5 w-5 ${active ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </motion.nav>
  )
}
