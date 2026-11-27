import { notFound } from 'next/navigation'
import { BowlBuilder } from '@/components/kiosk/BowlBuilder'
import { reviewBowlSource } from '@/lib/server/bowl-guide'
import { previewBowlSource } from './fixture'

export const dynamic = 'force-dynamic'

const { bowl } = reviewBowlSource(previewBowlSource)

export default function BowlPreviewPage() {
  if (process.env.NODE_ENV === 'production' || !bowl) notFound()

  return (
    <main className="min-h-screen bg-[#f4f8f7] px-4 py-8 text-[#003842] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 space-y-3">
          <p className="text-sm font-semibold">AllyJen · Maynooth pilot preview</p>
          <h1 className="text-4xl font-extrabold sm:text-5xl">Build your bowl</h1>
          <p className="max-w-xl text-sm text-slate-700">This test uses fictional allergen records and includes a placeholder for the unverified collagen crumb. Use the venue’s current guide for food served at OAKBERRY.</p>
        </header>
        <BowlBuilder groups={bowl.groups} fixed={bowl.fixed} />
      </div>
    </main>
  )
}
