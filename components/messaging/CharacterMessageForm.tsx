'use client'

import { useState } from 'react'
import { CheckCircle, Send } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Character = 'ally' | 'jen'

interface CharacterMessageFormProps {
  character: Character
  context?: string
  customerFacing?: boolean
}

interface FormState {
  name: string
  email: string
  message: string
  website: string
}

const EMPTY_FORM: FormState = { name: '', email: '', message: '', website: '' }

export function CharacterMessageForm({ character, context = '', customerFacing = false }: CharacterMessageFormProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const characterName = character === 'ally' ? 'Ally' : 'Jen'
  const accent = character === 'ally' ? '#42b8ac' : '#003842'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/support-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, character: characterName, context }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || t('messaging.sendError'))
      setForm(EMPTY_FORM)
      setSent(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('messaging.sendError'))
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6 py-10 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-700">
          <CheckCircle className="h-8 w-8" />
        </span>
        <h3 className="text-lg font-bold text-[#003842]">{t('messaging.messageSent')}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{t('messaging.thanks')}</p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-[#0e7066] transition-colors hover:bg-teal-50"
        >
          {t('messaging.sendAnother')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-gray-50 p-4">
      <div className="mb-4 rounded-xl border border-teal-100 bg-white px-3 py-3 text-sm leading-relaxed text-gray-700 shadow-sm">
        {t('messaging.intro', { name: characterName })}
      </div>
      {customerFacing && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          {t('messaging.urgentAllergen')}
        </div>
      )}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-gray-700">
          {t('messaging.yourName')}
          <input required maxLength={100} autoComplete="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200" />
        </label>
        <label className="block text-xs font-semibold text-gray-700">
          {t('messaging.replyEmail')}
          <input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200" />
        </label>
        <label className="block text-xs font-semibold text-gray-700">
          {t('messaging.howCanWeHelp')}
          <textarea required rows={4} maxLength={3000} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200" />
        </label>
        <label className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
          {t('messaging.website')}
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} />
        </label>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <button type="submit" disabled={submitting} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: accent }}>
        <Send className="h-4 w-4" />
        {submitting ? t('messaging.sending') : t('messaging.sendMessage')}
      </button>
    </form>
  )
}
