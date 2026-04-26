// app/kiosk/[slug]/page.tsx - FIXED VERSION
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { 
  Filter, Search, AlertCircle, Check, X, QrCode, Download, 
  FileText, Shield, Package, Calendar,
  Wheat, Fish, Egg, Nut, Leaf, Milk, Carrot, Shell, 
  Circle, Sprout, Shrimp, Cookie, Beaker, ArrowRight, Clock, Home, Table2, Grid3x3,
  ChevronDown, ChevronUp, CheckSquare, Square, RefreshCw
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

async function trackFilterUsage(slug: string, selectedAllergens: string[], siteId?: string | null) {
  await sendKioskAnalyticsEvent({ slug, siteId, eventType: 'filter', selectedAllergens })
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
  
  // Use offline-enabled data hook
  const {
    business,
    menuItems,
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
  const [menuViewMode, setMenuViewMode] = useState<'cards' | 'table'>('cards')
  const [showScreensaver, setShowScreensaver] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  
  const t = translations[currentLanguage] as typeof translations.en
  const businessName = business?.name?.trim() || ''
  const kioskDisplayName = business?.kiosk_display_name?.trim() || ''
  const totalActiveFilters = selectedAllergens.length + selectedGlutenTypes.length + selectedTreeNutTypes.length
  
  // Refs for timeout management
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const pageLoadTime = useRef(Date.now())
  const screensaverTimerRef = useRef<NodeJS.Timeout | null>(null)

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
        setMenuViewMode('cards')
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
      screensaverTimerRef.current = setTimeout(() => setShowScreensaver(true), SCREENSAVER_TIMEOUT)
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
    
    // Clear any selections
    setSelectedAllergens([])
    setSearchQuery('')
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
    if (selectedAllergens.length > 0) {
      trackFilterUsage(slug, selectedAllergens, siteIdParam)
    }
  }, [selectedAllergens, slug, siteIdParam])

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
    // If it's gluten or tree nuts, toggle expansion instead
    if (allergenId === 'contains_cereals_gluten' || allergenId === 'contains_nuts') {
      setExpandedAllergens(prev => 
        prev.includes(allergenId)
          ? prev.filter(id => id !== allergenId)
          : [...prev, allergenId]
      )
      return
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
      
      // Check regular allergens
      if (selectedAllergens.length > 0) {
        const hasSelectedAllergen = selectedAllergens.some(allergenId => 
          item[allergenId as keyof MenuItem] === true
        )
        if (hasSelectedAllergen) {
          return false
        }
      }
      
      // Check specific gluten types
      if (selectedGlutenTypes.length > 0 && item.contains_cereals_gluten) {
        // If item has cereals_gluten_levels, check specific types
        const itemGlutenLevels = (item as any).cereals_gluten_levels
        if (itemGlutenLevels) {
          const hasSelectedGluten = selectedGlutenTypes.some(glutenType => {
            const level = itemGlutenLevels[glutenType]
            return level && level !== 'none'
          })
          if (hasSelectedGluten) return false
        } else {
          // No specific levels, assume all gluten types if contains_cereals_gluten is true
          return false
        }
      }
      
      // Check specific tree nut types
      if (selectedTreeNutTypes.length > 0 && item.contains_nuts) {
        // If item has nuts_levels, check specific types
        const itemNutLevels = (item as any).nuts_levels
        if (itemNutLevels) {
          const hasSelectedNut = selectedTreeNutTypes.some(nutType => {
            const level = itemNutLevels[nutType]
            return level && level !== 'none'
          })
          if (hasSelectedNut) return false
        } else {
          // No specific levels, assume all nut types if contains_nuts is true
          return false
        }
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
      
      const itemsToInclude = includeFilters ? filteredItems : menuItems
      
      await generateAllergenTablePDF({
        business: business,
        items: itemsToInclude,
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
    try {
      const itemsToInclude = includeFilters ? filteredItems : menuItems
      // Generate PDF as base64 in the browser, then POST to server for mailing
      const pdfBase64 = await generateAllergenTablePDF({
        business,
        items: itemsToInclude,
        title: includeFilters && totalActiveFilters > 0
          ? `Allergen Guide (${totalActiveFilters} active filter${totalActiveFilters > 1 ? 's' : ''})`
          : 'Complete Allergen Information Guide',
        showLegend: true,
        outputMode: 'base64',
      }) as string

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
        const data = await response.json()
        setEmailError(data.error || 'Failed to send. Please try again.')
        return
      }
      setEmailSent(true)
      setEmailInput('')
    } catch (err) {
      console.error('Error emailing menu:', err)
      setEmailError('Failed to send. Please try again.')
    } finally {
      setSendingEmail(false)
    }
  }

  // Track when user starts the kiosk
  const handleStartKiosk = () => {
    setKioskStarted(true)
    setActiveView('landing')
    trackKioskInteraction(slug, 'home_screen_start')
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
        className="min-h-screen bg-[#001a20] relative overflow-hidden cursor-pointer"
        data-context="kiosk"
        onClick={handleStartKiosk}
        onTouchStart={handleStartKiosk}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-44 -left-32 w-[560px] h-[560px] rounded-full bg-[#42b8ac]/14 blur-3xl" />
          <div className="absolute -bottom-44 -right-32 w-[620px] h-[620px] rounded-full bg-[#42b8ac]/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, #42b8ac 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
        </div>

        <AccessibilityPanel />

        <div className="relative z-10 min-h-screen flex items-center justify-center px-8 py-12 lg:px-16">
          <div className="w-full max-w-6xl rounded-3xl border border-white/15 bg-white/5 backdrop-blur-md shadow-2xl p-8 sm:p-12 lg:p-16 text-center">
            <img
              src={ADMIN_WORDMARK_SRC}
              alt="AllyJen"
              className="h-20 sm:h-24 lg:h-28 xl:h-32 w-auto mx-auto mb-5"
            />

            <p className="text-[#9fe5de] text-lg sm:text-xl lg:text-2xl font-semibold mb-3 tracking-tight">
              Interactive Allergen Check Guide
            </p>

            <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-[#42b8ac]/45 bg-[#42b8ac]/15 px-5 py-4">
              <p className="text-white font-bold text-xl sm:text-2xl lg:text-3xl mb-0">
                Click here to begin
              </p>
            </div>

            {showScreensaver && (
              <p className="text-white/45 text-sm mt-6">Sleep mode active</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ===== MENU DISPLAY =====
  const filteredItems = filterMenuItems()
  const categories = Array.from(new Set(menuItems.map(item => item.category)))
  const kioskUrl = typeof window !== 'undefined' ? `${window.location.origin}/kiosk/${slug}` : ''

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {showInactivityWarning && <InactivityWarning />}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#003842] shadow-lg border-b border-[#42b8ac]/20">
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

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <img 
                  src={ADMIN_WORDMARK_SRC}
                  alt="AllyJen Logo" 
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 pointer-events-none" style={{ color: 'rgba(66, 184, 172, 0.6)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchMenuItems}
                    style={{
                      borderColor: 'rgba(66, 184, 172, 0.35)',
                      color: 'white',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#42b8ac'
                      e.target.style.boxShadow = '0 0 0 3px rgba(66, 184, 172, 0.15)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(66, 184, 172, 0.35)'
                      e.target.style.boxShadow = 'none'
                    }}
                    className="pl-10 pr-4 py-1.5 rounded-lg border-2 bg-white/10 placeholder-white/30 w-64 transition-colors focus:outline-none font-sans font-medium text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Filter className="h-4 w-4" />}
                    onClick={() => setActiveView(activeView === 'filters' ? 'menu' : 'filters')}
                  >
                    {activeView === 'filters' ? t.browseFullMenu : t.filterByAllergens}
                  </Button>
                  <Button variant="outline" size="sm" icon={<FileText className="h-4 w-4" />} onClick={() => setShowPDFOptions(true)}>
                    {t.emailMenu}
                  </Button>
                  <Button variant="outline" size="sm" icon={<QrCode className="h-4 w-4" />} onClick={() => setShowQRCode(true)}>
                    {t.qrCodeButton}
                  </Button>
                  
                  {/* Language Dropdown */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
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
                              // Save to localStorage and notify other components
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
                    onClick={() => {
                      setKioskStarted(false)
                      setActiveView('landing')
                      clearFilters()
                      setShowInactivityWarning(false)
                    }}
                    title="Return to home screen"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 pointer-events-none" style={{ color: 'rgba(66, 184, 172, 0.6)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  style={{
                    borderColor: 'rgba(66, 184, 172, 0.35)',
                    color: 'white',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#42b8ac'
                    e.target.style.boxShadow = '0 0 0 3px rgba(66, 184, 172, 0.15)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(66, 184, 172, 0.35)'
                    e.target.style.boxShadow = 'none'
                  }}
                  className="pl-10 pr-4 py-1.5 rounded-lg border-2 bg-white/10 placeholder-white/30 w-full transition-colors focus:outline-none font-sans font-medium text-sm"
                />
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {/* Search by Allergen Tile */}
              <button
                onClick={() => setActiveView('filters')}
                className="group text-left transition-transform hover:scale-[1.015] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#dc2626] rounded-3xl"
              >
                <Card className="relative overflow-hidden p-8 sm:p-9 bg-gradient-to-br from-[#fff5f4] via-[#ffeceb] to-[#ffdeda] border border-[#f5c8c2] shadow-md hover:shadow-xl transition-all h-full min-h-[220px] sm:min-h-[240px]">
                  <div className="pointer-events-none absolute -left-24 top-0 h-full w-32 bg-white/45 blur-2xl -skew-x-12 translate-x-[-180%] group-hover:translate-x-[520%] transition-transform duration-1000 ease-out" />
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#ef4444]/10 group-hover:scale-110 transition-transform" />
                  <div className="flex items-start gap-4 h-full">
                    <div className="p-3.5 bg-gradient-to-br from-[#dc2626] to-[#ef4444] rounded-xl shadow-sm flex-shrink-0 ring-4 ring-white/60">
                      <Filter className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 flex flex-col h-full">
                      <h3 className="text-xl sm:text-2xl font-bold text-[#7f1d1d] mb-2 tracking-tight leading-tight">{t.avoidAllergens}</h3>
                      <p className="text-[#991b1b] text-sm sm:text-[15px] mb-4 leading-relaxed">
                        {t.avoidAllergensDesc}
                      </p>
                      <div className="mt-auto flex justify-center">
                        <div className="inline-flex px-5 py-2.5 bg-[#dc2626] text-white rounded-xl font-semibold text-sm shadow-sm group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                          {t.startFiltering}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </button>

              {/* Search Menu Tile */}
              <button
                onClick={() => setActiveView('menu')}
                className="group text-left transition-transform hover:scale-[1.015] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0284c7] rounded-3xl"
              >
                <Card className="relative overflow-hidden p-8 sm:p-9 bg-gradient-to-br from-[#eef7ff] via-[#e3f2ff] to-[#d5ebff] border border-[#b8d8f3] shadow-md hover:shadow-xl transition-all h-full min-h-[220px] sm:min-h-[240px]">
                  <div className="pointer-events-none absolute -left-24 top-0 h-full w-32 bg-white/45 blur-2xl -skew-x-12 translate-x-[-180%] group-hover:translate-x-[520%] transition-transform duration-1000 ease-out" />
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#0ea5e9]/10 group-hover:scale-110 transition-transform" />
                  <div className="flex items-start gap-4 h-full">
                    <div className="p-3.5 bg-gradient-to-br from-[#0284c7] to-[#0ea5e9] rounded-xl shadow-sm flex-shrink-0 ring-4 ring-white/60">
                      <Search className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 flex flex-col h-full">
                      <h3 className="text-xl sm:text-2xl font-bold text-[#0c4a6e] mb-2 tracking-tight leading-tight">{t.browseFullMenu}</h3>
                      <p className="text-[#0e7490] text-sm sm:text-[15px] mb-4 leading-relaxed">
                        {t.browseFullMenuDesc}
                      </p>
                      <div className="mt-auto flex justify-center">
                        <div className="inline-flex px-5 py-2.5 bg-[#0284c7] text-white rounded-xl font-semibold text-sm shadow-sm group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                          {t.viewMenu}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </button>

              {/* QR Code Download Tile */}
              <button
                onClick={() => setShowQRCode(true)}
                className="group text-left transition-transform hover:scale-[1.015] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7e22ce] rounded-3xl"
              >
                <Card className="relative overflow-hidden p-8 sm:p-9 bg-gradient-to-br from-[#f7f0ff] via-[#f1e6ff] to-[#e8d6ff] border border-[#d4b9f2] shadow-md hover:shadow-xl transition-all h-full min-h-[220px] sm:min-h-[240px]">
                  <div className="pointer-events-none absolute -left-24 top-0 h-full w-32 bg-white/45 blur-2xl -skew-x-12 translate-x-[-180%] group-hover:translate-x-[520%] transition-transform duration-1000 ease-out" />
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#9333ea]/10 group-hover:scale-110 transition-transform" />
                  <div className="flex items-start gap-4 h-full">
                    <div className="p-3.5 bg-gradient-to-br from-[#7e22ce] to-[#a855f7] rounded-xl shadow-sm flex-shrink-0 ring-4 ring-white/60">
                      <QrCode className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 flex flex-col h-full">
                      <h3 className="text-xl sm:text-2xl font-bold text-[#581c87] mb-2 tracking-tight leading-tight">{t.saveMenuToPhone}</h3>
                      <p className="text-[#6b21a8] text-sm sm:text-[15px] mb-4 leading-relaxed">
                        {t.saveMenuToPhoneDesc}
                      </p>
                      <div className="mt-auto flex justify-center">
                        <div className="inline-flex px-5 py-2.5 bg-[#7e22ce] text-white rounded-xl font-semibold text-sm shadow-sm group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                          {t.showQRCode}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </button>

              {/* Full Allergen Guide PDF Tile */}
              <button
                onClick={() => handleGeneratePDF(false)}
                className="group text-left transition-transform hover:scale-[1.015] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#047857] rounded-3xl"
              >
                <Card className="relative overflow-hidden p-8 sm:p-9 bg-gradient-to-br from-[#ecfdf5] via-[#d1fae5] to-[#a7f3d0] border border-[#6ee7b7] shadow-md hover:shadow-xl transition-all h-full min-h-[220px] sm:min-h-[240px]">
                  <div className="pointer-events-none absolute -left-24 top-0 h-full w-32 bg-white/45 blur-2xl -skew-x-12 translate-x-[-180%] group-hover:translate-x-[520%] transition-transform duration-1000 ease-out" />
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#059669]/10 group-hover:scale-110 transition-transform" />
                  <div className="flex items-start gap-4 h-full">
                    <div className="p-3.5 bg-gradient-to-br from-[#047857] to-[#059669] rounded-xl shadow-sm flex-shrink-0 ring-4 ring-white/60">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 flex flex-col h-full">
                      <h3 className="text-xl sm:text-2xl font-bold text-[#064e3b] mb-2 tracking-tight leading-tight">Full Allergen Guide</h3>
                      <p className="text-[#065f46] text-sm sm:text-[15px] mb-4 leading-relaxed">
                        Download the complete allergen information PDF directly to your device.
                      </p>
                      <div className="mt-auto flex justify-center">
                        <div className="inline-flex px-5 py-2.5 bg-[#047857] text-white rounded-xl font-semibold text-sm shadow-sm group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                          {generatingPDF ? 'Generating…' : 'Download PDF'}
                        </div>
                      </div>
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
                    {t.disclaimerText}
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
            {/* Allergen Filter Section */}
            <Card className="mb-8">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-[#003842] flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter by Allergens
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Click allergens to exclude items containing them from the menu
                </p>
              </div>

              <div className="p-6">
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

                {(selectedAllergens.length > 0 || selectedGlutenTypes.length > 0 || selectedTreeNutTypes.length > 0) && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-red-800">Excluding items containing:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedAllergens.map(id => {
                              const allergen = ALLERGENS.find(a => a.id === id)
                              return allergen ? (
                                <span 
                                  key={id} 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border"
                                  style={{
                                    backgroundColor: `${allergen.bgColor}15`,
                                    color: allergen.bgColor,
                                    borderColor: `${allergen.bgColor}40`
                                  }}
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
                                  style={{
                                    backgroundColor: `${allergen.bgColor}15`,
                                    color: allergen.bgColor,
                                    borderColor: `${allergen.bgColor}40`
                                  }}
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
                                  style={{
                                    backgroundColor: `${allergen.bgColor}15`,
                                    color: allergen.bgColor,
                                    borderColor: `${allergen.bgColor}40`
                                  }}
                                >
                                  <Nut className="h-3.5 w-3.5" style={{ color: allergen.bgColor }} />
                                  {nut.name}
                                </span>
                              ) : null
                            })}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-700">
                        Clear All
                      </Button>
                    </div>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No items match your filters</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your filters or search term</p>
                    {totalActiveFilters > 0 && (
                    <Button variant="primary" onClick={clearFilters} className="mx-auto">
                      Clear Allergen Filters
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
                              <Card key={item.id} className="h-full border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-md hover:shadow-lg transition-shadow">
                                <div className="p-6">
                                  <h4 className="text-lg font-semibold text-[#003842]">{item.name}</h4>
                                  {item.description && <p className="text-gray-600 mt-3">{item.description}</p>}

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
                    <p className="text-sm text-gray-600">Total Menu Items</p>
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
                    <p className="text-sm text-gray-600">Allergen-Free Options</p>
                    <p className="text-2xl font-bold text-[#003842]">
                      {menuItems.filter(item => getAllergensForItem(item).length === 0).length}
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
                    <p className="text-sm text-gray-600">Current Filters</p>
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
                Back to Menu
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
                    <span className="text-sm font-medium">Cards</span>
                  </button>
                  <button
                    onClick={() => setMenuViewMode('table')}
                    disabled={isSmallScreen}
                    title={isSmallScreen ? 'Table view is available on larger screens' : 'Show table view'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${
                      menuViewMode === 'table'
                        ? 'bg-white text-[#003842] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Table2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Table</span>
                  </button>
                </div>
              </div>

              {isSmallScreen && (
                <p className="text-xs text-gray-500 -mt-3 mb-4">Table view is disabled on smaller screens for readability.</p>
              )}

              {filteredItems.length === 0 ? (
                <Card className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No items match your filters</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your filters or search term</p>
                    {totalActiveFilters > 0 && (
                    <Button variant="primary" onClick={clearFilters} className="mx-auto">
                      Clear Allergen Filters
                    </Button>
                  )}
                </Card>
              ) : menuViewMode === 'table' ? (
                /* Table View */
                <AllergenTableView 
                  items={filteredItems} 
                  compact={false}
                  showLegend={true}
                />
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
                              <Card key={item.id} className="h-full border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-md hover:shadow-lg transition-shadow">
                                <div className="p-6">
                                  <h4 className="text-lg font-semibold text-[#003842]">{item.name}</h4>
                                  {item.description && <p className="text-gray-600 mt-3">{item.description}</p>}

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
                    <p className="text-sm text-gray-600">Total Menu Items</p>
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
                    <p className="text-sm text-gray-600">Allergen-Free Options</p>
                    <p className="text-2xl font-bold text-[#003842]">
                      {menuItems.filter(item => getAllergensForItem(item).length === 0).length}
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
                    <p className="text-sm text-gray-600">Current Filters</p>
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
                Back to Menu
              </button>
            </div>
          </>
        )}

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-[#003842]">Scan to Download Allergen Guide PDF</h3>
                <button onClick={() => setShowQRCode(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex justify-center p-4 bg-white rounded-lg border border-gray-200">
                <QRCodeSVG id="qr-code-svg" value={kioskUrl + '?pdf=1' + (siteIdParam ? '&site_id=' + siteIdParam : '')} size={256} level="H" bgColor="#FFFFFF" fgColor="#003842" />
              </div>
              <p className="text-sm text-gray-600 text-center mt-4">Scan with your phone camera — the full allergen guide PDF will download automatically</p>
              <div className="mt-6 flex justify-center">
                <Button variant="ghost" onClick={() => setShowQRCode(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* PDF / Email Options Modal */}
      {showPDFOptions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-[#003842]">Get Your Allergen Guide</h3>
                <button onClick={() => { setShowPDFOptions(false); setShowEmailInput(false); setEmailInput(''); setEmailSent(false); setEmailError(''); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Download section */}
                <Button 
                  variant="primary" 
                  className="w-full justify-start h-auto py-4" 
                  onClick={async () => {
                    await handleGeneratePDF(false)
                    setShowPDFOptions(false)
                  }}
                  disabled={generatingPDF || sendingEmail}
                >
                  <FileText className="h-5 w-5 text-white mr-3" />
                  <div className="text-left flex-1">
                    <div className="font-semibold">Download Full Menu (Table Format)</div>
                    <div className="text-sm opacity-90">Complete allergen information for all {menuItems.length} items</div>
                  </div>
                </Button>

                {totalActiveFilters > 0 && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-auto py-4" 
                    onClick={async () => {
                      await handleGeneratePDF(true)
                      setShowPDFOptions(false)
                    }}
                    disabled={generatingPDF || sendingEmail}
                  >
                    <Filter className="h-5 w-5 text-[#42b8ac] mr-3" />
                    <div className="text-left flex-1">
                      <div className="font-semibold text-gray-900">Download Filtered Menu</div>
                      <div className="text-sm text-gray-600">
                        {filteredItems.length} items after {totalActiveFilters} active filter(s)
                      </div>
                    </div>
                  </Button>
                )}

                <div className="border-t border-gray-200 pt-4">
                  {emailSent ? (
                    <div className="text-center py-4">
                      <div className="text-2xl mb-2">✅</div>
                      <p className="font-semibold text-[#003842]">Email sent!</p>
                      <p className="text-sm text-gray-500 mt-1">Check your inbox for the allergen guide PDF.</p>
                      <button
                        onClick={() => { setEmailSent(false); setEmailInput(''); }}
                        className="mt-3 text-sm text-[#42b8ac] underline"
                      >
                        Send to a different address
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700 mb-2">📧 Email me this guide</p>
                      <p className="text-xs text-gray-500 mb-3">
                        We&apos;ll send the allergen PDF straight to your inbox — handy to keep on your phone.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={emailInput}
                          onChange={e => { setEmailInput(e.target.value); setEmailError(''); }}
                          placeholder="your@email.com"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#42b8ac]"
                          disabled={sendingEmail}
                        />
                        <button
                          onClick={() => handleEmailMenu(totalActiveFilters > 0)}
                          disabled={sendingEmail || !emailInput.trim()}
                          className="bg-[#42b8ac] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#389e93] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {sendingEmail ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          ) : 'Send'}
                        </button>
                      </div>
                      {emailError && <p className="text-red-500 text-xs mt-2">{emailError}</p>}
                    </>
                  )}
                </div>
              </div>

              {generatingPDF && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#42b8ac] border-t-transparent"></div>
                    Generating PDF...
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
      </Container>

      {/* Ally — AI chat assistant for allergy queries */}
      <AllyChat menuItems={menuItems ?? []} businessName={business?.name ?? ''} />

      {/* EU Compliance Footer */}
      <div className="mt-8 border-t border-gray-200 bg-gray-50 py-5 px-4">
          <div className="max-w-4xl mx-auto flex items-start gap-3 text-xs text-gray-500 pr-24 sm:pr-0">
          <Shield className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-gray-600">Allergen information compliant with EU Regulation No. 1169/2011 (FIC Regulation). </span>
            Where an ingredient is sourced from multiple suppliers, the allergen declaration shown reflects the
            <strong> most severe risk level</strong> across all supplier profiles, as required by law.
            Always inform staff of any allergy before ordering. For severe allergies, ask to speak with a manager.
          </div>
        </div>
      </div>
    </div>
  )
}