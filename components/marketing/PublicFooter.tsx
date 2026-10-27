import Link from 'next/link'
import { Container } from '@/components/layout/Container'

export function PublicFooter() {
  return (
      <footer className="bg-[#003842] border-t border-white/10 py-10">
        <Container>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img src="/Logo-AllyJen.svg" alt="AllyJen" className="h-24 w-auto" />
            <div className="flex flex-col items-center md:items-end gap-3">
              <div className="grid grid-cols-3 place-items-center gap-3" aria-label="Contact AllyJen">
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
  )
}
