// app/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Container } from './components/layout/Container'
import { Button } from './components/ui/Button'
import {
  Shield,
  Zap,
  Users,
  Globe,
  CheckCircle,
  ArrowRight,
  Star,
  Building,
  Clock,
  BarChart,
  Mail,
  Phone,
  User,
  Send
} from 'lucide-react'

export default function LandingPage() {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: ''
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
        body: JSON.stringify(contactForm)
      })

      if (response.ok) {
        setSubmitted(true)
        setContactForm({ name: '', email: '', company: '', phone: '', message: '' })
      } else {
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContactForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <Container>
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-[#42b8ac]" />
              <span className="text-2xl font-bold text-[#003842]">AllyJen</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/signin">
                <Button variant="primary">Sign In</Button>
              </Link>
            </div>
          </div>
        </Container>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-[#f0f9f8] to-white">
        <Container>
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#42b8ac]/10 rounded-full text-[#42b8ac] text-sm font-medium mb-6">
              <Star className="h-4 w-4" />
              Trusted by food service businesses worldwide
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-[#003842] mb-6">
              Allergen Management Made Simple
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Keep your customers safe with comprehensive allergen tracking,
              automated warnings, and customer-facing kiosks—all in one platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="primary" className="px-8 py-3 text-lg" onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}>
                Get Started
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button variant="outline" className="px-8 py-3 text-lg">
                Watch Demo
              </Button>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Contact us to learn how we can help your business
            </p>
          </div>
        </Container>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#003842] mb-4">
              Everything You Need to Manage Allergens
            </h2>
            <p className="text-xl text-gray-600">
              Built for restaurants, cafés, and food service businesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center p-3 bg-[#42b8ac]/10 rounded-lg mb-4">
                <Shield className="h-6 w-6 text-[#42b8ac]" />
              </div>
              <h3 className="text-xl font-semibold text-[#003842] mb-2">
                Comprehensive Allergen Tracking
              </h3>
              <p className="text-gray-600">
                Track 14 major allergens across all ingredients and menu items with automated warnings
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center p-3 bg-[#42b8ac]/10 rounded-lg mb-4">
                <Globe className="h-6 w-6 text-[#42b8ac]" />
              </div>
              <h3 className="text-xl font-semibold text-[#003842] mb-2">
                Customer-Facing Kiosks
              </h3>
              <p className="text-gray-600">
                Deploy interactive kiosks for customers to view allergen information in real-time
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center p-3 bg-[#42b8ac]/10 rounded-lg mb-4">
                <Zap className="h-6 w-6 text-[#42b8ac]" />
              </div>
              <h3 className="text-xl font-semibold text-[#003842] mb-2">
                Automated Warnings
              </h3>
              <p className="text-gray-600">
                Get instant alerts when ingredients with allergens are added to menu items
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center p-3 bg-[#42b8ac]/10 rounded-lg mb-4">
                <Building className="h-6 w-6 text-[#42b8ac]" />
              </div>
              <h3 className="text-xl font-semibold text-[#003842] mb-2">
                Multi-Location Support
              </h3>
              <p className="text-gray-600">
                Manage allergen information across multiple restaurant locations from one dashboard
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center p-3 bg-[#42b8ac]/10 rounded-lg mb-4">
                <Clock className="h-6 w-6 text-[#42b8ac]" />
              </div>
              <h3 className="text-xl font-semibold text-[#003842] mb-2">
                Offline Capability
              </h3>
              <p className="text-gray-600">
                Kiosks work offline with automatic data syncing when connection is restored
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center p-3 bg-[#42b8ac]/10 rounded-lg mb-4">
                <BarChart className="h-6 w-6 text-[#42b8ac]" />
              </div>
              <h3 className="text-xl font-semibold text-[#003842] mb-2">
                Analytics & Insights
              </h3>
              <p className="text-gray-600">
                Track allergen queries and understand customer needs with detailed analytics
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#003842] mb-4">
              How We Work With You
            </h2>
            <p className="text-xl text-gray-600">
              Our team handles the setup so you can focus on your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#42b8ac] text-white rounded-full text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-[#003842] mb-2">
                Contact Us
              </h3>
              <p className="text-gray-600">
                Fill out our contact form and tell us about your business needs
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#42b8ac] text-white rounded-full text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-[#003842] mb-2">
                We Set You Up
              </h3>
              <p className="text-gray-600">
                Our team configures your allergen management system and imports your data
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#42b8ac] text-white rounded-full text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-[#003842] mb-2">
                Start Managing
              </h3>
              <p className="text-gray-600">
                Access your dashboard and begin tracking allergens with confidence
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Social Proof */}
      <section className="py-20">
        <Container>
          <div className="bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Trusted by Food Service Professionals
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Join hundreds of restaurants, cafés, and food businesses that trust AllyJen 
              to keep their customers safe
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-center">
              <div>
                <div className="text-4xl font-bold">14</div>
                <div className="text-sm opacity-75">Allergens Tracked</div>
              </div>
              <div>
                <div className="text-4xl font-bold">99.9%</div>
                <div className="text-sm opacity-75">Uptime SLA</div>
              </div>
              <div>
                <div className="text-4xl font-bold">24/7</div>
                <div className="text-sm opacity-75">Support Available</div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-20 bg-gray-50">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-[#003842] mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-gray-600">
                Contact us to learn how AllyJen can help your business manage allergens safely
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                {submitted ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-[#003842] mb-2">Thank You!</h3>
                    <p className="text-gray-600">
                      We've received your message and will get back to you within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={contactForm.name}
                          onChange={handleContactChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={contactForm.email}
                          onChange={handleContactChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          value={contactForm.company}
                          onChange={handleContactChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                          placeholder="Your restaurant or business name"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={contactForm.phone}
                          onChange={handleContactChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Tell us about your needs
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={contactForm.message}
                        onChange={handleContactChange}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                        placeholder="Tell us about your business, current allergen management challenges, and what you're looking to achieve..."
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full py-3 text-lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                      <Send className="h-5 w-5 ml-2" />
                    </Button>
                  </form>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-[#003842] mb-4">Why Choose AllyJen?</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-6 w-6 text-[#42b8ac] mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-[#003842]">Expert Setup</h4>
                        <p className="text-gray-600 text-sm">Our team handles the initial configuration and data import</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-6 w-6 text-[#42b8ac] mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-[#003842]">Ongoing Support</h4>
                        <p className="text-gray-600 text-sm">24/7 support and regular system updates</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-6 w-6 text-[#42b8ac] mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-[#003842]">Compliance Ready</h4>
                        <p className="text-gray-600 text-sm">Built to meet food safety regulations</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#42b8ac]/5 p-6 rounded-lg">
                  <h4 className="font-semibold text-[#003842] mb-2">Need immediate assistance?</h4>
                  <p className="text-gray-600 text-sm mb-4">
                    For urgent questions or technical support, contact us directly:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#42b8ac]" />
                      <span>info@allyjen.ie</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[#42b8ac]" />
                      
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 bg-white">
        <Container>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-[#42b8ac]" />
              <span className="text-xl font-bold text-[#003842]">AllyJen</span>
            </div>
            
            <div className="flex gap-8 text-sm text-gray-600">
              <Link href="/privacy" className="hover:text-[#42b8ac]">Privacy</Link>
              <Link href="/terms" className="hover:text-[#42b8ac]">Terms</Link>
              <Link href="/contact" className="hover:text-[#42b8ac]">Contact</Link>
            </div>
            
            <div className="text-sm text-gray-500">
              © 2026 AllyJen. All rights reserved.
            </div>
          </div>
        </Container>
      </footer>
    </div>
  )
}
