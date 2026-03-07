// components/DarkModeInitializer.tsx
'use client'

import { useEffect } from 'react'

export default function DarkModeInitializer() {
  useEffect(() => {
    // Function to apply dark mode
    const applyDarkMode = (darkMode: boolean) => {
      if (darkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    // Apply dark mode preference from localStorage on app load
    if (typeof window !== 'undefined') {
      const darkMode = localStorage.getItem('darkMode') === 'true'
      applyDarkMode(darkMode)

      // Listen for dark mode changes from settings
      const handleDarkModeChange = (event: CustomEvent<boolean>) => {
        applyDarkMode(event.detail)
      }

      window.addEventListener('darkModeChange', handleDarkModeChange as EventListener)

      // Cleanup
      return () => {
        window.removeEventListener('darkModeChange', handleDarkModeChange as EventListener)
      }
    }
  }, [])

  return null // This component doesn't render anything
}