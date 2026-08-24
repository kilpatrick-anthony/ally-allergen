// app/admin/suppliers/[id]/edit/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Save, AlertCircle, MessageSquare, Trash2 } from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface SupplierForm {
  name: string
  contact: string
  phone: string
  email: string
  website: string
}

interface SupplierNote {
  id: string
  note: string
  created_at: string
  updated_at?: string
  created_by?: string
}

export default function SupplierEditPage() {
  const params = useParams()
  const router = useRouter()
  const { t, language } = useTranslation()
  const supplierId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SupplierForm | null>(null)
  const [notes, setNotes] = useState<SupplierNote[]>([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [noteDraft, setNoteDraft] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        setLoading(true)
        setNotesLoading(true)
        const [response, notesResponse] = await Promise.all([
          fetch(`/api/suppliers/${supplierId}`),
          fetch(`/api/suppliers/${supplierId}/notes`),
        ])
        const [data, notesData] = await Promise.all([response.json(), notesResponse.json()])

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch supplier')
        }

        setForm({
          name: data.supplier.name || '',
          contact: data.supplier.contact || '',
          phone: data.supplier.phone || '',
          email: data.supplier.email || '',
          website: data.supplier.website || ''
        })
        setNotes(notesResponse.ok ? notesData.notes || [] : [])
      } catch (error: any) {
        console.error('Error fetching supplier:', error)
        setForm(null)
        setNotes([])
      } finally {
        setLoading(false)
        setNotesLoading(false)
      }
    }

    fetchSupplier()
  }, [supplierId])

  const handleChange = (field: keyof SupplierForm, value: string) => {
    setForm((current) => current ? { ...current, [field]: value } : current)
  }

  const handleSave = async () => {
    if (!form) return
    if (!form.name.trim()) {
      alert(t('supplierPortal.nameRequired'))
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (!response.ok) {
        throw new Error(t('supplierPortal.updateError'))
      }

      router.push(`/admin/suppliers/${supplierId}`)
    } catch (error: any) {
      console.error('Error updating supplier:', error)
      alert(error.message || t('supplierPortal.updateError'))
    } finally {
      setSaving(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteDraft.trim()) {
      return
    }

    try {
      setNotesSaving(true)
      const response = await fetch(`/api/suppliers/${supplierId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteDraft.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(t('supplierPortal.addNoteError'))
      }

      setNotes((prev) => [data.note, ...prev])
      setNoteDraft('')
    } catch (error: any) {
      console.error('Error adding supplier note:', error)
      alert(error.message || t('supplierPortal.addNoteError'))
    } finally {
      setNotesSaving(false)
    }
  }

  const handleStartEditNote = (note: SupplierNote) => {
    setEditingNoteId(note.id)
    setEditingNoteText(note.note)
  }

  const handleCancelEditNote = () => {
    setEditingNoteId(null)
    setEditingNoteText('')
  }

  const handleUpdateNote = async () => {
    if (!editingNoteId || !editingNoteText.trim()) {
      return
    }

    try {
      setNotesSaving(true)
      const response = await fetch(`/api/suppliers/${supplierId}/notes/${editingNoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: editingNoteText.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(t('supplierPortal.updateNoteError'))
      }

      setNotes((prev) => prev.map((note) => (note.id === data.note.id ? data.note : note)))
      handleCancelEditNote()
    } catch (error: any) {
      console.error('Error updating supplier note:', error)
      alert(error.message || t('supplierPortal.updateNoteError'))
    } finally {
      setNotesSaving(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm(t('supplierPortal.deleteNoteConfirm'))) {
      return
    }

    try {
      setNotesSaving(true)
      const response = await fetch(`/api/suppliers/${supplierId}/notes/${noteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(t('supplierPortal.deleteNoteError'))
      }

      setNotes((prev) => prev.filter((note) => note.id !== noteId))
      if (editingNoteId === noteId) {
        handleCancelEditNote()
      }
    } catch (error: any) {
      console.error('Error deleting supplier note:', error)
      alert(error.message || t('supplierPortal.deleteNoteError'))
    } finally {
      setNotesSaving(false)
    }
  }

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="relative h-12 w-12 mx-auto mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            <p className="text-gray-600">{t('supplierPortal.loadingSupplier')}</p>
          </div>
        </div>
      </Container>
    )
  }

  if (!form) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">{t('supplierPortal.supplierNotFound')}</p>
            <Link href="/admin/suppliers">
              <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} className="mt-4">
                {t('supplierPortal.backToSuppliers')}
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="py-8">
        <div className="flex items-center justify-between">
          <Link href={`/admin/suppliers/${supplierId}`}>
            <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
              {t('supplierPortal.backToSupplier')}
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/admin/suppliers">
              <Button variant="ghost">
                {t('accessPoints.cancel')}
              </Button>
            </Link>
            <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={handleSave} disabled={saving}>
              {saving ? t('supplierPortal.saving') : t('admin.saveChanges')}
            </Button>
          </div>
        </div>

        <Card className="mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Edit className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#003842] dark:text-white">{t('supplierPortal.editSupplier')}</h1>
              <p className="text-gray-600">{t('supplierPortal.supplierId')} {supplierId}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="supplier-name" className="text-sm font-medium text-gray-600">{t('accessPoints.name')}</label>
                <input
                  id="supplier-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="supplier-contact" className="text-sm font-medium text-gray-600">{t('supplierPortal.contact')}</label>
                <input
                  id="supplier-contact"
                  type="text"
                  value={form.contact}
                  onChange={(e) => handleChange('contact', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="supplier-phone" className="text-sm font-medium text-gray-600">{t('supplierPortal.phone')}</label>
                <input
                  id="supplier-phone"
                  type="text"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="supplier-email" className="text-sm font-medium text-gray-600">{t('admin.email')}</label>
                <input
                  id="supplier-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="supplier-website" className="text-sm font-medium text-gray-600">{t('messaging.website')}</label>
                <input
                  id="supplier-website"
                  type="text"
                  value={form.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              {t('supplierPortal.automaticTotals')}
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#003842] dark:text-white">{t('supplierPortal.supplierNotes')}</h2>
              <p className="text-gray-600">{t('supplierPortal.notesDescription')}</p>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="supplier-note" className="text-sm font-medium text-gray-600">{t('supplierPortal.newNote')}</label>
            <textarea
              id="supplier-note"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={4}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
              placeholder={t('supplierPortal.notePlaceholder')}
            />
            <div className="mt-3 flex justify-end">
              <Button variant="primary" onClick={handleAddNote} disabled={notesSaving || !noteDraft.trim()}>
                {notesSaving ? t('supplierPortal.saving') : t('supplierPortal.addNote')}
              </Button>
            </div>
          </div>

          {notesLoading ? (
            <p className="text-sm text-gray-500">{t('supplierPortal.loadingNotes')}</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-gray-500">{t('supplierPortal.noNotes')}</p>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => {
                const createdAt = new Date(note.created_at).toLocaleString(language)
                const updatedAt = note.updated_at && note.updated_at !== note.created_at
                  ? new Date(note.updated_at).toLocaleString(language)
                  : null

                return (
                  <div key={note.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {editingNoteId === note.id ? (
                          <textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                          />
                        ) : (
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.note}</p>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          <span>{t('ingredientsPortal.created')} {createdAt}</span>
                          {updatedAt && <span className="ml-2">{t('admin.updated')} {updatedAt}</span>}
                          {note.created_by && <span className="ml-2">{t('supplierPortal.by')} {note.created_by}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingNoteId === note.id ? (
                          <>
                            <Button variant="outline" size="sm" onClick={handleUpdateNote} disabled={notesSaving || !editingNoteText.trim()}>
                              {t('team.save')}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleCancelEditNote} disabled={notesSaving}>
                              {t('accessPoints.cancel')}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleStartEditNote(note)}>
                              {t('team.edit')}
                            </Button>
                            <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDeleteNote(note.id)}>
                              {t('accessPoints.delete')}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </Container>
  )
}
