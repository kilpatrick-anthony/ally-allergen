import Link from 'next/link'
import { Plus, type LucideIcon } from 'lucide-react'

type Props = {
  title: string
  description: string
  icon: LucideIcon
  addHref: string
  addLabel: string
  stats: { label: string; value: number; href?: string }[]
}

export function ManagementListHeader({ title, description, icon: Icon, addHref, addLabel, stats }: Props) {
  return <header className="mb-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="rounded-lg bg-teal-600 p-2"><Icon aria-hidden="true" className="h-6 w-6 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p></div>
      </div>
      <Link href={addHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
        <Plus aria-hidden="true" className="h-5 w-5 shrink-0" />{addLabel}
      </Link>
    </div>
    <dl className="mt-4 grid grid-cols-3 divide-x divide-gray-200 rounded-lg border border-gray-200 bg-white py-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
      {stats.map(stat => <div key={stat.label} className="min-w-0 px-3">
        <dt className="break-words text-xs text-gray-600 dark:text-gray-300">{stat.href ? <Link className="underline focus-visible:outline" href={stat.href}>{stat.label}</Link> : stat.label}</dt>
        <dd className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{stat.value}</dd>
      </div>)}
    </dl>
  </header>
}
