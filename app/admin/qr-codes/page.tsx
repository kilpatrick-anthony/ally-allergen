'use client'

import Link from 'next/link'
import { Monitor, QrCode } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import QRCodeManagement from '@/components/admin/QRCodeManagement'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function QRCodesPage() {
  const { t } = useTranslation()
  return (
    <Container>
      <div className="space-y-6 py-8">
        <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('adminPortal.accessPoints')}</h1><p className="mt-2 text-gray-600">{t('adminPortal.accessPointsDescription')}</p></div>
        <div className="flex gap-2 border-b border-gray-200">
          <Link href="/admin/qr-codes" className="inline-flex items-center gap-2 border-b-2 border-[#42b8ac] px-3 py-3 text-sm font-semibold text-[#003842]"><QrCode className="h-4 w-4" />{t('accessPoints.qrCodes')}</Link>
          <Link href="/admin/devices" className="inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-gray-500 hover:text-gray-800"><Monitor className="h-4 w-4" />{t('adminPortal.kioskDevices')}</Link>
        </div>
        <QRCodeManagement />
      </div>
    </Container>
  )
}
