// components/admin/EditHistory.tsx
// Shows the full audit trail (created/updated/deleted + field-level diffs)
// for a single ingredient or menu item, fetched from /api/audit-log.
'use client'

import { useEffect, useState } from 'react'
import { Clock, Plus, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/layout/Card'

interface AuditChange {
  field: string
  label: string
  from: string
  to: string
}

interface AuditLogEntry {
  id: string
  action: 'created' | 'updated' | 'deleted'
  changes: AuditChange[]
  changed_by_email: string | null
  created_at: string
}

const ACTION_META: Record<AuditLogEntry['action'], { icon: typeof Plus; label: string; color: string }> = {
  created: { icon: Plus, label: 'Created', color: '#16a34a' },
  updated: { icon: Pencil, label: 'Updated', color: '#2563eb' },
  deleted: { icon: Trash2, label: 'Deleted', color: '#dc2626' },
}

export function EditHistory({ entityType, entityId }: { entityType: 'ingredient' | 'menu_item'; entityId: string }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/audit-log?entityType=${entityType}&entityId=${entityId}`)
        const data = await res.json()
        if (!cancelled && res.ok) setEntries(data.entries || [])
      } catch {
        /* non-fatal — history simply won't show */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [entityType, entityId])

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-[#003842]" />
        <h2 className="text-xl font-semibold text-[#003842]">Edit History</h2>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading history…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500">No edit history recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => {
            const meta = ACTION_META[entry.action] || ACTION_META.updated
            const Icon = meta.icon
            return (
              <div key={entry.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                <div className="p-2 rounded-lg h-fit flex-shrink-0" style={{ backgroundColor: `${meta.color}1a` }}>
                  <Icon className="h-4 w-4" style={{ color: meta.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-semibold text-gray-900">{meta.label}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">{new Date(entry.created_at).toLocaleString()}</span>
                    {entry.changed_by_email && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 truncate">{entry.changed_by_email}</span>
                      </>
                    )}
                  </div>
                  {entry.changes.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {entry.changes.map((c, i) => (
                        <li key={i} className="text-gray-700">
                          <span className="font-medium">{c.label}:</span>{' '}
                          <span className="text-gray-500 line-through">{c.from}</span>{' '}
                          <span className="text-gray-400">&rarr;</span>{' '}
                          <span className="text-gray-900">{c.to}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
