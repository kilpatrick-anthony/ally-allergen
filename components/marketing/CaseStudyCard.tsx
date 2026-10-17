import Link from 'next/link'
import { ArrowRight, Globe, Mail, QrCode, Tablet } from 'lucide-react'
import { oakberryCaseStudy } from '@/lib/oakberry-case-study'

export function CaseStudyCard() {
  return <article className="grid overflow-hidden rounded-3xl border border-[#003842]/10 bg-white shadow-sm lg:grid-cols-[0.85fr_1.15fr]">
    <div className="flex flex-col justify-between gap-10 bg-[#003842] p-7 text-white sm:p-10">
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8dd8d2]">A customer story</p>
        <p className="text-3xl font-bold tracking-tight sm:text-4xl">OAKBERRY</p>
        <p className="mt-1 text-lg text-white/80">Maynooth, Co. Kildare</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          { icon: Tablet, label: 'In-store tablet' },
          { icon: QrCode, label: 'QR code' },
          { icon: Mail, label: 'Email access' },
          { icon: Globe, label: 'Website access' },
        ].map(({ icon: Icon, label }) => <div key={label} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 p-3">
          <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#8dd8d2]" /><span>{label}</span>
        </div>)}
      </div>
    </div>
    <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
      <h3 className="mb-4 text-2xl font-bold leading-tight text-[#003842] sm:text-3xl">Making allergen information easier for everyone</h3>
      <p className="mb-7 text-base leading-relaxed text-slate-600 sm:text-lg">{oakberryCaseStudy.summary}</p>
      <Link href={oakberryCaseStudy.href} className="inline-flex min-h-11 w-fit items-center gap-3 rounded-full bg-[#003842] px-6 py-3 font-bold text-white transition-colors hover:bg-[#07545e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#003842]">
        Read the OAKBERRY case study <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
      </Link>
    </div>
  </article>
}
