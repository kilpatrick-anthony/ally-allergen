'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { JenAvatar } from '../ally/JenAvatar'
import { X, ChevronDown, Send } from 'lucide-react'

// Pages where Ally (food/menu context) is always the coach
const ALWAYS_ALLY_PATHS = ['/admin/menu-builder', '/admin/ingredients', '/admin/kiosks', '/admin/suppliers']

// Pages where Jen (compliance/general) is always the coach
const ALWAYS_JEN_PATHS = ['/admin/compliance', '/admin/settings', '/admin/help', '/super-admin']

// For neutral pages (dashboard, sites, analytics, devices etc.) alternate each visit
function resolveCoachMode(pathname: string | null): 'ally' | 'jen' {
  if (ALWAYS_ALLY_PATHS.some(p => pathname?.startsWith(p))) return 'ally'
  if (ALWAYS_JEN_PATHS.some(p => pathname?.startsWith(p))) return 'jen'
  if (typeof window === 'undefined') return 'jen'
  const n = parseInt(sessionStorage.getItem('coach_visit') ?? '0', 10)
  sessionStorage.setItem('coach_visit', String(n + 1))
  return n % 2 === 0 ? 'ally' : 'jen'
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string
  name: string
  allergen_warnings?: Record<string, string>
  ingredients?: { id: string }[]
  site_id?: string
}

