// app/kiosk/[slug]/page.tsx - FIXED VERSION
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { 
  Filter, Search, AlertCircle, Check, X, QrCode, Download, 
  FileText, Mail, Package, Calendar,
  Wheat, Fish, Egg, Nut, Leaf, Milk, Carrot, Shell, 
  Circle, Sprout, Shrimp, Cookie, Beaker, ArrowRight, Clock, Home, Table2, Grid3x3,
  ChevronDown, ChevronUp, CheckSquare, Square, RefreshCw,
  Moon, Apple, WheatOff, Star, Globe, Droplets, ShieldCheck, Salad
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import AccessibilityPanel from '@/components/shared/AccessibilityPanel'
import Link from 'next/link'
import { translations, type LanguageCode } from '@/lib/translations'
import AllergenTableView from '@/components/kiosk/AllergenTableView'
import { generateAllergenTablePDF } from '@/lib/pdf/allergenTablePDF'
import { GLUTEN_TYPES, TREE_NUT_TYPES, type GlutenType, type TreeNutType } from '@/types/allergen'

// Import your design system components
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

// Import offline functionality
import { useOfflineKioskData, type Business, type MenuItem } from '@/lib/hooks/useOfflineKioskData'
import OfflineIndicator from '@/components/kiosk/OfflineIndicator'
import { AllyChat } from '@/components/kiosk/AllyChat'
import { useDeviceHeartbeat } from '@/lib/hooks/useDeviceHeartbeat'

// ===== TRACKING FUNCTIONS =====
async function sendKioskAnalyticsEvent(payload: {
  slug: string
  siteId?: string | null
  eventType: 'page_view' | 'search' | 'filter' | 'time_on_page' | 'download' | 'qr_scan'
  searchQuery?: string
  selectedAllergens?: string[]
  downloadType?: string
  scanSource?: string
  timeOnPage?: number
}) {
  try {
    await fetch('/api/analytics/kiosk-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Analytics should never block kiosk interactions
  }
}

async function trackPageView(slug: string, siteId?: string | null) {
  await sendKioskAnalyticsEvent({ slug, siteId, eventType: 'page_view' })
}

async function trackQRScan(slug: string, scanSource: string, siteId?: string | null) {
  await sendKioskAnalyticsEvent({ slug, siteId, eventType: 'qr_scan', scanSource })
}

async function trackDownload(slug: string, downloadType: string, siteId?: string | null) {
  await sendKioskAnalyticsEvent({ slug, siteId, eventType: 'download', downloadType })
}

async function trackFilterUsage(slug: string, selectedAllergens: string[], selectedDietary: string[], siteId?: string | null) {
  const searchQuery = selectedDietary.length > 0
    ? selectedDietary.map(value => `dietary:${value}`).join('|')
    : undefined
  await sendKioskAnalyticsEvent({ slug, siteId, eventType: 'filter', selectedAllergens, searchQuery })
}

async function trackSearch(slug: string, searchQuery: string, siteId?: string | null) {
  await sendKioskAnalyticsEvent({ slug, siteId, eventType: 'search', searchQuery })
}

async function trackTimeOnPage(slug: string, timeOnPage: number, siteId?: string | null) {
  await sendKioskAnalyticsEvent({ slug, siteId, eventType: 'time_on_page', timeOnPage })
}

// ===== CONSTANTS =====
// Sleek allergen icons with polished styling - EU 14 Allergen List (Official Order)
// Matching the admin color scheme for consistency
// Store component references, not JSX elements (fixes React#31 error)
type IconComponent = React.ComponentType<{ className?: string }>

const ALLERGENS_CONFIG: Array<{
  id: string
  name: string
  icon: IconComponent
  color: string
  hoverColor: string
  bgColor: string
}> = [
  { 
    id: 'contains_cereals_gluten', 
    name: '1. Gluten', 
    icon: Wheat,
    color: 'bg-[#f59e0b15] text-[#f59e0b] border border-[#f59e0b40]',
    hoverColor: 'hover:bg-[#f59e0b25]',
    bgColor: '#f59e0b'
  },
  { 
    id: 'contains_crustaceans', 
    name: '2. Crustaceans', 
    icon: Shell,
    color: 'bg-[#ef444415] text-[#ef4444] border border-[#ef444440]',
    hoverColor: 'hover:bg-[#ef444425]',
    bgColor: '#ef4444'
  },
  { 
    id: 'contains_eggs', 
    name: '3. Eggs', 
    icon: Egg,
    color: 'bg-[#f9731615] text-[#f97316] border border-[#f9731640]',
    hoverColor: 'hover:bg-[#f9731625]',
    bgColor: '#f97316'
  },
  { 
    id: 'contains_fish', 
    name: '4. Fish', 
    icon: Fish,
    color: 'bg-[#3b82f615] text-[#3b82f6] border border-[#3b82f640]',
    hoverColor: 'hover:bg-[#3b82f625]',
    bgColor: '#3b82f6'
  },
  { 
    id: 'contains_peanuts', 
    name: '5. Peanuts', 
    icon: Nut,
    color: 'bg-[#92400e15] text-[#92400e] border border-[#92400e40]',
    hoverColor: 'hover:bg-[#92400e25]',
    bgColor: '#92400e'
  },
  { 
    id: 'contains_soybeans', 
    name: '6. Soybeans', 
    icon: Sprout,
    color: 'bg-[#16a34a15] text-[#16a34a] border border-[#16a34a40]',
    hoverColor: 'hover:bg-[#16a34a25]',
    bgColor: '#16a34a'
  },
  { 
    id: 'contains_milk', 
    name: '7. Milk', 
    icon: Milk,
    color: 'bg-[#8b5cf615] text-[#8b5cf6] border border-[#8b5cf640]',
    hoverColor: 'hover:bg-[#8b5cf625]',
    bgColor: '#8b5cf6'
  },
  { 
    id: 'contains_nuts', 
    name: '8. Tree Nuts', 
    icon: Nut,
    color: 'bg-[#b4530915] text-[#b45309] border border-[#b4530940]',
    hoverColor: 'hover:bg-[#b4530925]',
    bgColor: '#b45309'
  },
  { 
    id: 'contains_celery', 
    name: '9. Celery', 
    icon: Carrot,
    color: 'bg-[#84cc1615] text-[#84cc16] border border-[#84cc1640]',
    hoverColor: 'hover:bg-[#84cc1625]',
    bgColor: '#84cc16'
  },
  { 
    id: 'contains_mustard', 
    name: '10. Mustard', 
    icon: Circle,
    color: 'bg-[#eab30815] text-[#eab308] border border-[#eab30840]',
    hoverColor: 'hover:bg-[#eab30825]',
    bgColor: '#eab308'
  },
  { 
    id: 'contains_sesame', 
    name: '11. Sesame', 
    icon: Circle,
    color: 'bg-[#d9730015] text-[#d97300] border border-[#d9730040]',
    hoverColor: 'hover:bg-[#d9730025]',
    bgColor: '#d97300'
  },
  { 
    id: 'contains_sulphites', 
    name: '12. Sulphites', 
    icon: Beaker,
    color: 'bg-[#a855f715] text-[#a855f7] border border-[#a855f740]',
    hoverColor: 'hover:bg-[#a855f725]',
    bgColor: '#a855f7'
  },
  { 
    id: 'contains_lupin', 
    name: '13. Lupin', 
    icon: Leaf,
    color: 'bg-[#6366f115] text-[#6366f1] border border-[#6366f140]',
    hoverColor: 'hover:bg-[#6366f125]',
    bgColor: '#6366f1'
  },
  { 
    id: 'contains_molluscs', 
    name: '14. Molluscs', 
    icon: Shell,
    color: 'bg-[#14b8a615] text-[#14b8a6] border border-[#14b8a640]',
    hoverColor: 'hover:bg-[#14b8a625]',
    bgColor: '#14b8a6'
  }
]

// Helper function to render allergen icon
const renderAllergenIcon = (IconComponent: IconComponent, className = 'w-4 h-4') => (
  <IconComponent className={className} />
)

// Backwards compatibility - map old ALLERGENS to new format
const ALLERGENS = ALLERGENS_CONFIG

// Dietary preference options — must match names used in admin menu builder
const DIETARY_OPTIONS = [
  { name: 'Vegan',            color: '#16a34a', icon: Leaf },
  { name: 'Vegetarian',       color: '#84cc16', icon: Apple },
  { name: 'Gluten-Free',      color: '#f59e0b', icon: WheatOff },
  { name: 'Halal',            color: '#10b981', icon: Moon },
  { name: 'Kosher',           color: '#3b82f6', icon: Star },
  { name: 'Organic',          color: '#22c55e', icon: Sprout },
  { name: 'Fair Trade',       color: '#8b5cf6', icon: Globe },
  { name: 'Lactose-Free',     color: '#06b6d4', icon: Droplets },
  { name: 'Coeliac-Friendly', color: '#ec4899', icon: ShieldCheck },
]

const CATEGORY_NAMES: Record<string, string> = {
  'acai_bowls': 'Açai Bowls',
  'smoothies': 'Smoothies',
  'juices': 'Fresh Juices',
  'toppings': 'Toppings',
  'extras': 'Extras',
  'main': 'Main Courses',
  'starters': 'Starters',
  'desserts': 'Desserts',
  'drinks': 'Drinks',
  'appetizers': 'Appetizers',
  'sides': 'Side Dishes',
  'salads': 'Salads',
  'breakfast': 'Breakfast',
  'lunch': 'Lunch',
  'dinner': 'Dinner'
}

// Production ready - no mock data (data fetched via useOfflineKioskData hook)

// ===== CONSTANTS =====
const INACTIVITY_TIMEOUT = 120000 // 2 minutes before returning to home screen
const WARNING_TIME = 20000 // 20 seconds warning before reset
const SCREENSAVER_TIMEOUT = 180000 // 3 minutes idle on home screen → screensaver
const ADMIN_WORDMARK_SRC = '/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg'
const isImageIcon = (icon?: string) => Boolean(icon && /^https?:\/\//.test(icon))

// Examples:
// 10000 = 10 seconds
// 30000 = 30 seconds
// 60000 = 1 minute
// 120000 = 2 minutes
// 180000 = 3 minutes
// 300000 = 5 minutes

// ===== HELPER FUNCTIONS =====
function downloadQRCode() {
  const svg = document.getElementById('qr-code-svg') as SVGElement | null
  if (!svg) return
  
  const svgData = new XMLSerializer().serializeToString(svg)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = new Image()
  
  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    ctx?.drawImage(img, 0, 0)
    
    const pngUrl = canvas.toDataURL('image/png')
    const downloadLink = document.createElement('a')
    downloadLink.href = pngUrl
    downloadLink.download = 'allergen-menu-qrcode.png'
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }
  
  img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
}

async function generatePDF(includeFilters: boolean = false) {
  console.log('Generating PDF...', includeFilters ? 'with filters' : 'full menu')
  // This function will be replaced with generateAllergenTablePDF call in the component
}

export default function KioskPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const siteIdParam = searchParams.get('site_id')
  const pdfAutoDownload = searchParams.get('pdf')

  // Persist slug so the PWA start_url (/kiosk) can redirect back here
  useEffect(() => {
    if (slug && typeof window !== 'undefined') {
      localStorage.setItem('allyjen_kiosk_slug', slug)
    }
  }, [slug])
  
  // Use offline-enabled data hook
  const {
    business,
    menuItems,
    ingredients,
    loading,
    error,
    isOffline,
    isStale,
    lastUpdated,
    refresh,
  } = useOfflineKioskData(slug, siteIdParam)

  // Send periodic heartbeats to track device status
  useDeviceHeartbeat({
    siteId: siteIdParam || undefined,
    businessId: business?.id,
    enabled: !loading && !!business,
    intervalMs: 60000 // 1 minute
  })
  
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [selectedDietary, setSelectedDietary] = useState<string[]>([])
  const [expandedAllergens, setExpandedAllergens] = useState<string[]>([])
  const [selectedGlutenTypes, setSelectedGlutenTypes] = useState<GlutenType[]>([])
  const [selectedTreeNutTypes, setSelectedTreeNutTypes] = useState<TreeNutType[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showQRCode, setShowQRCode] = useState(false)
  const [showPDFOptions, setShowPDFOptions] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [kioskStarted, setKioskStarted] = useState(false)
  const [showInactivityWarning, setShowInactivityWarning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [activeView, setActiveView] = useState<'landing' | 'filters' | 'menu'>('landing')
  const [emailInput, setEmailInput] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(
    (typeof window !== 'undefined' ? localStorage.getItem('defaultLanguage') as LanguageCode || 'en' : 'en') as LanguageCode
  )
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [menuViewMode, setMenuViewMode] = useState<'cards' | 'table'>('table')
  const [showScreensaver, setShowScreensaver] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const [showAllergenGuide, setShowAllergenGuide] = useState(false)
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  
  const t = translations[currentLanguage] as typeof translations.en
  const businessName = business?.name?.trim() || ''
  const kioskDisplayName = business?.kiosk_display_name?.trim() || ''
  const totalActiveFilters = selectedAllergens.length + selectedGlutenTypes.length + selectedTreeNutTypes.length + selectedDietary.length
  
  // Refs for timeout management
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const pageLoadTime = useRef(Date.now())
  const screensaverTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ── Visual Viewport / keyboard offset ───────────────────────────────────────
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardOffset(offset)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  // ── Auto-refresh on new deployment ─────────────────────────────────────────
  // Poll /api/version every 5 minutes. If the deployment ID changes it means
  // the app has been updated. We only reload when the kiosk is idle (start
  // screen not yet started, or after inactivity has reset it back) so we never
  // interrupt a customer mid-session.
  useEffect(() => {
    let deploymentVersion: string | null = null

    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const incoming = String(data.version ?? '')
        if (!incoming || incoming === 'dev') return // skip in local dev

        if (deploymentVersion === null) {
          // First fetch — store as baseline, don't reload
          deploymentVersion = incoming
          return
        }

        if (incoming !== deploymentVersion && !kioskStartedRef.current) {
          // New deployment detected AND kiosk is idle — safe to reload
          window.location.reload()
        }
      } catch {
        // Network error — silently ignore, try again next interval
      }
    }

    checkVersion()
    const interval = setInterval(checkVersion, 5 * 60 * 1000) // every 5 minutes
    return () => clearInterval(interval)
  }, [])

  // Listen for language changes from admin settings
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent<LanguageCode>) => {
      setCurrentLanguage(event.detail)
    }

    window.addEventListener('languageChange', handleLanguageChange as EventListener)

    return () => {
      window.removeEventListener('languageChange', handleLanguageChange as EventListener)
    }
  }, [])

  // Keep table view off on smaller screens where it becomes hard to read.
  useEffect(() => {
    const handleResize = () => {
      const small = window.innerWidth < 1024
      setIsSmallScreen(small)
      if (small) {
        setMenuViewMode('table')
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ===== SCREENSAVER (HOME SCREEN IDLE) =====
  useEffect(() => {
    if (kioskStarted) {
      if (screensaverTimerRef.current) clearTimeout(screensaverTimerRef.current)
      setShowScreensaver(false)
      return
    }

    const startTimer = () => {
      if (screensaverTimerRef.current) clearTimeout(screensaverTimerRef.current)
      screensaverTimerRef.current = setTimeout(() => {
        setShowScreensaver(true)
      }, 45000)
    }

    const handleActivity = () => {
      setShowScreensaver(false)
      startTimer()
    }

    const events = ['touchstart', 'click', 'mousemove', 'keydown'] as const
    events.forEach(e => document.addEventListener(e, handleActivity, true))
    startTimer()

    return () => {
      if (screensaverTimerRef.current) clearTimeout(screensaverTimerRef.current)
      events.forEach(e => document.removeEventListener(e, handleActivity, true))
    }
  }, [kioskStarted])

  // Auto-trigger PDF download when ?pdf=1 param is present (QR code scan from kiosk)
  useEffect(() => {
    if (pdfAutoDownload === '1' && !loading && menuItems.length > 0 && business) {
      handleGeneratePDF(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfAutoDownload, loading, menuItems.length])

  // ===== INACTIVITY TIMER SETUP =====
  useEffect(() => {
    if (!kioskStarted) return

    // Setup activity listeners
    const handleActivity = () => {
      lastActivityRef.current = Date.now()
      setShowInactivityWarning(false)
      resetInactivityTimer()
    }

    // Touch events for touch screen devices
    const touchEvents = ['touchstart', 'touchmove', 'touchend']
    touchEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Mouse events for desktop testing
    const mouseEvents = ['click', 'mousemove', 'mousedown']
    mouseEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Keyboard events
    document.addEventListener('keydown', handleActivity, true)
    
    // Scroll events
    window.addEventListener('scroll', handleActivity, true)

    // Initial timer setup
    resetInactivityTimer()

    return () => {
      // Cleanup listeners
      touchEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      mouseEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      document.removeEventListener('keydown', handleActivity, true)
      window.removeEventListener('scroll', handleActivity, true)

      // Cleanup timers
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [kioskStarted])

  // ===== RESET INACTIVITY TIMER =====
  const resetInactivityTimer = () => {
    // Clear existing timers
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

    // Set warning timer (appears 30 seconds before reset)
    warningTimerRef.current = setTimeout(() => {
      setShowInactivityWarning(true)
      setRemainingSeconds(Math.ceil(WARNING_TIME / 1000))

      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, INACTIVITY_TIMEOUT - WARNING_TIME)

    // Set reset timer (auto-reset to home screen)
    inactivityTimerRef.current = setTimeout(() => {
      handleInactivityReset()
    }, INACTIVITY_TIMEOUT)
  }

  // ===== HANDLE INACTIVITY RESET =====
  const handleInactivityReset = () => {
    console.log('⏱️ [Kiosk] Inactivity timeout - Returning to home screen')
    setKioskStarted(false)
    setActiveView('menu')
    setShowInactivityWarning(false)
    setRemainingSeconds(0)
    setCurrentLanguage('en')
    
    // Clear any selections
    setSelectedAllergens([])
    setSelectedDietary([])
    setSearchQuery('')

    // Reset accessibility settings to defaults
    window.dispatchEvent(new CustomEvent('kiosk:reset'))
  }

  // ===== DISMISS WARNING =====
  const handleDismissWarning = () => {
    lastActivityRef.current = Date.now()
    setShowInactivityWarning(false)
    resetInactivityTimer()
  }

  // Track page view on load
  useEffect(() => {
    if (slug) {
      trackPageView(slug, siteIdParam)
    }
  }, [slug, siteIdParam])

  // Track search queries
  useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        trackSearch(slug, searchQuery, siteIdParam)
      }, 500)
      
      return () => clearTimeout(timeoutId)
    }
  }, [searchQuery, slug, siteIdParam])

  // Track filter usage
  useEffect(() => {
    if (selectedAllergens.length > 0 || selectedDietary.length > 0) {
      trackFilterUsage(slug, selectedAllergens, selectedDietary, siteIdParam)
    }
  }, [selectedAllergens, selectedDietary, slug, siteIdParam])

  useEffect(() => {
    if (showQRCode) {
      trackQRScan(slug, 'kiosk_modal', siteIdParam)
    }
  }, [showQRCode, slug, siteIdParam])

  // Track time on page when leaving
  useEffect(() => {
    return () => {
      const timeOnPage = Math.floor((Date.now() - pageLoadTime.current) / 1000)
      trackTimeOnPage(slug, timeOnPage, siteIdParam)
    }
  }, [slug, siteIdParam])

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activeView])

  // Scroll to top when kiosk starts
  useEffect(() => {
    if (kioskStarted) {
      window.scrollTo(0, 0)
    }
  }, [kioskStarted])

  function toggleAllergen(allergenId: string) {
    // If it's gluten or tree nuts, also expand the sub-type panel
    if (allergenId === 'contains_cereals_gluten' || allergenId === 'contains_nuts') {
      setExpandedAllergens(prev => 
        prev.includes(allergenId)
          ? prev.filter(id => id !== allergenId)
          : [...prev, allergenId]
      )
      // Fall through to also toggle in selectedAllergens for top-level filtering
    }
    
    setSelectedAllergens(prev => 
      prev.includes(allergenId)
        ? prev.filter(id => id !== allergenId)
        : [...prev, allergenId]
    )
  }

  function toggleGlutenType(glutenType: GlutenType) {
    setSelectedGlutenTypes(prev =>
      prev.includes(glutenType)
        ? prev.filter(t => t !== glutenType)
        : [...prev, glutenType]
    )
  }

  function toggleTreeNutType(nutType: TreeNutType) {
    setSelectedTreeNutTypes(prev =>
      prev.includes(nutType)
        ? prev.filter(t => t !== nutType)
        : [...prev, nutType]
    )
  }

  function selectAllGlutenTypes() {
    const allGlutenKeys = GLUTEN_TYPES.map(g => g.key)
    if (selectedGlutenTypes.length === allGlutenKeys.length) {
      // All selected, deselect all
      setSelectedGlutenTypes([])
    } else {
      // Select all
      setSelectedGlutenTypes(allGlutenKeys)
    }
  }

  function selectAllTreeNutTypes() {
    const allNutKeys = TREE_NUT_TYPES.map(n => n.key)
    if (selectedTreeNutTypes.length === allNutKeys.length) {
      // All selected, deselect all
      setSelectedTreeNutTypes([])
    } else {
      // Select all
      setSelectedTreeNutTypes(allNutKeys)
    }
  }

  function clearFilters() {
    setSelectedAllergens([])
    setSelectedDietary([])
    setSelectedGlutenTypes([])
    setSelectedTreeNutTypes([])
    setExpandedAllergens([])
    setSearchQuery('')
  }

  function getAllergensForItem(item: MenuItem): string[] {
    return ALLERGENS
      .filter(allergen => item[allergen.id as keyof MenuItem] === true)
      .map(allergen => allergen.name)
  }

  function filterMenuItems() {
    return menuItems.filter(item => {
      const normalizedQuery = searchQuery.toLowerCase()
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(normalizedQuery) &&
        !(item.description || '').toLowerCase().includes(normalizedQuery)
      ) {
        return false
      }
      
      // Check regular allergens — supports both legacy boolean fields and new allergen_warnings JSONB
      if (selectedAllergens.length > 0) {
        const hasSelectedAllergen = selectedAllergens.some(allergenId => {
          // Legacy: contains_milk, contains_eggs, etc.
          if (item[allergenId as keyof MenuItem] === true) return true
          // New allergen_warnings system: strip 'contains_' prefix to get key, e.g. 'milk'
          const warningKey = allergenId.replace(/^contains_/, '')
          const warningLevel = (item.allergen_warnings as Record<string, string> | undefined)?.[warningKey]
          return warningLevel && warningLevel !== 'none'
        })
        if (hasSelectedAllergen) {
          return false
        }
      }
      
      // Check specific gluten types
      const itemHasGluten =
        item.contains_cereals_gluten === true ||
        ((item.allergen_warnings as Record<string, string> | undefined)?.cereals_gluten ?? 'none') !== 'none'
      if (selectedGlutenTypes.length > 0 && itemHasGluten) {
        const itemGlutenLevels = (item as any).cereals_gluten_levels
        if (itemGlutenLevels) {
          const hasSelectedGluten = selectedGlutenTypes.some(glutenType => {
            const level = itemGlutenLevels[glutenType]
            return level && level !== 'none'
          })
          if (hasSelectedGluten) return false
        } else {
          return false
        }
      }
      
      // Check specific tree nut types
      const itemHasNuts =
        item.contains_nuts === true ||
        ((item.allergen_warnings as Record<string, string> | undefined)?.nuts ?? 'none') !== 'none'
      if (selectedTreeNutTypes.length > 0 && itemHasNuts) {
        const itemNutLevels = (item as any).nuts_levels
        if (itemNutLevels) {
          const hasSelectedNut = selectedTreeNutTypes.some(nutType => {
            const level = itemNutLevels[nutType]
            return level && level !== 'none'
          })
          if (hasSelectedNut) return false
        } else {
          return false
        }
      }
      
      // Dietary preference filter — INCLUDE logic: item must have ALL selected dietary attrs
      if (selectedDietary.length > 0) {
        const itemDietary: string[] = Array.isArray(item.dietary) ? item.dietary : []
        const matchesAll = selectedDietary.every(d => itemDietary.includes(d))
        if (!matchesAll) return false
      }

      return true
    })
  }

  function getCategoryDisplayName(category: string): string {
    return CATEGORY_NAMES[category.toLowerCase()] || 
           category.split('_').map(word => 
             word.charAt(0).toUpperCase() + word.slice(1)
           ).join(' ')
  }

  function sortByCategoryAndName(items: MenuItem[]): MenuItem[] {
    return [...items].sort((a, b) => {
      const categoryA = getCategoryDisplayName((a.category || 'uncategorized').toLowerCase())
      const categoryB = getCategoryDisplayName((b.category || 'uncategorized').toLowerCase())
      if (categoryA !== categoryB) return categoryA.localeCompare(categoryB)
      return String(a.name || '').localeCompare(String(b.name || ''))
    })
  }

  function getOrderedCategories(items: MenuItem[]): string[] {
    return Array.from(new Set(items.map(item => item.category || 'uncategorized')))
      .sort((a, b) => getCategoryDisplayName(a).localeCompare(getCategoryDisplayName(b)))
  }

  // Open full allergen guide as inline overlay (no PDF, no auth check)
  const handleOpenAllergenGuide = () => {
    setShowAllergenGuide(true)
    trackDownload(slug, 'inline_guide_view', siteIdParam)
  }

  // Handle PDF generation with table format
  const handleGeneratePDF = async (includeFilters: boolean = false) => {
    if (!business) return
    
    setGeneratingPDF(true)
    try {
      // Check if PDF download is allowed (trial limits)
      const response = await fetch('/api/pdf/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadType: includeFilters ? 'filtered_pdf' : 'full_pdf',
          siteId: siteIdParam || null
        })
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.allowed) {
        setGeneratingPDF(false)
        alert(result.error || 'PDF download limit reached. Please upgrade your plan to continue.')
        return
      }
      
      const menuItemsToInclude = (includeFilters ? filteredItems : menuItems).map(i => ({ ...i, itemType: 'menu_item' as const }))
      const allItemsToInclude = [...menuItemsToInclude, ...ingredientGuideRows.map(i => ({ ...i, itemType: 'ingredient' as const }))]
      
      await generateAllergenTablePDF({
        business: business,
        items: allItemsToInclude,
          title: includeFilters && totalActiveFilters > 0 
            ? `Allergen Guide (${totalActiveFilters} active filter${totalActiveFilters > 1 ? 's' : ''})`
          : 'Complete Allergen Information Guide',
        showLegend: true
      })
      
      await trackDownload(slug, includeFilters ? 'filtered_pdf' : 'full_pdf', siteIdParam)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Sorry, there was an error generating the PDF. Please try again.')
    } finally {
      setGeneratingPDF(false)
    }
  }

  // Send allergen PDF to customer email
  const handleEmailMenu = async (includeFilters: boolean = false) => {
    if (!business) return
    const email = emailInput.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setSendingEmail(true)
    setEmailError('')
    let pdfBase64: string | undefined
    try {
      const menuItemsToEmail = (includeFilters ? filteredItems : menuItems).map(i => ({ ...i, itemType: 'menu_item' as const }))
      const allItemsToEmail = [...menuItemsToEmail, ...ingredientGuideRows.map(i => ({ ...i, itemType: 'ingredient' as const }))]
      // Generate PDF as base64 in the browser, then POST to server for mailing
      // Strip logo_url to avoid large payloads — branding colour still applies
      const businessForPdf = { ...business, logo_url: null }
      pdfBase64 = await generateAllergenTablePDF({
        business: businessForPdf,
        items: allItemsToEmail,
        title: includeFilters && totalActiveFilters > 0
          ? `Allergen Guide (${totalActiveFilters} active filter${totalActiveFilters > 1 ? 's' : ''})`
          : 'Complete Allergen Information Guide',
        showLegend: true,
        outputMode: 'base64',
      }) as string
    } catch (err) {
      console.error('Error generating PDF for email:', err)
      setEmailError('Could not generate PDF. Please try again.')
      setSendingEmail(false)
      return
    }

    try {
      const response = await fetch('/api/kiosk/email-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          pdfBase64,
          businessName: business.name,
          filteredCount: includeFilters ? filteredItems.length : 0,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setEmailError(data.error || 'Failed to send. Please try again.')
        return
      }
      setEmailSent(true)
      setEmailInput('')
    } catch (err) {
      console.error('Error sending email:', err)
      setEmailError('Failed to send. Please try again.')
    } finally {
      setSendingEmail(false)
    }
  }

  // Screen Wake Lock — keep screen on while kiosk is active
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        wakeLockRef.current?.addEventListener('release', () => {
          // Re-acquire if still running (e.g. tab became visible again)
          if (kioskStartedRef.current) requestWakeLock()
        })
      }
    } catch {
      // Wake lock not supported or denied — non-fatal
    }
  }

  const kioskStartedRef = useRef(false)

  // Release wake lock when kiosk stops
  useEffect(() => {
    kioskStartedRef.current = kioskStarted
    if (!kioskStarted && wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [kioskStarted])

  // Re-acquire wake lock when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && kioskStartedRef.current) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Request fullscreen — must be called from a user gesture handler
  const enterFullscreen = () => {
    const el = document.documentElement
    if (document.fullscreenElement) return // already fullscreen
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    } else if ((el as any).webkitRequestFullscreen) {
      ;(el as any).webkitRequestFullscreen()
    }
  }

  // Track when user starts the kiosk
  const handleStartKiosk = () => {
    setKioskStarted(true)
    setActiveView('landing')
    trackKioskInteraction(slug, 'home_screen_start')
    enterFullscreen()
    requestWakeLock()
  }

  // Helper function for tracking
  async function trackKioskInteraction(slug: string, action: string) {
    console.log('📊 [Dev] Kiosk interaction:', action, 'for:', slug)
  }

  if (loading && !business && menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#003842] flex items-center justify-center px-6" data-context="kiosk">
        <div className="text-center text-white max-w-md">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/25 border-t-[#42b8ac]" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t.loadingKiosk || 'Loading Kiosk'}</h1>
          <p className="text-white/70">{t.fetchingLatestMenu || 'Fetching the latest allergen menu...'}</p>
        </div>
      </div>
    )
  }

  if (error && !business && menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#003842] flex items-center justify-center px-6" data-context="kiosk">
        <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">{t.kioskDataUnavailable || 'Kiosk Data Unavailable'}</h1>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button variant="primary" onClick={refresh} icon={<RefreshCw className="h-4 w-4" />}>
                {t.retryLoading || 'Retry Loading'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== INACTIVITY WARNING MODAL =====
  const InactivityWarning = () => (
    <div className="fixed inset-0 bg-[#001e24]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full bg-[#003842] border border-[#42b8ac]/30 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8 text-center">
          <div className="p-4 bg-[#42b8ac]/15 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-[#42b8ac]/30">
            <Clock className="h-8 w-8 text-[#42b8ac] animate-spin" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {t.inactivityWarning}
          </h2>

          <p className="text-[#8dd8d2] mb-6">
            {t.noActivityDetected}
          </p>

          <div className="mb-8">
            <div className="text-6xl font-bold text-[#42b8ac] font-mono tabular-nums">
              {String(remainingSeconds).padStart(2, '0')}
            </div>
            <p className="text-sm text-white/40 mt-2">{t.tapAnywhereToContinue}</p>
          </div>

          <div className="w-full bg-white/10 rounded-full h-1.5 mb-8 overflow-hidden">
            <div
              className="bg-[#42b8ac] h-full transition-all duration-1000"
              style={{
                width: `${(remainingSeconds / Math.ceil(WARNING_TIME / 1000)) * 100}%`,
              }}
            />
          </div>

          <Button
            variant="primary"
            fullWidth
            onClick={handleDismissWarning}
          >
            {t.continueUsingKiosk}
          </Button>
        </div>
      </div>
    </div>
  )

  // ===== HOME SCREEN =====
  if (!kioskStarted) {
    return (
      <div
        className="min-h-[100svh] md:min-h-screen relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #42b8ac 0%, #1a6e8a 55%, #001a20 100%)' }}
        data-context="kiosk"
        onClick={enterFullscreen}
      >
        {/* Decorative blobs for depth */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-44 -left-32 w-[560px] h-[560px] rounded-full bg-[#42b8ac]/30 blur-3xl"
            style={{ animation: 'kioskBlobOne 18s ease-in-out infinite alternate' }}
          />
          <div
            className="absolute -bottom-44 -right-32 w-[620px] h-[620px] rounded-full bg-white/10 blur-3xl"
            style={{ animation: 'kioskBlobTwo 22s ease-in-out infinite alternate' }}
          />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
        </div>

        <AccessibilityPanel />

        <div className="relative z-10 min-h-[100svh] md:min-h-screen flex items-center justify-center px-6 py-6 sm:px-8 sm:py-10 lg:px-16 lg:py-12">
          <div className="w-full max-w-6xl rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md shadow-2xl p-8 sm:p-12 lg:p-16 text-center">
            <img
              src={ADMIN_WORDMARK_SRC}
              alt="AllyJen"
              className="h-20 sm:h-24 lg:h-28 xl:h-32 w-auto mx-auto"
            />

            <div className="mt-10 sm:mt-12 lg:mt-14">
              <p className="text-white/95 text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 tracking-tight">
                {t.readyWhenYouAre}
              </p>

              <p className="text-white/85 text-lg sm:text-xl lg:text-2xl font-semibold leading-snug">
                {t.servingConfidenceDesc}
              </p>
            </div>

            <button
              onClick={handleStartKiosk}
              className="mx-auto mt-16 sm:mt-20 max-w-lg rounded-2xl px-6 py-5 cursor-pointer block w-full transition-all active:scale-[0.98] bg-[#003842] hover:bg-[#004d5c] border border-white/20 shadow-lg"
            >
              <p className="text-white font-bold text-lg sm:text-xl lg:text-2xl mb-0">
                {t.clickHereToBegin}
              </p>
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes kioskBlobOne {
            0% { transform: translate3d(0, 0, 0) scale(1); }
            100% { transform: translate3d(48px, -26px, 0) scale(1.08); }
          }
          @keyframes kioskBlobTwo {
            0% { transform: translate3d(0, 0, 0) scale(1); }
            100% { transform: translate3d(-56px, 24px, 0) scale(1.07); }
          }
        `}</style>
      </div>
    )
  }

  // ===== MENU DISPLAY =====
  const filteredItems = sortByCategoryAndName(filterMenuItems())
  const categories = getOrderedCategories(filteredItems)
  const sortedMenuItems = sortByCategoryAndName(menuItems)
  const sortedIngredients = [...(ingredients || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))

  const ingredientGuideRows: MenuItem[] = sortedIngredients.map((ingredient, index) => ({
    id: `ingredient-${ingredient.id}`,
    name: ingredient.name,
    description: ingredient.description || null,
    price: 0,
    category: ingredient.category || 'ingredients',
    display_order: index,
    business_id: ingredient.business_id,
    is_active: true,
    ingredient_names: [],
    allergen_warnings: ingredient.allergen_warnings,
    suppliers: ingredient.suppliers || [],
    supplier_profiles: ingredient.supplier_profiles || {},
    combined_allergens: ingredient.allergen_warnings ? [ingredient.allergen_warnings] : [],
  }))

  const kioskUrl = typeof window !== 'undefined' ? `${window.location.origin}/kiosk/${slug}` : ''

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {showInactivityWarning && <InactivityWarning />}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#003842] shadow-lg">
        <Container>
          <div className="py-4">
            {/* Offline Indicator */}
            {(isOffline || isStale) && (
              <div className="mb-4">
                <OfflineIndicator
                  isOffline={isOffline}
                  isStale={isStale}
                  lastUpdated={lastUpdated}
                  onRefresh={refresh}
                  showDetails={true}
                />
              </div>
            )}

            {/* ── Mobile header (< md): hamburger left · logo centre · nothing right ── */}
            <div className="flex items-center justify-between md:hidden">
              {/* Hamburger */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg border border-white/40 text-white hover:bg-white/10 transition"
                aria-label="Open menu"
              >
                {showMobileMenu ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
                )}
              </button>

              {/* Logo centred */}
              <img src={ADMIN_WORDMARK_SRC} alt="AllyJen Logo" className="h-10 w-auto object-contain" />

              {/* Right spacer — same width as hamburger so logo stays centred */}
              <div className="w-9" />
            </div>

            {/* Mobile dropdown menu */}
            {showMobileMenu && (
              <div className="md:hidden mt-3 rounded-xl border border-white/20 bg-[#004f5e] p-4 flex flex-col gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'rgba(66,184,172,0.7)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setActiveView('menu') }}
                    placeholder={t.searchMenuItems}
                    style={{ borderColor: 'rgba(66,184,172,0.35)', color: 'white' }}
                    onFocus={(e) => { e.target.style.borderColor = '#42b8ac'; e.target.style.boxShadow = '0 0 0 3px rgba(66,184,172,0.15)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(66,184,172,0.35)'; e.target.style.boxShadow = 'none' }}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border-2 bg-white/10 placeholder-white/30 text-sm font-medium focus:outline-none transition-colors"
                  />
                </div>

                {/* Filter allergens */}
                <button
                  onClick={() => { setActiveView(activeView === 'filters' ? 'menu' : 'filters'); setShowMobileMenu(false) }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/30 text-white hover:bg-white/10 transition text-sm font-medium"
                >
                  <Filter className="h-4 w-4 shrink-0" />
                  {activeView === 'filters' ? t.browseFullMenu : t.filterByAllergens}
                </button>

                {/* Language */}
                <div>
                  <button
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/30 text-white hover:bg-white/10 transition text-sm font-medium"
                  >
                    <span className="text-base">{t.flag}</span>
                    <span>{t.name}</span>
                    <svg className="h-4 w-4 ml-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  {showLanguageMenu && (
                    <div className="mt-1 rounded-lg border border-white/20 bg-[#003842] overflow-hidden">
                      {(Object.entries(translations) as [LanguageCode, any][]).map(([code, lang]) => (
                        <button
                          key={code}
                          onClick={() => { setCurrentLanguage(code); setShowLanguageMenu(false); setShowMobileMenu(false); localStorage.setItem('defaultLanguage', code); window.dispatchEvent(new CustomEvent('languageChange', { detail: code })) }}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition ${currentLanguage === code ? 'bg-white/10 font-semibold' : ''}`}
                        >
                          <span className="text-base">{lang.flag}</span>
                          <span>{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Home */}
                <button
                  onClick={() => { setActiveView('landing'); clearFilters(); setShowInactivityWarning(false); setShowMobileMenu(false) }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/30 text-white hover:bg-white/10 transition text-sm font-medium"
                >
                  <Home className="h-4 w-4 shrink-0" />
                  {t.homeButton}
                </button>
              </div>
            )}

            {/* ── Desktop header (≥ md): logo left · buttons right ── */}
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              {/* Left slot on desktop — empty spacer */}
              <div />

              {/* Logo centred */}
              <div className="flex items-center justify-center">
                <img src={ADMIN_WORDMARK_SRC} alt="AllyJen Logo" className="h-12 w-auto object-contain" />
              </div>

              {/* Right slot — all action buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 pointer-events-none" style={{ color: 'rgba(66, 184, 172, 0.6)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setActiveView('menu') }}
                    placeholder={t.searchMenuItems}
                    style={{ borderColor: 'rgba(66, 184, 172, 0.35)', color: 'white' }}
                    onFocus={(e) => { e.target.style.borderColor = '#42b8ac'; e.target.style.boxShadow = '0 0 0 3px rgba(66, 184, 172, 0.15)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(66, 184, 172, 0.35)'; e.target.style.boxShadow = 'none' }}
                    className="pl-10 pr-4 py-1.5 rounded-lg border-2 bg-white/10 placeholder-white/30 w-64 transition-colors focus:outline-none font-sans font-medium text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Filter className="h-4 w-4" />}
                    className="text-white border-white/40 hover:text-white hover:border-white/60"
                    onClick={() => setActiveView(activeView === 'filters' ? 'menu' : 'filters')}
                  >
                    {activeView === 'filters' ? t.browseFullMenu : t.filterByAllergens}
                  </Button>

                  {/* Language Dropdown */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-white border-white/40 hover:text-white hover:border-white/60"
                      onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    >
                      <span className="font-semibold">{t.abbr}</span>
                    </Button>
                    {showLanguageMenu && (
                      <div className="absolute right-0 top-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-max">
                        {(Object.entries(translations) as [LanguageCode, any][]).map(([code, lang]) => (
                          <button
                            key={code}
                            onClick={() => {
                              setCurrentLanguage(code)
                              setShowLanguageMenu(false)
                              localStorage.setItem('defaultLanguage', code)
                              window.dispatchEvent(new CustomEvent('languageChange', { detail: code }))
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                              currentLanguage === code ? 'bg-[#42b8ac]/10 text-[#003842] font-semibold' : ''
                            }`}
                          >
                            <span className="text-lg">{lang.flag}</span>
                            <span>{lang.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Home className="h-4 w-4" />}
                    className="text-white border-white/40 hover:text-white hover:border-white/60"
                    onClick={() => { setActiveView('landing'); clearFilters(); setShowInactivityWarning(false) }}
                    title="Return to main menu"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-white border-white/40 hover:text-white hover:border-white/60"
                    onClick={() => { setKioskStarted(false); setActiveView('landing'); clearFilters(); setShowInactivityWarning(false); setCurrentLanguage('en'); window.dispatchEvent(new CustomEvent('kiosk:reset')) }}
                    title="Return to sleep screen"
                  >
                    Kiosk
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </header>

      <Container className="py-8">
        {/* Landing Page View */}
        {activeView === 'landing' && (
          <>
            {/* Quick Action Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5 mb-8">
              {/* Search by Allergen Tile */}
              <button
                onClick={() => setActiveView('filters')}
                className="group text-left flex flex-col h-full transition-transform md:hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#dc2626] rounded-2xl"
              >
                <Card className="relative overflow-hidden p-6 sm:p-7 bg-[#fff7f6] border-2 border-[#dc2626] shadow-md hover:shadow-lg transition-all h-full min-h-[170px]">
                  <div className="flex h-full items-center gap-5">
                    <div className="p-4 bg-[#dc2626] rounded-2xl shadow-sm flex-shrink-0">
                      <Filter className="h-8 w-8 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl sm:text-3xl font-bold text-[#7f1d1d] leading-tight">{t.avoidAllergens}</h3>
                      <p className="mt-2 text-[#991b1b] text-base sm:text-lg leading-snug">
                        {t.avoidAllergensDesc}
                      </p>
                    </div>
                    <div className="self-end text-[#dc2626] group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="h-7 w-7" />
                    </div>
                  </div>
                </Card>
              </button>

              {/* Full Allergen Guide Tile */}
              <button
                onClick={handleOpenAllergenGuide}
                className="group text-left flex flex-col h-full transition-transform md:hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#047857] rounded-2xl"
              >
                <Card className="relative overflow-hidden p-6 sm:p-7 bg-[#f0fdf4] border border-[#86efac] shadow-md hover:shadow-lg transition-all h-full min-h-[170px]">
                  <div className="flex h-full items-center gap-5">
                    <div className="p-4 bg-[#047857] rounded-2xl shadow-sm flex-shrink-0">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl sm:text-3xl font-bold text-[#064e3b] leading-tight">{t.fullAllergenGuide}</h3>
                      <p className="mt-2 text-[#065f46] text-base sm:text-lg leading-snug">
                        {t.fullAllergenGuideDesc}
                      </p>
                    </div>
                    <div className="self-end text-[#047857] group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="h-7 w-7" />
                    </div>
                  </div>
                </Card>
              </button>

              {/* QR Code Download Tile */}
              <button
                onClick={() => setShowQRCode(true)}
                className="group text-left flex flex-col h-full transition-transform md:hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7e22ce] rounded-2xl"
              >
                <Card className="relative overflow-hidden p-6 sm:p-7 bg-[#faf5ff] border border-[#d8b4fe] shadow-md hover:shadow-lg transition-all h-full min-h-[170px]">
                  <div className="flex h-full items-center gap-5">
                    <div className="p-4 bg-[#7e22ce] rounded-2xl shadow-sm flex-shrink-0">
                      <QrCode className="h-8 w-8 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl sm:text-3xl font-bold text-[#581c87] leading-tight">{t.saveMenuToPhone}</h3>
                      <p className="mt-2 text-[#6b21a8] text-base sm:text-lg leading-snug">
                        {t.saveMenuToPhoneDesc}
                      </p>
                    </div>
                    <div className="self-end text-[#7e22ce] group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="h-7 w-7" />
                    </div>
                  </div>
                </Card>
              </button>

              {/* Email Guide Tile */}
              <button
                onClick={() => setShowPDFOptions(true)}
                className="group text-left flex flex-col h-full transition-transform md:hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f4f4a] rounded-2xl"
              >
                <Card className="relative overflow-hidden p-6 sm:p-7 bg-[#effaf8] border border-[#99d8d1] shadow-md hover:shadow-lg transition-all h-full min-h-[170px]">
                  <div className="flex h-full items-center gap-5">
                    <div className="p-4 bg-[#0f4f4a] rounded-2xl shadow-sm flex-shrink-0">
                      <Mail className="h-8 w-8 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl sm:text-3xl font-bold text-[#134e4a] leading-tight">{t.emailAllergenGuide}</h3>
                      <p className="mt-2 text-[#115e59] text-base sm:text-lg leading-snug">
                        {t.emailAllergenGuideDesc}
                      </p>
                    </div>
                    <div className="self-end text-[#0f4f4a] group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="h-7 w-7" />
                    </div>
                  </div>
                </Card>
              </button>
            </div>

            {/* Disclaimer Section */}
            <Card className="p-5 sm:p-6 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-600 rounded-xl shadow-sm flex-shrink-0 mt-1">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-orange-900 mb-3">{t.crossContamination}</h2>
                  <p className="text-orange-800 text-sm mb-2 leading-relaxed">
                    {business?.kiosk_disclaimer || t.disclaimerText}
                  </p>
                  <p className="text-orange-800 text-sm mb-3 leading-relaxed">
                    {t.severeAllergyWarning}
                  </p>

                  <details className="group mt-2">
                    <summary className="cursor-pointer list-none inline-flex items-center gap-2 text-sm font-semibold text-orange-900 hover:text-orange-700 transition-colors">
                      {t.importantNotice}
                      <span className="text-xs text-orange-700 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-3 rounded-xl border border-orange-200 bg-white/60 p-4">
                      <ul className="text-orange-800 text-sm space-y-2">
                        <li>
                          <span className="font-semibold">{t.peanuts}:</span> {t.peanutsDesc}
                        </li>
                        <li>
                          <span className="font-semibold">{t.treeNuts}:</span> {t.treeNutsDesc}
                        </li>
                        <li>
                          <span className="font-semibold">{t.dairyGluten}:</span> {t.dairyGlutenDesc}
                        </li>
                      </ul>
                    </div>
                  </details>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Allergen Filter View */}
        {activeView === 'filters' && (
          <>
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{t.avoidAllergens || 'Avoid Allergens'}</h1>
              <p className="text-gray-600 text-lg">{t.avoidAllergensDesc || 'Select the allergens you want to avoid, and we\'ll hide menu items containing them.'}</p>
            </div>

            {/* Allergen Filter Section */}
            <Card className="mb-8">
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-800">Filter by Allergens</span>
                    <span className="text-xs text-red-500 font-normal">— hides items containing these allergens</span>
                  </div>
                <div className="flex flex-wrap gap-3">
                  {ALLERGENS.map(allergen => {
                    const isSelected = selectedAllergens.includes(allergen.id)
                    const isExpanded = expandedAllergens.includes(allergen.id)
                    const hasSubtypes = allergen.id === 'contains_cereals_gluten' || allergen.id === 'contains_nuts'
                    
                    return (
                      <div key={allergen.id} className="contents">
                        <button
                          onClick={() => toggleAllergen(allergen.id)}
                          className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                            isSelected || isExpanded
                              ? 'shadow-md ring-2'
                              : 'border-gray-300 hover:shadow-lg hover:scale-105'
                          }`}
                          style={{
                            backgroundColor: (isSelected || isExpanded) ? `${allergen.bgColor}20` : '#fff',
                            color: (isSelected || isExpanded) ? allergen.bgColor : '#374151',
                            borderColor: (isSelected || isExpanded) ? allergen.bgColor : '#d1d5db'
                          }}
                        >
                          <span style={{ color: allergen.bgColor }}>{React.createElement(allergen.icon as unknown as React.ComponentType<{className: string}>, { className: 'w-4 h-4' })}</span>
                          <span className="font-semibold">{allergen.name}</span>
                          {hasSubtypes && (
                            isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                          {!hasSubtypes && isSelected && <X className="h-4 w-4 ml-1" style={{ color: allergen.bgColor }} />}
                        </button>
                        
                        {/* Gluten Subtypes */}
                        {allergen.id === 'contains_cereals_gluten' && isExpanded && (
                          <div className="w-full ml-8 flex flex-wrap gap-2 mt-2 mb-2">
                            {GLUTEN_TYPES.map(glutenType => {
                              const isGlutenSelected = selectedGlutenTypes.includes(glutenType.key)
                              return (
                                <button
                                  key={glutenType.key}
                                  onClick={() => toggleGlutenType(glutenType.key)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                                    isGlutenSelected
                                      ? 'shadow-sm'
                                      : 'hover:shadow-md'
                                  }`}
                                  style={{
                                    backgroundColor: isGlutenSelected ? `${allergen.bgColor}25` : `${allergen.bgColor}08`,
                                    color: allergen.bgColor,
                                    borderColor: isGlutenSelected ? allergen.bgColor : `${allergen.bgColor}40`
                                  }}
                                >
                                  <Wheat className="h-3.5 w-3.5" style={{ color: allergen.bgColor }} />
                                  <span>{glutenType.name}</span>
                                  {isGlutenSelected && <X className="h-3 w-3" />}
                                </button>
                              )
                            })}
                            {/* Select All Button */}
                            <button
                              onClick={selectAllGlutenTypes}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all hover:shadow-md"
                              style={{
                                backgroundColor: selectedGlutenTypes.length === GLUTEN_TYPES.length ? `${allergen.bgColor}30` : '#fff',
                                color: allergen.bgColor,
                                borderColor: allergen.bgColor,
                                borderStyle: 'dashed'
                              }}
                            >
                              {selectedGlutenTypes.length === GLUTEN_TYPES.length ? (
                                <>
                                  <CheckSquare className="h-3.5 w-3.5" style={{ color: allergen.bgColor }} />
                                  <span>Deselect All</span>
                                </>
                              ) : (
                                <>
                                  <Square className="h-3.5 w-3.5" style={{ color: allergen.bgColor }} />
                                  <span>Select All</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                        
                        {/* Tree Nut Subtypes */}
                        {allergen.id === 'contains_nuts' && isExpanded && (
                          <div className="w-full ml-8 flex flex-wrap gap-2 mt-2 mb-2">
                            {TREE_NUT_TYPES.map(nutType => {
                              const isNutSelected = selectedTreeNutTypes.includes(nutType.key)
                              return (
                                <button
                                  key={nutType.key}
                                  onClick={() => toggleTreeNutType(nutType.key)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                                    isNutSelected
                                      ? 'shadow-sm'
                                      : 'hover:shadow-md'
                                  }`}
                                  style={{
                                    backgroundColor: isNutSelected ? `${allergen.bgColor}25` : `${allergen.bgColor}08`,
                                    color: allergen.bgColor,
                                    borderColor: isNutSelected ? allergen.bgColor : `${allergen.bgColor}40`
                                  }}
                                >
                                  <Nut className="h-3.5 w-3.5" style={{ color: allergen.bgColor }} />
                                  <span>{nutType.name}</span>
                                  {isNutSelected && <X className="h-3 w-3" />}
                                </button>
                              )
                            })}
                            {/* Select All Button */}
                            <button
                              onClick={selectAllTreeNutTypes}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all hover:shadow-md"
                              style={{
                                backgroundColor: selectedTreeNutTypes.length === TREE_NUT_TYPES.length ? `${allergen.bgColor}30` : '#fff',
                                color: allergen.bgColor,
                                borderColor: allergen.bgColor,
                                borderStyle: 'dashed'
                              }}
                            >
                              {selectedTreeNutTypes.length === TREE_NUT_TYPES.length ? (
                                <>
                                  <CheckSquare className="h-3.5 w-3.5" style={{ color: allergen.bgColor }} />
                                  <span>Deselect All</span>
                                </>
                              ) : (
                                <>
                                  <Square className="h-3.5 w-3.5" style={{ color: allergen.bgColor }} />
                                  <span>Select All</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                </div>

                {/* Dietary Preference Filter */}
                <div className="mt-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Salad className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-800">Filter by Dietary Preference</span>
                    <span className="text-xs text-green-600 font-normal">— shows only items with these attributes</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {DIETARY_OPTIONS.map(option => {
                      const isSelected = selectedDietary.includes(option.name)
                      const IconComp = option.icon as unknown as React.ComponentType<{className: string}>
                      return (
                        <button
                          key={option.name}
                          onClick={() => setSelectedDietary(prev =>
                            prev.includes(option.name)
                              ? prev.filter(d => d !== option.name)
                              : [...prev, option.name]
                          )}
                          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all"
                          style={{
                            backgroundColor: isSelected ? `${option.color}20` : '#fff',
                            color: isSelected ? option.color : '#374151',
                            borderColor: isSelected ? option.color : '#d1d5db',
                            boxShadow: isSelected ? `0 0 0 2px ${option.color}40` : undefined
                          }}
                        >
                          <span style={{ color: option.color }}><IconComp className="w-4 h-4" /></span>
                          <span className="font-semibold">{option.name}</span>
                          {isSelected && <X className="h-4 w-4 ml-1" style={{ color: option.color }} />}
                        </button>
                      )
                    })}
                  </div>
                  </div>
                </div>

                {/* Allergen exclusion summary — red */}
                {(selectedAllergens.length > 0 || selectedGlutenTypes.length > 0 || selectedTreeNutTypes.length > 0) && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-red-800 text-sm">Hiding items that contain:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedAllergens.map(id => {
                              const allergen = ALLERGENS.find(a => a.id === id)
                              return allergen ? (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border"
                                  style={{ backgroundColor: `${allergen.bgColor}15`, color: allergen.bgColor, borderColor: `${allergen.bgColor}40` }}
                                >
                                  <span style={{ color: allergen.bgColor }}>{React.createElement(allergen.icon as unknown as React.ComponentType<{className: string}>, { className: 'w-4 h-4' })}</span>
                                  {allergen.name}
                                </span>
                              ) : null
                            })}
                            {selectedGlutenTypes.map(glutenType => {
                              const gluten = GLUTEN_TYPES.find(g => g.key === glutenType)
                              const allergen = ALLERGENS.find(a => a.id === 'contains_cereals_gluten')
                              return gluten && allergen ? (
                                <span
                                  key={glutenType}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border"
                                  style={{ backgroundColor: `${allergen.bgColor}15`, color: allergen.bgColor, borderColor: `${allergen.bgColor}40` }}
                                >
                                  <Wheat className="h-3.5 w-3.5" style={{ color: allergen.bgColor }} />
                                  {gluten.name}
                                </span>
                              ) : null
                            })}
                            {selectedTreeNutTypes.map(nutType => {
                              const nut = TREE_NUT_TYPES.find(n => n.key === nutType)
                              const allergen = ALLERGENS.find(a => a.id === 'contains_nuts')
                              return nut && allergen ? (
                                <span
                                  key={nutType}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border"
                                  style={{ backgroundColor: `${allergen.bgColor}15`, color: allergen.bgColor, borderColor: `${allergen.bgColor}40` }}
                                >
                                  <Nut className="h-3.5 w-3.5" style={{ color: allergen.bgColor }} />
                                  {nut.name}
                                </span>
                              ) : null
                            })}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedAllergens([]); setSelectedGlutenTypes([]); setSelectedTreeNutTypes([]) }}
                        className="shrink-0 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        <X className="h-3.5 w-3.5" /> Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Dietary inclusion summary — green */}
                {selectedDietary.length > 0 && (
                  <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2">
                        <Salad className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-green-800 text-sm">Showing only items suitable for:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedDietary.map(name => {
                              const opt = DIETARY_OPTIONS.find(o => o.name === name)
                              if (!opt) return null
                              const IconComp = opt.icon as unknown as React.ComponentType<{className: string}>
                              return (
                                <span
                                  key={name}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border"
                                  style={{ backgroundColor: `${opt.color}15`, color: opt.color, borderColor: `${opt.color}40` }}
                                >
                                  <IconComp className="w-3.5 h-3.5" />
                                  {name}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedDietary([])}
                        className="shrink-0 inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium"
                      >
                        <X className="h-3.5 w-3.5" /> Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Clear all — only shown when both types active */}
                {(selectedAllergens.length > 0 || selectedGlutenTypes.length > 0 || selectedTreeNutTypes.length > 0) && selectedDietary.length > 0 && (
                  <div className="mt-2 flex justify-end">
                    <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-700 underline">
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Menu Items in Filter View */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#003842] mb-6">Menu Items</h2>

              {filteredItems.length === 0 ? (
                <Card className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.noItemsMatch}</h3>
                  <p className="text-gray-600 mb-4">{t.tryAdjustingFilters}</p>
                    {totalActiveFilters > 0 && (
                    <Button variant="primary" onClick={clearFilters} className="mx-auto">
                      {t.clearAllergenFilters}
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="space-y-6">
                  {categories.map(category => {
                    const categoryItems = filteredItems.filter(item => item.category === category)
                    if (categoryItems.length === 0) return null

                    return (
                      <div key={category} className="space-y-4">
                        <h3 className="text-xl font-bold text-[#003842]">
                          {getCategoryDisplayName(category)}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {categoryItems.map(item => {
                            const itemAllergens = getAllergensForItem(item)
                            const allergenDetails = ALLERGENS.filter(allergen => item[allergen.id as keyof MenuItem] === true)

                            return (
                              <Card key={item.id} className="h-full border border-slate-200 shadow-md hover:shadow-lg transition-shadow overflow-hidden" style={item.color ? { borderLeftColor: item.color, borderLeftWidth: '4px', backgroundColor: `${item.color}0d` } : undefined}>
                                <div className="p-6">
                                  <div className="flex items-start gap-3">
                                    {item.icon && (
                                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-3xl">
                                        {isImageIcon(item.icon) ? (
                                          <img src={item.icon} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          <span>{item.icon}</span>
                                        )}
                                      </div>
                                    )}
                                    <h4 className="text-lg font-semibold text-[#003842]">{item.name}</h4>
                                  </div>
                                  {item.description && <p className="mt-3 text-gray-600">{item.description}</p>}

                                  {allergenDetails.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <p className="text-sm font-medium text-gray-700 mb-2">Contains:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {allergenDetails.map(allergen => (
                                          <div 
                                            key={allergen.id} 
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                                            style={{
                                              backgroundColor: `${allergen.bgColor}15`,
                                              color: allergen.bgColor,
                                              borderColor: `${allergen.bgColor}40`
                                            }}
                                          >
                                            <span style={{ color: allergen.bgColor }}>{React.createElement(allergen.icon as unknown as React.ComponentType<{className: string}>, { className: 'w-4 h-4' })}</span>
                                            <span>{allergen.name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {Array.isArray(item.dietary) && item.dietary.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {item.dietary.map(d => {
                                        const opt = DIETARY_OPTIONS.find(o => o.name === d)
                                        if (!opt) return null
                                        const IconComp = opt.icon as unknown as React.ComponentType<{className: string}>
                                        return (
                                          <span
                                            key={d}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold"
                                            style={{
                                              backgroundColor: `${opt.color}18`,
                                              color: opt.color,
                                              border: `1px solid ${opt.color}50`
                                            }}
                                          >
                                            <IconComp className="w-3 h-3" />
                                            {d}
                                          </span>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </Card>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Info Section - Moved to Bottom */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t.totalMenuItems}</p>
                    <p className="text-2xl font-bold text-[#003842]">{menuItems.length}</p>
                  </div>
                  <div className="p-3 bg-[#f0f9f8] rounded-lg">
                    <Package className="h-6 w-6 text-[#42b8ac]" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t.itemsAvailable}</p>
                    <p className="text-2xl font-bold text-[#003842]">
                      {filteredItems.length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t.currentFilters}</p>
                      <p className="text-2xl font-bold text-[#003842]">{totalActiveFilters}</p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <Filter className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Back to Menu Button - Bottom Left */}
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={() => setActiveView('landing')}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                {t.backToMenu}
              </button>
            </div>
          </>
        )}

        {/* Menu Browse View */}
        {activeView === 'menu' && (
          <>
            {/* Menu Items Header with View Toggle */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#003842]">Menu Items</h2>
                
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setMenuViewMode('cards')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${
                      menuViewMode === 'cards'
                        ? 'bg-white text-[#003842] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Grid3x3 className="h-4 w-4" />
                    <span className="text-sm font-medium">{t.cardsView}</span>
                  </button>
                  <button
                    onClick={() => setMenuViewMode('table')}
                    disabled={isSmallScreen}
                    title={isSmallScreen ? t.tableViewDisabled : 'Show table view'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${
                      menuViewMode === 'table'
                        ? 'bg-white text-[#003842] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Table2 className="h-4 w-4" />
                    <span className="text-sm font-medium">{t.tableView}</span>
                  </button>
                </div>
              </div>

              {isSmallScreen && (
                <p className="text-xs text-gray-500 -mt-3 mb-4">{t.tableViewDisabled}</p>
              )}

              {filteredItems.length === 0 ? (
                <Card className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.noItemsMatch}</h3>
                  <p className="text-gray-600 mb-4">{t.tryAdjustingFilters}</p>
                    {totalActiveFilters > 0 && (
                    <Button variant="primary" onClick={clearFilters} className="mx-auto">
                      {t.clearAllergenFilters}
                    </Button>
                  )}
                </Card>
              ) : menuViewMode === 'table' ? (
                /* Table View */
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-3 rounded-lg border border-[#42b8ac]/30 bg-[#e8f7f5] px-3 py-2 text-xs text-[#0f4f4a] font-medium">
                    <span>{t.swipeLeftHint}</span>
                    <span className="text-[#42b8ac]">|</span>
                    <span>↕ Scroll inside table for more rows</span>
                  </div>
                  <AllergenTableView 
                    items={filteredItems} 
                    compact={false}
                    showLegend={true}
                    showLegendTop={true}
                    wrapperClassName="w-full max-h-[68vh] overflow-auto rounded-lg"
                    stickyTopOffset={2}
                  />
                </div>
              ) : (
                /* Card View */
                <div className="space-y-6">
                  {categories.map(category => {
                    const categoryItems = filteredItems.filter(item => item.category === category)
                    if (categoryItems.length === 0) return null

                    return (
                      <div key={category} className="space-y-4">
                        <h3 className="text-xl font-bold text-[#003842]">
                          {getCategoryDisplayName(category)}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {categoryItems.map(item => {
                            const itemAllergens = getAllergensForItem(item)
                            const allergenDetails = ALLERGENS.filter(allergen => item[allergen.id as keyof MenuItem] === true)

                            return (
                              <Card key={item.id} className="h-full border border-slate-200 shadow-md hover:shadow-lg transition-shadow overflow-hidden" style={item.color ? { borderLeftColor: item.color, borderLeftWidth: '4px', backgroundColor: `${item.color}0d` } : undefined}>
                                <div className="p-6">
                                  <div className="flex items-start gap-3">
                                    {item.icon && (
                                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-3xl">
                                        {isImageIcon(item.icon) ? (
                                          <img src={item.icon} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          <span>{item.icon}</span>
                                        )}
                                      </div>
                                    )}
                                    <h4 className="text-lg font-semibold text-[#003842]">{item.name}</h4>
                                  </div>
                                  {item.description && <p className="mt-3 text-gray-600">{item.description}</p>}

                                  {allergenDetails.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <p className="text-sm font-medium text-gray-700 mb-2">Contains:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {allergenDetails.map(allergen => (
                                          <div 
                                            key={allergen.id} 
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                                            style={{
                                              backgroundColor: `${allergen.bgColor}15`,
                                              color: allergen.bgColor,
                                              borderColor: `${allergen.bgColor}40`
                                            }}
                                          >
                                            <span style={{ color: allergen.bgColor }}>{React.createElement(allergen.icon as unknown as React.ComponentType<{className: string}>, { className: 'w-4 h-4' })}</span>
                                            <span>{allergen.name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {Array.isArray(item.dietary) && item.dietary.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {item.dietary.map(d => {
                                        const opt = DIETARY_OPTIONS.find(o => o.name === d)
                                        if (!opt) return null
                                        const IconComp = opt.icon as unknown as React.ComponentType<{className: string}>
                                        return (
                                          <span
                                            key={d}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold"
                                            style={{
                                              backgroundColor: `${opt.color}18`,
                                              color: opt.color,
                                              border: `1px solid ${opt.color}50`
                                            }}
                                          >
                                            <IconComp className="w-3 h-3" />
                                            {d}
                                          </span>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </Card>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Info Section - Moved to Bottom */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t.totalMenuItems}</p>
                    <p className="text-2xl font-bold text-[#003842]">{menuItems.length}</p>
                  </div>
                  <div className="p-3 bg-[#f0f9f8] rounded-lg">
                    <Package className="h-6 w-6 text-[#42b8ac]" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t.itemsAvailable}</p>
                    <p className="text-2xl font-bold text-[#003842]">
                      {filteredItems.length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t.currentFilters}</p>
                      <p className="text-2xl font-bold text-[#003842]">{totalActiveFilters}</p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <Filter className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Back to Menu Button - Bottom Left */}
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={() => setActiveView('landing')}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                {t.backToMenu}
              </button>
            </div>
          </>
        )}

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-[#001a20]/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl overflow-hidden border-0 shadow-2xl">
            <div className="bg-[#003842] px-6 py-5 sm:px-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#42b8ac]/20 text-[#8be1d8]">
                    <QrCode className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Use AllyJen on Your Phone</h3>
                    <p className="mt-1 text-sm font-medium text-white/75">Open this allergen guide on a mobile device.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQRCode(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                  aria-label="Close QR code"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-[auto,1fr] sm:items-center">
                <div className="mx-auto rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <QRCodeSVG id="qr-code-svg" value={kioskUrl + (siteIdParam ? '?site_id=' + siteIdParam : '')} size={250} level="H" bgColor="#FFFFFF" fgColor="#003842" />
                </div>

                <div className="text-center sm:text-left">
                  <p className="text-2xl font-bold leading-tight text-[#003842]">
                    Scan with your phone camera
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-gray-700">
                    The menu will open for this business, so you can read allergen details more comfortably on your own screen.
                  </p>
                  <div className="mt-5 rounded-2xl bg-[#f0f9f8] px-4 py-3 text-sm font-semibold text-[#134e4a]">
                    No app needed. Just point your camera at the code.
                  </div>
                </div>
              </div>

              <div className="mt-7 flex justify-center sm:justify-end">
                <button
                  onClick={() => setShowQRCode(false)}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-6 text-base font-bold text-[#003842] shadow-sm hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Full Allergen Guide Overlay */}
      {showAllergenGuide && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#003842]">
          {/* Header — logo + close only */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#42b8ac]/20 flex-shrink-0">
            <img src={ADMIN_WORDMARK_SRC} alt="AllyJen" className="h-8 w-auto" />
            <button
              onClick={() => setShowAllergenGuide(false)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition"
            >
              <X className="h-4 w-4" />
              {t.close}
            </button>
          </div>
          {/* Guide content */}
          <div className="flex-1 overflow-auto bg-gray-50 p-4 space-y-5">
            {/* Title */}
            <h2 className="text-xl font-bold text-[#003842]">
              {business?.name} — {t.fullAllergenGuideFor}
            </h2>
            <Card className="p-4">
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-[#003842]">{t.menuItemsBySubMenu}</h3>
              </div>
              {sortedMenuItems.length > 0 ? (
                <AllergenTableView
                  items={sortedMenuItems}
                  compact={false}
                  showLegend={true}
                  showLegendTop={true}
                  compactLegend={true}
                  wrapperClassName="w-full max-h-[58vh] overflow-auto rounded-lg"
                  groupByCategory={true}
                  stickyTopOffset={2}
                />
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  {t.noMenuItemsAvailable}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-[#003842]">{t.fullIngredientsList}</h3>
              </div>
              {ingredientGuideRows.length > 0 ? (
                <AllergenTableView
                  items={ingredientGuideRows}
                  compact={false}
                  showLegend={true}
                  showLegendTop={true}
                  compactLegend={true}
                  wrapperClassName="w-full max-h-[58vh] overflow-auto rounded-lg"
                  groupByCategory={false}
                  stickyTopOffset={2}
                />
              ) : (
                <div className="py-6 text-gray-500">{t.noIngredientsAvailable}</div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* PDF / Email Options Modal */}
      {showPDFOptions && (
        <div
          className="fixed inset-0 bg-[#001a20]/75 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 transition-[padding] duration-150 overflow-y-auto"
          style={{ paddingBottom: `${keyboardOffset + 16}px` }}
        >
          <Card className="my-auto w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto border-0 shadow-2xl">
            <div className="bg-[#003842] px-6 py-5 sm:px-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#42b8ac]/20 text-[#8be1d8]">
                    <Mail className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{t.getYourAllergenGuide}</h3>
                    <p className="mt-1 text-sm font-medium text-white/75">Send a copy of this guide to your inbox.</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowPDFOptions(false); setShowEmailInput(false); setEmailInput(''); setEmailSent(false); setEmailError(''); }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                  aria-label="Close email guide"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
                  {emailSent ? (
                    <div className="text-center py-4">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#42b8ac]/15 text-[#13786f]">
                        <Check className="h-9 w-9" />
                      </div>
                      <p className="text-2xl font-bold text-[#003842]">{t.emailSent}</p>
                      <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-gray-700">{t.emailSentDesc}</p>
                      <button
                        onClick={() => { setEmailSent(false); setEmailInput(''); }}
                        className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#003842] px-6 text-base font-bold text-white hover:bg-[#004d5c]"
                      >
                        {t.sendToAnotherAddress}
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xl font-bold text-[#003842]">{t.emailMeThisGuide}</p>
                      <p className="mt-2 text-base leading-relaxed text-gray-700">
                        {t.emailGuideDesc}
                      </p>
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <input
                          type="email"
                          value={emailInput}
                          onChange={e => { setEmailInput(e.target.value); setEmailError(''); }}
                          onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300)}
                          placeholder="your@email.com"
                          className="min-h-14 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-lg text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-[#42b8ac]/30 focus:border-[#42b8ac]"
                          disabled={sendingEmail}
                          autoComplete="email"
                          inputMode="email"
                        />
                        <button
                          onClick={() => handleEmailMenu(false)}
                          disabled={sendingEmail || !emailInput.trim()}
                          className="inline-flex min-h-14 items-center justify-center rounded-xl bg-[#42b8ac] px-6 text-lg font-bold text-white shadow-sm hover:bg-[#389e93] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {sendingEmail ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                          ) : 'Send'}
                        </button>
                      </div>
                      {emailError && (
                        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          <p>{emailError}</p>
                        </div>
                      )}
                    </>
                  )}
              </div>

              {generatingPDF && (
                <div className="mt-5 text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#42b8ac] border-t-transparent" />
                    Generating PDF...
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
      </Container>

      {/* Ally — AI chat assistant for allergy queries (temporarily disabled) */}
      {/* <AllyChat menuItems={menuItems ?? []} businessName={business?.name ?? ''} /> */}

      {/* EU Compliance Footer */}
      <div className="mt-8 border-t border-gray-200 bg-gray-50 py-5 px-4">
          <div className="max-w-4xl mx-auto flex items-start justify-center gap-3 text-xs text-gray-500 text-center">
          {/* EU Flag icon — rectangular */}
          <svg className="h-4 w-6 shrink-0 mt-0.5 rounded-[1px]" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="EU flag">
            <rect width="18" height="12" fill="#003399"/>
            {/* 12 gold stars in a circle, radius ~3.5 units, centred at 9,6 */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 - 90) * (Math.PI / 180)
              const cx = 9 + 3.5 * Math.cos(angle)
              const cy = 6 + 3.5 * Math.sin(angle)
              return <polygon key={i} points="0,-0.9 0.21,-0.29 0.86,-0.29 0.35,0.11 0.53,0.74 0,0.36 -0.53,0.74 -0.35,0.11 -0.86,-0.29 -0.21,-0.29" transform={`translate(${cx},${cy})`} fill="#FFCC00"/>
            })}
          </svg>
          <div>
            <span className="font-semibold text-gray-600">{t.euFooterCompliance} </span>
            {t.euFooterBody}
          </div>
        </div>
      </div>

      {/* Site Footer */}
      <footer className="bg-[#003842] border-t border-[#42b8ac]/20 py-5 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-2 text-center">
          <p className="text-white/55 text-xs">
            © {new Date().getFullYear()} AllyJen Solutions Limited. CRO No. 811542 | Republic of Ireland | AllyJen.ie
          </p>
          <img src={ADMIN_WORDMARK_SRC} alt="AllyJen" className="h-5 w-auto opacity-70" />
        </div>
      </footer>
    </div>
  )
}
