'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  Briefcase,
  CheckCircle,
  Globe,
  Heart,
  MapPin,
  Menu,
  Rocket,
  Send,
  Shield,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { Container } from '@/components/layout/Container'

const WHY_ALLYJEN = [
  {
    icon: Rocket,
    title: 'Early-stage impact',
    desc: 'Join a small team where your work ships fast and shapes the product directly.',
  },
  {
    icon: Globe,
    title: 'Meaningful mission',
    desc: 'We help people with allergies eat safely. Every feature we build has real-world consequences.',
  },
  {
    icon: Heart,
    title: 'People first',
    desc: 'Flexible working, no unnecessary meetings, and a culture built on trust and autonomy.',
  },
  {
    icon: Zap,
    title: 'Modern stack',
    desc: 'Next.js, TypeScript, Supabase — we use the best tools and keep technical debt low.',
  },
  {
    icon: Shield,
    title: 'Compliance matters',
    desc: "We operate in a regulated space (EU FIC Regulation). You'll learn things that matter.",
  },
  {
    icon: Users,
    title: 'Grow with us',
    desc: 'As we scale across Ireland and Europe, the people who join early grow with us.',
  },
]

export default function CareersPage() {
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/careers/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Something went wrong. Please try again.')
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-atkinson), sans-serif" }}>

      {/* ── HEADER ── */}
      <header className="relative z-20 bg-[#003842] border-b border-[#003842]">
        <Container>
          <div className="flex items-center justify-between py-4 gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/">
                <img
                  src="/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg"
                  alt="AllyJen Logo"
                  className="h-10 w-auto object-contain"
                />
              </Link>
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link href="/" className="inline-flex items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm">Home</Link>
              <Link href="/#features" className="inline-flex items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm">Features</Link>
              <Link href="/#how-it-works" className="inline-flex items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm">How It Works</Link>
              <Link href="/#pricing" className="inline-flex items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm">Pricing</Link>
              <Link href="/#contact-form" className="inline-flex items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm">Contact</Link>
              <Link href="/about" className="inline-flex items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm">About</Link>
              <Link href="/careers" className="inline-flex items-center text-[#42b8ac] font-semibold text-sm">Careers</Link>
            </nav>

            {/* Mobile menu toggle */}
            <div className="lg:hidden flex-1 flex justify-center">
              <button
                type="button"
                aria-label={isNavOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setIsNavOpen(o => !o)}
                className="p-2 text-white hover:text-[#42b8ac] transition-colors"
              >
                {isNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* CTAs */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <Link href="/auth/signin">
                <span className="inline-flex items-center gap-2 px-3 lg:px-5 py-2 rounded-full bg-white text-[#003842] font-semibold text-sm hover:bg-[#42b8ac] hover:text-white transition-colors">
                  Sign In <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
        </Container>
      </header>

      {/* Mobile nav dropdown */}
      {isNavOpen && (
        <div className="lg:hidden bg-[#002d38] border-b border-white/10 z-10">
          <nav className="flex flex-col divide-y divide-white/10">
            {[
              { label: 'Home', href: '/' },
              { label: 'Features', href: '/#features' },
              { label: 'How It Works', href: '/#how-it-works' },
              { label: 'Pricing', href: '/#pricing' },
              { label: 'Contact', href: '/#contact-form' },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setIsNavOpen(false)}
                className="px-6 py-3 text-left text-white hover:text-[#42b8ac] hover:bg-white/5 transition-colors font-medium text-sm"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/about"
              onClick={() => setIsNavOpen(false)}
              className="px-6 py-3 text-left text-white hover:text-[#42b8ac] hover:bg-white/5 transition-colors font-medium text-sm"
            >
              About
            </Link>
            <Link
              href="/careers"
              onClick={() => setIsNavOpen(false)}
              className="px-6 py-3 text-left text-[#42b8ac] hover:bg-white/5 transition-colors font-semibold text-sm"
            >
              Careers
            </Link>
          </nav>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="relative bg-[#003842] overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-[#42b8ac]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-[#42b8ac]/10 blur-3xl pointer-events-none" />
        <Container>
          <div className="relative flex flex-col lg:flex-row items-center gap-12 py-12 lg:py-16">
            {/* Left – photo */}
            <div className="flex-1 w-full lg:max-w-none">
              <div className="rounded-2xl overflow-hidden shadow-2xl ring-4 ring-[#42b8ac]/30">
                <img
                  src="/food-safety-1.jpg"
                  alt="Food safety in action"
                  className="w-full h-auto block object-cover"
                />
              </div>
            </div>
            {/* Right – text */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-3xl md:text-4xl xl:text-5xl font-extrabold text-white leading-none mb-6 tracking-tight">
                Help us make food<br />
                <span className="text-[#42b8ac]">safer for everyone.</span>
              </h1>
              <p className="text-lg text-white/70 mb-0 max-w-xl mx-auto lg:mx-0">
                AllyJen is on a mission to make allergen compliance effortless for food businesses across Ireland and Europe.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── OPEN ROLES ── */}
      <section className="py-16 bg-gray-50">
        <Container>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-[#003842] mb-3">Open Positions</h2>
            <p className="text-gray-500 text-lg">Roles we're actively hiring for right now.</p>
          </div>

          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#42b8ac]/10 flex items-center justify-center mx-auto mb-5">
              <Briefcase className="h-8 w-8 text-[#42b8ac]" />
            </div>
            <h3 className="text-xl font-semibold text-[#003842] mb-3">No open roles right now</h3>
            <p className="text-gray-500 text-base leading-relaxed mb-6">
              We don't have any positions available at the moment, but we're growing and that will change soon.
              Sign up below and we'll email you the moment something opens up.
            </p>
            <a
              href="#alert-signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#003842] text-white font-semibold text-sm hover:bg-[#004d5c] transition-colors"
            >
              <Bell className="h-4 w-4" />
              Get job alerts
            </a>
          </div>
        </Container>
      </section>

      {/* ── WHY ALLYJEN ── */}
      <section className="py-16 bg-[#003842]">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Why join AllyJen?</h2>
            <p className="text-white/70 text-lg max-w-xl mx-auto">
              We're building something that matters — and we want people who care about doing it well.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_ALLYJEN.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#42b8ac]/50 hover:bg-white/10 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#42b8ac]/20 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-[#42b8ac]" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── ALERT SIGN-UP ── */}
      <section id="alert-signup" className="py-16 bg-gray-50">
        <Container>
          <div className="max-w-xl mx-auto">
            {submitted ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#42b8ac]/10 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="h-8 w-8 text-[#42b8ac]" />
                </div>
                <h2 className="text-2xl font-bold text-[#003842] mb-3">You're on the list!</h2>
                <p className="text-gray-500 text-base leading-relaxed mb-6">
                  We'll reach out as soon as a relevant position opens up. Thanks for your interest in AllyJen.
                </p>
                <Link href="/" className="inline-flex items-center gap-2 text-[#42b8ac] hover:text-[#003842] transition-colors font-medium text-sm">
                  ← Back to home
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-[#003842] mb-3">Get job alerts</h2>
                  <p className="text-gray-500 text-base">
                    Leave your details and we'll notify you when a position opens up that might suit you.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name *</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="e.g. Aoife Murphy"
                        className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address *</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="e.g. aoife@example.ie"
                        className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Area of interest</label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] text-sm appearance-none"
                    >
                      <option value="">— Select an area —</option>
                      <option value="Engineering">Engineering (Frontend / Fullstack)</option>
                      <option value="Design">Design / UX</option>
                      <option value="Sales & Marketing">Sales &amp; Marketing</option>
                      <option value="Customer Success">Customer Success</option>
                      <option value="Operations">Operations</option>
                      <option value="Other">Other / Open to anything</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Anything else? <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={3}
                      placeholder="e.g. I've been working in food tech for a few years and I'm based in Dublin…"
                      className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] text-sm resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-red-600 text-sm">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-[#003842] text-white font-semibold text-base hover:bg-[#004d5c] transition-colors disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Notify me
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </Container>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#003842] border-t border-white/10 py-10">
        <Container>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img src="/Logo-AllyJen.svg" alt="AllyJen" className="h-24 w-auto" />
            <div className="flex flex-col items-center md:items-end gap-2">
              <p className="text-sm text-white/40">© 2026 AllyJen Solutions Limited.</p>
              <p className="text-xs text-white/30">CRO No. 811542 | Republic of Ireland</p>
            </div>
          </div>
        </Container>
      </footer>

    </div>
  )
}
