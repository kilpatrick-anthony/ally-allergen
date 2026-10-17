'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Container } from '@/components/layout/Container'

const links = [
  ['Home', '/'], ['Features', '/#features'], ['How It Works', '/#how-it-works'],
  ['Pricing', '/#pricing'], ['Case studies', '/#case-studies'], ['Contact', '/#contact-form'],
  ['About', '/about'], ['Careers', '/careers'],
]

export function CaseStudyHeader() {
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  return <header className="relative z-20 bg-[#003842] text-white">
    <Container>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-4 lg:flex lg:justify-between">
        <Link href="/" aria-label="AllyJen home" className="col-start-2 row-start-1 justify-self-center shrink-0 lg:justify-self-auto">
          <img src="/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg" alt="AllyJen" className="h-10 w-auto" />
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-4 text-sm font-medium lg:flex xl:gap-6">
          {links.map(([label, href]) => <Link key={label} href={href} className="inline-flex min-h-11 items-center rounded-sm hover:text-[#8dd8d2] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{label}</Link>)}
        </nav>
        <button ref={toggle} type="button" aria-expanded={open} aria-controls="case-study-mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(value => !value)} className="col-start-1 row-start-1 inline-flex h-11 w-11 items-center justify-center justify-self-start rounded-lg hover:bg-white/10 lg:hidden">
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <Link href="/auth/signin" className="hidden shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#003842] hover:bg-[#8dd8d2] lg:inline-flex">Sign In <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
      </div>
    </Container>
    <nav id="case-study-mobile-menu" aria-label="Mobile navigation" hidden={!open} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() } }} className="border-t border-white/10 lg:hidden">
      {[...links, ['Sign In', '/auth/signin']].map(([label, href]) => <Link key={label} href={href} onClick={() => setOpen(false)} className="block px-6 py-3 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-white">{label}</Link>)}
    </nav>
  </header>
}
