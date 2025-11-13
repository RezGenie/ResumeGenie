"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Sparkles, 
  Briefcase, 
  Bookmark,
  FileText
} from "lucide-react"
import { motion } from "framer-motion"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/genie", label: "Genie", icon: Sparkles },
  { href: "/opportunities", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/my-jobs", label: "Saved", icon: Bookmark },
  { href: "/dashboard/resumes", label: "Resumes", icon: FileText },
]

export function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="lg:hidden fixed bottom-4 left-4 right-4 z-50"
    >
      <div className="bg-gradient-to-br from-purple-50/60 to-blue-50/60 dark:from-purple-950/30 dark:to-blue-950/30 backdrop-blur-xl border border-purple-200/30 dark:border-purple-800/30 rounded-2xl shadow-lg">
        <div className="flex items-center justify-around px-2 py-3 safe-area-bottom">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                  active
                    ? 'text-purple-600 dark:text-purple-400 scale-105'
                    : 'text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400'
                }`}
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
