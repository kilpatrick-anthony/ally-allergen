'use client'

import AccessPointNavigation from '@/components/admin/AccessPointNavigation'
import { Container } from '@/components/layout/Container'
import QRCodeManagement from '@/components/admin/QRCodeManagement'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function QRCodesPage() {
  const { t } = useTranslation()
  return (
    <Container>
      <div className="space-y-6 py-8">
        <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('adminPortal.accessPoints')}</h1><p className="mt-2 text-gray-600">{t('adminPortal.accessPointsDescription')}</p></div>
        <AccessPointNavigation />
        <QRCodeManagement />
      </div>
    </Container>
  )
}
