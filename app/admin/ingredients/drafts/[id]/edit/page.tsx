import IngredientDraftEditor from '@/components/admin/IngredientDraftEditor'

export default async function IngredientDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <IngredientDraftEditor id={id} />
}
