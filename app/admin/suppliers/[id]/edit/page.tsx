// app/admin/suppliers/[id]/edit/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Save, AlertCircle, MessageSquare, Trash2 } from 'lucide-react'

import { Container } from '../../../../components/layout/Container'
import { Card } from '../../../../components/layout/Card'
import { Button } from '../../../../components/ui/Button'

interface SupplierForm {
  name: string
  contact: string
  phone: string
  email: string
  website: string
  ingredient_count: number
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
        const response = await fetch(`/api/suppliers/${supplierId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch supplier')
        }

        setForm({
          name: data.supplier.name || '',
          contact: data.supplier.contact || '',
          phone: data.supplier.phone || '',
          email: data.supplier.email || '',
          website: data.supplier.website || '',
          ingredient_count: typeof data.supplier.ingredient_count === 'number' ? data.supplier.ingredient_count : 0
        })
        await fetchNotes()
      } catch (error: any) {
        console.error('Error fetching supplier:', error)
        setForm(null)
        setNotes([])
      } finally {
        setLoading(false)
      }
    }

    const fetchNotes = async () => {
      try {
        setNotesLoading(true)
        const response = await fetch(`/api/suppliers/${supplierId}/notes`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch supplier notes')
        }

        setNotes(data.notes || [])
      } catch (error: any) {
        console.error('Error fetching supplier notes:', error)
        setNotes([])
      } finally {
        setNotesLoading(false)
      }
    }

    fetchSupplier()
  }, [supplierId])

  const handleChange = (field: keyof SupplierForm, value: string | number) => {
    if (!form) return
    setForm({ ...form, [field]: value })
  }

  const handleSave = async () => {
    if (!form) return
    if (!form.name.trim()) {
      alert('Supplier name is required')
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ingredient_count: Number(form.ingredient_count) || 0
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update supplier')
      }

      router.push(`/admin/suppliers/${supplierId}`)
    } catch (error: any) {
      console.error('Error updating supplier:', error)
      alert(error.message || 'Failed to update supplier')
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
        throw new Error(data.error || 'Failed to add note')
      }

      setNotes((prev) => [data.note, ...prev])
      setNoteDraft('')
    } catch (error: any) {
      console.error('Error adding supplier note:', error)
      alert(error.message || 'Failed to add note')
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
        throw new Error(data.error || 'Failed to update note')
      }

      setNotes((prev) => prev.map((note) => (note.id === data.note.id ? data.note : note)))
      handleCancelEditNote()
    } catch (error: any) {
      console.error('Error updating supplier note:', error)
      alert(error.message || 'Failed to update note')
    } finally {
      setNotesSaving(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) {
      return
    }

    try {
      setNotesSaving(true)
      const response = await fetch(`/api/suppliers/${supplierId}/notes/${noteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete note')
      }

      setNotes((prev) => prev.filter((note) => note.id !== noteId))
      if (editingNoteId === noteId) {
        handleCancelEditNote()
      }
    } catch (error: any) {
      console.error('Error deleting supplier note:', error)
      alert(error.message || 'Failed to delete note')
    } finally {
      setNotesSaving(false)
    }
  }

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#42b8ac] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading supplier...</p>
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
            <p className="text-gray-600">Supplier not found</p>
            <Link href="/admin/suppliers">
              <Button variant="ghost" icon={ArrowLeft} className="mt-4">
                Back to Suppliers
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
            <Button variant="ghost" icon={ArrowLeft}>
              Back to Supplier
            </Button>
          </Link>
          <Button variant="primary" icon={Save} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Card className="mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Edit className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Supplier</h1>
              <p className="text-gray-600">Supplier ID: {supplierId}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Contact</label>
                <input
                  type="text"
                  value={form.contact}
                  onChange={(e) => handleChange('contact', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Ingredient Count</label>
                <input
                  type="number"
                  min="0"
                  value={form.ingredient_count}
                  onChange={(e) => handleChange('ingredient_count', Number(e.target.value))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Supplier Notes</h2>
              <p className="text-gray-600">Add time-stamped notes for this supplier.</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-gray-600">New note</label>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={4}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
              placeholder="Add any supplier notes..."
            />
            <div className="mt-3 flex justify-end">
              <Button variant="primary" onClick={handleAddNote} disabled={notesSaving || !noteDraft.trim()}>
                {notesSaving ? 'Saving...' : 'Add Note'}
              </Button>
            </div>
          </div>

          {notesLoading ? (
            <p className="text-sm text-gray-500">Loading notes...</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-gray-500">No notes yet.</p>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => {
                const createdAt = new Date(note.created_at).toLocaleString()
                const updatedAt = note.updated_at && note.updated_at !== note.created_at
                  ? new Date(note.updated_at).toLocaleString()
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
                          <span>Created {createdAt}</span>
                          {updatedAt && <span className="ml-2">Updated {updatedAt}</span>}
                          {note.created_by && <span className="ml-2">By {note.created_by}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingNoteId === note.id ? (
                          <>
                            <Button variant="outline" size="sm" onClick={handleUpdateNote} disabled={notesSaving || !editingNoteText.trim()}>
                              Save
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleCancelEditNote} disabled={notesSaving}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleStartEditNote(note)}>
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDeleteNote(note.id)}>
                              Delete
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
