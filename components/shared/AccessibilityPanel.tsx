// components/shared/AccessibilityPanel.tsx - FIXED VERSION
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Eye, Text, Contrast, 
  Volume2, VolumeX, 
  Type, Settings, X, 
  Maximize2, Minimize2, Palette,
  RotateCcw, UserCheck
} from 'lucide-react';

interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'x-large' | 'xx-large';
  fontFamily: 'default' | 'dyslexic' | 'high-contrast' | 'arsenal' | 'verdana-pro';
  contrast: 'normal' | 'high' | 'inverted';
  speech: boolean;
  speechRate: number;
  reducedMotion: boolean;
  highlightLinks: boolean;
  letterSpacing: 'normal' | 'wide' | 'extra-wide';
  lineHeight: 'normal' | 'relaxed' | 'very-relaxed';
  darkMode: boolean;
}

// Custom icon: Person in circle with checkmark
function PersonWithCheckIcon({ size = 28 }: { size?: number }) {
  return (
    <UserCheck size={size} />
  );
}

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
    lineHeight: 'normal',
    darkMode: false
  });
  const [showDefaultsNotice, setShowDefaultsNotice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('accessibilityDefaultsMigrated')) {
      setShowDefaultsNotice(true);
    }
  }, []);

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Apply settings to document
  const applySettings = (newSettings: Partial<AccessibilitySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    // Apply CSS custom properties
    const root = document.documentElement;
    
    // Font size
    const fontSizeMap = {
      'normal': '100%',
      'large': '125%',
      'x-large': '150%',
      'xx-large': '200%'
    };
    root.style.setProperty('--accessibility-font-size', fontSizeMap[updated.fontSize]);
    
    // Font family
    if (updated.fontFamily === 'dyslexic') {
      root.classList.add('dyslexia-mode');
      root.classList.remove('high-contrast-font', 'arsenal-font', 'verdana-pro-font');
    } else if (updated.fontFamily === 'high-contrast') {
      root.classList.add('high-contrast-font');
      root.classList.remove('dyslexia-mode', 'arsenal-font', 'verdana-pro-font');
    } else if (updated.fontFamily === 'arsenal') {
      root.classList.add('arsenal-font');
      root.classList.remove('dyslexia-mode', 'high-contrast-font', 'verdana-pro-font');
    } else if (updated.fontFamily === 'verdana-pro') {
      root.classList.add('verdana-pro-font');
      root.classList.remove('dyslexia-mode', 'high-contrast-font', 'arsenal-font');
    } else {
      root.classList.remove('dyslexia-mode', 'high-contrast-font', 'arsenal-font', 'verdana-pro-font');
    }
    
    // Contrast
    root.setAttribute('data-contrast', updated.contrast);
    
    // Letter spacing
    const spacingMap = {
      'normal': '0.02em',
      'wide': '0.05em',
      'extra-wide': '0.1em'
    };
    root.style.setProperty('--letter-spacing', spacingMap[updated.letterSpacing]);
    
    // Line height
    const lineHeightMap = {
      'normal': '1.6',
      'relaxed': '2',
      'very-relaxed': '2.5'
    };
    root.style.setProperty('--line-height', lineHeightMap[updated.lineHeight]);
    
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
    
    // Dark mode
    if (updated.darkMode) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
    
    // Speech
    if (updated.speech) {
      startSpeech();
    } else {
      stopSpeech();
    }
    
    // Save to localStorage
    localStorage.setItem('accessibilitySettings', JSON.stringify(updated));
  };

  // Speech synthesis functions
  const startSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser');
      applySettings({ speech: false });
      return;
    }
    
    synthRef.current = window.speechSynthesis;
    
    // Stop any current speech
    stopSpeech();
    
    // Get main content
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
      
      speechRef.current.onerror = () => {
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
      // Ctrl+Alt+A to toggle panel
      if (e.ctrlKey && e.altKey && e.key === 'a') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      // Ctrl+Alt+S to toggle speech
      if (e.ctrlKey && e.altKey && e.key === 's') {
        e.preventDefault();
        applySettings({ speech: !settings.speech });
      }
      // Ctrl+Alt+C to cycle contrast
      if (e.ctrlKey && e.altKey && e.key === 'c') {
        e.preventDefault();
        const nextContrast = 
          settings.contrast === 'normal' ? 'high' :
          settings.contrast === 'high' ? 'inverted' : 'normal';
        applySettings({ contrast: nextContrast });
      }
      // Ctrl+Alt+Plus to increase font
      if (e.ctrlKey && e.altKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        const nextSize = 
          settings.fontSize === 'normal' ? 'large' :
          settings.fontSize === 'large' ? 'x-large' :
          settings.fontSize === 'x-large' ? 'xx-large' : 'xx-large';
        applySettings({ fontSize: nextSize });
      }
      // Ctrl+Alt+Minus to decrease font
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

  // Load saved settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('accessibilitySettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        // Apply settings without triggering speech
        const { speech, ...settingsWithoutSpeech } = parsed;
        applySettings(settingsWithoutSpeech);
      } catch (e) {
        console.error('Error loading saved settings:', e);
      }
    }
  }, []);

  // Reset to defaults
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
      lineHeight: 'normal',
      darkMode: false
    };
    applySettings(defaults);
  };

  const applyNewDefaults = () => {
    const defaults: AccessibilitySettings = {
      fontSize: 'normal',
      fontFamily: 'default',
      contrast: 'normal',
      speech: false,
      speechRate: 1,
      reducedMotion: false,
      highlightLinks: false,
      letterSpacing: 'normal',
      lineHeight: 'normal',
      darkMode: false
    };
    applySettings(defaults);
    try { localStorage.setItem('accessibilitySettings', JSON.stringify(defaults)) } catch {}
    localStorage.setItem('accessibilityDefaultsMigrated', 'true');
    setShowDefaultsNotice(false);
  };

  const dismissDefaultsNotice = () => {
    localStorage.setItem('accessibilityDefaultsMigrated', 'true');
    setShowDefaultsNotice(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  return (
    <>
      {/* Floating toggle button - BOTTOM RIGHT CORNER with inclusive icon */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        pointerEvents: 'auto'
      }}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-br from-[#003842] to-[#42b8ac] text-white p-4 rounded-full shadow-xl hover:from-[#004c5a] hover:to-[#48c8b8] focus:outline-none focus:ring-4 focus:ring-[#42b8ac]/50 transition-all duration-200 flex items-center justify-center"
          aria-label="Accessibility settings"
          aria-expanded={isOpen}
          style={{ 
            width: '64px',
            height: '64px',
            boxShadow: '0 10px 25px rgba(0, 56, 66, 0.3)'
          }}
        >
          {isOpen ? (
            <X size={36} />
          ) : (
            <PersonWithCheckIcon size={36} />
          )}
        </button>
      </div>

      {/* Settings panel - Now opens UP from bottom-right */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '96px',
          right: '24px',
          zIndex: 9998,
          pointerEvents: 'auto'
        }}>
          <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-300 ${isExpanded ? 'w-96' : 'w-80'}`}>
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#003842]/5 to-[#42b8ac]/5">
              <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-[#003842] to-[#42b8ac] rounded-lg">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-[#003842]">
                    Accessibility Settings
                  </h2>
                </div>
              <p className="text-gray-600 text-sm"> 
              {showDefaultsNotice && (
                <div className="mt-3 p-2 rounded bg-yellow-50 border border-yellow-100 text-yellow-800 text-sm flex items-center justify-between gap-3">
                  <div>Accessibility defaults updated — <strong>highlight links</strong> are now OFF by default.</div>
                  <div className="flex gap-2">
                    <Button size="xs" onClick={applyNewDefaults}>Apply new defaults</Button>
                    <Button size="xs" variant="ghost" onClick={dismissDefaultsNotice}>Dismiss</Button>
                  </div>
                </div>
              )}
                Customise your viewing experience for better accessibility
              </p>
            </div>

            {/* Settings content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Font Size */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Text size={18} className="text-[#003842]" />
                  <h3 className="font-semibold text-[#003842]">Font Size</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['normal', 'large', 'x-large', 'xx-large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => applySettings({ fontSize: size })}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${settings.fontSize === size ? 'bg-gradient-to-r from-[#003842]/10 to-[#42b8ac]/10 text-[#003842] border-2 border-[#42b8ac]/50' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      aria-label={`Set font size to ${size}`}
                    >
                      {size === 'normal' ? 'A' : 
                       size === 'large' ? 'A+' : 
                       size === 'x-large' ? 'A++' : 'A+++'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Appearance */}
              {isExpanded && (
                <>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Type size={18} className="text-[#003842]" />
                      <h3 className="font-semibold text-[#003842]">Text Appearance</h3>
                    </div>
                    <div className="space-y-4">
                      {/* Font Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Type
                        </label>
                        <select 
                          value={settings.fontFamily}
                          onChange={(e) => applySettings({ fontFamily: e.target.value as any })}
                          className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                          aria-label="Select font type"
                        >
                          <option value="default">Default (Arsenal)</option>
                          <option value="verdana-pro">Verdana Pro</option>
                          <option value="arsenal">Arsenal</option>
                          <option value="dyslexic">Dyslexia-friendly</option>
                          <option value="high-contrast">High Visibility</option>
                        </select>
                      </div>

                      {/* Letter Spacing */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Letter Spacing
                        </label>
                        <div className="flex gap-2">
                          {(['normal', 'wide', 'extra-wide'] as const).map((spacing) => (
                            <button
                              key={spacing}
                              onClick={() => applySettings({ letterSpacing: spacing })}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm ${settings.letterSpacing === spacing ? 'bg-gradient-to-r from-[#003842]/10 to-[#42b8ac]/10 text-[#003842] border-2 border-[#42b8ac]/50' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                              aria-label={`Set letter spacing to ${spacing}`}
                            >
                              {spacing.replace('-', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Line Height */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Line Height
                        </label>
                        <div className="flex gap-2">
                          {(['normal', 'relaxed', 'very-relaxed'] as const).map((height) => (
                            <button
                              key={height}
                              onClick={() => applySettings({ lineHeight: height })}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm ${settings.lineHeight === height ? 'bg-gradient-to-r from-[#003842]/10 to-[#42b8ac]/10 text-[#003842] border-2 border-[#42b8ac]/50' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                              aria-label={`Set line height to ${height}`}
                            >
                              {height.replace('-', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Preferences */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Palette size={18} className="text-[#003842]" />
                      <h3 className="font-semibold text-[#003842]">Visual Preferences</h3>
                    </div>
                    <div className="space-y-4">
                      {/* Contrast */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Color Contrast
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['normal', 'high', 'inverted'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => applySettings({ contrast: mode })}
                              className={`py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${settings.contrast === mode ? 'ring-2 ring-offset-2 ring-[#42b8ac]' : ''} ${mode === 'normal' ? 'bg-white text-gray-900 border border-gray-300' : mode === 'high' ? 'bg-black text-yellow-300' : 'bg-yellow-300 text-black'}`}
                              aria-label={`Set contrast mode to ${mode}`}
                            >
                              <Contrast size={16} />
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Toggles */}
                      <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                          <span className="font-medium text-gray-900">Reduce Motion</span>
                          <input
                            type="checkbox"
                            checked={settings.reducedMotion}
                            onChange={(e) => applySettings({ reducedMotion: e.target.checked })}
                            className="sr-only"
                            aria-label="Toggle reduced motion"
                          />
                          <div className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${settings.reducedMotion ? 'bg-[#42b8ac]' : 'bg-gray-300'}`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${settings.reducedMotion ? 'translate-x-6' : ''}`} />
                          </div>
                        </label>

                        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                          <span className="font-medium text-gray-900">Highlight Interactive Elements</span>
                          <input
                            type="checkbox"
                            checked={settings.highlightLinks}
                            onChange={(e) => applySettings({ highlightLinks: e.target.checked })}
                            className="sr-only"
                            aria-label="Toggle highlight interactive elements"
                          />
                          <div className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${settings.highlightLinks ? 'bg-[#42b8ac]' : 'bg-gray-300'}`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${settings.highlightLinks ? 'translate-x-6' : ''}`} />
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Text-to-Speech */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Volume2 size={18} className="text-[#003842]" />
                  <h3 className="font-semibold text-[#003842]">Text-to-Speech</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => applySettings({ speech: !settings.speech })}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${settings.speech ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gradient-to-r from-[#003842]/10 to-[#42b8ac]/10 text-[#003842] hover:from-[#003842]/20 hover:to-[#42b8ac]/20'}`}
                      aria-label={settings.speech ? "Stop reading aloud" : "Start reading aloud"}
                    >
                      {settings.speech ? (
                        <>
                          <VolumeX size={20} />
                          Stop Reading Aloud
                        </>
                      ) : (
                        <>
                          <Volume2 size={20} />
                          Read Aloud
                        </>
                      )}
                    </button>
                    <span className="text-sm text-gray-500">
                      Ctrl+Alt+S
                    </span>
                  </div>
                  
                  {settings.speech && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Speech Speed
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={settings.speechRate}
                        onChange={(e) => applySettings({ speechRate: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#42b8ac]"
                        aria-label="Adjust speech speed"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Slower</span>
                        <span>{settings.speechRate.toFixed(1)}x</span>
                        <span>Faster</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dark Mode */}
              <div className="mb-6">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <span className="font-medium text-gray-900">Dark Mode</span>
                  <input
                    type="checkbox"
                    checked={settings.darkMode}
                    onChange={(e) => applySettings({ darkMode: e.target.checked })}
                    className="sr-only"
                    aria-label="Toggle dark mode"
                  />
                  <div className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${settings.darkMode ? 'bg-[#42b8ac]' : 'bg-gray-300'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${settings.darkMode ? 'translate-x-6' : ''}`} />
                  </div>
                </label>
              </div>

              {/* Reset Button */}
              <button
                onClick={resetSettings}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#003842]/5 to-[#42b8ac]/5 text-[#003842] rounded-lg font-medium hover:from-[#003842]/10 hover:to-[#42b8ac]/10 transition-colors border border-[#42b8ac]/20 flex items-center justify-center gap-2"
                aria-label="Reset all accessibility settings to default"
              >
                <RotateCcw size={18} />
                Reset to Default Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}