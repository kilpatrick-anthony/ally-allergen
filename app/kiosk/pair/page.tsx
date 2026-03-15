// app/kiosk/pair/page.tsx
// Full-screen pairing page for kiosk devices.
// Staff enter the ALLY-XXXX code shown in the admin portal and the kiosk
// automatically redirects to the correct allergen menu.
'use client'

import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Monitor, AlertCircle, CheckCircle } from 'lucide-react'

const CODE_LENGTH = 4 // chars after "ALLY-"

export default function KioskPairPage() {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const validChars = /^[A-Za-z2-9]$/

  const getFullCode = () => `ALLY-${digits.join('').toUpperCase()}`

  const submit = async () => {
    const code = getFullCode()
    if (digits.some(d => d === '')) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/devices/pair/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Invalid pairing code')
        setDigits(Array(CODE_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
        return
      }

      // Store a device marker so the kiosk can persist identity
      if (typeof window !== 'undefined') {
        localStorage.setItem('ally_paired_device_id', data.device_id)
        localStorage.setItem('ally_paired_device_name', data.device_name ?? '')
      }

      setStatus('success')

      // Brief success flash, then redirect
      setTimeout(() => {
        router.replace(
          `/kiosk/${data.business_slug}?site_id=${data.site_id}`
        )
      }, 1200)
    } catch {
      setStatus('error')
      setErrorMsg('Connection error — please try again')
    }
  }

  const handleChange = (index: number, value: string) => {
    if (!validChars.test(value) && value !== '') return
    const next = [...digits]
    next[index] = value.toUpperCase().slice(-1)
    setDigits(next)
    if (status === 'error') setStatus('idle')

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') {
      submit()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/[^A-Za-z2-9]/g, '').toUpperCase()
    const next = [...digits]
    text.split('').slice(0, CODE_LENGTH).forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    const focusIndex = Math.min(text.length, CODE_LENGTH - 1)
    inputRefs.current[focusIndex]?.focus()
    if (status === 'error') setStatus('idle')
  }

  const isComplete = digits.every(d => d !== '')

  return (
    <div className="min-h-screen bg-[#003842] flex flex-col items-center justify-center px-6">
      {/* Logo / branding */}
      <div className="flex items-center gap-3 mb-12">
        <div className="bg-[#42b8ac] p-3 rounded-xl">
          <Monitor className="h-8 w-8 text-white" />
        </div>
        <div>
          <p className="text-[#42b8ac] text-sm font-semibold uppercase tracking-widest">Ally</p>
          <p className="text-white text-2xl font-bold leading-none">Allergen Kiosk</p>
        </div>
      </div>

      {status === 'success' ? (
        <div className="flex flex-col items-center gap-4 text-center animate-pulse">
          <CheckCircle className="h-20 w-20 text-[#42b8ac]" />
          <p className="text-white text-2xl font-semibold">Paired! Opening kiosk…</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-[#003842]">Enter Pairing Code</h1>
            <p className="text-sm text-gray-500">
              Find the code in your admin portal under<br />
              <span className="font-medium text-[#003842]">Sites → Devices &amp; Kiosks → Add Device</span>
            </p>
          </div>

          {/* ALLY- prefix + digit boxes */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-mono font-bold text-gray-400 select-none">
              ALLY-
            </span>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="text"
                maxLength={1}
                value={d}
                autoFocus={i === 0}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className={`
                  w-12 h-14 text-center text-2xl font-mono font-bold rounded-lg border-2
                  focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-[#42b8ac]
                  transition-colors uppercase
                  ${d ? 'border-[#42b8ac] bg-[#f0faf9] text-[#003842]' : 'border-gray-300 bg-white text-[#003842]'}
                  ${status === 'error' ? 'border-red-400 bg-red-50' : ''}
                `}
              />
            ))}
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            onClick={submit}
            disabled={!isComplete || status === 'loading'}
            className={`
              w-full py-3 rounded-xl font-semibold text-white text-lg transition-all
              ${isComplete && status !== 'loading'
                ? 'bg-[#42b8ac] hover:bg-[#37a398] active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
          >
            {status === 'loading' ? 'Connecting…' : 'Connect Kiosk'}
          </button>

          <p className="text-center text-xs text-gray-400">
            Codes expire after 24 hours and can only be used once.
          </p>
        </div>
      )}
    </div>
  )
}
