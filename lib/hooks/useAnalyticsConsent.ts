'use client'

import { useEffect, useState } from 'react'
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  hasAnalyticsConsent,
  type CookieConsentPreferences,
} from '@/lib/cookie-consent'

export function useAnalyticsConsent(): boolean {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false)

  useEffect(() => {
    setAnalyticsAllowed(hasAnalyticsConsent())

    const handleConsentChange = (event: Event) => {
      const consentEvent = event as CustomEvent<CookieConsentPreferences>
      setAnalyticsAllowed(consentEvent.detail.analytics)
    }

    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, handleConsentChange)
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, handleConsentChange)
  }, [])

  return analyticsAllowed
}
