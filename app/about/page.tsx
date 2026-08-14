// app/about/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { ArrowRight, Menu, Phone, X } from 'lucide-react'

const TEAM: { photo: string; name: string; role: string; phone?: string; phoneHref?: string; bio: React.ReactNode[] }[] = [
  {
    photo: '/Anthony.png',
    name: 'Anthony Kilpatrick',
    role: 'Co-Founder',
    bio: [
      "Anthony is a Co-Founder of AllyJen, with a background spanning 20+ years in business management, technology, training, consultancy and customer experience.",
      "A graduate of the University of Limerick, Anthony spent 17 years in management and leadership roles at ODEON Cinemas, and was awarded the Barry Souber Award for General Manager of the Year UK & Ireland in 2020. That experience gave him a strong understanding of the realities of running busy, customer-facing operations, where processes need to be practical, teams need the right information, and getting the details right matters.",
      "After moving into consultancy, Anthony worked closely with businesses across areas including operations, customer experience and compliance. Part of that work involved creating and maintaining detailed allergen guides, and it was here that the original idea for AllyJen began.",
      "Faced with manually managing significantly large allergen guides and constantly updating them as products, ingredients and supplier information changed, Anthony began developing a digital tool that could make the process easier to manage.",
      "What started as a solution to his own problem ultimately became AllyJen.",
      "Today, Anthony works across product development, technology, customer experience and the continued development of the platform. Having experienced the problem AllyJen solves first-hand, his focus remains on ensuring that the technology stays practical, affordable and genuinely useful for the people who have to manage allergen information every day.",
    ],
  },
  {
    photo: '/Alvin.png',
    name: 'Alvin Galligan',
    role: 'Co-Founder',
    bio: [
      <>Alvin is a Co-Founder of AllyJen, bringing together more than 15 years of entrepreneurial and business leadership experience with a strong academic background in health. He holds a <strong className="text-[#003842]">Master's degree in Immunisation and Global Health</strong>, adding valuable health-focused knowledge and perspective to the AllyJen team.</>,
      "Throughout his career, Alvin has built extensive experience across operations, commercial strategy and business development, with a particular focus on turning ideas into practical, sustainable businesses.",
      "When Anthony's original allergen management tool began to take shape, Alvin immediately recognised its wider potential. Together, they saw an opportunity to transform a solution to an everyday operational problem into a platform that could help food businesses manage allergen information more effectively.",
      "Today, Alvin plays a key role in AllyJen's strategy, operations, partnerships and growth. His combination of commercial experience and postgraduate education in health brings a valuable perspective to AllyJen as the company continues to develop technology designed to support businesses, strengthen allergen management and help protect their customers.",
    ],
  },
  {
    photo: '/James.png',
    name: "James O'Brien",
    role: 'Sales and Accounts Manager',
    phone: '+353 89 658 0997',
    phoneHref: 'tel:+353896580997',
    bio: [
      "James is AllyJen's Sales and Accounts Manager and is often one of the first people our customers get to know.",
      "His role is centred around people: understanding how a business currently manages its allergen information, identifying where AllyJen can make life easier, and helping customers find the right solution for their operation.",
      "From the first conversation through to becoming an AllyJen customer, James works closely with businesses to make the process straightforward and personal. He also supports our existing accounts, building long-term customer relationships and ensuring our customers continue to get real value from the platform.",
      "For James, sales isn't simply about bringing new businesses on board. It's about listening, understanding what each customer actually needs and building relationships that last.",
    ],
  },
]

