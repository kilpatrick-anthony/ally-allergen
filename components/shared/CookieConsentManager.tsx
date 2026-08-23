'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next'
import { Cookie, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { useEffect, useState } from 'react'
import {
  clearGoogleAnalyticsCookies,
  readCookieConsent,
  saveCookieConsent,
  type CookieConsentPreferences,
} from '@/lib/cookie-consent'
import { useTranslation } from '@/lib/hooks/useTranslation'

const GOOGLE_ANALYTICS_ID = 'G-9BH4TMRH75'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    'ga-disable-G-9BH4TMRH75'?: boolean
  }
}

function disableAnalytics() {
  window['ga-disable-G-9BH4TMRH75'] = true
  window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
  clearGoogleAnalyticsCookies()
}

function enableAnalytics() {
  window['ga-disable-G-9BH4TMRH75'] = false
  window.gtag?.('consent', 'update', { analytics_storage: 'granted' })
}

function filterVercelAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  return readCookieConsent()?.analytics === true ? event : null
}

export default function CookieConsentManager() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [preferences, setPreferences] = useState<CookieConsentPreferences | null>(null)
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)

  useEffect(() => {
    const storedPreferences = readCookieConsent()
    setPreferences(storedPreferences)
    setAnalyticsEnabled(storedPreferences?.analytics ?? false)
    setHasLoadedPreferences(true)

    if (!storedPreferences?.analytics) disableAnalytics()
  }, [])

  const applyPreferences = (analytics: boolean) => {
    const nextPreferences = saveCookieConsent(analytics)
    setPreferences(nextPreferences)
    setAnalyticsEnabled(analytics)
    setSettingsOpen(false)

    if (analytics) enableAnalytics()
    else disableAnalytics()
  }

  const openSettings = () => {
    setAnalyticsEnabled(preferences?.analytics ?? false)
    setSettingsOpen(true)
  }

  const analyticsAllowed = preferences?.analytics === true
  const showBanner = hasLoadedPreferences && preferences === null
  const portalContext = pathname.startsWith('/admin')
    ? 'admin'
    : pathname.startsWith('/kiosk')
      ? 'kiosk'
      : undefined

  return (
    <>
      {analyticsAllowed ? (
        <>
          <Analytics beforeSend={filterVercelAnalyticsEvent} />
          <Script
            id="google-analytics-library"
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window['ga-disable-${GOOGLE_ANALYTICS_ID}'] = false;
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('consent', 'update', { analytics_storage: 'granted' });
              gtag('config', '${GOOGLE_ANALYTICS_ID}');
            `}
          </Script>
        </>
      ) : null}

      {showBanner ? (
        <section
          aria-label={t('cookieConsent.consentAria')}
          data-context={portalContext}
          className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-4xl rounded-2xl border border-[#42b8ac]/30 bg-white p-5 shadow-2xl dark:bg-gray-900 sm:inset-x-6 sm:p-6"
        >
          <div className="flex items-start gap-4">
            <div className="hidden rounded-full bg-[#e8f7f5] p-3 text-[#003842] sm:block" aria-hidden="true">
              <Cookie className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-[#003842] dark:text-white">{t('cookieConsent.privacyChoices')}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
                {t('cookieConsent.bannerDescription')}
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('cookieConsent.readOur')} <Link href="/cookies" className="font-semibold text-[#007f75] underline">{t('cookieConsent.cookiePolicy')}</Link>{' '}
                {t('cookieConsent.and')} <Link href="/privacy" className="font-semibold text-[#007f75] underline">{t('cookieConsent.privacyPolicy')}</Link>.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => applyPreferences(false)}
                  className="min-h-11 rounded-lg border-2 border-[#003842] px-5 py-2.5 text-sm font-semibold text-[#003842] hover:bg-[#003842] hover:text-white dark:border-white dark:text-white"
                >
                  {t('cookieConsent.rejectNonEssential')}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreferences(true)}
                  className="min-h-11 rounded-lg border-2 border-[#003842] bg-[#003842] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#00505c]"
                >
                  {t('cookieConsent.acceptAnalytics')}
                </button>
                <button
                  type="button"
                  onClick={openSettings}
                  className="min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold text-[#007f75] underline hover:text-[#005f58] dark:text-[#8dd8d2]"
                >
                  {t('cookieConsent.managePreferences')}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {hasLoadedPreferences && !showBanner ? (
        <button
          type="button"
          onClick={openSettings}
          className="fixed bottom-3 left-3 z-[90] inline-flex min-h-11 items-center gap-2 rounded-full border border-[#42b8ac]/40 bg-white px-4 py-2 text-sm font-semibold text-[#003842] shadow-lg hover:bg-[#e8f7f5] dark:bg-gray-900 dark:text-white"
          aria-label={t('cookieConsent.openSettings')}
          data-context={portalContext}
        >
          <Cookie className="h-4 w-4" aria-hidden="true" />
          {t('cookieConsent.settings')}
        </button>
      ) : null}

      <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[110] bg-black/60" />
          <Dialog.Content data-context={portalContext} className="fixed left-1/2 top-1/2 z-[120] max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-2xl font-bold text-[#003842] dark:text-white">{t('cookieConsent.preferences')}</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {t('cookieConsent.preferencesDescription')}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button type="button" className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={t('cookieConsent.closePreferences')}>
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{t('cookieConsent.strictlyNecessary')}</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('cookieConsent.necessaryDescription')}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#007f75] dark:text-[#8dd8d2]">{t('cookieConsent.alwaysOn')}</span>
                </div>
              </div>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <span>
                  <span className="block font-semibold text-gray-900 dark:text-white">{t('cookieConsent.analytics')}</span>
                  <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">{t('cookieConsent.analyticsDescription')}</span>
                </span>
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(event) => setAnalyticsEnabled(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[#007f75]"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => applyPreferences(false)}
                className="min-h-11 rounded-lg border-2 border-[#003842] px-5 py-2.5 text-sm font-semibold text-[#003842] hover:bg-[#003842] hover:text-white dark:border-white dark:text-white"
              >
                {t('cookieConsent.rejectNonEssential')}
              </button>
              <button
                type="button"
                onClick={() => applyPreferences(analyticsEnabled)}
                className="min-h-11 rounded-lg bg-[#003842] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#00505c]"
              >
                {t('cookieConsent.savePreferences')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
