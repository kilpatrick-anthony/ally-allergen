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

      {/* Social proof / trust strip */}
      <section className="py-12 bg-white border-t border-gray-100">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            {[
              { headline: 'EU & FSAI Compliant', body: 'Built specifically for Irish and EU food regulations from day one.' },
              { headline: 'Live in 48 Hours', body: 'Our team handles setup. Most customers go live in under two days.' },
              { headline: '12-Month Agreement', body: 'All plans are on a 12-month minimum term. Transparent pricing, no hidden fees.' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <CheckCircle className="h-8 w-8 text-[#42b8ac] mb-3" />
                <h3 className="font-bold text-[#003842] mb-1">{item.headline}</h3>
                <p className="text-gray-500 text-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="bg-[#003842] py-8">
        <Container>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <img
              src="/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg"
              alt="AllyJen"
              className="h-8 w-auto opacity-80"
            />
            <p className="text-white/40 text-xs text-center sm:text-right">
              © {new Date().getFullYear()} AllyJen. All rights reserved.{' '}
              <Link href="/" className="text-white/60 hover:text-[#42b8ac] transition-colors">Home</Link>
              {' · '}
              <Link href="/auth/signin" className="text-white/60 hover:text-[#42b8ac] transition-colors">Sign In</Link>
            </p>
          </div>
        </Container>
      </footer>
    </div>
  )
}
