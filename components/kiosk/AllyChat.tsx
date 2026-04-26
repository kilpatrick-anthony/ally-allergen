'use client'

import { useState, useRef, useEffect } from 'react'
import { AllyAvatar } from '../ally/AllyAvatar'
import { JenAvatar } from '../ally/JenAvatar'
import { X, Send, ChevronDown } from 'lucide-react'
import type { MenuItem } from '@/lib/hooks/useOfflineKioskData'

interface Message {
  role: 'user' | 'ally' | 'jen'
  text: string
}

type CoachMode = 'ally' | 'jen'

const STARTERS = [
  "I'm allergic to nuts — what can I eat?",
  'What gluten-free options are available?',
  'Are there any dairy-free dishes?',
  'Which dishes are suitable for a vegan?',
]

const JEN_STARTERS = [
  'What should I ask staff about severe allergies?',
  'How does AllyJen handle allergen information?',
  'What does cross-contamination mean here?',
  'What is the safest way to double-check my order?',
]

const COACH_SEQUENCE: CoachMode[] = ['ally', 'jen']

interface AllyChatProps {
  menuItems: MenuItem[]
  businessName?: string
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
    return "Done! Switched to Atkinson Hyperlegible — a font designed for accessibility and easier reading. You can change this anytime in the Accessibility panel."
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

export function AllyChat({ menuItems, businessName = '' }: AllyChatProps) {
  const [open, setOpen] = useState(false)
  const [activeCoach, setActiveCoach] = useState<CoachMode>('ally')
  const [messagesByCoach, setMessagesByCoach] = useState<Record<CoachMode, Message[]>>({ ally: [], jen: [] })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [rotationIndex, setRotationIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const messages = messagesByCoach[activeCoach]
  const coachName = activeCoach === 'ally' ? 'Ally' : 'Jen'
  const closedCoach = COACH_SEQUENCE[rotationIndex % COACH_SEQUENCE.length]
  const closedLabel = closedCoach === 'ally' ? 'Ask Ally' : 'Ask Jen'

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) return

    const interval = window.setInterval(() => {
      setRotationIndex((prev) => (prev + 1) % COACH_SEQUENCE.length)
    }, 3500)

    return () => window.clearInterval(interval)
  }, [open])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setMessagesByCoach((prev) => ({
      ...prev,
      [activeCoach]: [...prev[activeCoach], { role: 'user', text: trimmed }],
    }))
    setInput('')

    const fontReply = handleFontRequest(trimmed)
    if (fontReply) {
      setMessagesByCoach((prev) => ({
        ...prev,
        [activeCoach]: [...prev[activeCoach], { role: activeCoach, text: fontReply }],
      }))
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/ally-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          activeCoach === 'ally'
            ? { message: trimmed, menuItems, businessName }
            : {
                message: trimmed,
                menuItems: [],
                businessName: 'EU Food Safety (Regulation 1169/2011)',
                _jenMode: true,
              }
        ),
      })
      const data = await res.json()
      setMessagesByCoach((prev) => ({
        ...prev,
        [activeCoach]: [
          ...prev[activeCoach],
          {
            role: activeCoach,
            text:
              data.reply ??
              (activeCoach === 'ally'
                ? "I'm not sure — please ask a staff member."
                : 'I’m not certain — please confirm with a member of staff or a manager.'),
          },
        ],
      }))
    } catch {
      setMessagesByCoach((prev) => ({
        ...prev,
        [activeCoach]: [
          ...prev[activeCoach],
          {
            role: activeCoach,
            text:
              activeCoach === 'ally'
                ? 'Connection issue. Please ask a member of staff for allergen details.'
                : 'Connection issue. Please verify anything important with staff before ordering.',
          },
        ],
      }))
    } finally {
      setLoading(false)
    }
  }

  const starterQuestions = activeCoach === 'ally' ? STARTERS : JEN_STARTERS

  const renderCoachAvatar = (mode: CoachMode, size: number, className = '', thinking = false) => {
    if (mode === 'ally') {
      return <AllyAvatar size={size} className={className} thinking={thinking} />
    }

    return <JenAvatar size={size} className={className} />
  }

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-2">
      {/* Chat panel */}
      {open && (
        <div
          className="w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-teal-100 flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(520px, calc(100vh - 120px))' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#003842] text-white">
            {renderCoachAvatar(activeCoach, 36)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{coachName}</p>
              <p className="text-xs text-teal-300 leading-tight">
                {activeCoach === 'ally' ? 'Food Allergy Assistant' : 'Safety Guidance Assistant'}
              </p>
            </div>
            <div className="flex items-center rounded-full bg-white/10 p-1 mr-1">
              {COACH_SEQUENCE.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveCoach(mode)}
                  className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-full transition-colors ${
                    activeCoach === mode ? 'bg-white text-[#003842]' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {mode === 'ally' ? 'Ally' : 'Jen'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close chat"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {renderCoachAvatar(activeCoach, 28, 'mt-0.5 shrink-0')}
                  <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-700 shadow-sm border border-gray-100">
                    {activeCoach === 'ally'
                      ? 'Hi! I\'m Ally 👋 I can help you find dishes that are safe for your dietary needs. What can I help you with?'
                      : 'Hi! I\'m Jen 👋 I can help with allergy safety guidance and what to double-check with staff before ordering.'}
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">Suggested questions:</p>
                <div className="space-y-1.5">
                  {starterQuestions.map((starter) => (
                    <button
                      key={starter}
                      onClick={() => send(starter)}
                      className="w-full text-left text-xs px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 transition-colors"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.role !== 'user' && renderCoachAvatar(msg.role, 28, 'mt-0.5 shrink-0')}
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

            {loading && (
              <div className="flex gap-2">
                {renderCoachAvatar(activeCoach, 28, 'mt-0.5 shrink-0', activeCoach === 'ally')}
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
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-white"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeCoach === 'ally' ? 'Ask about allergens…' : 'Ask about allergy safety…'}
              className="flex-1 text-sm bg-gray-50 rounded-full px-3 py-1.5 outline-none focus:ring-2 focus:ring-teal-300 border border-gray-200"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-full bg-[#42b8ac] text-white hover:bg-[#37a99e] disabled:opacity-40 transition-colors"
              aria-label="Send"
            >
              <Send size={14} />
            </button>
          </form>

          {/* Disclaimer */}
          <p className="text-[10px] text-gray-400 text-center px-3 pb-2 leading-tight">
            {activeCoach === 'ally'
              ? 'Ally uses AI. Always confirm allergens with staff for medical dietary needs.'
              : 'Jen uses AI. Guidance may be incomplete. Please verify anything important with staff.'}
          </p>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => {
          if (!open) {
            setActiveCoach(closedCoach)
          }
          setOpen((o) => !o)
        }}
        className="relative flex items-center gap-0 rounded-full shadow-2xl hover:shadow-teal-400/30 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 overflow-visible h-[56px] sm:h-[62px]"
        style={{
          background: open
            ? 'linear-gradient(135deg, #003842 0%, #005a6e 100%)'
            : 'linear-gradient(135deg, #003842 0%, #00616e 60%, #42b8ac 100%)',
          paddingRight: open ? '0' : '18px',
        }}
        aria-label={open ? `Close ${coachName} chat` : `Open ${closedLabel}`}
      >
        {open ? (
          <>
            <span className="relative shrink-0 -ml-1 -my-2 sm:-my-3">
              {renderCoachAvatar(activeCoach, 56, 'rounded-full block ring-2 ring-white/40 sm:w-[78px] sm:h-[78px] w-[56px] h-[56px]')}
            </span>
            <span className="flex items-center justify-center w-10 h-10 ml-1 mr-1">
              <X size={20} className="text-white" />
            </span>
          </>
        ) : (
          <>
            <span className="relative shrink-0 -ml-1 -my-2 sm:-my-3">
              {renderCoachAvatar(closedCoach, 56, 'rounded-full block ring-2 ring-white/40 sm:w-[78px] sm:h-[78px] w-[56px] h-[56px]')}
            </span>
            <span className="block ml-2 pr-1 text-[12px] sm:text-[15px] font-bold text-white tracking-wide min-w-[70px] sm:min-w-[88px] text-left leading-none">
              {closedLabel}
            </span>
          </>
        )}
      </button>
    </div>
  )
}
