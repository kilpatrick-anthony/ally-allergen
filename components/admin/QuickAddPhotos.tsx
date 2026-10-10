'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Photo = { id: string; state: 'pending' | 'ready'; file?: Blob; preview?: string; error?: string }
type Props = { draftId: string; disabled?: boolean; onActivity: (busy: boolean, unsaved: boolean) => void }

async function prepare(file: File): Promise<Blob> {
  if (file.size > 30 * 1024 * 1024) throw new Error('photoSourceTooLarge')
  if (!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name) && !/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) throw new Error('photoFormat')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode().catch(() => { throw new Error('photoFormat') })
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 50_000_000) throw new Error('photoInvalid')
    const scale = Math.min(1, 3200 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('photoInvalid')
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('photoInvalid')), 'image/jpeg', 0.9))
    if (blob.size > 4 * 1024 * 1024) throw new Error('photoTooLarge')
    return blob
  } finally { URL.revokeObjectURL(url) }
}

const knownErrors = ['photoFormat', 'photoInvalid', 'photoTooLarge', 'photoSourceTooLarge', 'photoLimit', 'photoConflict', 'unauthorized', 'forbidden', 'notFound', 'editConflict']
const errorCode = (reason: unknown) => reason instanceof Error && knownErrors.includes(reason.message) ? reason.message : 'photoFailed'

export default function QuickAddPhotos({ draftId, disabled, onActivity }: Props) {
  const { t } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [working, setWorking] = useState(false)
  const lock = useRef(false)
  const previews = useRef(new Set<string>())
  const base = `/api/quick-add-drafts/${draftId}/photos`

  useEffect(() => {
    const urls = previews.current
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear() }
  }, [])
  useEffect(() => { onActivity(working, photos.some(photo => !!photo.file && photo.state !== 'ready')) }, [working, photos, onActivity])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setLoadFailed(false)
    void fetch(base, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      if (!controller.signal.aborted) { setPhotos(data.photos); setError('') }
    }).catch(reason => { if (!controller.signal.aborted) { setLoadFailed(true); setError(errorCode(reason)) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [base, attempt])

  async function upload(photo: Photo) {
    try {
      const response = await fetch(`${base}/${photo.id}`, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: photo.file, signal: AbortSignal.timeout(60000) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setPhotos(current => current.map(item => item.id === photo.id ? { ...data.photo, preview: item.preview } : item))
    } catch (reason) {
      setPhotos(current => current.map(item => item.id === photo.id ? { ...item, error: errorCode(reason) } : item))
    }
  }

  async function choose(files: File[]) {
    if (lock.current || disabled) return
    lock.current = true; setWorking(true); setError('')
    try {
      if (files.length + photos.length > 12) throw new Error('photoLimit')
      for (const file of files) {
        try {
          const prepared = await prepare(file)
          const preview = URL.createObjectURL(prepared)
          previews.current.add(preview)
          const photo: Photo = { id: crypto.randomUUID(), state: 'pending', file: prepared, preview }
          setPhotos(current => [...current, photo])
          await upload(photo)
        } catch (reason) { setError(errorCode(reason)) }
      }
    } catch (reason) { setError(errorCode(reason)) }
    finally { lock.current = false; setWorking(false) }
  }

  async function act(photo: Photo, remove: boolean) {
    if (lock.current || disabled) return
    lock.current = true; setWorking(true)
    try {
      if (!remove) { await upload(photo); return }
      const response = await fetch(`${base}/${photo.id}`, { method: 'DELETE', signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error((await response.json()).error)
      setPhotos(current => current.filter(item => item.id !== photo.id))
      if (photo.preview) { URL.revokeObjectURL(photo.preview); previews.current.delete(photo.preview) }
    } catch (reason) {
      setPhotos(current => current.map(item => item.id === photo.id ? { ...item, error: errorCode(reason) } : item))
    } finally { lock.current = false; setWorking(false) }
  }

  const blocked = disabled || working || loading || loadFailed
  return <section aria-label={text('photos')} className="mt-5 space-y-3 border-t pt-4 dark:border-gray-700">
    <h3 className="font-semibold">{text('photos')}</h3>
    <p className="text-sm text-gray-600 dark:text-gray-300">{text('photoHelp')}</p>
    {loading ? <p role="status">{text('loading')}</p> : <>
      <div className="flex flex-wrap gap-3">
        <label className="relative rounded-lg border p-3 focus-within:ring-2 focus-within:ring-teal-600">
          {text('takePhoto')}
          <input aria-label={text('takePhoto')} type="file" accept="image/*" capture="environment" disabled={blocked}
            className="absolute inset-0 w-full opacity-0" onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void choose(files) }} />
        </label>
        <label className="relative rounded-lg border p-3 focus-within:ring-2 focus-within:ring-teal-600">
          {text('choosePhotos')}
          <input aria-label={text('choosePhotos')} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple disabled={blocked}
            className="absolute inset-0 w-full opacity-0" onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void choose(files) }} />
        </label>
      </div>
      {working && <p role="status">{text('photoWorking')}</p>}
      {error && <div role="alert"><p className="text-sm text-red-700 dark:text-red-300">{text(error)}</p>
        {loadFailed && <Button type="button" variant="outline" disabled={working} onClick={() => setAttempt(value => value + 1)}>{text('retry')}</Button>}
      </div>}
      <ul className="grid grid-cols-2 gap-3">
        {photos.map((photo, index) => <li key={photo.id} className="min-w-0 rounded-lg border p-2">
          {photo.preview || photo.state === 'ready' ? <a href={photo.preview || `${base}/${photo.id}`} target="_blank" rel="noopener noreferrer" aria-label={`${text('openPhoto')} ${index + 1}`}>
            {/* Private API image: do not route evidence through Next's image cache. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.preview || `${base}/${photo.id}`} alt={`${text('labelPhoto')} ${index + 1}`} className="h-32 w-full object-contain" />
          </a> : <p className="text-sm">{text('photoInterrupted')}</p>}
          <p className="mt-2 text-sm">{text(photo.state === 'ready' ? 'photoSaved' : 'photoPending')}</p>
          {photo.error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{text(photo.error)}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {photo.file && photo.state !== 'ready' && <Button type="button" variant="outline" disabled={blocked} onClick={() => void act(photo, false)}>{text('retry')}</Button>}
            <Button type="button" variant="ghost" disabled={blocked} aria-label={`${text('removePhoto')} ${index + 1}`} onClick={() => void act(photo, true)}>{text('removePhoto')}</Button>
          </div>
        </li>)}
      </ul>
    </>}
  </section>
}