// ── Font switching helper ─────────────────────────────────────────────────────
// Intercepts chat messages asking to change font before hitting the API.
function handleFontRequest(text: string): string | null {
  const wantsAtkinson = /atkinson|accessibility font|dyslexic font|easier.*read|readable font|change.*font/i.test(text)
  const wantsDefault  = /default font|normal font|reset font|original font|back.*font/i.test(text)
  if (wantsAtkinson) {
    document.documentElement.classList.add('dyslexia-mode')
    try {
      const saved = JSON.parse(localStorage.getItem('accessibilitySettings') || '{}')
      localStorage.setItem('accessibilitySettings', JSON.stringify({ ...saved, fontFamily: 'dyslexic' }))
    } catch {}
    return "Done! Switched to Atkinson Hyperlegible — a font designed for accessibility and easier reading. You can change this anytime in the Accessibility panel (bottom-right corner)."
  }
  if (wantsDefault) {
    document.documentElement.classList.remove('dyslexia-mode')
    try {
      const saved = JSON.parse(localStorage.getItem('accessibilitySettings') || '{}')
      localStorage.setItem('accessibilitySettings', JSON.stringify({ ...saved, fontFamily: 'default' }))
    } catch {}
    return "Done! Switched back to the default font."
  }
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JenCoach() {
  const pathname = usePathname()
  const { language } = useTranslation()
  const [coachMode, setCoachMode] = useState<'ally' | 'jen'>(() => resolveCoachMode(pathname))

  // Re-resolve on every navigation so neutral pages alternate properly
  useEffect(() => {
    setCoachMode(resolveCoachMode(pathname))
  }, [pathname])

  const [open, setOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])

  // Ask-Jen chat state
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'jen'; text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // Preview-as-customer (Ally) chat state
  const [previewMessages, setPreviewMessages] = useState<{ role: 'user' | 'ally'; text: string }[]>([])
  const [previewInput, setPreviewInput] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewBottomRef = useRef<HTMLDivElement>(null)

  // Persist dismiss in sessionStorage — survives page reloads but clears when the browser/tab closes (i.e. next login)
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('jencoach_dismissed') === '1'
    }
    return false
  })

  function dismissCoach() {
    sessionStorage.setItem('jencoach_dismissed', '1')
    setOpen(false)
    setDismissed(true)
  }

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (signal?.aborted) return
    try {
      const res = await fetch('/api/menu-items', { signal })
      if (!res.ok) return
      const data = await res.json()
      const items: MenuItem[] = Array.isArray(data) ? data : (data.items ?? [])
      setMenuItems(items)
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) return
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    refresh(controller.signal)
    const interval = setInterval(() => refresh(controller.signal), 5 * 60 * 1000)
    return () => { controller.abort('unmount'); clearInterval(interval) }
  }, [refresh])

  // When navigating to a different page type, close the panel
  useEffect(() => {
    setOpen(false)
  }, [coachMode])

  useEffect(() => {
    previewBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [previewMessages, previewLoading])

  async function askAlly(text: string) {
    const trimmed = text.trim()
    if (!trimmed || previewLoading) return

    const history = [...previewMessages, { role: 'user' as const, text: trimmed }]
    setPreviewMessages(history)
    setPreviewInput('')

    const fontReply = handleFontRequest(trimmed)
    if (fontReply) {
      setPreviewMessages((prev) => [...prev, { role: 'ally', text: fontReply }])
      return
    }

    setPreviewLoading(true)

    try {
      const res = await fetch('/api/ally-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          menuItems,
          businessName: 'Admin Portal',
          _source: 'admin-coach',
          _coach: 'ally',
          pagePath: pathname,
          chatHistory: history,
          language,
        }),
      })
      const data = await res.json()
      setPreviewMessages((prev) => [
        ...prev,
        { role: 'ally', text: data.reply ?? "I'm not sure — please ask a staff member." },
      ])
    } catch {
      setPreviewMessages((prev) => [
        ...prev,
        { role: 'ally', text: 'Connection issue. Please try again.' },
      ])
    } finally {
      setPreviewLoading(false)
    }
  }

  async function askJen(text: string) {
    const trimmed = text.trim()
    if (!trimmed || chatLoading) return

    const history = [...chatMessages, { role: 'user' as const, text: trimmed }]
    setChatMessages(history)
    setChatInput('')

    const fontReply = handleFontRequest(trimmed)
    if (fontReply) {
      setChatMessages((prev) => [...prev, { role: 'jen', text: fontReply }])
      return
    }

    setChatLoading(true)

    try {
      const res = await fetch('/api/ally-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          menuItems: [],
          businessName: 'Admin Portal',
          // Overriding with a compliance-focused context
          _jenMode: true,
          _source: 'admin-coach',
          _coach: 'jen',
          pagePath: pathname,
          chatHistory: history,
          language,
        }),
      })
      const data = await res.json()
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'jen',
          text:
            data.reply ??
            "I'm not sure — please consult the FSAI guidance at fsai.ie",
        },
      ])
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'jen',
          text: 'Connection issue. Try again or visit fsai.ie for compliance guidance.',
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 sm:bottom-12 lg:bottom-[56px] right-4 sm:right-6 z-40 flex flex-col items-end gap-2">
      {/* Jen panel */}
      {open && (
        <div
          className="w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(540px, calc(100vh - 160px))' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 text-white transition-colors"
            style={{ background: coachMode === 'ally' ? '#0e7066' : '#003842' }}
          >
            {coachMode === 'ally' ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src="/Ally_9.svg" alt="" width={36} height={36} className="rounded-full" />
            ) : (
              <JenAvatar size={36} />
            )}
            <p className="text-sm font-semibold leading-tight flex-1 min-w-0">
              {coachMode === 'ally' ? 'Ally' : 'Jen'}
            </p>
            <button
              onClick={dismissCoach}
              className="text-[11px] text-white/60 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
              title="Hide until next login"
            >
              Hide
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Chat — Jen on compliance pages, Ally on food pages */}
          {coachMode === 'jen' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {chatMessages.length === 0 && (
                  <div className="flex gap-2">
                    <JenAvatar size={28} className="mt-0.5 shrink-0" />
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-700 shadow-sm border border-gray-100">
                      Hi, I&apos;m Jen &#x1F44B; I&apos;m here to help you get the most out of the platform. Ask me anything about managing your menu, ingredients, allergens, or settings.
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {msg.role === 'jen' && <JenAvatar size={28} className="mt-0.5 shrink-0" />}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-[#003842] text-white rounded-tr-sm'
                          : 'bg-white text-gray-700 border border-gray-100 rounded-tl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2">
                    <JenAvatar size={28} className="mt-0.5 shrink-0" />
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  askJen(chatInput)
                }}
                className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-white"
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask me anything…"
                  className="flex-1 text-sm bg-gray-50 rounded-full px-3 py-1.5 outline-none focus:ring-2 focus:ring-teal-300 border border-gray-200"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="p-2 rounded-full bg-[#003842] text-white hover:bg-[#005060] disabled:opacity-40 transition-colors"
                  aria-label="Send"
                >
                  <Send size={14} />
                </button>
              </form>
              <p className="text-[10px] text-gray-400 text-center px-3 pb-2 leading-tight">
                Jen uses AI. Responses may not always be accurate — please verify important decisions.
              </p>
            </>
          )}

          {/* Ally chat — food/menu pages */}
          {coachMode === 'ally' && (
            <>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {previewMessages.length === 0 && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/Ally_9.svg" alt="" width={28} height={28} className="rounded-full mt-0.5 shrink-0" />
                      <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-700 shadow-sm border border-gray-100">
                        Hi! I&apos;m Ally 👋 I&apos;m here to help you get the most out of the platform. Ask me anything about managing your menu, ingredients, allergens, or settings.
                      </div>
                    </div>
                  </div>
                )}
                {previewMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {msg.role === 'ally' && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src="/Ally_9.svg" alt="" width={28} height={28} className="rounded-full mt-0.5 shrink-0" />
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-[#003842] text-white rounded-tr-sm'
                          : 'bg-white text-gray-700 border border-gray-100 rounded-tl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {previewLoading && (
                  <div className="flex gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/Ally_9.svg" alt="" width={28} height={28} className="rounded-full mt-0.5 shrink-0" />
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={previewBottomRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  askAlly(previewInput)
                }}
                className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-white"
              >
                <input
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  placeholder="Ask me anything…"
                  className="flex-1 text-sm bg-gray-50 rounded-full px-3 py-1.5 outline-none focus:ring-2 focus:ring-teal-300 border border-gray-200"
                  disabled={previewLoading}
                />
                <button
                  type="submit"
                  disabled={!previewInput.trim() || previewLoading}
                  className="p-2 rounded-full bg-[#42b8ac] text-white hover:bg-[#37a99e] disabled:opacity-40 transition-colors"
                  aria-label="Send"
                >
                  <Send size={14} />
                </button>
              </form>
              <p className="text-[10px] text-gray-400 text-center px-3 pb-2 leading-tight">
                Ally uses AI. Responses may not always be accurate — please verify important decisions.
              </p>
            </>
          )}
        </div>
      )}

      {/* Floating button — avatar and label switch based on which page the admin is on */}
      {!dismissed && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative flex items-center gap-0 rounded-full shadow-2xl hover:shadow-teal-400/30 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 overflow-visible h-[56px] sm:h-[62px]"
          style={{
            background: open
              ? 'linear-gradient(135deg, #003842 0%, #005a6e 100%)'
              : 'linear-gradient(135deg, #003842 0%, #00616e 60%, #42b8ac 100%)',
            paddingRight: open ? '0' : '18px',
          }}
          aria-label={open ? 'Close' : coachMode === 'ally' ? 'Open Ally' : 'Open Jen'}
        >
            {/* Avatar — overflows pill vertically on sm+ to appear larger; sits flush on mobile */}
            <span className="relative shrink-0 -ml-1 -my-1 sm:-my-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coachMode === 'ally' ? '/Ally_9.svg' : '/Jen_2.svg'}
                alt=""
                width={78}
                height={78}
                className="rounded-full block ring-2 ring-white/40 w-[52px] h-[52px] sm:w-[78px] sm:h-[78px]"
                style={{ display: 'block' }}
              />
            </span>

            {open ? (
              <span className="flex items-center justify-center w-10 h-10 ml-1 mr-1">
                <X size={20} className="text-white" />
              </span>
            ) : (
              <span className="hidden sm:block ml-2 text-[15px] font-bold text-white tracking-wide">
                {coachMode === 'ally' ? 'Ask Ally' : 'Ask Jen'}
              </span>
            )}

        </button>
      )}
    </div>
  )
}
