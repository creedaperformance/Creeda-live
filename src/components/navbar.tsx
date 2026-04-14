'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageToggle, useTranslation } from '@/lib/i18n/LanguageProvider'

export function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()
  const signupLink = '/signup'
  const loginLink = '/login'
  const loginText = t('landing.cta_start', 'Start Your Journey')

  // Hide on dashboard / internal pages (they have their own nav)
  const isDashboard = pathname?.startsWith('/athlete/') ||
    pathname?.startsWith('/coach/') ||
    pathname?.startsWith('/individual/') ||
    pathname?.startsWith('/learn')

  if (isDashboard) return null

  const navLinks = [
    { href: '/#individuals', label: t('landing.section_individuals', 'Individuals') },
    { href: '/#athletes', label: t('landing.section_athletes', 'Athletes') },
    { href: '/#how-it-works', label: t('landing.section_how', 'How It Works') },
    { href: '/consent', label: 'Trust & Legal' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#04070A]/80 backdrop-blur-xl border-b border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/creeda-performance-bgr.png"
              alt="Creeda Performance"
              width={360}
              height={180}
              priority
              className="h-10 w-auto object-contain"
            />
            <span className="hidden lg:block text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
              Digital Sports Scientist
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/50 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <LanguageToggle />

            <Link
              href={loginLink}
              prefetch={false}
              className="hidden sm:inline-flex text-xs font-semibold text-white/55 hover:text-white transition-colors"
            >
              Log In
            </Link>

            <Button
              asChild
              size="sm"
              className="hidden sm:inline-flex h-9 px-5 rounded-full bg-[var(--saffron)] text-black font-bold text-xs hover:brightness-110 transition-all shadow-[0_0_20px_var(--saffron-glow)]"
            >
              <Link href={signupLink} prefetch={false}>
                {loginText}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden overflow-hidden bg-[#04070A]/95 backdrop-blur-xl border-t border-white/[0.04] animate-fade-in">
          <div className="px-4 py-6 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={loginLink}
              prefetch={false}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
            >
              Log In
            </Link>
            <div className="pt-4 border-t border-white/[0.06]">
              <Button
                asChild
                className="w-full h-12 rounded-xl bg-[var(--saffron)] text-black font-bold text-sm hover:brightness-110 shadow-lg"
              >
                <Link href={signupLink} prefetch={false} onClick={() => setIsOpen(false)}>
                  {loginText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
