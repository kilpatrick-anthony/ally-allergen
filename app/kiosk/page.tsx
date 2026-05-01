'use client'

// app/kiosk/page.tsx
// PWA start_url landing — reads the last-used kiosk slug from localStorage
// and redirects automatically. Shown when the PWA icon is tapped on a device
// that has previously loaded a kiosk URL.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'allyjen_kiosk_slug'

export default function KioskLanding() {
  const router = useRouter()
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    const saved = typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null

    if (saved) {
      setSlug(saved)
      router.replace(`/kiosk/${saved}`)
    } else {
      setSlug('')
    }
  }, [router])

  // While we're reading storage / redirecting, show a brief splash
  if (slug === null) {
    return (
      <div className="min-h-screen bg-[#003842] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading AllyJen…</p>
        </div>
      </div>
    )
  }

  // No slug saved — device hasn't been set up yet
  return (
    <div className="min-h-screen bg-[#003842] flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center shadow-2xl">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.243m-4.243 0H7.757M12 12V8m0 4v4" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Kiosk Not Set Up</h1>
        <p className="text-gray-600 text-sm mb-6">
          This device hasn't been linked to a kiosk yet. Open the full kiosk URL provided by your admin to get started — the app will remember it for next time.
        </p>
        <p className="text-xs text-gray-400">
          e.g. <span className="font-mono">allyjen.ie/kiosk/your-business</span>
        </p>
      </div>
    </div>
  )
}
