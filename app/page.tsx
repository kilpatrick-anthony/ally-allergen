// app/page.tsx
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
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
import { CaseStudyCard } from '@/components/marketing/CaseStudyCard'
import { PublicFooter } from '@/components/marketing/PublicFooter'
import { getPlanDefinition } from '@/lib/plans'

const TEAM_PREVIEW = [
  { photo: '/Anthony.png', name: 'Anthony Kilpatrick', role: 'Co-Founder' },
  { photo: '/Alvin.png', name: 'Alvin Galligan', role: 'Co-Founder' },
  { photo: '/Alex.png', name: 'Alex Murphy', role: 'Brand Ambassador' },
]

export default function LandingPage() {
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
    privacyAccepted: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedEnquiry, setSelectedEnquiry] = useState('')
  const publicPlans = [
    {
      ...getPlanDefinition('qr_lite'),
      title: 'QR Lite',
      badge: 'Early Adopter Offer',
      unit: '/year',
      billingLabel: 'Per location · Paid annually',
      desc: 'Customers access your allergen guide on their own phones. You manage your menu updates.',
      features: [
        'Customer access: scan your QR code to open your guide.',
        'Menu updates: update your information as your menu changes.',
        'Reporting: allergen reports and usage analytics.',
        'Setup: QR signage and help setting up your existing allergen information.',
        'Support: email support.',
      ],
      hardware: 'No tablet required.',
      kioskNote: 'For in-store kiosk use, choose Self-Managed or Fully Managed.',
      terms: 'Annual price protected for your first three years while your subscription remains active. No obligation to renew after each paid year.',
      availability: 'Available to the next 10 locations to sign up.',
      cta: 'Enquire about the offer',
      enquiry: 'QR Lite — Early Adopter Offer',
      highlight: true,
    },
    {
      ...getPlanDefinition('starter'),
      badge: null,
      unit: '/month',
      billingLabel: 'Per location',
      desc: 'Customers use your QR guide or an in-store tablet. You keep your menu information up to date.',
      features: [
        'Customer access: QR guide or in-store tablet.',
        'Kiosk software: included with your subscription.',
        'Menu updates: managed by you.',
        'Reporting: allergen reports and usage analytics.',
        'Setup: help getting your system running.',
        'Support: email support.',
      ],
      hardware: 'Kiosk tablet purchased separately.',
      kioskNote: null,
      terms: 'Monthly billing available. Minimum commitment, renewal and cancellation arrangements agreed in your quote.',
      availability: null,
      cta: 'Choose Self-Managed',
      enquiry: 'Self-Managed',
      highlight: false,
    },
    {
      ...getPlanDefinition('pro'),
      badge: null,
      unit: '/month',
      billingLabel: 'Per location',
      desc: 'Your QR guide and in-store kiosk, with menu updates managed for you.',
      features: [
        'Customer access: QR guide or in-store tablet.',
        'Kiosk software: included with your subscription.',
        'Menu updates managed using the ingredient and supplier information you provide.',
        'Reporting: allergen reports and usage analytics.',
        'Setup: help getting your system running.',
        'Support: priority email support.',
      ],
      hardware: 'Kiosk tablet purchased separately.',
      kioskNote: null,
      terms: 'Monthly billing available. Minimum commitment, renewal and cancellation arrangements agreed in your quote.',
      availability: null,
      cta: 'Discuss Fully Managed',
      enquiry: 'Fully Managed',
      highlight: false,
    },
  ]

  const enquireAbout = (enquiry: string) => {
    setSelectedEnquiry(enquiry)
    setSubmitted(false)
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })
    requestAnimationFrame(() => document.getElementById('enquiry-type')?.focus({ preventScroll: true }))
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactForm,
          message: [selectedEnquiry ? `Enquiry: ${selectedEnquiry}` : '', contactForm.message].filter(Boolean).join('\n\n'),
        }),
      })
      if (response.ok) {
        setSubmitted(true)
        setSelectedEnquiry('')
        setContactForm({ name: '', email: '', company: '', phone: '', message: '', privacyAccepted: false })
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
  const navItemClass = 'inline-flex h-10 items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm leading-none appearance-none bg-transparent p-0'

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-atkinson), sans-serif" }}>

      {/* Header */}
      <header className="relative z-20 bg-[#003842] border-b border-[#003842]">
        <Container>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center py-4 gap-4 lg:flex lg:justify-between">
            {/* Logo */}
            <div className="col-start-2 row-start-1 justify-self-center flex-shrink-0 lg:col-auto lg:row-auto lg:justify-self-auto">
              <img
                src="/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg"
                alt="AllyJen Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            
            {/* Navigation - left-aligned after logo (hidden on mobile) */}
            <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-4 xl:gap-6 h-10">
              <Link href="/" className={navItemClass}>Home</Link>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className={navItemClass}
              >
                Features
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className={navItemClass}
              >
                How It Works
              </button>
              <button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className={navItemClass}
              >
                Pricing
              </button>
              <Link href="/#case-studies" className={navItemClass}>Case studies</Link>
              <button
                onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                className={navItemClass}
              >
                Contact
              </button>
              <Link href="/about" className={navItemClass}>
                About
              </Link>
              <Link href="/careers" className={navItemClass}>
                Careers
              </Link>
            </nav>
            
            {/* Mobile menu toggle - left */}
            <div className="col-start-1 row-start-1 justify-self-start lg:hidden">
              <button
                type="button"
                aria-label={isNavOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isNavOpen}
                aria-controls="homepage-mobile-menu"
                onClick={() => setIsNavOpen((o) => !o)}
                className="p-2 text-white hover:text-[#42b8ac] transition-colors"
              >
                {isNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
            
            {/* CTAs - right */}
            <div className="hidden flex-shrink-0 items-center gap-2 lg:flex">
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
          <nav id="homepage-mobile-menu" aria-label="Mobile navigation" className="flex flex-col divide-y divide-white/10">
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
              href="/#case-studies"
              onClick={() => setIsNavOpen(false)}
              className="px-6 py-3 text-left text-white hover:text-[#42b8ac] hover:bg-white/5 transition-colors font-medium text-sm"
            >
              Case studies
            </Link>
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
              className="px-6 py-3 text-left text-white hover:text-[#42b8ac] hover:bg-white/5 transition-colors font-medium text-sm"
            >
              Careers
            </Link>
            <Link
              href="/auth/signin"
              onClick={() => setIsNavOpen(false)}
              className="px-6 py-4 text-left text-[#003842] bg-white hover:bg-[#42b8ac] hover:text-white transition-colors font-semibold text-sm inline-flex items-center justify-between"
            >
              Sign In
              <ArrowRight className="h-4 w-4" />
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
              Built for Irish &amp; EU food businesses.
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
              { step: '02', title: 'We Get You Running', desc: 'We help you set up your existing allergen information. QR Lite includes QR signage. For an in-store kiosk, choose Self-Managed or Fully Managed and add a tablet for €299. We configure it remotely and deliver it by courier, ready for plug and play.' },
              { step: '03', title: 'Go Live with Confidence', desc: 'Launch AllyJen, manage allergens, and show customers the information they need.' },
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

      {/* ── CASE STUDIES ── */}
      <section id="case-studies" aria-labelledby="case-studies-heading" className="scroll-mt-6 bg-[#f0f9f8] py-16 sm:py-24">
        <Container>
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#18756e]">AllyJen in practice</p>
            <h2 id="case-studies-heading" className="mb-4 text-3xl font-extrabold text-[#003842] sm:text-4xl">Case studies</h2>
            <p className="text-lg leading-relaxed text-slate-600">See how food businesses make allergen information easier to access for customers and staff.</p>
          </div>
          <CaseStudyCard />
        </Container>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 bg-white">
        <Container>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#003842] mb-3">Everything You Need, Nothing You Don&apos;t</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Pick the plan that fits your business
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6">
            {publicPlans.map((plan) => (
              <article
                key={plan.key}
                aria-labelledby={`pricing-${plan.key}`}
                className={`relative flex min-w-0 flex-col rounded-2xl border-2 p-6 sm:p-7 ${
                  plan.highlight
                    ? 'border-[#42b8ac] shadow-xl shadow-[#42b8ac]/10'
                    : 'border-gray-100 shadow-sm'
                }`}
              >
                <div className="mb-4 min-h-7">
                  {plan.badge && <span className="inline-block rounded-full bg-[#42b8ac] px-3 py-1 text-xs font-bold text-[#003842]">{plan.badge}</span>}
                </div>
                <h3 id={`pricing-${plan.key}`} className="mb-3 text-xl font-bold text-[#003842]">{plan.title}</h3>
                <div className="mb-1 flex flex-wrap items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-[#003842]">{plan.priceLabel.replace('EUR ', '€')}</span>
                  <span className="text-lg font-semibold text-gray-600">{plan.unit}</span>
                </div>
                <p className="text-sm font-semibold text-gray-600">{plan.billingLabel}</p>
                <p className="mb-6 mt-4 text-sm leading-relaxed text-gray-600">{plan.desc}</p>
                <ul className="mb-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-700">
                      <CheckCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#0e7066]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto border-t border-gray-100 pt-5">
                  <p className="mb-3 text-sm font-bold text-[#003842]">{plan.hardware}</p>
                  {plan.kioskNote && <p className="mb-3 text-sm leading-relaxed text-gray-600">{plan.kioskNote}</p>}
                  <p className="text-sm leading-relaxed text-gray-600">{plan.terms}</p>
                  {plan.availability && <p className="mt-3 text-sm font-semibold text-[#0e7066]">{plan.availability}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => enquireAbout(plan.enquiry)}
                  className={`mt-6 min-h-12 w-full rounded-full px-4 py-3 text-center text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#003842] ${
                    plan.highlight ? 'bg-[#42b8ac] text-[#003842] hover:bg-[#3aa89e]' : 'bg-[#003842] text-white hover:bg-[#004d5e]'
                  }`}
                >
                  {plan.cta}
                </button>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-[#42b8ac]/30 bg-[#f0f9f8] p-6 sm:p-9" aria-labelledby="kiosk-hardware-heading">
            <div className="flex flex-col gap-7 md:flex-row md:items-center">
              <figure className="w-full shrink-0 md:w-64">
                <Image src="/unnamed.webp" alt="AllyJen running on an in-store tablet at OAKBERRY Maynooth" width={765} height={1020} sizes="(min-width: 768px) 256px, calc(100vw - 96px)" className="aspect-[4/3] w-full rounded-2xl object-cover object-center md:aspect-square" />
                <figcaption className="mt-2 text-xs leading-relaxed text-gray-600">AllyJen in use at OAKBERRY Maynooth.</figcaption>
              </figure>
              <div className="min-w-0 flex-1">
                <h3 id="kiosk-hardware-heading" className="mb-3 text-2xl font-bold text-[#003842]">Want an in-store allergen kiosk?</h3>
                <p className="text-xl font-bold text-[#003842]">Add a kiosk tablet for €299 — one-off purchase.</p>
                <p className="mt-2 font-semibold text-gray-700">Subscription charged separately.</p>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
                  Kiosk software access is included with Self-Managed and Fully Managed.
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
                  Includes the tablet and stand, remote configuration, and courier delivery to your location,
                  ready for plug and play. You own the tablet and stand.
                </p>
                <button type="button" onClick={() => enquireAbout('Kiosk tablet — €299 one-off purchase')} className="mt-5 min-h-11 rounded-full border-2 border-[#003842] px-6 py-2.5 text-sm font-semibold text-[#003842] transition-colors hover:bg-[#003842] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#003842]">
                  Enquire about a kiosk tablet
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[#003842] p-6 text-white sm:flex-row sm:items-center sm:p-7">
            <p className="text-lg font-semibold">Multiple locations? Talk to us about group pricing.</p>
            <button type="button" onClick={() => enquireAbout('Group pricing')} className="min-h-11 shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#003842] transition-colors hover:bg-[#d4f0ed] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Discuss group pricing
            </button>
          </div>

          <p className="text-center text-sm text-gray-400 mt-10">
            Not sure which plan is right for you?{' '}
            <button
              type="button"
              onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[#42b8ac] hover:underline font-medium"
            >
              Contact us
            </button>
            {' '}and we'll help you choose.
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

      {/* ── ABOUT TEASER ── */}
      <section className="py-16 bg-gray-50">
        <Container>
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block mb-3 text-[#42b8ac] text-xs font-bold uppercase tracking-widest">Meet the Team</span>
            <h2 className="text-2xl md:text-3xl font-bold text-[#003842] mb-3">Built by people who've faced this problem first-hand</h2>
            <p className="text-gray-500 text-base leading-relaxed max-w-2xl mx-auto">
              AllyJen was founded by a team who experienced the challenges of allergen management up close, and built a platform to solve it properly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 my-8">
              {TEAM_PREVIEW.map((member) => (
                <div key={member.name} className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-3 py-5 shadow-sm">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    width={80}
                    height={80}
                    sizes="80px"
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-[#42b8ac]/30"
                  />
                  <h3 className="mt-3 text-sm font-bold text-[#003842]">{member.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-[#42b8ac]">{member.role}</p>
                </div>
              ))}
            </div>

            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#003842] text-white font-semibold text-sm hover:bg-[#004d5c] transition-colors"
            >
              Read More About Us <ArrowRight className="h-4 w-4" />
            </Link>
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
                    <div>
                      <label htmlFor="enquiry-type" className="mb-1.5 block text-sm font-medium text-white/80">Enquiry type</label>
                      <select id="enquiry-type" name="enquiryType" value={selectedEnquiry} onChange={(e) => setSelectedEnquiry(e.target.value)} className="w-full rounded-lg border border-white/20 bg-[#003842] px-4 py-3 text-sm text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#42b8ac]">
                        <option value="">General enquiry</option>
                        {['QR Lite — Early Adopter Offer', 'Self-Managed', 'Fully Managed', 'Kiosk tablet — €299 one-off purchase', 'Group pricing'].map((enquiry) => <option key={enquiry} value={enquiry}>{enquiry}</option>)}
                      </select>
                    </div>
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
                    <label className="flex items-start gap-3 text-xs text-white/70">
                      <input
                        type="checkbox"
                        name="privacyAccepted"
                        checked={contactForm.privacyAccepted}
                        onChange={(e) => setContactForm(prev => ({ ...prev, privacyAccepted: e.target.checked }))}
                        required
                        className="mt-0.5 h-4 w-4 rounded border-white/30 bg-white/10 text-[#42b8ac] focus:ring-[#42b8ac]"
                      />
                      <span>
                        I have read the <Link href="/privacy" className="underline hover:text-[#42b8ac]">Privacy Notice</Link> and understand how AllyJen will use my information to respond to this enquiry.
                      </span>
                    </label>
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
                  <a href="mailto:info@allyjen.ie" className="flex w-fit items-center gap-2 text-sm text-white hover:text-[#42b8ac] transition-colors">
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
      <PublicFooter />

    </div>
  )
}
