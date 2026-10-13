// app/about/page.tsx
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
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
    photo: '/Alex.png',
    name: 'Alex Murphy',
    role: 'Brand Ambassador',
    bio: [
      "Alex is AllyJen’s Brand Ambassador, helping us explain what the platform does and why it matters to food businesses and their customers.",
      "A graduate of University College Dublin, Alex holds a BSc in Economics and Information & Communication Studies and is currently studying for an MSc in Strategic Management at UCD Michael Smurfit Graduate Business School. She is qualified in HACCP and Allergen Awareness and has years of experience working in a busy food service environment. That experience gives her a first-hand appreciation of the care and attention food safety requires.",
      "Through AllyJen’s videos and content, Alex puts a friendly face to the platform. She helps turn topics like allergen management, ingredient records and customer information into clear, useful conversations that busy business owners can relate to.",
      "For Alex, representing AllyJen is about making an important subject easier to understand and helping more businesses see how they can serve their customers with confidence.",
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
                  <Image
                    src={member.photo}
                    alt={member.name}
                    width={96}
                    height={96}
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
              <div className="grid grid-cols-4 place-items-center gap-3" aria-label="Contact AllyJen">
                <a href="tel:+353896580997" aria-label="Call AllyJen on +353 89 658 0997" title="Call AllyJen: +353 89 658 0997" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 leading-none text-white/70 transition-colors hover:bg-[#42b8ac] hover:text-white sm:h-9 sm:w-9">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href="https://www.linkedin.com/company/allyjen/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="AllyJen on LinkedIn"
                  title="AllyJen on LinkedIn"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 leading-none text-white/70 transition-colors hover:bg-[#42b8ac] hover:text-white sm:h-9 sm:w-9"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/allyjen_solutions/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="AllyJen on Instagram"
                  title="AllyJen on Instagram"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 leading-none text-white/70 transition-colors hover:bg-[#42b8ac] hover:text-white sm:h-9 sm:w-9"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838A6.162 6.162 0 1 0 12 18.162 6.162 6.162 0 0 0 12 5.838zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@allyjen_solutions?is_from_webapp=1&sender_device=pc"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="AllyJen on TikTok"
                  title="AllyJen on TikTok"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 leading-none text-white/70 transition-colors hover:bg-[#42b8ac] hover:text-white sm:h-9 sm:w-9"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.72-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.58.07-5.37.01-4.04-.01-8.08.02-12.12z" />
                  </svg>
                </a>
              </div>
              <p className="text-sm text-white/40">© 2026 AllyJen Solutions Limited.</p>
              <p className="text-xs text-white/30">CRO No. 811542 | Republic of Ireland</p>
              <nav aria-label="Legal pages" className="flex flex-wrap justify-center gap-4 text-xs text-white/60 md:justify-end">
                <Link href="/privacy" className="transition-colors hover:text-[#8dd8d2]">Privacy</Link>
                <Link href="/cookies" className="transition-colors hover:text-[#8dd8d2]">Cookies</Link>
                <Link href="/terms" className="transition-colors hover:text-[#8dd8d2]">Terms</Link>
              </nav>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  )
}
