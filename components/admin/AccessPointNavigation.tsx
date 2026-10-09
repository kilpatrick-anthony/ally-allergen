'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe, Monitor, QrCode } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function AccessPointNavigation() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const links = [
    { href: '/admin/qr-codes', label: t('accessPoints.qrCodes'), Icon: QrCode },
    { href: '/admin/devices', label: t('adminPortal.kioskDevices'), Icon: Monitor },
    { href: '/admin/website-links', label: t('websiteLinks.title'), Icon: Globe },
  ]

  return (
    <nav aria-label={t('adminPortal.accessPoints')} className="flex flex-wrap gap-2 border-b border-gray-200">
      {links.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}
          className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm ${pathname === href
            ? 'border-[#42b8ac] font-semibold text-[#003842]'
            : 'border-transparent font-medium text-gray-500 hover:text-gray-800'}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />{label}
        </Link>
      ))}
    </nav>
  )
}
