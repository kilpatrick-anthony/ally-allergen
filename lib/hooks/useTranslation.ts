import { useCallback, useState, useEffect } from 'react'
import { translations, LanguageCode } from '@/lib/translations'

const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'ga', 'pt', 'fr', 'es', 'de']

function readSavedLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en'
  const saved = localStorage.getItem('defaultLanguage') as LanguageCode | null
  return saved && SUPPORTED_LANGUAGES.includes(saved) ? saved : 'en'
}

export function useTranslation() {
  // Get initial language from localStorage, default to 'en'
  const [language, setLanguage] = useState<LanguageCode>(readSavedLanguage)

  // Listen for language change events
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent<LanguageCode>) => {
      if (SUPPORTED_LANGUAGES.includes(event.detail)) setLanguage(event.detail)
    }
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'defaultLanguage') setLanguage(readSavedLanguage())
    }

    window.addEventListener('languageChange', handleLanguageChange as EventListener)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('languageChange', handleLanguageChange as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: any = translations[language]

    for (const k of keys) {
      value = value?.[k]
    }

    // Fallback to English if translation not found
    if (value === undefined && language !== 'en') {
      let fallbackValue: any = translations.en
      for (const k of keys) {
        fallbackValue = fallbackValue?.[k]
      }
      const fallbackText = fallbackValue || key
      return replacements
        ? Object.entries(replacements).reduce((text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)), fallbackText)
        : fallbackText
    }

    const text = value || key
    return replacements
      ? Object.entries(replacements).reduce((result, [name, replacement]) => result.replaceAll(`{${name}}`, String(replacement)), text)
      : text
  }, [language])

  return { t, language }
}
