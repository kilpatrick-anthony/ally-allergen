// components/SpeechController.tsx
'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function SpeechController() {
  const pathname = usePathname()
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const enabledRef = useRef<boolean>(false)
  const rateRef = useRef<number>(1)

  const stopSpeech = () => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel()
    }
  }

  const readPage = (rate: number) => {
    if (!('speechSynthesis' in window)) return

    synthRef.current = window.speechSynthesis
    stopSpeech()

    const main = document.querySelector('main')
    let text = ''
    if (main) {
      const nodes = Array.from(
        main.querySelectorAll('h1, h2, h3, h4, h5, p')
      ).filter(el => {
        return !el.closest('button') &&
               !el.closest('a') &&
               !el.closest('[role="menu"]') &&
               !el.closest('[role="tooltip"]')
      })
      text = nodes
        .map(el => el.textContent?.trim())
        .filter(t => t && t.length > 3)
        .join('. ')
    }
    if (!text) text = main?.textContent?.trim() || document.body.textContent?.trim() || ''
    if (!text) return

    const langMap: Record<string, string> = {
      en: 'en-GB', ga: 'ga-IE', pt: 'pt-PT', fr: 'fr-FR', es: 'es-ES', de: 'de-DE',
    }
    const lang = localStorage.getItem('defaultLanguage') || 'en'

    utteranceRef.current = new window.SpeechSynthesisUtterance(text)
    utteranceRef.current.rate = rate
    utteranceRef.current.pitch = 1
    utteranceRef.current.volume = 1
    utteranceRef.current.lang = langMap[lang] || 'en-GB'
    synthRef.current.speak(utteranceRef.current)
  }

  // On mount: read initial state from localStorage and listen for speechChange events
  useEffect(() => {
    if (typeof window === 'undefined') return

    enabledRef.current = localStorage.getItem('speechEnabled') === 'true'
    rateRef.current = parseFloat(localStorage.getItem('speechRate') || '1')

    const handleSpeechChange = (event: CustomEvent<{ enabled: boolean; rate: number }>) => {
      const { enabled, rate } = event.detail
      enabledRef.current = enabled
      rateRef.current = rate

      // Don't take over when on the settings page (it manages its own preview)
      if (window.location.pathname.includes('/admin/settings')) return

      if (enabled) {
        readPage(rate)
      } else {
        stopSpeech()
      }
    }

    window.addEventListener('speechChange', handleSpeechChange as EventListener)

    return () => {
      window.removeEventListener('speechChange', handleSpeechChange as EventListener)
      stopSpeech()
    }
    // eslint-disable-next-line
  }, [])

  // On pathname change: stop current speech and read new page if enabled
  useEffect(() => {
    if (typeof window === 'undefined') return

    stopSpeech()

    // Don't auto-read on the settings page — it has its own speech preview
    if (pathname?.includes('/admin/settings')) return

    if (enabledRef.current) {
      // Delay to let the DOM settle after navigation
      const timer = setTimeout(() => {
        readPage(rateRef.current)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  return null
}
