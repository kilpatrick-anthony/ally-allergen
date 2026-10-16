'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import RegularIngredientForm from '@/components/admin/RegularIngredientForm'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useListReturnPath } from '@/lib/hooks/useListReturnPath'

export default function IngredientDraftEditor({ id }: { id: string }) {
  const { t } = useTranslation()
  const { returnTo, withReturnTo } = useListReturnPath('/admin/ingredients')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError(false); setData(null)
    fetch(`/api/ingredient-drafts/${encodeURIComponent(id)}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error()
      const result = await response.json()
      if (!result.draft || !Array.isArray(result.datasheets)) throw new Error()
      if (!controller.signal.aborted) setData(result)
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [id, attempt])
  if (!data) return <Container><div data-no-translate className="py-8" role={error ? 'alert' : 'status'}>
    <p>{t(error ? 'ingredientDrafts.loadFailed' : 'ingredientDrafts.loading')}</p>
    {error && <Button onClick={() => setAttempt(value => value + 1)}>{t('regularLists.retry')}</Button>}
    <Link className="block py-3 underline" href={returnTo}>{t('ingredientsPortal.backToIngredients')}</Link>
  </div></Container>
  if (data.draft.ingredient_id) return <Container><div data-no-translate className="py-8">
    <p>{t('ingredientDrafts.alreadyActive')}</p>
    <Link className="block py-3 underline" href={withReturnTo(`/admin/ingredients/${data.draft.ingredient_id}`)}>{t('ingredientDrafts.viewActive')}</Link>
    <Link className="block py-3 underline" href={returnTo}>{t('ingredientsPortal.backToIngredients')}</Link>
  </div></Container>
  return <RegularIngredientForm key={id} draft={data.draft} initialDatasheets={data.datasheets} />
}
