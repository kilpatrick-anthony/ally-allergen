// components/shared/AccessibilityPanel.tsx - UPDATED FOR KIOSK
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Eye, Text, Contrast, 
  Volume2, VolumeX, ZoomIn, 
  Type, Settings, X, 
  Maximize2, Minimize2, Palette,
  RotateCcw, User
} from 'lucide-react';

interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'x-large' | 'xx-large';
  fontFamily: 'default' | 'dyslexic' | 'high-contrast';
  contrast: 'normal' | 'high' | 'inverted';
  speech: boolean;
  speechRate: number;
  reducedMotion: boolean;
  highlightLinks: boolean;
  letterSpacing: 'normal' | 'wide' | 'extra-wide';
  lineHeight: 'normal' | 'relaxed' | 'very-relaxed';
}

// Import your design system components
import { Card } from '@/app/components/layout/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

export default function AccessibilityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [settings, setSettings] = useState<AccessibilitySettings>({
    fontSize: 'normal',
    fontFamily: 'default',
    contrast: 'normal',
    speech: false,
    speechRate: 1,
    reducedMotion: false,
    highlightLinks: false,
    letterSpacing: 'normal',
    lineHeight: 'normal'
  });
  const [showDefaultsNotice, setShowDefaultsNotice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('accessibilityDefaultsMigrated')) {
      setShowDefaultsNotice(true);
    }
  }, []);

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Load saved settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('accessibilitySettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        const { speech, ...settingsWithoutSpeech } = parsed;
        applySettings(settingsWithoutSpeech);
      } catch (e) {
        console.error('Error loading saved settings:', e);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Apply settings to document
  const applySettings = (newSettings: Partial<AccessibilitySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    const root = document.documentElement;
    const body = document.body;
    
    // Font size
    const fontSizeMap = {
      'normal': '100%',
      'large': '125%', 
      'x-large': '150%',
      'xx-large': '200%'
    };
    const fontSizeValue = fontSizeMap[updated.fontSize];
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
    root.style.letterSpacing = spacingMap[updated.letterSpacing];
    
    // Line height
    const lineHeightMap = {
      'normal': '1.6',
      'relaxed': '2',
      'very-relaxed': '2.5'
    };
    root.style.lineHeight = lineHeightMap[updated.lineHeight];
    
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
      startSpeech();
    } else {
      stopSpeech();
    }
    
    localStorage.setItem('accessibilitySettings', JSON.stringify(updated));
  };

  // Speech functions
  const startSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser');
      applySettings({ speech: false });
      return;
    }
    
    synthRef.current = window.speechSynthesis;
    stopSpeech();
    
    const mainContent = document.querySelector('main')?.textContent || 
                       document.body.textContent || '';
    
    if (mainContent) {
      speechRef.current = new SpeechSynthesisUtterance(mainContent);
      speechRef.current.rate = settings.speechRate;
      speechRef.current.pitch = 1;
      speechRef.current.volume = 1;
      speechRef.current.lang = 'en-US';
      
      speechRef.current.onend = () => {
        applySettings({ speech: false });
      };
      
      synthRef.current.speak(speechRef.current);
    }
  };

  const stopSpeech = () => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === 'a') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.ctrlKey && e.altKey && e.key === 's') {
        e.preventDefault();
        applySettings({ speech: !settings.speech });
      }
      if (e.ctrlKey && e.altKey && e.key === 'c') {
        e.preventDefault();
        const nextContrast = 
          settings.contrast === 'normal' ? 'high' :
          settings.contrast === 'high' ? 'inverted' : 'normal';
        applySettings({ contrast: nextContrast });
      }
      if (e.ctrlKey && e.altKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        const nextSize = 
          settings.fontSize === 'normal' ? 'large' :
          settings.fontSize === 'large' ? 'x-large' :
          settings.fontSize === 'x-large' ? 'xx-large' : 'xx-large';
        applySettings({ fontSize: nextSize });
      }
      if (e.ctrlKey && e.altKey && e.key === '-') {
        e.preventDefault();
        const nextSize = 
          settings.fontSize === 'xx-large' ? 'x-large' :
          settings.fontSize === 'x-large' ? 'large' :
          settings.fontSize === 'large' ? 'normal' : 'normal';
        applySettings({ fontSize: nextSize });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, settings]);

  const resetSettings = () => {
    const defaults: AccessibilitySettings = {
      fontSize: 'normal',
      fontFamily: 'default',
      contrast: 'normal',
      speech: false,
      speechRate: 1,
      reducedMotion: false,
      highlightLinks: false,
      letterSpacing: 'normal',
      lineHeight: 'normal'
    };
    applySettings(defaults);
  };

  return (
    <>
      {/* KIOSK VERSION - Top right floating button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-24 right-6 z-50 bg-gradient-to-br from-[#42b8ac] to-[#003842] text-white p-3 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#42b8ac]/30 transition-all duration-200 flex items-center justify-center gap-2"
        aria-label="Accessibility settings"
        aria-expanded={isOpen}
        style={{ 
          minWidth: 'auto',
          minHeight: 'auto',
          padding: '12px 16px'
        }}
      >
        <User className="h-5 w-5" />
        <span className="font-medium text-sm hidden md:inline">Accessibility</span>
        {isOpen ? <X className="h-4 w-4 ml-1" /> : null}
      </button>

      {/* Settings panel - Updated to match your design */}
      {isOpen && (
        <div className={`fixed right-6 z-40 transition-all duration-300 ${isOpen ? 'top-40 opacity-100' : 'top-32 opacity-0'} ${isExpanded ? 'w-96' : 'w-80'}`}>
          <Card className="shadow-2xl border border-gray-200 max-h-[70vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-lg">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#003842]">
                      Accessibility
                    </h2>
                    <p className="text-sm text-gray-600">
                      Adjust for your needs
                    </p>
                    {showDefaultsNotice && (
                      <div className="mt-3 p-2 rounded bg-yellow-50 border border-yellow-100 text-yellow-800 text-sm flex items-center justify-between gap-3">
                        <div>Accessibility defaults updated — <strong>highlight links</strong> are now OFF by default.</div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => {
                            const defaults = {
                              fontSize: 'normal' as const,
                              fontFamily: 'default' as const,
                              contrast: 'normal' as const,
                              speech: false,
                              speechRate: 1,
                              reducedMotion: false,
                              highlightLinks: false,
                              letterSpacing: 'normal' as const,
                              lineHeight: 'normal' as const
                            }
                            applySettings(defaults)
                            try { localStorage.setItem('accessibilitySettings', JSON.stringify(defaults)) } catch {}
                            localStorage.setItem('accessibilityDefaultsMigrated', 'true')
                            setShowDefaultsNotice(false)
                          }}>Apply new defaults</Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            localStorage.setItem('accessibilityDefaultsMigrated', 'true')
                            setShowDefaultsNotice(false)
                          }}>Dismiss</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label={isExpanded ? "Show fewer options" : "Show all options"}
                >
                  {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
              </div>
            </div>

            {/* Settings content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {/* Quick Controls - Always visible */}
              <div className="mb-6">
                <h3 className="font-semibold text-[#003842] mb-3">Quick Adjustments</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextSize = 
                        settings.fontSize === 'normal' ? 'large' :
                        settings.fontSize === 'large' ? 'x-large' :
                        settings.fontSize === 'x-large' ? 'xx-large' : 'normal';
                      applySettings({ fontSize: nextSize });
                    }}
                    icon={Text}
                  >
                    Text Size
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextContrast = 
                        settings.contrast === 'normal' ? 'high' :
                        settings.contrast === 'high' ? 'inverted' : 'normal';
                      applySettings({ contrast: nextContrast });
                    }}
                    icon={Contrast}
                  >
                    Contrast
                  </Button>
                </div>
              </div>

              {/* Font Size Selector */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#003842]">Font Size</h3>
                  <Badge variant="primary">
                    {settings.fontSize.replace('-', ' ')}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['normal', 'large', 'x-large', 'xx-large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => applySettings({ fontSize: size })}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        settings.fontSize === size 
                          ? 'bg-[#f0f9f8] text-[#003842] border-2 border-[#42b8ac]' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {size === 'normal' ? 'A' : 
                       size === 'large' ? 'A+' : 
                       size === 'x-large' ? 'A++' : 'A+++'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expanded options */}
              {isExpanded && (
                <div className="space-y-6">
                  {/* Text Appearance */}
                  <div>
                    <h3 className="font-semibold text-[#003842] mb-3">Text Appearance</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Type
                        </label>
                        <select 
                          value={settings.fontFamily}
                          onChange={(e) => applySettings({ fontFamily: e.target.value as any })}
                          className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                        >
                          <option value="default">Default Font</option>
                          <option value="dyslexic">Dyslexia-friendly</option>
                          <option value="high-contrast">High Visibility</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Letter Spacing
                          </label>
                          <div className="flex flex-col gap-2">
                            {(['normal', 'wide', 'extra-wide'] as const).map((spacing) => (
                              <button
                                key={spacing}
                                onClick={() => applySettings({ letterSpacing: spacing })}
                                className={`py-2 px-3 rounded-lg text-sm ${
                                  settings.letterSpacing === spacing 
                                    ? 'bg-[#f0f9f8] text-[#003842] border-2 border-[#42b8ac]' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {spacing.replace('-', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Line Height
                          </label>
                          <div className="flex flex-col gap-2">
                            {(['normal', 'relaxed', 'very-relaxed'] as const).map((height) => (
                              <button
                                key={height}
                                onClick={() => applySettings({ lineHeight: height })}
                                className={`py-2 px-3 rounded-lg text-sm ${
                                  settings.lineHeight === height 
                                    ? 'bg-[#f0f9f8] text-[#003842] border-2 border-[#42b8ac]' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {height.replace('-', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Preferences */}
                  <div>
                    <h3 className="font-semibold text-[#003842] mb-3">Visual Preferences</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Color Contrast
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['normal', 'high', 'inverted'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => applySettings({ contrast: mode })}
                              className={`py-2 rounded-lg font-medium ${
                                settings.contrast === mode 
                                  ? 'ring-2 ring-offset-2 ring-[#42b8ac]' 
                                  : ''
                              } ${
                                mode === 'normal' ? 'bg-white text-gray-900 border' :
                                mode === 'high' ? 'bg-black text-yellow-300' :
                                'bg-yellow-300 text-black'
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">Reduce Motion</span>
                          <button
                            onClick={() => applySettings({ reducedMotion: !settings.reducedMotion })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                              settings.reducedMotion ? 'bg-[#42b8ac]' : 'bg-gray-300'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">Highlight Links</span>
                          <button
                            onClick={() => applySettings({ highlightLinks: !settings.highlightLinks })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                              settings.highlightLinks ? 'bg-[#42b8ac]' : 'bg-gray-300'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              settings.highlightLinks ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Text-to-Speech */}
                  <div>
                    <h3 className="font-semibold text-[#003842] mb-3">Read Aloud</h3>
                    <div className="space-y-4">
                      <Button
                        variant={settings.speech ? "danger" : "primary"}
                        icon={settings.speech ? VolumeX : Volume2}
                        onClick={() => applySettings({ speech: !settings.speech })}
                        fullWidth
                      >
                        {settings.speech ? 'Stop Reading' : 'Start Reading'}
                      </Button>

                      {settings.speech && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Speech Speed: {settings.speechRate.toFixed(1)}x
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={settings.speechRate}
                            onChange={(e) => applySettings({ speechRate: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#42b8ac]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 mt-6">
                {!isExpanded && (
                  <Button
                    variant="outline"
                    onClick={() => setIsExpanded(true)}
                    fullWidth
                    icon={Maximize2}
                  >
                    Show More Options
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  onClick={resetSettings}
                  fullWidth
                  icon={RotateCcw}
                >
                  Reset to Defaults
                </Button>

                <div className="text-xs text-gray-500 pt-4 border-t text-center">
                  Press <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+Alt+A</kbd> to toggle
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}