'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle,
  Shield,
  Zap,
  Globe,
  Clock,
  Users,
  Send,
  Menu,
} from 'lucide-react'
import { Container } from '@/components/layout/Container'

const DEMO_BENEFITS = [
  { icon: Clock, text: '30-minute personalised walkthrough' },
  { icon: Shield, text: 'See live allergen tracking in action' },
  { icon: Zap, text: 'We answer all your compliance questions' },
  { icon: Users, text: 'Learn how to set up your whole team in minutes' },
  { icon: Globe, text: 'See the multilingual customer kiosk live' },
  { icon: CheckCircle, text: 'Get a free setup plan for your business' },
]

const TEAM_SIZE_OPTIONS = [
  '1 location',
  '2–5 locations',
  '6–20 locations',
  '20+ locations',
]

export default function BookDemoPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    teamSize: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/book-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Failed to submit. Please try emailing us directly at hello@allyjen.ie')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-atkinson), sans-serif' }}>

      {/* Header */}
      <header className="bg-[#003842] border-b border-[#003842]">
        <Container>
          <div className="flex items-center justify-between py-4">
            <Link href="/">
              <img
                src="/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg"
                alt="AllyJen Logo"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <Link href="/auth/signin">
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-[#003842] font-semibold text-sm hover:bg-[#42b8ac] hover:text-white transition-colors">
                Sign In <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </Container>
      </header>

      {/* Hero */}
      <section className="bg-[#003842] py-16">
        <Container>
          <div className="max-w-3xl">
            <span className="inline-block mb-3 text-[#42b8ac] text-xs font-bold uppercase tracking-widest">Free Demo</span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
              See AllyJen in action: <span className="text-[#42b8ac]">live, for your business.</span>
            </h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Book a free 30-minute demo and see exactly how AllyJen makes allergen compliance fast, simple, and stress-free for Irish food businesses.
            </p>
          </div>
        </Container>
      </section>

      {/* Main content */}
      <section className="py-16 bg-[#f0f9f8]">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 max-w-6xl mx-auto">

            {/* Left — what you get */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-[#003842] mb-6">What's included in the demo</h2>
              <ul className="space-y-4">
                {DEMO_BENEFITS.map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#42b8ac]/15 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-[#42b8ac]" />
                    </div>
                    <span className="text-gray-700 text-sm leading-relaxed mt-1.5">{text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 p-5 rounded-xl bg-[#003842] text-white">
                <p className="font-semibold mb-1">Already using AllyJen?</p>
                <p className="text-sm text-white/70 mb-3">Sign in to your dashboard to manage your account.</p>
                <Link href="/auth/signin">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-[#42b8ac] hover:underline">
                    Go to Sign In <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Right — form */}
            <div className="lg:col-span-3">
              <div className="bg-[#003842] rounded-2xl shadow-xl p-8">
                {submitted ? (
                  <div className="text-center py-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#42b8ac]/20 mb-4">
                      <CheckCircle className="h-8 w-8 text-[#42b8ac]" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Request received!</h3>
                    <p className="text-white/70 mb-6 max-w-sm mx-auto">
                      Thanks, {form.name.split(' ')[0]}! We'll be in touch within one business day to confirm your demo time.
                    </p>
                    <Link href="/">
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#42b8ac] text-white font-semibold text-sm hover:bg-[#3aa89e] transition-colors">
                        Back to Home <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h3 className="text-xl font-bold text-white mb-2">Book your free demo</h3>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 text-sm">
                        {error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-1.5">Full Name *</label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          required
                          placeholder="Aoife Murphy"
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1.5">Work Email *</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          required
                          placeholder="aoife@restaurant.ie"
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="company" className="block text-sm font-medium text-white/80 mb-1.5">Business Name *</label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          value={form.company}
                          onChange={handleChange}
                          required
                          placeholder="Joe's Café"
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-white/80 mb-1.5">Phone <span className="text-white/40 font-normal">(optional)</span></label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="+353 87 123 4567"
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="teamSize" className="block text-sm font-medium text-white/80 mb-1.5">Number of Locations</label>
                      <select
                        id="teamSize"
                        name="teamSize"
                        value={form.teamSize}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm appearance-none"
                      >
                        <option value="" className="bg-[#003842]">Select…</option>
                        {TEAM_SIZE_OPTIONS.map(opt => (
                          <option key={opt} value={opt} className="bg-[#003842]">{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-white/80 mb-1.5">Anything else? <span className="text-white/40 font-normal">(optional)</span></label>
                      <textarea
                        id="message"
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Tell us a bit about your business or any specific questions you have…"
                        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#42b8ac] text-white font-semibold hover:bg-[#3aa89e] disabled:opacity-60 transition-colors text-sm"
                    >
                      {submitting ? 'Sending…' : (
                        <>
                          Book My Free Demo <Send className="h-4 w-4" />
                        </>
                      )}
                    </button>

                    <p className="text-center text-white/40 text-xs">
                      No commitment required. We'll reach out within one business day.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="bg-[#003842] border-t border-white/10 py-10">
        <Container>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img src="/Logo-AllyJen.svg" alt="AllyJen" className="h-24 w-auto" />
            <div className="flex flex-col items-center md:items-end gap-3">
              <a href="tel:+353896580997" className="text-sm font-medium text-white/70 transition-colors hover:text-[#42b8ac]">
                James: +353 89 658 0997
              </a>
              <a
                href="https://www.linkedin.com/company/allyjen/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="AllyJen on LinkedIn"
                className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 text-white/70 hover:bg-[#42b8ac] hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <p className="text-sm text-white/40">© 2026 AllyJen Solutions Limited.</p>
              <p className="text-xs text-white/30">CRO No. 811542 | Republic of Ireland</p>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  )
}
