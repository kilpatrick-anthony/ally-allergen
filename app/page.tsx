// app/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Container } from './components/layout/Container'
import { Button } from './components/ui/Button'
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
} from 'lucide-react'

export default function LandingPage() {
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
      icon: <Shield className="h-6 w-6 text-[#42b8ac]" />,
      title: 'Sub-Allergen Detail Tracking',
      desc: 'Go beyond the 14 major allergens. Track sub-types like specific tree nuts or cereal varieties for greater precision and customer confidence.',
    },
    {
      icon: <Globe className="h-6 w-6 text-[#42b8ac]" />,
      title: 'Multilingual Allergen Displays',
      desc: 'Serve a diverse customer base with allergen information displayed in multiple languages, right out of the box.',
    },
    {
      icon: <Zap className="h-6 w-6 text-[#42b8ac]" />,
      title: 'Real-Time Menu Updates',
      desc: 'Change an ingredient and every linked menu item and kiosk updates instantly. Save precious time and printing costs.',
    },
    {
      icon: <Building className="h-6 w-6 text-[#42b8ac]" />,
      title: 'Multi-Site Management',
      desc: 'Manage allergen data across all your locations from a single, centralised dashboard.',
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-[#42b8ac]" />,
      title: 'Customer-Facing Kiosks & QR Codes',
      desc: 'Deploy interactive kiosks or let customers scan a QR code to view live allergen information for any dish, straight from their phone.',
    },
    {
      icon: <BarChart className="h-6 w-6 text-[#42b8ac]" />,
      title: 'Analytics & Reporting',
      desc: 'Understand customer allergen queries and demonstrate compliance with detailed reports.',
    },
  ]

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-atkinson), sans-serif" }}>

      {/* ── HERO ── */}
      <section className="relative bg-[#003842] overflow-hidden">
        {/* decorative teal blob */}
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-[#42b8ac]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-[#42b8ac]/10 blur-3xl pointer-events-none" />

        {/* Sign In – top right */}
        <div className="absolute top-5 right-5 z-10">
          <Link href="/auth/signin">
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-[#42b8ac] hover:text-[#003842] transition-colors">
              Sign In <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        <Container>
          <div className="relative flex flex-col lg:flex-row items-center gap-12 py-20 lg:py-28">
            {/* Left – photo */}
            <div className="flex-1 w-full lg:max-w-none">
              <div className="rounded-2xl overflow-hidden shadow-2xl ring-4 ring-[#42b8ac]/30">
                <img
                  src="/Home%20Image.svg"
                  alt="AllyJen allergen management platform"
                  className="w-full h-auto block"
                />
              </div>
            </div>

            {/* Right – text */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-3xl md:text-4xl xl:text-5xl font-extrabold text-white leading-none mb-6">
                Serve every customer with <span className="text-[#42b8ac]">complete</span><br />
                <span className="text-[#42b8ac]">peace of mind.</span>
              </h1>
              <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto lg:mx-0">
                The all-in-one platform for Irish &amp; EU food businesses to track allergens, inform customers, and stay compliant.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#42b8ac] text-[#003842] font-bold rounded-full hover:bg-white transition-colors text-base"
                >
                  Start Serving with Confidence <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-white/30 text-white font-semibold rounded-full hover:border-[#42b8ac] hover:text-[#42b8ac] transition-colors text-base"
                >
                  See Features <ChevronDown className="h-5 w-5" />
                </button>
              </div>
            </div>
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
                  {f.icon}
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
              { step: '02', title: 'We Set You Up', desc: 'Our team configures your allergen system, imports your menu data, and gets your kiosks ready to go.' },
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
                  alt="AllyJen — Food Safety Partner"
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
                      { title: 'Expert-Guided Setup', body: 'Our team handles the initial configuration and imports your existing menu data.' },
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
            <p className="text-sm text-white/40">© 2026 AllyJen Solutions LTD. All rights reserved.</p>
          </div>
        </Container>
      </footer>

    </div>
  )
}
