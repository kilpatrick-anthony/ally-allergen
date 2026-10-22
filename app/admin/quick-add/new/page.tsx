import { redirect } from 'next/navigation'

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const query = new URLSearchParams()
  if (params.site) query.set('site', params.site)
  if (params.kind === 'packaged_product') query.set('type', 'packaged_product')
  redirect(`${params.kind === 'ingredient' || !params.kind ? '/admin/ingredients/new' : '/admin/menu-builder/new'}?${query}`)
}
