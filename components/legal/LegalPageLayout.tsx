import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Container } from '@/components/layout/Container'

type LegalPageLayoutProps = {
  title: string
  summary: string
  children: ReactNode
}

export default function LegalPageLayout({ title, summary, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f7fbfa] text-gray-800">
      <header className="border-b border-[#42b8ac]/20 bg-[#003842] text-white">
        <Container>
          <div className="flex min-h-20 items-center justify-between gap-6 py-3">
            <Link href="/" aria-label="AllyJen home">
              <Image src="/Logo-AllyJen.svg" alt="AllyJen" width={180} height={56} className="h-14 w-auto" />
            </Link>
            <Link href="/" className="text-sm font-semibold text-white/90 hover:text-[#8dd8d2]">
              Back to AllyJen
            </Link>
          </div>
        </Container>
      </header>

      <main>
        <Container>
          <article className="mx-auto max-w-4xl py-12 sm:py-16">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#007f75]">Legal information</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#003842] sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-600">{summary}</p>
            <p className="mt-3 text-sm text-gray-500">Last updated: 23 August 2026</p>
            <div className="legal-content mt-10 space-y-9">{children}</div>
          </article>
        </Container>
      </main>

      <footer className="border-t border-white/10 bg-[#003842] py-8 text-white">
        <Container>
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-white/70">© 2026 AllyJen Solutions Limited. CRO No. 811542.</p>
            <nav aria-label="Legal pages" className="flex flex-wrap justify-center gap-5 text-sm">
              <Link href="/privacy" className="hover:text-[#8dd8d2]">Privacy</Link>
              <Link href="/cookies" className="hover:text-[#8dd8d2]">Cookies</Link>
              <Link href="/terms" className="hover:text-[#8dd8d2]">Terms</Link>
            </nav>
          </div>
        </Container>
      </footer>
    </div>
  )
}
