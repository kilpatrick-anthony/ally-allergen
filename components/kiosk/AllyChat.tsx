'use client'

import { useState, useRef, useEffect } from 'react'
import { AllyAvatar } from '../ally/AllyAvatar'
import { X, Send, ChevronDown } from 'lucide-react'
import type { MenuItem } from '@/lib/hooks/useOfflineKioskData'

interface Message {
  role: 'user' | 'ally'
  text: string
}

const STARTERS = [
  "I'm allergic to nuts — what can I eat?",
  'What gluten-free options are available?',
  'Are there any dairy-free dishes?',
  'Which dishes are suitable for a vegan?',
]

interface AllyChatProps {
  menuItems: MenuItem[]
  businessName?: string
}

export function AllyChat({ menuItems, businessName = '' }: AllyChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ally-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, menuItems, businessName }),
      })
      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        { role: 'ally', text: data.reply ?? "I'm not sure — please ask a staff member." },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ally', text: 'Connection issue. Please ask a member of staff for allergen details.' },
      ])
    } finally {
      setLoading(false)
    }
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
            <AllyAvatar size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Ally</p>
              <p className="text-xs text-teal-300 leading-tight">Food Allergy Assistant</p>
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
                  <AllyAvatar size={28} className="mt-0.5 shrink-0" />
                  <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-700 shadow-sm border border-gray-100">
                    Hi! I&apos;m Ally 👋 I can help you find dishes that are safe for your dietary
                    needs. What can I help you with?
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">Suggested questions:</p>
                <div className="space-y-1.5">
                  {STARTERS.map((starter) => (
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
                {msg.role === 'ally' && <AllyAvatar size={28} className="mt-0.5 shrink-0" />}
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
                <AllyAvatar size={28} thinking className="mt-0.5 shrink-0" />
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
              placeholder="Ask about allergens…"
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
            Ally uses AI. Always confirm allergens with staff for medical dietary needs.
          </p>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full shadow-xl border-2 border-white hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-teal-400 w-14 h-14 sm:w-14 sm:h-14"
        aria-label={open ? 'Close Ally chat' : 'Open Ally chat'}
      >
        {open ? (
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-[#003842]">
            <X size={22} className="text-white" />
          </span>
        ) : (
          <AllyAvatar size={56} />
        )}
      </button>
    </div>
  )
}
