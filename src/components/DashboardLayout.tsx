'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
  Calendar,
  TrendingUp,
  ScanLine,
  ClipboardList,
  BarChart3,
  ChevronRight,
  Timer,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageToggle } from '@/lib/i18n/LanguageProvider'
import { BottomNav } from '@/components/BottomNav'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { CORE_MEDICAL_DISCLAIMER, DEFAULT_ROLE_LEGAL_PATHS, LEGAL_DOC_PATHS } from '@/lib/legal/constants'

interface SidebarItemProps {
  href: string
  icon: LucideIcon
  label: string
  active?: boolean
  badge?: string
}

function SidebarItem({ href, icon: Icon, label, active, badge }: SidebarItemProps) {
  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
          active
            ? 'bg-[var(--saffron)]/10 text-[var(--saffron)] border border-[var(--saffron)]/15'
            : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'
        }`}
      >
        <Icon
          className={`h-[18px] w-[18px] ${active ? 'text-[var(--saffron)]' : 'group-hover:text-white/60'}`}
          strokeWidth={active ? 2.5 : 2}
        />
        <span className={`text-sm font-semibold tracking-tight ${active ? 'text-white' : ''}`}>
          {label}
        </span>
        {badge && (
          <span className="ml-auto text-[9px] font-bold bg-[var(--saffron)]/20 text-[var(--saffron)] px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {active && <ChevronRight className="ml-auto h-3 w-3 text-[var(--saffron)]/50" />}
      </div>
    </Link>
  )
}

interface DashboardLayoutProps {
  children: ReactNode
  user: { email?: string | null } | null
  type: 'athlete' | 'coach' | 'individual'
  hasSyncedToday?: boolean
}

interface NavLink {
  href: string
  icon: LucideIcon
  label: string
  badge?: string
}

export function DashboardLayout({ children, user, type, hasSyncedToday }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const athleteLinks = [
    { href: '/athlete/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/athlete/scan', icon: ScanLine, label: 'Video Analysis', badge: 'NEW' },
    { href: '/athlete/tests', icon: Timer, label: 'Objective Tests', badge: 'BETA' },
    { href: '/athlete/family', icon: ShieldCheck, label: 'Guardian & Family', badge: 'NEW' },
    { href: '/athlete/nutrition-safety', icon: ShieldCheck, label: 'Nutrition Safety', badge: 'NEW' },
    { href: '/athlete/plans', icon: ClipboardList, label: 'Training Plans', badge: 'NEW' },
    { href: '/athlete/checkin', icon: Calendar, label: 'Daily Check-In' },
    { href: '/athlete/review', icon: TrendingUp, label: 'Weekly Review' },
    { href: '/athlete/legal', icon: ShieldCheck, label: 'Legal & Privacy', badge: 'NEW' },
    { href: '/athlete/settings', icon: Settings, label: 'Settings' },
  ]

  const coachLinks = [
    { href: '/coach/dashboard', icon: LayoutDashboard, label: 'Squad Roster' },
    { href: '/coach/academy', icon: ShieldCheck, label: 'Academy Ops', badge: 'NEW' },
    { href: '/coach/review', icon: TrendingUp, label: 'Weekly Review', badge: 'NEW' },
    { href: '/coach/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/coach/reports', icon: ClipboardList, label: 'Reports', badge: 'NEW' },
    { href: '/coach/legal', icon: ShieldCheck, label: 'Legal & Privacy', badge: 'NEW' },
    { href: '/coach/settings', icon: Settings, label: 'Settings' },
  ]

  const individualLinks = [
    { href: '/individual/dashboard', icon: LayoutDashboard, label: 'Home' },
    { href: '/individual/scan', icon: ScanLine, label: 'Movement Analysis', badge: 'NEW' },
    { href: '/individual/tests', icon: Timer, label: 'Objective Tests', badge: 'BETA' },
    { href: '/individual/nutrition-safety', icon: ShieldCheck, label: 'Nutrition Safety', badge: 'NEW' },
    { href: '/individual/logging', icon: Calendar, label: 'Daily Check-In' },
    { href: '/individual/review', icon: BarChart3, label: 'Weekly Review' },
    { href: '/individual/legal', icon: ShieldCheck, label: 'Legal & Privacy', badge: 'NEW' },
  ]



  const navLinksMap: Record<DashboardLayoutProps['type'], NavLink[]> = {
    athlete: athleteLinks,
    coach: coachLinks,
    individual: individualLinks,
  }

  const navLinks = navLinksMap[type] || athleteLinks
  const legalHomePath = DEFAULT_ROLE_LEGAL_PATHS[type]

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-white flex relative overflow-hidden">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-60 flex-col bg-[#0A0A0E] border-r border-white/[0.04] sticky top-0 h-screen z-50">
        {/* Logo */}
        <div className="p-6 mb-2">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-[var(--saffron)] flex items-center justify-center shadow-[0_0_20px_var(--saffron-glow)]">
              <Activity className="text-black h-5 w-5" strokeWidth={3} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white group-hover:text-[var(--saffron)] transition-colors">
              Creeda
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navLinks.map((link) => (
            <SidebarItem
              key={link.href}
              {...link}
              active={
                link.href === `/${type}/dashboard`
                  ? pathname === link.href || pathname === `/${type}`
                  : pathname?.startsWith(link.href)
              }
            />
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 mt-auto border-t border-white/[0.04]">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="h-9 w-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-sm font-bold text-white/50">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-white/25 font-medium capitalize">{type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2">
            <LanguageToggle className="flex-1" />
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 relative h-[100dvh] overflow-y-auto">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0A0A0E]/95 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[var(--saffron)] flex items-center justify-center">
              <Activity className="text-black h-4 w-4" strokeWidth={3} />
            </div>
            <span className="text-base font-extrabold text-white tracking-tight">Creeda</span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={handleSignOut}
              className="p-2 text-white/25 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-white/40 hover:text-white transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
          <section className="mb-5 rounded-2xl border border-[var(--saffron)]/15 bg-[var(--saffron)]/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--saffron)]">Safety & Legal</p>
            <p className="mt-2 text-sm text-white/50 leading-relaxed">{CORE_MEDICAL_DISCLAIMER}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/40">
              <Link href={LEGAL_DOC_PATHS.disclaimer} className="underline underline-offset-4 hover:text-white">
                Medical Disclaimer
              </Link>
              <Link href={LEGAL_DOC_PATHS.aiTransparency} className="underline underline-offset-4 hover:text-white">
                AI Transparency
              </Link>
              <Link href={legalHomePath} className="underline underline-offset-4 hover:text-white">
                Legal & Privacy Controls
              </Link>
            </div>
          </section>

          {children}

          {/* Floating Wellness Button */}
          {type === 'athlete' && pathname === '/athlete/dashboard' && !hasSyncedToday && (
            <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-[60]">
              <Link href="/athlete/checkin">
                <Button className="rounded-2xl pl-5 pr-6 h-12 shadow-[0_0_30px_var(--saffron-glow)] bg-[var(--saffron)] text-black font-bold text-xs hover:brightness-110 active:scale-95 transition-all">
                  <Activity className="h-4 w-4 mr-2" />
                  Daily Check-In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* ── Bottom Nav (Mobile) ── */}
      {type === 'athlete' && <BottomNav />}

      {/* ── Mobile Slide-Over Menu ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="absolute right-0 top-0 bottom-0 w-[80%] max-w-xs bg-[#0A0A0E] border-l border-white/[0.06] shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <span className="text-base font-bold text-white">Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-white/40 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Nav Items */}
              <nav className="space-y-1 mb-8">
                {navLinks.map((link) => (
                  <div key={link.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <SidebarItem
                      {...link}
                      active={pathname?.startsWith(link.href)}
                    />
                  </div>
                ))}
              </nav>

              {/* User + Sign Out */}
              <div className="absolute bottom-6 left-6 right-6 space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="h-9 w-9 rounded-full bg-white/[0.06] flex items-center justify-center text-sm font-bold text-white/50">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {user?.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-white/25 capitalize">{type}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400/70 hover:bg-red-500/10 transition-all text-sm font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
