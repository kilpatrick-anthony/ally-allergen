// app/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import {
  Shield,
  Zap,
  Globe,
  CheckCircle,
  ArrowRight,
  Building,
  BarChart,
  Mail,
  Send,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react'

export default function LandingPage() {
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      })
      if (response.ok) {
        setSubmitted(true)
        setContactForm({ name: '', email: '', company: '', phone: '', message: '' })
      } else {
        alert('Failed to send message. Please try again.')
      }
    } catch {
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContactForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const features = [
    {
      IconComponent: Shield,
      title: 'Sub-Allergen Detail Tracking',
      desc: 'Go beyond the 14 major allergens. Track sub-types like specific tree nuts or cereal varieties for greater precision and customer confidence.',
    },
    {
      IconComponent: Globe,
      title: 'Multilingual Allergen Displays',
      desc: 'Serve a diverse customer base with allergen information displayed in multiple languages, right out of the box.',
    },
    {
      IconComponent: Zap,
      title: 'Real-Time Menu Updates',
      desc: 'Change an ingredient and every linked menu item and kiosk updates instantly. Save precious time and printing costs.',
    },
    {
      IconComponent: Building,
      title: 'Multi-Site Management',
      desc: 'Manage allergen data across all your locations from a single, centralised dashboard.',
    },
    {
      IconComponent: CheckCircle,
      title: 'Customer-Facing Kiosks & QR Codes',
      desc: 'Deploy interactive kiosks or let customers scan a QR code to view live allergen information for any dish, straight from their phone.',
    },
    {
      IconComponent: BarChart,
      title: 'Analytics & Reporting',
      desc: 'Understand customer allergen queries and demonstrate compliance with detailed reports.',
    },
  ]

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-atkinson), sans-serif" }}>

      {/* Header */}
      <header className="relative z-20 bg-[#003842] border-b border-[#003842]">
        <Container>
          <div className="flex items-center justify-between py-4 gap-4">
            {/* Logo - left */}
            <div className="flex-shrink-0">
              <img
                src="/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg"
                alt="AllyJen Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            
            {/* Navigation - left-aligned after logo (hidden on mobile) */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link href="/" className="inline-flex items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm">Home</Link>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm"
              >
                Features
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm"
              >
                How It Works
              </button>
              <button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm"
              >
                Pricing
              </button>
              <button
                onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm"
              >
                Contact
              </button>
              <Link href="/careers" className="inline-flex items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm">
                Careers
              </Link>
            </nav>
            
            {/* Mobile menu toggle */}
            <div className="lg:hidden flex-1 flex justify-center">
              <button
                type="button"
                aria-label={isNavOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setIsNavOpen((o) => !o)}
                className="p-2 text-white hover:text-[#42b8ac] transition-colors"
              >
                {isNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
            
            {/* CTAs - right */}
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
            <Link
              href="/"
              onClick={() => setIsNavOpen(false)}
              className="px-6 py-3 text-left text-white hover:text-[#42b8ac] hover:bg-white/5 transition-colors font-medium text-sm"
            >
              Home
            </Link>
            {[
              { label: 'Features', id: 'features' },
              { label: 'How It Works', id: 'how-it-works' },
              { label: 'Pricing', id: 'pricing' },
              { label: 'Contact', id: 'contact-form' },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => {
                  setIsNavOpen(false)
                  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="px-6 py-3 text-left text-white hover:text-[#42b8ac] hover:bg-white/5 transition-colors font-medium text-sm"
              >
                {label}
              </button>
            ))}
            <Link
              href="/careers"
              onClick={() => setIsNavOpen(false)}
              className="px-6 py-3 text-left text-white hover:text-[#42b8ac] hover:bg-white/5 transition-colors font-medium text-sm"
            >
              Careers
            </Link>
          </nav>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="relative bg-[#003842] overflow-hidden">
        {/* decorative teal blob */}
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-[#42b8ac]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-[#42b8ac]/10 blur-3xl pointer-events-none" />

        <Container>
          <div className="relative flex flex-col lg:flex-row items-center gap-12 py-12 lg:py-16">
            {/* Left – photo */}
            <div className="flex-1 w-full lg:max-w-none">
              <div className="rounded-2xl overflow-hidden shadow-2xl ring-4 ring-[#42b8ac]/30">
                <img
                  src="/Home%20Image.svg"
                  alt="AllyJen allergen management platform"
                  fetchPriority="high"
                  className="w-full h-auto block"
                />
              </div>
            </div>

            {/* Right – text */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-3xl md:text-4xl xl:text-5xl font-extrabold text-white leading-none mb-6 tracking-tight">
                Serve every customer with <span className="text-[#42b8ac]">complete</span><br />
                <span className="text-[#42b8ac]">peace of mind.</span>
              </h1>
              <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto lg:mx-0">
                The all-in-one platform for Irish &amp; EU food businesses to track allergens, inform customers, and stay compliant.
              </p>

            </div>
          </div>
        </Container>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="bg-[#f0f9f8] border-y border-[#42b8ac]/20 py-5">
        <Container>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm text-[#003842] font-medium">
            <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#42b8ac]" />EU Regulation 1169/2011 compliant</span>
            <span className="hidden sm:inline text-[#42b8ac]/40">|</span>
            <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#42b8ac]" />FSAI-aligned allergen workflows</span>
            <span className="hidden sm:inline text-[#42b8ac]/40">|</span>
            <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#42b8ac]" />Irish-owned</span>
            <span className="hidden sm:inline text-[#42b8ac]/40">|</span>
            <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#42b8ac]" />12-month minimum agreement</span>
          </div>
        </Container>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-white">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#003842] mb-3">
              Save Time. Reduce Risk. Build Trust.
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Purpose-built for Irish and EU food service businesses from day one.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="group p-7 rounded-2xl border border-gray-100 bg-white hover:bg-[#003842] hover:border-[#003842] transition-all duration-300 shadow-sm hover:shadow-xl"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#42b8ac]/10 group-hover:bg-[#42b8ac]/20 mb-5 transition-colors">
                  {React.createElement(f.IconComponent, { className: 'h-6 w-6 text-[#42b8ac]' })}
                </div>
                <h3 className="text-lg font-bold text-[#003842] group-hover:text-white mb-2 transition-colors">{f.title}</h3>
                <p className="text-gray-500 group-hover:text-white/70 text-sm leading-relaxed transition-colors">{f.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 bg-[#003842]">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">How It Works</h2>
            <p className="text-lg text-white/60 max-w-xl mx-auto">
              We handle the heavy lifting so you can focus on your business.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Get in Touch', desc: 'Fill out the contact form below and tell us about your business. We\'ll respond within one business day.' },
              { step: '02', title: 'We Get You Running', desc: 'Our team configures your allergen system, installs your kiosk, and gets you set up on the platform. Menu management support is included for those on the Fully Managed plan.' },
              { step: '03', title: 'Go Live with Confidence', desc: 'Launch your AllyJen dashboard, start managing allergens, and give your customers the transparency they deserve.' },
            ].map((s, i) => (
              <div key={i} className="relative pl-6 border-l-2 border-[#42b8ac]">
                <span className="block text-[#42b8ac] text-xs font-bold uppercase tracking-widest mb-2">{s.step}</span>
                <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 bg-white">
        <Container>
          <div className="text-center mb-14">
            <span className="inline-block mb-3 text-[#42b8ac] text-xs font-bold uppercase tracking-widest">Simple, Transparent Pricing</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#003842] mb-3">Everything You Need, Nothing You Don&apos;t</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              One-time setup per location, then a simple monthly subscription. All plans are on a minimum 12-month agreement. Clear, transparent pricing from day one.
            </p>
          </div>

          {/* ── ONE-TIME SETUP FEE BANNER ── */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="relative rounded-2xl bg-[#003842] text-white p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl overflow-hidden">
              {/* subtle decorative ring */}
              <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[#42b8ac]/10 pointer-events-none" />
              <div className="absolute -right-4 -bottom-10 w-32 h-32 rounded-full bg-[#42b8ac]/10 pointer-events-none" />
              <div className="relative z-10">
                <p className="text-[#42b8ac] text-xs font-bold uppercase tracking-widest mb-1">One-Time Setup Fee</p>
                <h3 className="text-2xl font-extrabold mb-2">Device Installation &amp; Training</h3>
                <ul className="space-y-1 text-sm text-white/80">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#42b8ac] flex-shrink-0" /> On-site kiosk device installation</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#42b8ac] flex-shrink-0" /> Staff training &amp; hands-on walkthrough</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#42b8ac] flex-shrink-0" /> Platform onboarding &amp; initial configuration</li>
                </ul>
              </div>
              <div className="relative z-10 text-center sm:text-right flex-shrink-0">
                <div className="text-5xl font-extrabold text-white">€499</div>
                <div className="text-white/60 text-sm mt-1">per location, once</div>
              </div>
            </div>
          </div>

          {/* ── SUBSCRIPTION PLANS ── */}
          <div className="text-center mb-8">
            <p className="text-[#003842] font-semibold text-sm uppercase tracking-widest">Then choose your monthly plan</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'Self-Managed',
                price: '€19.99',
                priceSuffix: '/month per location',
                badge: null,
                desc: 'Full access to the AllyJen platform. You keep your menu up to date; we power the technology.',
                features: [
                  'Full AllyJen platform access',
                  'Customer-facing allergen kiosk &amp; QR code',
                  'All 14 EU-mandated allergens tracked',
                  'Sub-allergen detail tracking',
                  'Multilingual allergen display',
                  'Real-time menu updates (self-managed)',
                  'Unlimited menu items',
                  'Audit-ready compliance reports',
                  'Analytics &amp; usage dashboard',
                  'Email support',
                ],
                cta: 'Get Started',
                highlight: false,
              },
              {
                name: 'Fully Managed',
                price: '€39.99',
                priceSuffix: '/month per location',
                badge: 'Most Popular',
                desc: 'Everything in Self-Managed, plus our team handles your menu and platform management for you.',
                features: [
                  'Everything in Self-Managed',
                  'Menu management by our team',
                  'Regular menu &amp; ingredient updates on your behalf',
                  'Content accuracy guaranteed',
                  'Dedicated account manager',
                  'Priority email support',
                  'Proactive compliance monitoring',
                  'Seasonal menu change assistance',
                ],
                cta: 'Get Started',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Contact Us',
                priceSuffix: '',
                badge: null,
                desc: 'For large chains and multi-site groups. Tailored pricing, dedicated support, and a rollout plan built around your business.',
                features: [
                  'Everything in Fully Managed',
                  'Unlimited locations',
                  'Volume pricing for large chains',
                  'Dedicated account team',
                  'Custom onboarding &amp; rollout plan',
                  'SLA-backed support agreement',
                  'Flexible contract terms',
                ],
                cta: 'Contact Us',
                highlight: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`relative flex flex-col rounded-2xl border-2 p-7 ${
                  plan.highlight
                    ? 'border-[#42b8ac] shadow-xl shadow-[#42b8ac]/10'
                    : 'border-gray-100 shadow-sm'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-block px-3 py-1 bg-[#42b8ac] text-white text-xs font-bold rounded-full uppercase tracking-wide">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-sm font-bold text-[#42b8ac] uppercase tracking-widest mb-1">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-3 flex-wrap">
                    <span className="text-4xl font-extrabold text-[#003842]">{plan.price}</span>
                    {plan.priceSuffix && <span className="text-gray-400 text-sm mb-1">{plan.priceSuffix}</span>}
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{plan.desc}</p>
                </div>
                <ul className="space-y-2.5 flex-1 mb-7">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <CheckCircle className={`h-4 w-4 flex-shrink-0 ${plan.highlight && j === 0 ? 'text-[#003842]' : 'text-[#42b8ac]'}`} />
                      <span dangerouslySetInnerHTML={{ __html: f }} />
                    </li>
                  ))}
                </ul>
                {plan.cta === 'Contact Us' ? (
                  <button
                    type="button"
                    onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                    className="block w-full py-3 rounded-full text-center font-semibold text-sm transition-colors border-2 border-[#003842] text-[#003842] hover:bg-[#003842] hover:text-white"
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <Link href="/book-demo">
                    <span className={`block w-full py-3 rounded-full text-center font-semibold text-sm transition-colors ${
                      plan.highlight
                        ? 'bg-[#42b8ac] text-white hover:bg-[#3aa89e]'
                        : 'bg-[#003842] text-white hover:bg-[#004d5e]'
                    }`}>
                      {plan.cta}
                    </span>
                  </Link>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-10">
            The €499 setup fee covers device installation per location. Need an additional device at a location?{' '}
            <button
              type="button"
              onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[#42b8ac] hover:underline font-medium"
            >
              Contact us
            </button>
            {' '}to discuss options.{' '}Not sure which plan suits you?{' '}
            <button
              type="button"
              onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[#42b8ac] hover:underline font-medium"
            >
              Talk to us
            </button>
            {' '}and we&apos;ll help you get started.
          </p>
        </Container>
      </section>

      {/* ── FOOD SAFETY PHOTO STRIP ── */}
      <section className="py-16 bg-[#f0f9f8]">
        <Container>
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1">
              <span className="inline-block mb-3 text-[#42b8ac] text-xs font-bold uppercase tracking-widest">Why It Matters</span>
              <h2 className="text-3xl font-extrabold text-[#003842] mb-4">
                Compliance Without Complexity.
              </h2>
              <p className="text-gray-600 mb-5 leading-relaxed">
                Meeting allergen requirements doesn't have to be hard. AllyJen helps Irish &amp; EU food businesses protect customers, reduce risk, and build trust.
              </p>
              <ul className="space-y-3">
                {[
                  'Full EU Regulation (EU) No 1169/2011 compliance support',
                  'FSAI-aligned allergen labelling workflows',
                  'Plain-language customer-facing allergen displays',
                  'Audit-ready reports at the click of a button',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <CheckCircle className="h-5 w-5 text-[#42b8ac] flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 w-full max-w-lg">
              <div className="rounded-2xl overflow-hidden shadow-2xl ring-4 ring-[#42b8ac]/30">
                <img
                  src="/Home%20Image%202.svg"
                  alt="AllyJen: Food Safety Partner"
                  className="w-full h-auto block"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── CONTACT FORM ── */}
      <section id="contact-form" className="py-12 bg-white">
        <Container>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-block mb-3 text-[#42b8ac] text-xs font-bold uppercase tracking-widest">Get Started</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#003842] mb-3">Ready to Get Started?</h2>
              <p className="text-gray-500 text-lg max-w-xl mx-auto">
                Send us a message and we'll be in touch within one business day.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
              {/* Form */}
              <div className="lg:col-span-3 bg-[#003842] p-8 rounded-2xl shadow-xl">
                {submitted ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-[#42b8ac] mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">Message Received!</h3>
                    <p className="text-white/70">
                      Thanks for getting in touch. We'll get back to you within one business day.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-1.5">Full Name *</label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={contactForm.name}
                          onChange={handleContactChange}
                          required
                          placeholder="e.g. Aoife Murphy"
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1.5">Email Address *</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={contactForm.email}
                          onChange={handleContactChange}
                          required
                          placeholder="e.g. aoife@mybusiness.ie"
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
                          value={contactForm.company}
                          onChange={handleContactChange}
                          required
                          placeholder="e.g. The Café on Main Street"
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-white/80 mb-1.5">Phone Number</label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={contactForm.phone}
                          onChange={handleContactChange}
                          placeholder="e.g. +353 1 234 5678"
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-white/80 mb-1.5">Tell us about your needs</label>
                      <textarea
                        id="message"
                        name="message"
                        value={contactForm.message}
                        onChange={handleContactChange}
                        rows={4}
                        placeholder="Tell us about your business, the number of locations, and what you're hoping to achieve with AllyJen..."
                        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#42b8ac] text-[#003842] font-bold rounded-lg hover:bg-white transition-colors disabled:opacity-60 text-base"
                    >
                      {isSubmitting ? 'Sending…' : 'Send Message'}
                      <Send className="h-5 w-5" />
                    </button>
                  </form>
                )}
              </div>

              {/* Side info */}
              <div className="lg:col-span-2 flex flex-col justify-between gap-8">
                <div>
                  <h3 className="text-xl font-bold text-[#003842] mb-5">Why Choose AllyJen?</h3>
                  <div className="space-y-4">
                    {[
                      { title: 'Expert-Guided Setup', body: 'Our team handles the initial configuration.' },
                      { title: 'Ongoing Support', body: 'We\'re always on hand with dedicated support and regular platform updates.' },
                      { title: 'FSAI Compliance Ready', body: 'Built fully in line with Irish and EU food safety regulations.' },
                      { title: 'No Technical Skills Needed', body: 'An intuitive platform designed for busy food businesses, not IT professionals.' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-[#42b8ac] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[#003842] text-sm">{item.title}</p>
                          <p className="text-gray-500 text-sm">{item.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#003842] rounded-2xl p-6 text-white">
                  <h4 className="font-bold text-[#42b8ac] mb-1">Get in touch directly</h4>
                  <p className="text-white/60 text-sm mb-3">We're based in Ireland and reply within one business day.</p>
                  <a href="mailto:info@allyjen.ie" className="inline-flex items-center gap-2 text-sm text-white hover:text-[#42b8ac] transition-colors">
                    <Mail className="h-4 w-4 text-[#42b8ac] flex-shrink-0" />
                    info@allyjen.ie
                  </a>
                </div>
              </div>
            </div>
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
