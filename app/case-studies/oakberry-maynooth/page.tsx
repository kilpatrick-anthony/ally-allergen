import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Globe, Mail, QrCode, Tablet } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { CaseStudyHeader } from '@/components/marketing/CaseStudyHeader'
import { PublicFooter } from '@/components/marketing/PublicFooter'
import { oakberryCaseStudy as story } from '@/lib/oakberry-case-study'

const url = `https://allyjen.ie${story.href}`
const socialImage = { url: '/AllyJen Logo (1200 x 630 px).png', width: 1200, height: 630, alt: 'AllyJen — Serving Confidence' }

export const metadata: Metadata = {
  title: 'OAKBERRY Maynooth Case Study',
  description: story.summary,
  alternates: { canonical: url },
  openGraph: { type: 'article', title: story.title, description: story.summary, url, siteName: 'AllyJen', locale: 'en_IE', images: [socialImage] },
  twitter: { card: 'summary_large_image', title: story.title, description: story.summary, images: [socialImage.url] },
}

const accessIcons = [Tablet, QrCode, Mail]

export default function OakberryCaseStudyPage() {
  return <div data-no-translate className="min-h-screen bg-white text-slate-700" style={{ fontFamily: 'var(--font-atkinson), sans-serif' }}>
    <a href="#case-study-content" className="sr-only z-50 rounded-lg bg-white p-3 text-[#003842] focus:not-sr-only focus:absolute focus:left-4 focus:top-4">Skip to case study</a>
    <CaseStudyHeader />
    <main id="case-study-content">
      <article>
        <header className="overflow-hidden bg-[#003842] pb-16 pt-8 text-white sm:pb-20 sm:pt-10">
          <Container>
            <nav aria-label="Breadcrumb" className="mb-10 text-sm text-white/80 sm:mb-14">
              <ol className="flex flex-wrap items-center gap-x-2">
                <li className="inline-flex items-center"><Link href="/" className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:underline">Home</Link></li>
                <li className="inline-flex items-center gap-2 whitespace-nowrap">
                  <span aria-hidden="true">/</span>
                  <Link href="/#case-studies" className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:underline">Case studies</Link>
                </li>
                <li className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap">
                  <span aria-hidden="true">/</span>
                  <span aria-current="page">OAKBERRY Maynooth</span>
                </li>
              </ol>
            </nav>
            <div className="max-w-4xl">
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#8dd8d2]">Customer case study</p>
              <h1 className="mb-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{story.title}</h1>
              <p className="max-w-3xl text-lg leading-relaxed text-white/85 sm:text-xl">{story.introduction}</p>
            </div>
            <ul aria-label="Ways to access AllyJen at OAKBERRY Maynooth" className="mt-9 flex flex-wrap gap-3 text-sm">
              {[{ icon: Tablet, label: 'In-store tablet' }, { icon: QrCode, label: 'QR code' }, { icon: Mail, label: 'Email' }, { icon: Globe, label: 'Website' }].map(({ icon: Icon, label }) => <li key={label} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2"><Icon className="h-4 w-4 text-[#8dd8d2]" aria-hidden="true" />{label}</li>)}
            </ul>
          </Container>
        </header>
        <Container>
          <div className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
            <aside className="self-start rounded-2xl border border-[#003842]/10 bg-[#f0f9f8] p-6 lg:sticky lg:top-8">
              <p id="story-contents-heading" className="mb-4 text-sm font-bold text-[#003842]">In this case study</p>
              <nav aria-labelledby="story-contents-heading">
                <ul className="space-y-4 text-sm leading-relaxed">
                  {story.sections.map(section => <li key={section.id}><a href={`#${section.id}`} className="block rounded-sm text-[#165c62] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#003842]">{section.heading}</a></li>)}
                </ul>
              </nav>
              <Link href="/book-demo" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-sm font-bold text-[#003842] underline underline-offset-4">Book a demo <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            </aside>
            <div className="min-w-0 max-w-3xl space-y-12">
              {story.sections.map(section => <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-8">
                <h2 id={`${section.id}-heading`} className="mb-5 text-2xl font-bold leading-tight text-[#003842] sm:text-3xl">{section.heading}</h2>
                <div className="space-y-5 text-lg leading-relaxed">
                  {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                  {section.id === 'customer-access' && <ul className="my-7 space-y-4">
                    {story.accessOptions.map((option, index) => {
                      const Icon = accessIcons[index]
                      return <li key={option.label} className="flex gap-4 rounded-2xl border border-[#003842]/10 p-5">
                        <Icon aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-[#18756e]" />
                        <p><strong className="font-bold text-[#003842]">{option.label}</strong> {option.text}</p>
                      </li>
                    })}
                    <li className="flex gap-4 rounded-2xl border border-[#003842]/10 p-5">
                      <Globe aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-[#18756e]" />
                      <p><strong className="font-bold text-[#003842]">Through the OAKBERRY website:</strong> Access AllyJen at <a href="https://oakberry.ie" className="break-words font-bold text-[#165c62] underline underline-offset-4">oakberry.ie</a>, including before visiting the store.</p>
                    </li>
                  </ul>}
                  {'closing' in section && <p>{section.closing}</p>}
                </div>
              </section>)}
              <section aria-labelledby="case-study-demo-heading" className="rounded-3xl bg-[#003842] p-7 text-white sm:p-9">
                <h2 id="case-study-demo-heading" className="mb-4 text-2xl font-bold leading-tight">Want to make allergen information easier to access in your business?</h2>
                <p className="mb-6 text-lg leading-relaxed text-white/85">Visit <Link href="/" className="font-bold underline underline-offset-4">allyjen.ie</Link> to book a demo.</p>
                <Link href="/book-demo" className="inline-flex min-h-11 items-center gap-3 rounded-full bg-[#8dd8d2] px-6 py-3 font-bold text-[#003842] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Book a demo <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
              </section>
              <Link href="/#case-studies" className="inline-flex min-h-11 items-center gap-2 rounded-sm font-bold text-[#165c62] underline underline-offset-4"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to case studies</Link>
            </div>
          </div>
        </Container>
      </article>
    </main>
    <PublicFooter />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article', headline: story.title,
      description: story.summary, url, mainEntityOfPage: url,
      image: new URL(socialImage.url, 'https://allyjen.ie').href,
      author: { '@id': 'https://allyjen.ie/#organization' }, publisher: { '@id': 'https://allyjen.ie/#organization' },
    }).replace(/</g, '\\u003c') }} />
  </div>
}
