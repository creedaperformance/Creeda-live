'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, ScanLine, ClipboardList, BookOpen, User } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/LanguageProvider'
import { motion } from 'framer-motion'

const tabs = [
  { key: 'home', path: '/athlete/dashboard', icon: Home, translationKey: 'nav.home' },
  { key: 'scan', path: '/athlete/scan', icon: ScanLine, translationKey: 'nav.scan', highlight: true },
  { key: 'plans', path: '/athlete/plans', icon: ClipboardList, translationKey: 'nav.plans' },
  { key: 'learn', path: '/learn', icon: BookOpen, translationKey: 'nav.learn' },
  { key: 'profile', path: '/athlete/settings', icon: User, translationKey: 'nav.profile' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useTranslation()

  // Only show on athlete pages and learn pages
  const shouldShow = pathname?.startsWith('/athlete') || pathname?.startsWith('/learn')
  if (!shouldShow) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0E]/95 backdrop-blur-xl border-t border-white/[0.04] safe-bottom block lg:hidden">
      <div className="flex justify-around items-center h-16 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.path === '/athlete/dashboard'
            ? pathname === tab.path || pathname === '/athlete'
            : pathname?.startsWith(tab.path)

          const Icon = tab.icon

          return (
            <Link
              key={tab.key}
              href={tab.path}
              className="flex flex-col items-center justify-center w-full h-full gap-0.5 relative"
            >
              {/* Scan button gets special treatment */}
              {tab.highlight ? (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`
                    relative flex items-center justify-center w-12 h-12 -mt-5 rounded-2xl
                    ${isActive
                      ? 'bg-[var(--saffron)] shadow-[0_0_24px_var(--saffron-glow)]'
                      : 'bg-white/10 border border-white/10'
                    }
                    transition-all duration-300
                  `}
                >
                  <Icon
                    size={22}
                    strokeWidth={2.5}
                    className={isActive ? 'text-black' : 'text-white/60'}
                  />
                  {/* Glow ring */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-2xl animate-pulse-glow opacity-50" />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="relative flex items-center justify-center"
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={`transition-colors duration-200 ${
                      isActive ? 'text-[var(--saffron)]' : 'text-white/35'
                    }`}
                  />
                  {/* Active dot indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-[var(--saffron)]"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.div>
              )}

              {/* Label */}
              {!tab.highlight && (
                <span
                  className={`text-[9px] font-semibold tracking-wide transition-colors duration-200 ${
                    isActive ? 'text-[var(--saffron)]' : 'text-white/30'
                  }`}
                >
                  {t(tab.translationKey)}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
