'use client'

import { useState, useEffect, useCallback } from 'react'
import { JenAvatar } from '../ally/JenAvatar'
import { X, ChevronDown, ExternalLink, RefreshCw, MessageSquare, Send } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string
  name: string
  allergen_warnings?: Record<string, string>
  ingredients?: { id: string }[]
  site_id?: string
}

interface Nudge {
  id: string
  severity: 'warning' | 'info'
  title: string
  detail: string
  href?: string
}

type Tab = 'nudges' | 'ask'

// ── Rule engine (pure client-side) ────────────────────────────────────────────

const GLUTEN_CEREALS = [
  'wheat', 'rye', 'barley', 'oats', 'spelt', 'kamut',
]

function runRules(items: MenuItem[]): Nudge[] {
  const nudges: Nudge[] = []

  // Rule 1: Items with no allergen data at all
  const noAllergenData = items.filter(
    (item) =>
      !item.allergen_warnings ||
      Object.keys(item.allergen_warnings).length === 0
  )
  if (noAllergenData.length > 0) {
    nudges.push({
      id: 'no-allergen-data',
      severity: 'warning',
      title: `${noAllergenData.length} item${noAllergenData.length > 1 ? 's' : ''} missing allergen information`,
      detail: `"${noAllergenData.slice(0, 3).map((i) => i.name).join('", "')}"${noAllergenData.length > 3 ? ` and ${noAllergenData.length - 3} more` : ''} have no allergen data. EU Regulation 1169/2011 requires this.`,
      href: '/admin/menu-builder',
    })
  }

  // Rule 2: Items marked as "contains" cereals/gluten but with no sub-type
  const missingGlutenType = items.filter((item) => {
    const aw = item.allergen_warnings ?? {}
    const hasGluten =
      aw['cereals_gluten'] === 'contains' || aw['cereals_gluten'] === 'may_contain'
    const hasSubType = GLUTEN_CEREALS.some((c) => aw[`cereals_gluten_${c}`] === 'contains' || aw[`cereals_gluten_${c}`] === 'may_contain')
    return hasGluten && !hasSubType
  })
  if (missingGlutenType.length > 0) {
    nudges.push({
      id: 'missing-gluten-subtype',
      severity: 'info',
      title: `${missingGlutenType.length} item${missingGlutenType.length > 1 ? 's' : ''} need cereal sub-type`,
      detail: `Items containing gluten should specify which cereal (wheat, rye, barley, oats etc.) for best labelling practice.`,
      href: '/admin/menu-builder',
    })
  }

  // Rule 3: Items with all allergens set to none (may be genuine — flag as check)
  const allNone = items.filter((item) => {
    const aw = item.allergen_warnings ?? {}
    const vals = Object.values(aw)
    return vals.length > 0 && vals.every((v) => v === 'none')
  })
  if (allNone.length > 5) {
    nudges.push({
      id: 'all-none-check',
      severity: 'info',
      title: `${allNone.length} items show no allergens — worth a check`,
      detail: `It's unusual for many dishes to contain zero allergens. Please verify this data is correct.`,
      href: '/admin/menu-builder',
    })
  }

  // Rule 4: Items with no linked ingredients
  const noIngredients = items.filter(
    (item) => !item.ingredients || item.ingredients.length === 0
  )
  if (noIngredients.length > 0) {
    nudges.push({
      id: 'no-ingredients',
      severity: 'info',
      title: `${noIngredients.length} item${noIngredients.length > 1 ? 's' : ''} have no linked ingredients`,
      detail: `Linking ingredients lets you auto-compute allergens from your ingredient library. "${noIngredients.slice(0, 2).map((i) => i.name).join('", "')}"${noIngredients.length > 2 ? ` +${noIngredients.length - 2} more` : ''}.`,
      href: '/admin/ingredients',
    })
  }

  return nudges
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JenCoach() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('nudges')
  const [nudges, setNudges] = useState<Nudge[]>([])
  const [loading, setLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Ask-Jen chat state
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'jen'; text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/menu-items')
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      const items: MenuItem[] = Array.isArray(data) ? data : (data.items ?? [])
      setNudges(runRules(items))
      setLastRefreshed(new Date())
    } catch {
      // silently fail — nudges just won't update
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5 * 60 * 1000) // re-check every 5 min
    return () => clearInterval(interval)
  }, [refresh])

  async function askJen(text: string) {
    const trimmed = text.trim()
    if (!trimmed || chatLoading) return

    setChatMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch('/api/ally-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          menuItems: [],
          businessName: 'EU Food Safety (Regulation 1169/2011)',
          // Overriding with a compliance-focused context
          _jenMode: true,
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

  const warnings = nudges.filter((n) => n.severity === 'warning')

  return (
    <div className="fixed bottom-20 right-6 z-40 flex flex-col items-end gap-2">
      {/* Jen panel */}
      {open && (
        <div
          className="w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(540px, calc(100vh - 160px))' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#003842] text-white">
            <JenAvatar size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Jen</p>
              <p className="text-xs text-teal-300 leading-tight">Compliance Coach</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close Jen"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setTab('nudges')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                tab === 'nudges'
                  ? 'text-[#003842] border-b-2 border-[#42b8ac]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Compliance Check
              {nudges.length > 0 && (
                <span
                  className={`ml-1.5 inline-flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                    warnings.length > 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {nudges.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('ask')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                tab === 'ask'
                  ? 'text-[#003842] border-b-2 border-[#42b8ac]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <MessageSquare size={12} className="inline mr-1" />
              Ask Jen
            </button>
          </div>

          {/* Nudges tab */}
          {tab === 'nudges' && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-[11px] text-gray-400">
                  {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : 'Checking…'}
                </p>
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Refresh checks"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              {loading && nudges.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                  Checking your menu data…
                </div>
              ) : nudges.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <span className="text-2xl">✅</span>
                  <p className="text-sm font-medium text-gray-700">Everything looks good!</p>
                  <p className="text-xs text-gray-400 text-center px-6">
                    No compliance issues detected. Keep it up!
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {nudges.map((nudge) => (
                    <div
                      key={nudge.id}
                      className={`rounded-xl p-3 border ${
                        nudge.severity === 'warning'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm mt-0.5">{nudge.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-semibold leading-tight ${
                              nudge.severity === 'warning' ? 'text-red-700' : 'text-amber-700'
                            }`}
                          >
                            {nudge.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{nudge.detail}</p>
                          {nudge.href && (
                            <a
                              href={nudge.href}
                              className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-[#42b8ac] hover:underline"
                            >
                              Fix now <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ask Jen tab */}
          {tab === 'ask' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {chatMessages.length === 0 && (
                  <div className="flex gap-2">
                    <JenAvatar size={28} className="mt-0.5 shrink-0" />
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-700 shadow-sm border border-gray-100">
                      Hi, I&apos;m Jen 👓 I can answer questions about EU food labelling law,
                      allergen declaration requirements, and FSAI compliance. What would you like to know?
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
                  placeholder="Ask about EU labelling law…"
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
                Jen uses AI. Always verify critical compliance decisions with a qualified advisor.
              </p>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full shadow-xl border-2 border-white hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-teal-400"
        aria-label={open ? 'Close Jen' : 'Open Jen compliance coach'}
        title="Jen — Compliance Coach"
      >
        {open ? (
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-[#003842]">
            <X size={22} className="text-white" />
          </span>
        ) : (
          <JenAvatar size={56} badge={nudges.length} />
        )}
      </button>
    </div>
  )
}
