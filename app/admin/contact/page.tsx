'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Mail, MessageCircle } from 'lucide-react'
import { CharacterMessageForm } from '@/components/messaging/CharacterMessageForm'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Character = 'ally' | 'jen'

export default function ContactPage() {
  const { t } = useTranslation()
  const [character, setCharacter] = useState<Character>('ally')
  const characterSelected = useRef(false)

  useEffect(() => {
    if (characterSelected.current) return
    characterSelected.current = true
    const previous = sessionStorage.getItem('contact_character')
    const next: Character = previous === 'ally' ? 'jen' : 'ally'
    sessionStorage.setItem('contact_character', next)
    setCharacter(next)
  }, [])

  const characterName = character === 'ally' ? 'Ally' : 'Jen'
  const avatar = character === 'ally' ? '/Ally_9.svg' : '/Jen_2.svg'
  const accent = character === 'ally' ? '#0e7066' : '#003842'

  return <Container>
    <div className="mx-auto max-w-2xl py-4 sm:py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#003842] text-white"><MessageCircle aria-hidden="true" /></span>
        <div><h1 className="text-3xl font-bold text-[#003842] dark:text-white">{t('liveDashboard.contactUs')}</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">{t('liveDashboard.contactTeam')}</p></div>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-4 border-b border-teal-100 bg-gradient-to-br from-white to-teal-50 px-4 py-5 sm:px-6 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
          <Image src={avatar} alt={characterName} width={88} height={88} priority className="h-20 w-20 shrink-0 rounded-full object-contain ring-2 ring-white shadow-lg sm:h-24 sm:w-24" />
          <div className="min-w-0">
            <p className="mb-2 text-sm font-bold" style={{ color: accent }}>{t('liveDashboard.messageCharacter', { name: characterName })}</p>
            <div className="relative rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm leading-relaxed text-gray-700 shadow-sm ring-1 ring-teal-100 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700">
              {t('messaging.intro', { name: characterName })}
            </div>
          </div>
        </div>
        <CharacterMessageForm character={character} context="Admin contact page" showIntro={false} />
      </Card>
      <p className="mt-5 text-center text-sm text-gray-600 dark:text-gray-300">
        <a className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-medium text-[#006b68] underline dark:text-[#42b8ac]" href="mailto:info@allyjen.ie"><Mail className="h-4 w-4" aria-hidden="true" />info@allyjen.ie</a>
      </p>
    </div>
  </Container>
}
