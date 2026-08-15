'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Mail, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type TeamRole = 'owner' | 'manager' | 'staff'
type Member = {
  id: string
  userId: string
  name: string
  email: string
  role: TeamRole
  status: 'active' | 'invited'
}

export default function TeamMembersPanel({ mode, businessId }: { mode: 'owner' | 'super-admin'; businessId?: string }) {
  const baseUrl = mode === 'super-admin' ? `/api/super-admin/business/${businessId}/team` : '/api/team-members'
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [form, setForm] = useState<{ name: string; email: string; role: TeamRole }>({ name: '', email: '', role: 'staff' })

  const load = useCallback(async () => {
    if (mode === 'super-admin' && !businessId) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(baseUrl)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load team members')
      setMembers(data.members || [])
      setCurrentUserId(data.currentUserId || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load team members')
    } finally {
      setLoading(false)
    }
  }, [baseUrl, businessId, mode])

  useEffect(() => { void load() }, [load])

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not invite team member')
      setForm({ name: '', email: '', role: 'staff' })
      setShowInvite(false)
      setNotice('Invitation sent. They can use the email link to choose a password.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not invite team member')
    } finally { setSaving(false) }
  }

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch(`${baseUrl}/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editing.name, role: editing.role }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not update team member')
      setEditing(null); setNotice('Team member updated.'); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update team member') }
    finally { setSaving(false) }
  }

  const remove = async (member: Member) => {
    if (!window.confirm(`Remove ${member.name} from this business? Their account will not be deleted.`)) return
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch(`${baseUrl}/${member.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not remove team member')
      setNotice('Team member removed.'); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove team member') }
    finally { setSaving(false) }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"><Users className="h-5 w-5 text-[#42b8ac]" /> Team members</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Invite people and choose who owns or operates this business.</p>
        </div>
        <Button onClick={() => { setShowInvite(value => !value); setEditing(null) }} size="sm">
          {showInvite ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{showInvite ? 'Cancel' : 'Add team member'}
        </Button>
      </div>

      <div className="space-y-4 p-5">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}

        {showInvite && (
          <form onSubmit={submitInvite} className="grid gap-3 rounded-lg bg-gray-50 p-4 md:grid-cols-[1fr_1fr_150px_auto] dark:bg-gray-900/40">
            <input required aria-label="Team member name" placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <input required type="email" aria-label="Team member email" placeholder="Email address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <select aria-label="Team member role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as TeamRole })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              <option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option>
            </select>
            <Button type="submit" disabled={saving}>{saving ? 'Sending…' : 'Send invite'}</Button>
          </form>
        )}

        <div className="space-y-2">
          {loading ? <p className="py-6 text-center text-sm text-gray-500">Loading team…</p> : members.map(member => (
            <div key={member.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
              {editing?.id === member.id ? (
                <form onSubmit={saveEdit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                  <input required aria-label="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  <select aria-label="Role" value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value as TeamRole })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></select>
                  <Button type="submit" size="sm" disabled={saving}>Save</Button><Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-gray-900 dark:text-white">{member.name}</span>{member.userId === currentUserId && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">You</span>}<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-700 dark:bg-gray-700 dark:text-gray-200">{member.role}</span><span className={`rounded-full px-2 py-0.5 text-xs ${member.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{member.status === 'active' ? 'Active' : 'Invite sent'}</span></div>
                    <p className="mt-1 flex items-center gap-1 truncate text-sm text-gray-500"><Mail className="h-3.5 w-3.5" />{member.email}</p>
                  </div>
                  <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { setEditing({ ...member }); setShowInvite(false) }} disabled={mode === 'owner' && member.userId === currentUserId}><Pencil className="h-4 w-4" /><span className="sr-only">Edit {member.name}</span></Button><Button size="sm" variant="outline" onClick={() => remove(member)} disabled={saving || (mode === 'owner' && member.userId === currentUserId)}><Trash2 className="h-4 w-4 text-red-600" /><span className="sr-only">Remove {member.name}</span></Button></div>
                </>
              )}
            </div>
          ))}
          {!loading && members.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No team members found.</p>}
        </div>
        <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-4 dark:border-teal-900 dark:bg-teal-950/20">
          <h4 className="mb-3 text-sm font-semibold text-[#003842] dark:text-[#42b8ac]">Which role should I choose?</h4>
          <div className="grid gap-3 text-xs text-gray-600 md:grid-cols-3 dark:text-gray-300">
            <p><strong className="block text-gray-900 dark:text-white">Owner</strong>Full access, including managing team members and deleting operational content.</p>
            <p><strong className="block text-gray-900 dark:text-white">Manager</strong>Full operational access, including deletions, but cannot manage team members.</p>
            <p><strong className="block text-gray-900 dark:text-white">Staff</strong>Can create and edit content, but cannot manage users or delete ingredients and menu items.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
