'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown, X } from 'lucide-react'
import { CharacterMessageForm } from '@/components/messaging/CharacterMessageForm'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Character = 'ally' | 'jen'

const ALWAYS_ALLY_PATHS = ['/admin/menu-builder', '/admin/ingredients', '/admin/kiosks', '/admin/suppliers']
const ALWAYS_JEN_PATHS = ['/admin/compliance', '/admin/settings', '/admin/help', '/super-admin']

function resolveCharacter(pathname: string | null): Character {
  if (ALWAYS_ALLY_PATHS.some((path) => pathname?.startsWith(path))) return 'ally'
  if (ALWAYS_JEN_PATHS.some((path) => pathname?.startsWith(path))) return 'jen'
  if (typeof window === 'undefined') return 'jen'
  const visits = Number.parseInt(sessionStorage.getItem('coach_visit') ?? '0', 10)
  sessionStorage.setItem('coach_visit', String(visits + 1))
  return visits % 2 === 0 ? 'ally' : 'jen'
}

export function JenCoach() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [character, setCharacter] = useState<Character>(() => resolveCharacter(pathname))
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(() => typeof window !== 'undefined' && sessionStorage.getItem('jencoach_dismissed') === '1')

  useEffect(() => {
    setCharacter(resolveCharacter(pathname))
    setOpen(false)
  }, [pathname])

  function dismissCoach() {
    sessionStorage.setItem('jencoach_dismissed', '1')
    setOpen(false)
    setDismissed(true)
  }

  const characterName = character === 'ally' ? 'Ally' : 'Jen'
  const avatar = character === 'ally' ? '/Ally_9.svg' : '/Jen_2.svg'

  return (
    <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-12 sm:right-6 lg:bottom-[56px]">
      {open && (
        <div className="flex w-[350px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" style={{ maxHeight: 'min(620px, calc(100vh - 160px))' }}>
          <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: character === 'ally' ? '#0e7066' : '#003842' }}>
            <Image src={avatar} alt={characterName} width={38} height={38} className="rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{t('liveDashboard.messageCharacter', { name: characterName })}</p>
              <p className="text-xs leading-tight text-white/70">{t('liveDashboard.contactTeam')}</p>
            </div>
            <button type="button" onClick={dismissCoach} className="rounded px-2 py-1 text-[11px] text-white/60 transition-colors hover:bg-white/10 hover:text-white" title={t('liveDashboard.hideUntilLogin')}>{t('liveDashboard.hide')}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 transition-colors hover:bg-white/10" aria-label={t('liveDashboard.closeMessage', { name: characterName })}><ChevronDown size={18} /></button>
          </div>
          <CharacterMessageForm key={`${character}-${pathname}`} character={character} context={`Admin portal: ${pathname || '/admin'}`} />
        </div>
      )}

      {!dismissed && (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="relative flex h-[56px] cursor-pointer items-center gap-0 overflow-visible rounded-full shadow-2xl transition-all duration-200 hover:scale-[1.03] hover:shadow-teal-400/30 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 active:scale-[0.97] sm:h-[62px]"
          style={{ background: open ? 'linear-gradient(135deg, #003842 0%, #005a6e 100%)' : 'linear-gradient(135deg, #003842 0%, #00616e 60%, #42b8ac 100%)', paddingRight: open ? '0' : '18px' }}
          aria-label={open ? t('liveDashboard.closeMessage', { name: characterName }) : t('liveDashboard.contactUs')}
        >
          <span className="relative -my-1 -ml-1 shrink-0 sm:-my-3">
            <Image src={avatar} alt="" width={78} height={78} className="block h-[52px] w-[52px] rounded-full ring-2 ring-white/40 sm:h-[78px] sm:w-[78px]" />
          </span>
          {open ? (
            <span className="ml-1 mr-1 flex h-10 w-10 items-center justify-center"><X size={20} className="text-white" /></span>
          ) : (
            <span className="ml-2 hidden text-[15px] font-bold tracking-wide text-white sm:block">{t('liveDashboard.contactUs')}</span>
          )}
        </button>
      )}
    </div>
  )
}
