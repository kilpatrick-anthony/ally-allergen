'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { CharacterMessageForm } from '@/components/messaging/CharacterMessageForm'

interface AllyChatProps {
  businessName?: string
}

export function AllyChat({ businessName = '' }: AllyChatProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2 sm:right-6">
      {open && (
        <div className="flex w-[350px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-2xl" style={{ maxHeight: 'min(620px, calc(100vh - 120px))' }}>
          <div className="flex items-center gap-3 bg-[#003842] px-4 py-3 text-white">
            <Image src="/Ally_9.svg" alt="Ally" width={38} height={38} className="rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Message Ally</p>
              <p className="text-xs leading-tight text-teal-200">Contact the AllyJen team</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 transition-colors hover:bg-white/10" aria-label="Close Ally message form">
              <ChevronDown size={18} />
            </button>
          </div>
          <CharacterMessageForm character="ally" context={businessName ? `Customer kiosk: ${businessName}` : 'Customer kiosk'} customerFacing />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-[56px] items-center gap-0 overflow-visible rounded-full shadow-2xl transition-all duration-200 hover:scale-[1.03] hover:shadow-teal-400/30 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 active:scale-[0.97] sm:h-[62px]"
        style={{ background: open ? 'linear-gradient(135deg, #003842 0%, #005a6e 100%)' : 'linear-gradient(135deg, #003842 0%, #00616e 60%, #42b8ac 100%)', paddingRight: open ? '0' : '18px' }}
        aria-label={open ? 'Close Ally message form' : 'Message Ally'}
      >
        <span className="relative -my-1 -ml-1 shrink-0 sm:-my-3">
          <Image src="/Ally_9.svg" alt="" width={78} height={78} className="block h-[52px] w-[52px] rounded-full ring-2 ring-white/40 sm:h-[78px] sm:w-[78px]" />
        </span>
        {open ? (
          <span className="ml-1 mr-1 flex h-10 w-10 items-center justify-center"><X size={20} className="text-white" /></span>
        ) : (
          <span className="ml-2 hidden text-[15px] font-bold tracking-wide text-white sm:block">Message Ally</span>
        )}
      </button>
    </div>
  )
}
