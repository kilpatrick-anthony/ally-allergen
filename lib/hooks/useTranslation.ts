import { useState, useEffect } from 'react'
import { translations, LanguageCode } from '@/lib/translations'

export function useTranslation() {
  // Get initial language from localStorage, default to 'en'
  const [language, setLanguage] = useState<LanguageCode>(
    (typeof window !== 'undefined'
      ? localStorage.getItem('defaultLanguage') as LanguageCode || 'en'
      : 'en') as LanguageCode
  )

  // Listen for language change events
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent<LanguageCode>) => {
      setLanguage(event.detail)
    }

    window.addEventListener('languageChange', handleLanguageChange as EventListener)

    return () => {
      window.removeEventListener('languageChange', handleLanguageChange as EventListener)
    }
  }, [])

  const t = (key: string): string => {
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
      return fallbackValue || key
    }

    return value || key
  }

  return { t, language }
}