export default function AboutPage() {
  const [isNavOpen, setIsNavOpen] = useState(false)
  const navItemClass = 'inline-flex h-10 items-center text-white hover:text-[#42b8ac] transition-colors font-medium text-sm leading-none appearance-none bg-transparent p-0'

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-atkinson), sans-serif' }}>

      {/* ── HEADER ── */}
      <header className="relative z-20 bg-[#003842] border-b border-[#003842]">
        <Container>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center py-4 gap-4 lg:flex lg:justify-between">
            {/* Logo */}
            <div className="col-start-2 row-start-1 justify-self-center flex-shrink-0 lg:col-auto lg:row-auto lg:justify-self-auto">
              <Link href="/">
                <img
                  src="/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg"
                  alt="AllyJen Logo"
                  className="h-10 w-auto object-contain"
                />
              </Link>
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-8 h-10">
              <Link href="/" className={navItemClass}>Home</Link>
              <Link href="/#features" className={navItemClass}>Features</Link>
              <Link href="/#how-it-works" className={navItemClass}>How It Works</Link>
              <Link href="/#pricing" className={navItemClass}>Pricing</Link>
              <Link href="/#contact-form" className={navItemClass}>Contact</Link>
              <Link href="/about" className="inline-flex h-10 items-center text-[#42b8ac] font-semibold text-sm leading-none">About</Link>
              <Link href="/careers" className={navItemClass}>Careers</Link>
            </nav>

            {/* Mobile menu toggle */}
            <div className="col-start-1 row-start-1 justify-self-start lg:hidden">
              <button
                type="button"
                aria-label={isNavOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setIsNavOpen((o) => !o)}
                className="p-2 text-white hover:text-[#42b8ac] transition-colors"
              >
                {isNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* CTAs */}
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
              className="px-6 py-3 text-left text-[#42b8ac] hover:bg-white/5 transition-colors font-semibold text-sm"
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
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-[#42b8ac]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-[#42b8ac]/10 blur-3xl pointer-events-none" />
        <Container>
          <div className="relative py-16 lg:py-20 text-center max-w-3xl mx-auto">
            <span className="inline-block mb-3 text-[#42b8ac] text-xs font-bold uppercase tracking-widest">Meet the Team</span>
            <h1 className="text-3xl md:text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
              The people behind Ally<span className="text-[#42b8ac]">Jen.</span>
            </h1>
          </div>
        </Container>
      </section>

      {/* ── OUR STORY ── */}
      <section className="py-16 bg-white">
        <Container>
          <div className="max-w-3xl mx-auto space-y-5 text-gray-700 text-base leading-relaxed text-justify">
            <p>AllyJen started with a problem we knew all too well.</p>
            <p>After years working across retail, hospitality and customer-facing businesses, we'd seen first-hand how difficult it can be to keep allergen information accurate and up to date.</p>
            <p>Through their consultancy work, Anthony and Alvin regularly created and maintained allergen guides for businesses, manually tracking changes to products, ingredients and suppliers. Keeping everything accurate was essential, but the process was far more complicated and time-consuming than it needed to be.</p>
            <p>So, they started building an app to make the job easier.</p>
            <p>As the idea developed, Anthony and Alvin realised this wasn't just their problem; businesses everywhere faced the same challenge. What began as a simple internal tool became the starting point for AllyJen.</p>
            <p>Today, AllyJen combines practical experience with technology to replace spreadsheets, bulky allergen guides and repetitive manual updates with a simpler way to manage allergen information, helping businesses save time, reduce risk and give their customers greater confidence.</p>
          </div>
        </Container>
      </section>

      {/* ── TEAM ── */}
      <section className="py-16 bg-gray-50">
        <Container>
          <div className="max-w-4xl mx-auto space-y-12">
            {TEAM.map((member) => (
              <div key={member.name} className="flex flex-col sm:flex-row gap-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-bold text-[#003842]">{member.name}</h2>
                  <p className="text-[#42b8ac] font-semibold text-sm mb-4">{member.role}</p>
                  {member.phone && member.phoneHref && (
                    <a href={member.phoneHref} className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#e8f7f5] px-3 py-2 text-sm font-semibold text-[#0e7066] transition-colors hover:bg-[#d4f0ed]">
                      <Phone className="h-4 w-4" />
                      {member.phone}
                    </a>
                  )}
                  <div className="space-y-3 text-gray-600 text-sm leading-relaxed text-justify">
                    {member.bio.map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CLOSING ── */}
      <section className="py-16 bg-[#003842]">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Built from experience. Built for real businesses.</h2>
            <div className="space-y-4 text-white/70 text-base leading-relaxed text-justify">
              <p>AllyJen wasn't created around a hypothetical problem. It came from experiencing that problem ourselves.</p>
              <p>We understand the responsibility businesses carry when providing allergen information, but we also understand the operational reality behind keeping that information accurate when products, recipes and suppliers are constantly changing.</p>
              <p>That's why we've built AllyJen to make the process simpler.</p>
              <p>We're proud to be an Irish-owned business, and as AllyJen grows, we'll continue to develop the platform in the same way it started: by listening to the people who actually use it, solving real problems and finding better ways to help businesses serve every customer with confidence.</p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── FOOTER ── */}
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
