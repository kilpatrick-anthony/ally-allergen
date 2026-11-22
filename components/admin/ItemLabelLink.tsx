'use client'

import Link from 'next/link'
import type { MouseEventHandler } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function ItemLabelLink({
  kind,
  id,
  compact = true,
  onClick,
}: {
  kind: 'ingredient' | 'menu-item'
  id: string
  compact?: boolean
  onClick?: MouseEventHandler<HTMLAnchorElement>
}) {
  const href = kind === 'ingredient'
    ? `/admin/labels?ingredient=${encodeURIComponent(id)}`
    : `/admin/labels?item=${encodeURIComponent(id)}`
  const label = compact ? 'Create or print label' : 'Create / print label'

  return (
    <Link href={href} onClick={onClick} aria-label={label} title={label}>
      <Button
        type="button"
        variant={compact ? 'ghost' : 'outline'}
        size={compact ? 'sm' : 'md'}
        icon={<Printer className="h-4 w-4" />}
      >
        {compact ? null : label}
      </Button>
    </Link>
  )
}
