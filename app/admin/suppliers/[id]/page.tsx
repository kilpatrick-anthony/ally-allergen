// app/admin/suppliers/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Truck, Save, FileText, AlertCircle, MessageSquare } from 'lucide-react'

import { Container } from '../../../components/layout/Container'
import { Card } from '../../../components/layout/Card'
import { Button } from '../../../components/ui/Button'

interface Supplier {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  website: string
  ingredient_count: number
}

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

export default function SupplierDetailPage() {
  const params = useParams()
  const supplierId = params.id as string

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<SupplierNote[]>([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [form, setForm] = useState<SupplierForm | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/suppliers/${supplierId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch supplier')
        }

        setSupplier(data.supplier)
        setForm({
          name: data.supplier.name || '',
          contact: data.supplier.contact || '',
          phone: data.supplier.phone || '',
          email: data.supplier.email || '',
          website: data.supplier.website || ''
        })

        const notesResponse = await fetch(`/api/suppliers/${supplierId}/notes`)
        const notesData = await notesResponse.json()

        if (!notesResponse.ok) {
          throw new Error(notesData.error || 'Failed to fetch supplier notes')
        }

        setNotes(notesData.notes || [])
      } catch (error: any) {
        console.error('Error fetching supplier:', error)
        setSupplier(null)
        setForm(null)
        setNotes([])
      } finally {
        setLoading(false)
        setNotesLoading(false)
      }
    }

    fetchSupplier()
  }, [supplierId])

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="relative h-12 w-12 mx-auto mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            <p className="text-gray-600">Loading supplier...</p>
          </div>
        </div>
      </Container>
    )
  }

  if (!supplier || !form) {
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
          <Link href="/admin/suppliers">
            <Button variant="ghost" icon={ArrowLeft}>
              Back to Suppliers
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={Save} onClick={async () => {
              if (!supplier) return
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
                    ingredient_count: supplier.ingredient_count
                  })
                })

                const data = await response.json()

                if (!response.ok) {
                  throw new Error(data.error || 'Failed to update supplier')
                }

                setSupplier(data.supplier)
              } catch (error: any) {
                console.error('Error updating supplier:', error)
                alert(error.message || 'Failed to update supplier')
              } finally {
                setSaving(false)
              }
            }} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Link href={`/admin/suppliers/${supplierId}/docs`}>
              <Button variant="primary" icon={FileText}>
                Documents
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#003842] dark:text-white">{supplier.name}</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">Contact</label>
                <input
                  type="text"
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Supplier Notes</h2>
              <p className="text-gray-600 dark:text-gray-300">Latest notes recorded for this supplier.</p>
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
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.note}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      <span>Created {createdAt}</span>
                      {updatedAt && <span className="ml-2">Updated {updatedAt}</span>}
                      {note.created_by && <span className="ml-2">By {note.created_by}</span>}
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
