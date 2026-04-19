'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

export type Language = 'en' | 'hi'
type TranslationValue = string | TranslationDictionary
interface TranslationDictionary {
  [key: string]: TranslationValue
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, fallback?: string) => string
  isHindi: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Flat key lookup with dot notation: t('nav.home') => translations.nav.home
function isLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'hi'
}

function isTranslationDictionary(value: TranslationValue | undefined): value is TranslationDictionary {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getNestedValue(obj: TranslationDictionary, path: string): string | undefined {
  let current: TranslationValue | undefined = obj

  for (const part of path.split('.')) {
    if (!isTranslationDictionary(current)) {
      return undefined
    }

    current = current[part]
  }

  return typeof current === 'string' ? current : undefined
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en'

  const saved = window.localStorage.getItem('creeda-lang')
  return isLanguage(saved) ? saved : 'en'
}

// Lazy-load translations
const translationCache: Record<Language, TranslationDictionary | null> = {
  en: null,
  hi: null,
}

async function loadTranslations(lang: Language): Promise<TranslationDictionary> {
  if (translationCache[lang]) return translationCache[lang]!
  
  try {
    const messagesModule = await import(`./translations/${lang}.json`)
    translationCache[lang] = messagesModule.default || messagesModule
    return translationCache[lang]!
  } catch (e) {
    console.warn(`[i18n] Failed to load ${lang} translations:`, e)
    return {}
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)
  const [translations, setTranslations] = useState<TranslationDictionary>({})

  // Load translations when language changes
  useEffect(() => {
    let cancelled = false
    loadTranslations(language).then((nextTranslations) => {
      if (!cancelled) setTranslations(nextTranslations)
    })
    document.documentElement.lang = language

    return () => {
      cancelled = true
    }
  }, [language])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    window.localStorage.setItem('creeda-lang', lang)
  }, [])

  const t = useCallback((key: string, fallback?: string): string => {
    const value = getNestedValue(translations, key)
    if (value !== undefined) return value
    // Fallback: use the last segment of the key as human-readable
    return fallback || key.split('.').pop()?.replace(/_/g, ' ') || key
  }, [translations])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isHindi: language === 'hi' }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useTranslation()

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5 rounded-full 
        bg-white/5 border border-white/10 
        text-xs font-bold tracking-wider
        hover:bg-white/10 transition-all duration-200
        active:scale-95
        ${className || ''}
      `}
      aria-label={`Switch to ${language === 'en' ? 'Hindi' : 'English'}`}
    >
      <span className={language === 'en' ? 'text-[var(--saffron)]' : 'text-white/40'}>EN</span>
      <span className="text-white/20">|</span>
      <span className={language === 'hi' ? 'text-[var(--saffron)]' : 'text-white/40'}>हि</span>
    </button>
  )
}
