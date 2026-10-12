'use client'

import { Mail, MessageCircle } from 'lucide-react'
import { CharacterMessageForm } from '@/components/messaging/CharacterMessageForm'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function ContactPage() {
  const { t } = useTranslation()

  return <Container>
    <div className="mx-auto max-w-2xl py-4 sm:py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#003842] text-white"><MessageCircle aria-hidden="true" /></span>
        <div><h1 className="text-3xl font-bold text-[#003842] dark:text-white">{t('liveDashboard.contactUs')}</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">{t('liveDashboard.contactTeam')}</p></div>
      </div>
      <Card className="overflow-hidden p-0">
        <CharacterMessageForm character="jen" context="Admin contact page" />
      </Card>
      <p className="mt-5 text-center text-sm text-gray-600 dark:text-gray-300">
        <a className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-medium text-[#006b68] underline dark:text-[#42b8ac]" href="mailto:info@allyjen.ie"><Mail className="h-4 w-4" aria-hidden="true" />info@allyjen.ie</a>
      </p>
    </div>
  </Container>
}
