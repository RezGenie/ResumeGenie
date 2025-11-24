"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Sparkles,
  BookOpen,
  DollarSign,
  LogIn,
  Sun,
  Moon
} from "lucide-react"
import { motion } from "framer-motion"

const navItems = [
  { href: "/genie", label: "Genie", icon: Sparkles },
  { href: "/guides", label: "Guides", icon: BookOpen },
  { href: "/pricing", label: "Pricing", icon: DollarSign },
  { href: "/auth", label: "Login", icon: LogIn },
]

export function GuestMobileNav() {
  const pathname = usePathname()
  const { setTheme, theme } = useTheme()

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
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${active
                    ? 'text-purple-600 dark:text-purple-400 scale-105'
                    : 'text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400'
                  }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400"
          >
            <div className="relative h-5 w-5">
              <Sun className="absolute h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </div>
            <span className="text-[10px] font-medium">Theme</span>
          </button>
        </div>
      </div>
    </motion.nav>
  )
}
