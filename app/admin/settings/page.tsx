"use client";
// --- Accessibility: Admin Portal ---
import { useRef, useState, useEffect } from 'react';
// app/admin/settings/page.tsx
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { 
  Settings, Save, Shield, Users, Bell, Globe,
  Palette, Database, Key, CreditCard, Mail,
  Building, Download, Lock, ChevronRight,
  CheckCircle, AlertCircle, Trash2,
  Upload, Copy, Eye, EyeOff, Plus, Sparkles,
  Moon, Sun, ChefHat, Truck
} from 'lucide-react'
import { ToastIcon, DeliverooIcon } from '@/components/icons'

// Import design system components
import { Container } from '../../components/layout/Container'
import { Card } from '../../components/layout/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../../components/ui/Select'
import { useTranslation } from '@/lib/hooks/useTranslation'

const ChangePasswordModal = dynamic(() => import('./ChangePasswordModal'), { ssr: false })
const TwoFactorModal = dynamic(() => import('./TwoFactorModal'), { ssr: false })

export default function SettingsPage() {
  const settingsRootRef = useRef<HTMLDivElement | null>(null)

  // Accessibility settings state (must be first!)
  const [settings, setSettings] = useState({
    // General
    businessName: '',
    contactEmail: '',
    businessAddress: '',
    businessCity: '',
    businessPostalCode: '',
    businessCountry: '',
    businessPhone: '',
    defaultLanguage: typeof window !== 'undefined' ? localStorage.getItem('defaultLanguage') || 'en' : 'en',
    darkMode: typeof window !== 'undefined' ? localStorage.getItem('darkMode') === 'true' : false,
    dateFormat: typeof window !== 'undefined' ? localStorage.getItem('dateFormat') || 'DD/MM/YYYY' : 'DD/MM/YYYY',
    // Branding
    primaryColor: '#003842',
    secondaryColor: '#42b8ac',
    logoUrl: null,
    // Security
    twoFactorAuth: false,
    sessionTimeout: typeof window !== 'undefined' ? localStorage.getItem('sessionTimeout') || '15 minutes' : '15 minutes',
    passwordPolicy: 'strong',
    // Notifications
    notificationsEnabled: true,
    emailAlerts: true,
    slackAlerts: false,
    reportGeneration: true,
    complianceAlerts: true,
    datasheetAuditFrequency: typeof window !== 'undefined' ? localStorage.getItem('datasheetAuditFrequency') || '1 month' : '1 month',
    ingredientsAuditFrequency: typeof window !== 'undefined' ? localStorage.getItem('ingredientsAuditFrequency') || '1 month' : '1 month',
    menuAuditFrequency: typeof window !== 'undefined' ? localStorage.getItem('menuAuditFrequency') || '1 month' : '1 month',
    supplierAuditFrequency: typeof window !== 'undefined' ? localStorage.getItem('supplierAuditFrequency') || '1 month' : '1 month',
    datasheetAuditEnabled: true,
    ingredientsAuditEnabled: true,
    menuAuditEnabled: true,
    supplierAuditEnabled: true,
    // Integrations
    stripeConnected: false,
    paymentMethods: [],
    // Billing
    plan: 'Free Trial',
    nextBilling: '',
    seats: 1,
    storage: '10 GB',
    // Accessibility
    fontSize: 'normal',
    fontFamily: 'default',
    contrast: 'normal',
    speech: typeof window !== 'undefined' ? localStorage.getItem('speechEnabled') === 'true' : false,
    speechRate: typeof window !== 'undefined' ? parseFloat(localStorage.getItem('speechRate') || '1') : 1,
    reducedMotion: false,
    highlightLinks: false,
    letterSpacing: 'normal',
    lineHeight: 'normal'
  });

  // Accessibility state for admin portal
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Apply accessibility settings to document
  const applyAccessibilitySettings = (newSettings: Partial<typeof settings> = {}) => {
    const updated = { ...settings, ...newSettings };

    // scope all visual changes to the settings panel root so we DON'T mutate the global <html>
    const root = settingsRootRef.current;
    if (!root) return; // safety — do not touch document.documentElement from this page

    // Font size
    const fontSizeMap = {
      'normal': '100%',
      'large': '125%',
      'x-large': '150%',
      'xx-large': '200%'
    };
    const fontSizeValue = fontSizeMap[updated.fontSize as keyof typeof fontSizeMap] || '100%';
    root.style.setProperty('--accessibility-font-size', fontSizeValue);
    root.style.fontSize = fontSizeValue;

    // Font family
    root.classList.remove('dyslexia-mode', 'high-contrast-font');
    if (updated.fontFamily === 'dyslexic') {
      root.classList.add('dyslexia-mode');
    } else if (updated.fontFamily === 'high-contrast') {
      root.classList.add('high-contrast-font');
    }

    // Contrast
    root.setAttribute('data-contrast', updated.contrast);

    // Letter spacing
    const spacingMap = {
      'normal': '0.02em',
      'wide': '0.05em',
      'extra-wide': '0.1em'
    };
    root.style.letterSpacing = spacingMap[updated.letterSpacing as keyof typeof spacingMap] || '0.02em';

    // Line height
    const lineHeightMap = {
      'normal': '1.6',
      'relaxed': '2',
      'very-relaxed': '2.5'
    };
    root.style.lineHeight = lineHeightMap[updated.lineHeight as keyof typeof lineHeightMap] || '1.6';

    // Reduced motion
    if (updated.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Highlight links
    if (updated.highlightLinks) {
      root.classList.add('highlight-links');
    } else {
      root.classList.remove('highlight-links');
    }

    // Speech
    if (updated.speech) {
      startSpeech(updated.speechRate);
    } else {
      stopSpeech();
    }

    // Save to localStorage — exclude darkMode (it has its own dedicated key)
    const { darkMode: _dm, ...accessibilityOnly } = updated;
    localStorage.setItem('adminAccessibilitySettings', JSON.stringify(accessibilityOnly));
  };

      // Text-to-speech
      const startSpeech = (rate = 1) => {
        if (!('speechSynthesis' in window)) {
          alert('Text-to-speech is not supported in your browser');
          return;
        }
        synthRef.current = window.speechSynthesis;
        stopSpeech();

        // Extract only meaningful readable content — headings and paragraphs,
        // skipping button labels, form controls, nav items, and tooltips.
        const main = document.querySelector('main');
        let text = '';
        if (main) {
          const nodes = Array.from(
            main.querySelectorAll('h1, h2, h3, h4, h5, p')
          ).filter(el => {
            // Drop elements that are children of interactive controls
            return !el.closest('button') &&
                   !el.closest('a') &&
                   !el.closest('[role="menu"]') &&
                   !el.closest('[role="tooltip"]');
          });
          text = nodes
            .map(el => el.textContent?.trim())
            .filter(t => t && t.length > 3)
            .join('. ');
        }
        // Fallback if nothing matched
        if (!text) text = main?.textContent?.trim() || document.body.textContent?.trim() || '';
        if (!text) return;

        // Map portal language to BCP-47 speech language tag
        const langMap: Record<string, string> = {
          en: 'en-GB', ga: 'ga-IE', pt: 'pt-PT', fr: 'fr-FR', es: 'es-ES', de: 'de-DE',
        };

        speechRef.current = new window.SpeechSynthesisUtterance(text);
        speechRef.current.rate = rate;
        speechRef.current.pitch = 1;
        speechRef.current.volume = 1;
        speechRef.current.lang = langMap[settings.defaultLanguage] || 'en-GB';
        synthRef.current.speak(speechRef.current);
      };
      const stopSpeech = () => {
        if (synthRef.current && synthRef.current.speaking) {
          synthRef.current.cancel();
        }
      };

      // Load saved accessibility settings on mount
      useEffect(() => {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('adminAccessibilitySettings');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              // Exclude darkMode — it is managed exclusively via the 'darkMode' localStorage key
              // Also exclude business-branding fields — these must come from the DB, not localStorage
              const {
                darkMode: _dm,
                primaryColor: _pc,
                secondaryColor: _sc,
                logoUrl: _lu,
                businessName: _bn,
                contactEmail: _ce,
                businessAddress: _ba,
                businessCity: _bci,
                businessPostalCode: _bpc,
                businessCountry: _bco,
                businessPhone: _bph,
                stripeConnected: _stripe,
                ...accessibilityOnly
              } = parsed;
              // Use dedicated speech keys as authoritative — the blob may be stale
              accessibilityOnly.speech = localStorage.getItem('speechEnabled') === 'true';
              accessibilityOnly.speechRate = parseFloat(localStorage.getItem('speechRate') || String(accessibilityOnly.speechRate || 1));
              setSettings(s => ({ ...s, ...accessibilityOnly }));
              applyAccessibilitySettings(accessibilityOnly);
            } catch {}
          }
        }
        // Cleanup speech on unmount
        return () => stopSpeech();
        // eslint-disable-next-line
      }, []);

      // Apply visual accessibility settings whenever they change (speech handled separately)
      useEffect(() => {
        applyAccessibilitySettings();
        // eslint-disable-next-line
      }, [settings.fontSize, settings.fontFamily, settings.contrast, settings.letterSpacing, settings.lineHeight, settings.reducedMotion, settings.highlightLinks]);

      // Start/stop speech independently so other setting changes don't restart it.
      // Also persist to localStorage and notify the global SpeechController.
      useEffect(() => {
        localStorage.setItem('speechEnabled', String(settings.speech));
        localStorage.setItem('speechRate', String(settings.speechRate));
        window.dispatchEvent(new CustomEvent('speechChange', {
          detail: { enabled: settings.speech, rate: settings.speechRate },
        }));
        if (settings.speech) {
          startSpeech(settings.speechRate);
        } else {
          stopSpeech();
        }
        // eslint-disable-next-line
      }, [settings.speech]);
    // ...existing code...

    // Move session check and logo upload logic to top level
    async function checkSessionAndUploadLogo(file: File) {
      const sessionCheck = await fetch('/api/auth/session')
      const sessionData = await sessionCheck.json()
      if (!sessionData.authenticated || !sessionData.user) {
        alert('Your session has expired. Please sign in again.')
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin';
        }
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      // Create FormData for upload
      const formData = new FormData()
      formData.append('logo', file)
      // Upload to API
      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData
      })
      let result
      if (!response.ok) {
        let errorMessage = 'Upload failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          errorMessage = `Upload failed: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      } else {
        result = await response.json()
      }
      if (!result || !result.logoUrl) {
        throw new Error('Invalid response from server')
      }
      setLogoUploadSuccess(true)
      setSettings(prev => ({
        ...prev,
        logoUrl: result.logoUrl
      }))
      alert('Logo uploaded successfully!')
    }
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoUploadSuccess, setLogoUploadSuccess] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  // Show migration notice for updated accessibility defaults
  const [showDefaultsNotice, setShowDefaultsNotice] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('accessibilityDefaultsMigrated')) {
      setShowDefaultsNotice(true)
    }
  }, [])

  // `settings` state is declared earlier (accessibility + app settings) — do not redeclare here.

  // Session timeout functionality
  useEffect(() => {
    const timeoutMinutes = parseInt(settings.sessionTimeout.split(' ')[0]);
    const timeoutMs = settings.sessionTimeout.includes('hour')
      ? timeoutMinutes * 60 * 60 * 1000
      : timeoutMinutes * 60 * 1000;

    // Store timeout setting
    localStorage.setItem('sessionTimeout', settings.sessionTimeout);

    // Set up activity tracking
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const resetTimeout = () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId as any);
      timeoutId = setTimeout(() => {
        window.location.href = '/auth/signin';
      }, timeoutMs);
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });

    // Initial timeout
    resetTimeout();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout, true);
      });
    };
  }, [settings.sessionTimeout]);

  // Fetch user session and business info on mount
  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        // Get user session (includes businessId, email, name)
        const sessionRes = await fetch('/api/auth/session');
        const sessionText = await sessionRes.clone().text();
        if (sessionRes.status === 401) {
          // Force sign out on 401
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/signin';
          }
          return;
        }
        const sessionData = JSON.parse(sessionText);
        // Check 2FA status
        const twoFactorEnabled = sessionData?.user?.twoFactorEnabled || false;
        if (!sessionData.authenticated || !sessionData.user) {
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/signin';
          }
          return;
        }
        if (sessionData?.user?.businessId) {
          setBusinessId(sessionData.user.businessId);
          // Fetch business info
          const businessRes = await fetch(`/api/business/${sessionData.user.businessId}`);
          const businessText = await businessRes.clone().text();
          if (businessRes.ok) {
            const businessData = JSON.parse(businessText);
            setSettings(prev => ({
              ...prev,
              businessName: businessData?.name ?? prev.businessName,
              contactEmail: sessionData.user.email ?? prev.contactEmail,
              businessAddress: businessData?.settings?.address?.street ?? '',
              businessCity: businessData?.settings?.address?.city ?? '',
              businessPostalCode: businessData?.settings?.address?.postalCode ?? '',
              businessCountry: businessData?.settings?.address?.country ?? '',
              businessPhone: businessData?.settings?.address?.phone ?? '',
              stripeConnected: businessData?.settings?.stripeConnected ?? false,
              sessionTimeout: businessData?.sessionTimeout ?? prev.sessionTimeout,
              logoUrl: businessData?.settings?.logoUrl ?? prev.logoUrl,
              primaryColor: businessData?.settings?.primaryColor ?? prev.primaryColor,
              secondaryColor: businessData?.settings?.secondaryColor ?? prev.secondaryColor,
              twoFactorAuth: twoFactorEnabled
            }));
          } else {
            setSettings(prev => ({
              ...prev,
              contactEmail: sessionData.user.email ?? prev.contactEmail,
              twoFactorAuth: twoFactorEnabled
            }));
          }
        } else if (sessionData?.user?.email) {
          setSettings(prev => ({
            ...prev,
            contactEmail: sessionData.user.email,
            twoFactorAuth: twoFactorEnabled
          }));
        }
      } catch (err) {
        // On error, force sign out
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin';
        }
      }
      setLoading(false);
    };
    fetchDefaults();
    // Set active tab from URL parameter if present
    const tab = searchParams.get('tab')
    if (tab && ['general', 'branding', 'security', 'notifications', 'integrations', 'billing'].includes(tab)) {
      setActiveTab(tab)
    }

    // Handle Stripe connection messages
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (success === 'stripe_connected') {
      alert('Stripe account connected successfully!')
      // Refresh the page to update the connection status
      window.location.href = '/admin/settings?tab=billing'
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        stripe_connection_failed: 'Failed to connect Stripe account. Please try again.',
        missing_authorization_code: 'Missing authorization code from Stripe.',
        settings_update_failed: 'Failed to update settings after connecting Stripe.',
        unexpected_error: 'An unexpected error occurred during Stripe connection.'
      }
      alert(errorMessages[error] || 'An error occurred during Stripe connection.')
    }
    // Remove old timer loading logic
    // eslint-disable-next-line
  }, [searchParams])

  // Save user preferences to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', settings.darkMode.toString())
      localStorage.setItem('dateFormat', settings.dateFormat)
      localStorage.setItem('defaultLanguage', settings.defaultLanguage)

      // Dispatch custom event to notify other components of dark mode change
      window.dispatchEvent(new CustomEvent('darkModeChange', { detail: settings.darkMode }))
      // Dispatch custom event to notify other components of language change
      window.dispatchEvent(new CustomEvent('languageChange', { detail: settings.defaultLanguage }))
    }
  }, [settings.darkMode, settings.dateFormat, settings.defaultLanguage])

  // Track unsaved changes
  useEffect(() => {
    // This will run when settings change, marking as unsaved
    // We skip the initial load by checking if businessId exists
    if (businessId) {
      setHasUnsavedChanges(true)
    }
  }, [settings, businessId])

  const handleSave = async () => {
    if (!businessId) {
      alert('No business ID found')
      return
    }
    try {
      const res = await fetch(`/api/business/${businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: settings.businessName, 
          contactEmail: settings.contactEmail,
          businessAddress: settings.businessAddress,
          businessCity: settings.businessCity,
          businessPostalCode: settings.businessPostalCode,
          businessCountry: settings.businessCountry,
          businessPhone: settings.businessPhone,
          sessionTimeout: settings.sessionTimeout,
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor
        })
      })
      if (!res.ok) {
        const err = await res.json()
        alert('Failed to save: ' + (err.error || 'Unknown error'))
        return
      }
      // Re-fetch the latest business info after save
      const businessRes = await fetch(`/api/business/${businessId}`)
      if (businessRes.ok) {
        const businessData = await businessRes.json()
        setSettings(prev => ({
          ...prev,
          businessName: businessData?.name ?? prev.businessName,
          sessionTimeout: businessData?.sessionTimeout ?? prev.sessionTimeout,
          primaryColor: businessData?.settings?.primaryColor ?? prev.primaryColor,
          secondaryColor: businessData?.settings?.secondaryColor ?? prev.secondaryColor
        }))
      }
      setHasUnsavedChanges(false)
      alert('Settings saved!');
    } catch (err: any) {
      alert('Failed to save: ' + (err?.message || 'Unknown error'))
    }
  }

  const handleReset = () => {
    setSettings({
      ...settings,
      businessName: '',
      contactEmail: '',
      defaultLanguage: 'en',
      darkMode: false,
      dateFormat: 'DD/MM/YYYY',
      primaryColor: '#003842',
      secondaryColor: '#42b8ac',
      sessionTimeout: '15 minutes'
    })
    setHasUnsavedChanges(false)
  }

  const disableTwoFactor = async () => {
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      if (!response.ok) {
        alert('Failed to disable 2FA: ' + (data.error || 'Unknown error'))
        return
      }

      setSettings({...settings, twoFactorAuth: false})
      alert('Two-factor authentication disabled')
    } catch (err: any) {
      alert('Failed to disable 2FA: ' + (err?.message || 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'general', label: t('admin.settings'), icon: Settings },
    { id: 'branding', label: t('admin.branding'), icon: Palette },
    { id: 'security', label: t('admin.security'), icon: Shield },
    { id: 'accessibility', label: 'Accessibility', icon: Eye },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Database },
    { id: 'billing', label: 'Billing', icon: CreditCard }
  ]

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-gray-700 rounded-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.settings')}</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Configure your allergen management platform
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={settingsRootRef} id="admin-settings-root" className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-[224px]">
          <Card className="sticky top-6">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors
                      ${activeTab === tab.id 
                        ? 'bg-teal-50 dark:bg-teal-900/50 text-gray-900 dark:text-white border-l-4 border-teal-500' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      <Icon className={`mr-3 h-5 w-5 ${activeTab === tab.id ? 'text-teal-500' : 'text-gray-400 dark:text-gray-500'}`} />
                      {tab.label}
                    </div>
                    {activeTab === tab.id && (
                      <ChevronRight className="h-4 w-4 text-teal-500" />
                    )}
                  </button>
                )
              })}
            </nav>
            
            {/* Language Selector */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="px-4 py-2 pb-6">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {t('admin.defaultLanguage')}
                </label>
                <select
                  value={settings.defaultLanguage}
                  onChange={(e) => setSettings({...settings, defaultLanguage: e.target.value})}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="en">🇬🇧 English</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="ga">🇮🇪 Gaeilge</option>
                  <option value="pt">🇵🇹 Português</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2 pt-4 border-t dark:border-gray-700">
              <Button
                fullWidth
                onClick={handleSave}
                disabled={!businessId}
                variant="primary"
              >
                {hasUnsavedChanges ? t('admin.saveChanges') : t('admin.save')}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={handleReset}
              >
                {t('admin.resetDefaults')}
              </Button>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('admin.generalSettings')}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('admin.businessInfo')}</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('admin.businessName')}
                      </label>
                      <input
                        type="text"
                        value={settings.businessName}
                        onChange={(e) => setSettings({...settings, businessName: e.target.value})}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={t('admin.enterBusinessName')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('admin.contactEmail')}
                      </label>
                      <input
                        type="email"
                        value={settings.contactEmail}
                        onChange={(e) => setSettings({...settings, contactEmail: e.target.value})}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={t('admin.enterEmailAddress')}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Business Address
                      </label>
                      <input
                        type="text"
                        value={settings.businessAddress}
                        onChange={(e) => setSettings({...settings, businessAddress: e.target.value})}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Street address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={settings.businessCity}
                        onChange={(e) => setSettings({...settings, businessCity: e.target.value})}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={settings.businessPostalCode}
                        onChange={(e) => setSettings({...settings, businessPostalCode: e.target.value})}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Postal code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={settings.businessCountry}
                        onChange={(e) => setSettings({...settings, businessCountry: e.target.value})}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Country"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Business Phone
                      </label>
                      <input
                        type="tel"
                        value={settings.businessPhone}
                        onChange={(e) => setSettings({...settings, businessPhone: e.target.value})}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Business phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('admin.dateFormat')}
                      </label>
                      <select
                        value={settings.dateFormat}
                        onChange={(e) => setSettings({...settings, dateFormat: e.target.value})}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Branding Settings */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Customise your platform colours and logo. These are applied across kiosk mode and generated reports.</p>
                </div>
                <div className="p-6 space-y-8">

                  {/* Colour Pickers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Primary Colour
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Used for main backgrounds, headers and buttons</p>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm flex-shrink-0"
                          style={{ backgroundColor: settings.primaryColor }}
                        />
                        <input
                          type="color"
                          value={settings.primaryColor}
                          onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                          className="w-10 h-10 p-0.5 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-700"
                          aria-label="Primary colour picker"
                        />
                        <input
                          type="text"
                          value={settings.primaryColor}
                          onChange={e => {
                            const val = e.target.value
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setSettings({...settings, primaryColor: val})
                          }}
                          className="w-28 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="#003842"
                          maxLength={7}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Secondary Colour
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Used for accents, highlights and interactive elements</p>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm flex-shrink-0"
                          style={{ backgroundColor: settings.secondaryColor }}
                        />
                        <input
                          type="color"
                          value={settings.secondaryColor}
                          onChange={e => setSettings({...settings, secondaryColor: e.target.value})}
                          className="w-10 h-10 p-0.5 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-700"
                          aria-label="Secondary colour picker"
                        />
                        <input
                          type="text"
                          value={settings.secondaryColor}
                          onChange={e => {
                            const val = e.target.value
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setSettings({...settings, secondaryColor: val})
                          }}
                          className="w-28 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="#42b8ac"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Colour Preview */}
                  <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                    <div className="px-4 py-3 text-sm font-medium text-white" style={{ backgroundColor: settings.primaryColor }}>
                      Preview — Primary colour
                    </div>
                    <div className="px-4 py-3 text-sm font-medium text-white" style={{ backgroundColor: settings.secondaryColor }}>
                      Preview — Secondary colour
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Logo
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Appears on kiosk screens and generated PDFs/reports. PNG, JPG or SVG, max 5 MB.</p>
                    <div className="flex items-center gap-4">
                      {settings.logoUrl ? (
                        <div className="w-24 h-16 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                          <img src={settings.logoUrl} alt="Company logo" className="max-h-full max-w-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-24 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                          <Upload className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          id="logo-upload-input"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setLogoUploading(true)
                            setLogoUploadSuccess(false)
                            try {
                              await checkSessionAndUploadLogo(file)
                            } catch (err: any) {
                              alert('Upload failed: ' + (err?.message || 'Unknown error'))
                            } finally {
                              setLogoUploading(false)
                              e.target.value = ''
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          icon={Upload}
                          onClick={() => document.getElementById('logo-upload-input')?.click()}
                          disabled={logoUploading}
                        >
                          {logoUploading ? 'Uploading...' : settings.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                        </Button>
                        {logoUploadSuccess && (
                          <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" /> Logo uploaded successfully
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </Card>
              {/* Theme Settings */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Theme Settings</h3>
                  <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        {settings.darkMode ? <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" /> : <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{t('admin.darkMode')}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Use dark theme for the admin interface</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({...settings, darkMode: !settings.darkMode})}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors p-1 ${
                        settings.darkMode ? 'bg-teal-500' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-300 transition-transform shadow-sm ${
                          settings.darkMode ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
          {activeTab === 'accessibility' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                  <h2 className="text-xl font-bold text-[#003842] dark:text-[#42b8ac] mb-4">Accessibility Settings</h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">Customise your viewing experience for better accessibility.</p>
                </div>
                <div className="p-6 space-y-8">
                  {/* Font Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Font Size</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['normal', 'large', 'x-large', 'xx-large'].map((size) => (
                        <button
                          key={size}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${settings.fontSize === size ? 'bg-[#f0f9f8] text-[#003842] border-2 border-[#42b8ac]' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                          onClick={() => setSettings({ ...settings, fontSize: size })}
                        >
                          {size === 'normal' ? 'A' : size === 'large' ? 'A+' : size === 'x-large' ? 'A++' : 'A+++'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Font Type</label>
                    <select
                      value={settings.fontFamily}
                      onChange={e => setSettings({ ...settings, fontFamily: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                    >
                      <option value="default">Default Font</option>
                      <option value="dyslexic">Dyslexia-friendly</option>
                      <option value="high-contrast">High Visibility</option>
                    </select>
                  </div>

                  {/* Letter Spacing & Line Height */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Letter Spacing</label>
                      <div className="flex flex-col gap-2">
                        {['normal', 'wide', 'extra-wide'].map((spacing) => (
                          <button
                            key={spacing}
                            className={`py-2 px-3 rounded-lg text-sm ${settings.letterSpacing === spacing ? 'bg-[#f0f9f8] text-[#003842] border-2 border-[#42b8ac]' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                            onClick={() => setSettings({ ...settings, letterSpacing: spacing })}
                          >
                            {spacing.replace('-', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Line Height</label>
                      <div className="flex flex-col gap-2">
                        {['normal', 'relaxed', 'very-relaxed'].map((height) => (
                          <button
                            key={height}
                            className={`py-2 px-3 rounded-lg text-sm ${settings.lineHeight === height ? 'bg-[#f0f9f8] text-[#003842] border-2 border-[#42b8ac]' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                            onClick={() => setSettings({ ...settings, lineHeight: height })}
                          >
                            {height.replace('-', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Color Contrast */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color Contrast</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['normal', 'high', 'inverted'].map((mode) => (
                        <button
                          key={mode}
                          className={`py-2 rounded-lg font-medium ${settings.contrast === mode ? 'ring-2 ring-offset-2 ring-[#42b8ac]' : ''} ${mode === 'normal' ? 'bg-white text-gray-900 border' : mode === 'high' ? 'bg-black text-yellow-300' : 'bg-yellow-300 text-black'}`}
                          onClick={() => setSettings({ ...settings, contrast: mode })}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reduce Motion & Highlight Links */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="font-medium text-gray-900 dark:text-white">Reduce Motion</span>
                      <button
                        onClick={() => setSettings({ ...settings, reducedMotion: !settings.reducedMotion })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${settings.reducedMotion ? 'bg-[#42b8ac]' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="font-medium text-gray-900 dark:text-white">Highlight Links</span>
                      <button
                        onClick={() => setSettings({ ...settings, highlightLinks: !settings.highlightLinks })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${settings.highlightLinks ? 'bg-[#42b8ac]' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.highlightLinks ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Read Aloud (Text-to-Speech) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Read Aloud</label>
                    <div className="space-y-2">
                      <Button
                        variant={settings.speech ? 'danger' : 'primary'}
                        onClick={() => setSettings({ ...settings, speech: !settings.speech })}
                        fullWidth
                      >
                        {settings.speech ? 'Stop Reading' : 'Start Reading'}
                      </Button>
                      {settings.speech && (
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Speech Speed: {settings.speechRate ? settings.speechRate.toFixed(1) : '1.0'}x</label>
                          <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={settings.speechRate || 1}
                            onChange={e => setSettings({ ...settings, speechRate: parseFloat(e.target.value) })}
                            onMouseUp={e => {
                              const rate = parseFloat((e.target as HTMLInputElement).value);
                              if (settings.speech) { stopSpeech(); startSpeech(rate); }
                            }}
                            onTouchEnd={e => {
                              const rate = parseFloat((e.target as HTMLInputElement).value);
                              if (settings.speech) { stopSpeech(); startSpeech(rate); }
                            }}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Defaults migration notice */}
                  {showDefaultsNotice && (
                    <div className="mb-4 p-3 rounded-md bg-yellow-50 border border-yellow-100 text-sm text-yellow-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong>Accessibility defaults updated.</strong>
                          <div className="text-xs text-yellow-700 mt-1">Highlight links is now OFF by default. You can apply the new defaults or dismiss this notice.</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => {
                            const defaults = {
                              fontSize: 'normal',
                              fontFamily: 'default',
                              contrast: 'normal',
                              speech: false,
                              speechRate: 1,
                              reducedMotion: false,
                              highlightLinks: false,
                              letterSpacing: 'normal',
                              lineHeight: 'normal'
                            }
                            setSettings(prev => ({ ...prev, ...defaults }))
                            applyAccessibilitySettings(defaults)
                            try { localStorage.setItem('adminAccessibilitySettings', JSON.stringify({ ...settings, ...defaults })) } catch {}
                            localStorage.setItem('accessibilityDefaultsMigrated', 'true')
                            setShowDefaultsNotice(false)
                          }}>
                            Apply new defaults
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            localStorage.setItem('accessibilityDefaultsMigrated', 'true')
                            setShowDefaultsNotice(false)
                          }}>
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </Card>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Manage authentication and security preferences</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 border dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <Shield className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={settings.twoFactorAuth ? 'success' : 'default'}>
                          {settings.twoFactorAuth ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (settings.twoFactorAuth) {
                              // Disable 2FA
                              disableTwoFactor()
                            } else {
                              // Enable 2FA
                              setShowTwoFactor(true)
                            }
                          }}
                        >
                          {settings.twoFactorAuth ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-4 border dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <Lock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Session Timeout</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Automatically log out after inactivity</p>
                        </div>
                      </div>
                      <select
                        value={settings.sessionTimeout}
                        onChange={(e) => {
                          setSettings({...settings, sessionTimeout: e.target.value})
                          setHasUnsavedChanges(true)
                        }}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option>5 minutes</option>
                        <option>15 minutes</option>
                        <option>30 minutes</option>
                        <option>1 hour</option>
                      </select>
                    </div>

                    <div className="flex justify-between items-center p-4 border dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                          <Key className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Change Password</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Update your account password</p>
                        </div>
                      </div>
                      <Button onClick={() => setShowChangePassword(true)}>
                        Change Password
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Settings</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Configure how and when you receive alerts</p>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    {/* Main Notifications Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">Enable Notifications</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive automated audit notifications for new additions to your database
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const newValue = !settings.notificationsEnabled;
                          setSettings({...settings, notificationsEnabled: newValue});
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('notificationsEnabled', newValue.toString());
                          }
                        }}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:ring-offset-2 ${
                          settings.notificationsEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            settings.notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Audit Notification Options - Only show when notifications are enabled */}
                    {settings.notificationsEnabled && (
                      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Audit Notification Frequency</h4>
                        
                        {/* Datasheet Audit */}
                        <div className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/20">
                              <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">Datasheet Audit</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Reminder to compliance check datasheets</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                const newValue = !settings.datasheetAuditEnabled;
                                setSettings({...settings, datasheetAuditEnabled: newValue});
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('datasheetAuditEnabled', newValue.toString());
                                }
                              }}
                              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:ring-offset-2 ${
                                settings.datasheetAuditEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            >
                              <span
                                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                                  settings.datasheetAuditEnabled ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <Select
                              value={settings.datasheetAuditFrequency}
                              onChange={(value) => {
                                setSettings({...settings, datasheetAuditFrequency: value});
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('datasheetAuditFrequency', value);
                                }
                              }}
                              options={[
                                { value: '2 weeks', label: 'Every 2 weeks' },
                                { value: '1 month', label: 'Monthly' },
                                { value: '3 months', label: 'Every 3 months' },
                                { value: '1 year', label: 'Yearly' }
                              ]}
                              className="w-40"
                            />
                          </div>
                        </div>

                        {/* Ingredients Audit */}
                        <div className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/20">
                              <ChefHat className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">Ingredients Audit</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Reminder to compliance check ingredients</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                const newValue = !settings.ingredientsAuditEnabled;
                                setSettings({...settings, ingredientsAuditEnabled: newValue});
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('ingredientsAuditEnabled', newValue.toString());
                                }
                              }}
                              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:ring-offset-2 ${
                                settings.ingredientsAuditEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            >
                              <span
                                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                                  settings.ingredientsAuditEnabled ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <Select
                              value={settings.ingredientsAuditFrequency}
                              onChange={(value) => {
                                setSettings({...settings, ingredientsAuditFrequency: value});
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('ingredientsAuditFrequency', value);
                                }
                              }}
                              options={[
                                { value: '2 weeks', label: 'Every 2 weeks' },
                                { value: '1 month', label: 'Monthly' },
                                { value: '3 months', label: 'Every 3 months' },
                                { value: '1 year', label: 'Yearly' }
                              ]}
                              className="w-40"
                            />
                          </div>
                        </div>

                        {/* Menu Audit */}
                        <div className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                              <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">Menu Audit</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Reminder to compliance check menu items</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                const newValue = !settings.menuAuditEnabled;
                                setSettings({...settings, menuAuditEnabled: newValue});
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('menuAuditEnabled', newValue.toString());
                                }
                              }}
                              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:ring-offset-2 ${
                                settings.menuAuditEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            >
                              <span
                                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                                  settings.menuAuditEnabled ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <Select
                              value={settings.menuAuditFrequency}
                              onChange={(value) => {
                                setSettings({...settings, menuAuditFrequency: value});
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('menuAuditFrequency', value);
                                }
                              }}
                              options={[
                                { value: '2 weeks', label: 'Every 2 weeks' },
                                { value: '1 month', label: 'Monthly' },
                                { value: '3 months', label: 'Every 3 months' },
                                { value: '1 year', label: 'Yearly' }
                              ]}
                              className="w-40"
                            />
                          </div>
                        </div>

                        {/* Supplier Audit */}
                        <div className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/20">
                              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">Supplier Audit</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Reminder to compliance check suppliers</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                const newValue = !settings.supplierAuditEnabled;
                                setSettings({...settings, supplierAuditEnabled: newValue});
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('supplierAuditEnabled', newValue.toString());
                                }
                              }}
                              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:ring-offset-2 ${
                                settings.supplierAuditEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            >
                              <span
                                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                                  settings.supplierAuditEnabled ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <Select
                              value={settings.supplierAuditFrequency}
                              onChange={(value) => {
                                setSettings({...settings, supplierAuditFrequency: value});
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('supplierAuditFrequency', value);
                                }
                              }}
                              options={[
                                { value: '2 weeks', label: 'Every 2 weeks' },
                                { value: '1 month', label: 'Monthly' },
                                { value: '3 months', label: 'Every 3 months' },
                                { value: '1 year', label: 'Yearly' }
                              ]}
                              className="w-40"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Integrations Settings */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Integrations</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Connect with other services and tools</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 border rounded-lg dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <ToastIcon className="h-8 w-8" />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Toast POS API</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Connect your Toast POS system</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          Coming Soon
                        </Badge>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-4 border rounded-lg dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <DeliverooIcon className="h-8 w-8" />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Deliveroo API</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Connect your Deliveroo delivery system</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          Coming Soon
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Billing Settings - UPDATED WITH STRIPE INTEGRATION */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Billing & Subscription</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Manage your subscription and payment methods</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Stripe Account Connection */}
                    <Card>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stripe Account</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                                <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">Stripe Payment Processing</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {settings.stripeConnected ? 'Connected - Ready to accept payments' : 'Not connected - Connect to start accepting payments'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {settings.stripeConnected ? (
                                <Badge variant="success">Connected</Badge>
                              ) : (
                                <Badge variant="warning">Not Connected</Badge>
                              )}
                              <Button 
                                variant={settings.stripeConnected ? "outline" : "primary"}
                                size="sm"
                                onClick={() => {
                                  if (settings.stripeConnected) {
                                    // Handle disconnect
                                    setSettings({...settings, stripeConnected: false})
                                  } else {
                                    // Handle connect - redirect to Stripe OAuth
                                    window.open('/api/stripe/connect', '_blank')
                                  }
                                }}
                              >
                                {settings.stripeConnected ? 'Disconnect' : 'Connect Stripe'}
                              </Button>
                            </div>
                          </div>
                          {!settings.stripeConnected && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <div className="flex">
                                <AlertCircle className="h-5 w-5 text-blue-400" />
                                <div className="ml-3">
                                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    Connect your Stripe account to start collecting payments
                                  </h4>
                                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                                    <p>Once connected, you'll be able to:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                      <li>Accept monthly subscriptions from businesses</li>
                                      <li>Process payments automatically</li>
                                      <li>Manage customer billing</li>
                                      <li>View payment history and analytics</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>

                    {/* Payment Methods for Business Owner */}
                    <Card>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Payment Methods</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          These are the payment methods associated with your account for billing purposes.
                        </p>
                        <div className="space-y-4">
                          {settings.paymentMethods && settings.paymentMethods.length > 0 ? (
                            settings.paymentMethods.map((method: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                    <CreditCard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {method.brand?.toUpperCase()} •••• {method.last4}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      Expires {method.expMonth}/{method.expYear}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {method.isDefault && <Badge variant="success">Default</Badge>}
                                  <Button variant="ghost" size="sm" icon={Trash2}>
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No payment methods added yet</p>
                            </div>
                          )}
                          <Button variant="outline" icon={Plus} fullWidth>
                            Add Payment Method
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Customer Subscriptions (for app owners) */}
                    <Card>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Subscriptions</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Manage subscriptions from businesses using your platform.
                        </p>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">Active Subscriptions</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {settings.stripeConnected ? '12 businesses currently subscribed' : 'Connect Stripe to view subscriptions'}
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={!settings.stripeConnected}
                              onClick={() => {
                                // In a real implementation, this would open a subscription management dashboard
                                alert('Subscription management dashboard would open here')
                              }}
                            >
                              Manage Subscriptions
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {settings.stripeConnected ? '12' : '0'}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400">Active</div>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {settings.stripeConnected ? '3' : '0'}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400">Trial</div>
                            </div>
                            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {settings.stripeConnected ? '1' : '0'}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400">Past Due</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
      <TwoFactorModal 
        isOpen={showTwoFactor} 
        onClose={() => setShowTwoFactor(false)}
        onSuccess={() => {
          setSettings({...settings, twoFactorAuth: true})
          setShowTwoFactor(false)
        }}
      />

    </Container>
  )
}