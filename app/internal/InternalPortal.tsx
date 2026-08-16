'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowLeft, CalendarClock, CheckCircle2, ClipboardCheck, ExternalLink,
  FileText, LayoutDashboard, Loader2, LockKeyhole, LogOut, Plus, RefreshCw,
  ShieldCheck, Target, UserCog, Users,
} from 'lucide-react'

type Actor = {
  userId: string; displayName: string; email: string; role: string; canManagePeople: boolean;
  canManageAccess: boolean; canGrantSuperAdmin: boolean; platformSuperAdmin: boolean
}
type Employee = Record<string, any> & { id: string; first_name: string; last_name: string }
type Overview = {
  actor: Actor; employees: Employee[]; documents: any[]; probation: any[];
  objectives: any[]; reviews: any[]; members: any[]; audit: any[]
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#42b8ac] focus:ring-2 focus:ring-[#42b8ac]/20'
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500'

function daysUntil(value?: string | null) {
  if (!value) return null
  return Math.ceil((new Date(`${value}T12:00:00`).getTime() - Date.now()) / 86400000)
}

function dateLabel(value?: string | null) {
  return value ? new Intl.DateTimeFormat('en-IE', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)) : 'Not set'
}

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Something went wrong')
  return result
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">{children}</div>
}

export default function InternalPortal() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [gate, setGate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'dashboard' | 'people' | 'access' | 'activity'>('dashboard')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewEmployee, setShowNewEmployee] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const sessionResponse = await fetch('/api/internal/session', { cache: 'no-store' })
      const session = await sessionResponse.json()
      if (!sessionResponse.ok || session.eligibleForBootstrap) {
        setGate({ ...session, status: sessionResponse.status })
        setOverview(null)
      } else {
        const data = await api('/api/internal/overview', { cache: 'no-store' })
        setOverview(data); setGate(null)
      }
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const selected = overview?.employees.find((employee) => employee.id === selectedId) || null
  const urgent = useMemo(() => {
    if (!overview) return []
    const items: Array<{ label: string; detail: string; days: number; employeeId: string }> = []
    overview.employees.forEach((employee) => {
      const name = `${employee.first_name} ${employee.last_name}`
      const permitDays = daysUntil(employee.residence_permit_expiry)
      if (permitDays !== null && permitDays <= 90) items.push({ label: `${name}: residence permit`, detail: dateLabel(employee.residence_permit_expiry), days: permitDays, employeeId: employee.id })
      const probationDays = daysUntil(employee.probation_end_date)
      if (employee.employment_status === 'probation' && probationDays !== null && probationDays <= 45) items.push({ label: `${name}: probation end`, detail: dateLabel(employee.probation_end_date), days: probationDays, employeeId: employee.id })
    })
    overview.documents.forEach((document) => {
      const expiryDays = daysUntil(document.expires_on)
      const employee = overview.employees.find((item) => item.id === document.employee_id)
      if (expiryDays !== null && expiryDays <= 90) items.push({ label: `${employee?.first_name || 'Employee'}: ${document.title}`, detail: dateLabel(document.expires_on), days: expiryDays, employeeId: document.employee_id })
    })
    overview.objectives.filter((objective) => !['completed', 'cancelled'].includes(objective.status)).forEach((objective) => {
      const dueDays = daysUntil(objective.due_date)
      if (dueDays !== null && dueDays <= 30) items.push({ label: objective.title, detail: `Objective due ${dateLabel(objective.due_date)}`, days: dueDays, employeeId: objective.employee_id })
    })
    return items.sort((a, b) => a.days - b.days)
  }, [overview])

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#003842]"><Loader2 className="h-9 w-9 animate-spin text-[#42b8ac]" /></div>

  if (gate) return <AccessGate gate={gate} onBootstrap={async () => { await api('/api/internal/bootstrap', { method: 'POST' }); await load() }} />

  if (!overview) return <AccessGate gate={{ error: error || 'Internal could not be loaded.', code: 'LOAD_ERROR' }} onBootstrap={load} />

  const nav = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    ...(overview.actor.canManagePeople ? [{ id: 'people', label: 'People', icon: Users }] : []),
    ...(overview.actor.canManageAccess ? [{ id: 'access', label: 'Access', icon: UserCog }, { id: 'activity', label: 'Activity', icon: Activity }] : []),
  ] as const

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#003842] text-white shadow-lg">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/Logo-AllyJen-Transparent%20BG.svg" alt="AllyJen" className="h-10 w-auto" />
            <div className="border-l border-white/20 pl-3"><div className="font-extrabold">Internal</div><div className="text-[11px] text-white/60">Private people workspace</div></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-right sm:block"><span className="block text-sm font-bold">{overview.actor.displayName}</span><span className="block text-xs capitalize text-white/60">{overview.actor.role.replace('_', ' ')}</span></span>
            {overview.actor.platformSuperAdmin && <a href="/super-admin" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" title="Super Admin"><ShieldCheck className="h-5 w-5" /></a>}
            <a href="/admin" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" title="Admin portal"><ArrowLeft className="h-5 w-5" /></a>
            <button onClick={async () => { await fetch('/api/signout', { method: 'POST' }); location.href = '/auth/signin?redirect=/internal' }} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" title="Sign out"><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col">
          {nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id as typeof tab)} className={`flex min-w-fit items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${tab === id ? 'bg-[#003842] text-white shadow-md' : 'bg-white text-slate-600 hover:text-[#003842]'}`}><Icon className="h-5 w-5" />{label}</button>)}
        </nav>

        <main className="min-w-0">
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {tab === 'dashboard' && <Dashboard overview={overview} urgent={urgent} openEmployee={(id) => { setSelectedId(id); setTab('people') }} />}
          {tab === 'people' && <People overview={overview} selected={selected} setSelectedId={setSelectedId} showNew={showNewEmployee} setShowNew={setShowNewEmployee} reload={load} setError={setError} />}
          {tab === 'access' && <Access overview={overview} reload={load} setError={setError} />}
          {tab === 'activity' && <Audit overview={overview} />}
        </main>
      </div>
    </div>
  )
}

function AccessGate({ gate, onBootstrap }: { gate: any; onBootstrap: () => Promise<void> | void }) {
  const needsSignIn = gate.status === 401 || ['NOT_AUTHENTICATED', 'INVALID_SESSION'].includes(gate.code)
  const needsMfa = ['MFA_REQUIRED', 'MFA_ENROLMENT_REQUIRED'].includes(gate.code)
  return <div className="flex min-h-screen items-center justify-center bg-[#003842] px-4"><div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl">
    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#42b8ac]/15 text-[#003842]"><LockKeyhole className="h-8 w-8" /></div>
    <h1 className="text-2xl font-extrabold text-[#003842]">AllyJen Internal</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">{gate.eligibleForBootstrap ? 'This account can securely initialise the private Internal workspace.' : gate.error}</p>
    {gate.eligibleForBootstrap ? <button onClick={() => void onBootstrap()} className="mt-6 rounded-xl bg-[#003842] px-5 py-3 font-bold text-white hover:bg-[#42b8ac]">Set up Internal</button>
      : needsSignIn || needsMfa ? <a href="/auth/signin?redirect=/internal" className="mt-6 inline-flex rounded-xl bg-[#003842] px-5 py-3 font-bold text-white hover:bg-[#42b8ac]">{needsMfa ? 'Sign in and verify 2FA' : 'Sign in'}</a>
      : <button onClick={() => void onBootstrap()} className="mt-6 rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-700">Try again</button>}
    {needsMfa && <p className="mt-4 text-xs text-slate-500">If 2FA is not enabled yet, enable it in Admin account settings, then sign in again.</p>}
  </div></div>
}

function Dashboard({ overview, urgent, openEmployee }: { overview: Overview; urgent: any[]; openEmployee: (id: string) => void }) {
  const activeObjectives = overview.objectives.filter((item) => !['completed', 'cancelled'].includes(item.status)).length
  const probation = overview.employees.filter((item) => item.employment_status === 'probation').length
  const stats = [
    { label: 'Team members', value: overview.employees.filter((item) => item.employment_status !== 'left').length, icon: Users },
    { label: 'On probation', value: probation, icon: ClipboardCheck },
    { label: 'Active objectives', value: activeObjectives, icon: Target },
    { label: 'Needs attention', value: urgent.length, icon: CalendarClock },
  ]
  return <div className="space-y-6">
    <div><p className="text-sm font-bold text-[#42b8ac]">People at a glance</p><h1 className="text-3xl font-extrabold text-[#003842]">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {overview.actor.displayName.split(' ')[0]}</h1></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{label}</span><Icon className="h-5 w-5 text-[#42b8ac]" /></div><div className="mt-3 text-3xl font-extrabold text-[#003842]">{value}</div></div>)}</div>
    <section className="rounded-2xl bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-extrabold text-[#003842]">Upcoming and overdue</h2><p className="text-xs text-slate-500">Permits, documents, probation and objectives</p></div><CalendarClock className="h-5 w-5 text-[#42b8ac]" /></div>
      {urgent.length ? <div className="divide-y divide-slate-100">{urgent.slice(0, 12).map((item, index) => <button key={`${item.label}-${index}`} onClick={() => openEmployee(item.employeeId)} className="flex w-full items-center justify-between gap-4 py-3 text-left"><div><div className="text-sm font-bold text-slate-800">{item.label}</div><div className="text-xs text-slate-500">{item.detail}</div></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.days < 0 ? 'bg-red-100 text-red-700' : item.days <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{item.days < 0 ? `${Math.abs(item.days)}d overdue` : `${item.days}d`}</span></button>)}</div> : <Empty>Nothing currently needs attention.</Empty>}
    </section>
  </div>
}

function People({ overview, selected, setSelectedId, showNew, setShowNew, reload, setError }: { overview: Overview; selected: Employee | null; setSelectedId: (id: string | null) => void; showNew: boolean; setShowNew: (value: boolean) => void; reload: () => Promise<void>; setError: (value: string) => void }) {
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold text-[#42b8ac]">Employee records</p><h1 className="text-3xl font-extrabold text-[#003842]">People</h1></div>{overview.actor.canManagePeople && <button onClick={() => { setSelectedId(null); setShowNew(true) }} className="flex items-center gap-2 rounded-xl bg-[#003842] px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Add employee</button>}</div>
    <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
      <section className="rounded-2xl bg-white p-3 shadow-sm"><div className="max-h-[72vh] space-y-1 overflow-y-auto">{overview.employees.length ? overview.employees.map((employee) => <button key={employee.id} onClick={() => { setSelectedId(employee.id); setShowNew(false) }} className={`w-full rounded-xl px-3 py-3 text-left ${selected?.id === employee.id ? 'bg-[#003842] text-white' : 'hover:bg-slate-50'}`}><div className="font-bold">{employee.first_name} {employee.last_name}</div><div className={`text-xs ${selected?.id === employee.id ? 'text-white/60' : 'text-slate-500'}`}>{employee.job_title || 'Role not set'} · <span className="capitalize">{employee.employment_status}</span></div></button>) : <Empty>Add your first employee record.</Empty>}</div></section>
      <section>{showNew ? <EmployeeForm reload={reload} close={() => setShowNew(false)} setError={setError} /> : selected ? <EmployeeDetail key={`${selected.id}-${selected.updated_at}`} overview={overview} employee={selected} reload={reload} setError={setError} /> : <div className="rounded-2xl bg-white p-12 text-center shadow-sm"><Users className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm text-slate-500">Choose an employee to view their people record.</p></div>}</section>
    </div>
  </div>
}

function EmployeeForm({ reload, close, setError, employee }: { reload: () => Promise<void>; close?: () => void; setError: (value: string) => void; employee?: Employee }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); const values = Object.fromEntries(new FormData(event.currentTarget)); try { await api(employee ? `/api/internal/employees/${employee.id}` : '/api/internal/employees', { method: employee ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }); await reload(); close?.() } catch (err: any) { setError(err.message) } }
  return <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="mb-5 text-xl font-extrabold text-[#003842]">{employee ? 'Employment profile' : 'New employee'}</h2><div className="grid gap-4 sm:grid-cols-2">
    <Field label="First name" name="first_name" required defaultValue={employee?.first_name} /><Field label="Last name" name="last_name" required defaultValue={employee?.last_name} />
    <Field label="Work email" name="work_email" type="email" defaultValue={employee?.work_email} /><Field label="Personal email" name="personal_email" type="email" defaultValue={employee?.personal_email} />
    <Field label="Job title" name="job_title" defaultValue={employee?.job_title} /><Field label="Department" name="department" defaultValue={employee?.department} />
    <Select label="Employment status" name="employment_status" defaultValue={employee?.employment_status || 'probation'} options={['probation', 'active', 'leave', 'left']} /><Select label="Employment type" name="employment_type" defaultValue={employee?.employment_type || 'permanent'} options={['permanent', 'fixed_term', 'contractor', 'intern']} />
    <Field label="Start date" name="start_date" type="date" defaultValue={employee?.start_date} /><Field label="End date" name="end_date" type="date" defaultValue={employee?.end_date} />
    <Field label="Probation end" name="probation_end_date" type="date" defaultValue={employee?.probation_end_date} /><Field label="Phone" name="phone" defaultValue={employee?.phone} />
    <Field label="Permit type" name="residence_permit_type" defaultValue={employee?.residence_permit_type} /><Field label="Permit expiry" name="residence_permit_expiry" type="date" defaultValue={employee?.residence_permit_expiry} />
    <label className="sm:col-span-2"><span className={labelClass}>Private HR notes</span><textarea name="notes" defaultValue={employee?.notes || ''} rows={3} className={inputClass} /></label>
  </div><div className="mt-5 flex justify-end gap-2">{close && <button type="button" onClick={close} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>}<button className="rounded-xl bg-[#003842] px-5 py-2.5 text-sm font-bold text-white">{employee ? 'Save profile' : 'Create employee'}</button></div></form>
}

function EmployeeDetail({ overview, employee, reload, setError }: { overview: Overview; employee: Employee; reload: () => Promise<void>; setError: (value: string) => void }) {
  const [composer, setComposer] = useState<'document' | 'probation' | 'objective' | 'review' | null>(null)
  const records = { documents: overview.documents.filter((item) => item.employee_id === employee.id), probation: overview.probation.filter((item) => item.employee_id === employee.id), objectives: overview.objectives.filter((item) => item.employee_id === employee.id), reviews: overview.reviews.filter((item) => item.employee_id === employee.id) }
  return <div className="space-y-5"><EmployeeForm employee={employee} reload={reload} setError={setError} />
    <section className="rounded-2xl bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-extrabold text-[#003842]">People record</h2><p className="text-xs text-slate-500">Documents are secure links to your existing Google Drive files.</p></div>{overview.actor.canManagePeople && <div className="flex flex-wrap gap-2">{(['document', 'probation', 'objective', 'review'] as const).map((kind) => <button key={kind} onClick={() => setComposer(composer === kind ? null : kind)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold capitalize text-slate-700 hover:bg-[#42b8ac]/20">+ {kind}</button>)}</div>}</div>
      {composer && <RecordForm kind={composer} employeeId={employee.id} reload={async () => { await reload(); setComposer(null) }} setError={setError} />}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <RecordList title="Documents" icon={FileText} empty="No document links yet.">{records.documents.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0"><div><div className="text-sm font-bold">{item.title}</div><div className="text-xs capitalize text-slate-500">{item.category.replaceAll('_', ' ')}{item.expires_on ? ` · expires ${dateLabel(item.expires_on)}` : ''}</div></div><a href={item.drive_url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-[#42b8ac] hover:bg-slate-100"><ExternalLink className="h-4 w-4" /></a></div>)}</RecordList>
        <RecordList title="Objectives" icon={Target} empty="No objectives yet.">{records.objectives.map((item) => <div key={item.id} className="border-b border-slate-100 py-2.5 last:border-0"><div className="flex justify-between gap-2"><span className="text-sm font-bold">{item.title}</span><span className="text-xs capitalize text-slate-500">{item.status.replaceAll('_', ' ')}</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#42b8ac]" style={{ width: `${item.progress}%` }} /></div><div className="mt-1 text-xs text-slate-500">{item.progress}% · due {dateLabel(item.due_date)}</div></div>)}</RecordList>
        <RecordList title="Probation" icon={ClipboardCheck} empty="No probation updates yet.">{records.probation.map((item) => <div key={item.id} className="border-b border-slate-100 py-2.5 last:border-0"><div className="flex justify-between"><span className="text-sm font-bold capitalize">{item.stage.replaceAll('_', ' ')}</span><span className="text-xs">{item.score ? `${item.score}/5` : item.status}</span></div><div className="text-xs text-slate-500">{dateLabel(item.review_date)}{item.summary ? ` · ${item.summary}` : ''}</div></div>)}</RecordList>
        <RecordList title="Reviews" icon={CheckCircle2} empty="No reviews yet.">{records.reviews.map((item) => <div key={item.id} className="border-b border-slate-100 py-2.5 last:border-0"><div className="flex justify-between"><span className="text-sm font-bold">{item.title}</span><span className="text-xs">{item.overall_score ? `${item.overall_score}/5` : item.status}</span></div><div className="text-xs text-slate-500">{dateLabel(item.review_date)}</div></div>)}</RecordList>
      </div>
    </section>
  </div>
}

function RecordForm({ kind, employeeId, reload, setError }: { kind: string; employeeId: string; reload: () => Promise<void>; setError: (value: string) => void }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); try { await api('/api/internal/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, kind, employee_id: employeeId }) }); await reload() } catch (err: any) { setError(err.message) } }
  return <form onSubmit={submit} className="mb-5 rounded-xl border border-[#42b8ac]/30 bg-[#42b8ac]/5 p-4"><div className="grid gap-3 sm:grid-cols-2">
    {kind === 'document' && <><Field label="Document title" name="title" required /><Select label="Category" name="category" options={['contract', 'residence_permit', 'identity', 'right_to_work', 'probation', 'review', 'other']} /><label className="sm:col-span-2"><span className={labelClass}>Secure Google Drive link</span><input name="drive_url" type="url" required placeholder="https://drive.google.com/..." className={inputClass} /></label><Field label="Issued" name="issued_on" type="date" /><Field label="Expires" name="expires_on" type="date" /></>}
    {kind === 'objective' && <><Field label="Objective" name="title" required /><Field label="Due date" name="due_date" type="date" /><label className="sm:col-span-2"><span className={labelClass}>Success measure</span><textarea name="success_measure" rows={2} className={inputClass} /></label><Select label="Status" name="status" options={['not_started', 'in_progress', 'blocked', 'completed']} /><Field label="Progress %" name="progress" type="number" min="0" max="100" defaultValue="0" /></>}
    {kind === 'probation' && <><Field label="Review date" name="review_date" type="date" required /><Select label="Stage" name="stage" options={['30_day', '60_day', '90_day', 'final', 'custom']} /><Select label="Status" name="status" options={['scheduled', 'completed', 'passed', 'extended', 'not_passed']} /><Field label="Score (1–5)" name="score" type="number" min="1" max="5" /><label className="sm:col-span-2"><span className={labelClass}>Summary</span><textarea name="summary" rows={2} className={inputClass} /></label><Field label="Next review" name="next_review_date" type="date" /></>}
    {kind === 'review' && <><Field label="Review title" name="title" required placeholder="2026 annual review" /><Field label="Review date" name="review_date" type="date" required /><Field label="Period start" name="period_start" type="date" /><Field label="Period end" name="period_end" type="date" /><Field label="Overall score (1–5)" name="overall_score" type="number" min="1" max="5" step="0.1" /><Select label="Status" name="status" options={['draft', 'shared', 'acknowledged', 'complete']} /><label><span className={labelClass}>Strengths</span><textarea name="strengths" rows={2} className={inputClass} /></label><label><span className={labelClass}>Development areas</span><textarea name="development_areas" rows={2} className={inputClass} /></label></>}
  </div><div className="mt-3 text-right"><button className="rounded-lg bg-[#003842] px-4 py-2 text-sm font-bold text-white">Save {kind}</button></div></form>
}

function RecordList({ title, icon: Icon, empty, children }: { title: string; icon: any; empty: string; children: React.ReactNode }) { return <div className="rounded-xl border border-slate-100 p-4"><h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#003842]"><Icon className="h-4 w-4 text-[#42b8ac]" />{title}</h3>{Array.isArray(children) && children.length === 0 ? <p className="py-3 text-xs text-slate-400">{empty}</p> : children}</div> }

function Access({ overview, reload, setError }: { overview: Overview; reload: () => Promise<void>; setError: (value: string) => void }) {
  const [adding, setAdding] = useState(false)
  const invite = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); try { const form = event.currentTarget; const raw = Object.fromEntries(new FormData(form)); await api('/api/internal/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...raw, canManagePeople: raw.canManagePeople === 'on', canManageAccess: raw.canManageAccess === 'on', platformSuperAdmin: raw.platformSuperAdmin === 'on' }) }); setAdding(false); await reload() } catch (err: any) { setError(err.message) } }
  const update = async (member: any, field: string, value: boolean) => { try { await api('/api/internal/members', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: member.id, [field]: value }) }); await reload() } catch (err: any) { setError(err.message) } }
  return <div className="space-y-5"><div className="flex items-end justify-between"><div><p className="text-sm font-bold text-[#42b8ac]">Founder-controlled permissions</p><h1 className="text-3xl font-extrabold text-[#003842]">Internal access</h1></div><button onClick={() => setAdding(!adding)} className="flex items-center gap-2 rounded-xl bg-[#003842] px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Add member</button></div>
    {adding && <form onSubmit={invite} className="rounded-2xl bg-white p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Name" name="displayName" required /><Field label="Email" name="email" type="email" required /><Select label="Internal role" name="role" options={['employee', 'manager', 'people_admin', 'director', 'founder']} /><div className="space-y-2 pt-5"><Check name="canManagePeople" label="Manage people" /><Check name="canManageAccess" label="Manage access" />{overview.actor.canGrantSuperAdmin && <Check name="platformSuperAdmin" label="Super Admin" />}</div></div><p className="mt-3 text-xs text-slate-500">If the person does not have an AllyJen account, an invitation is emailed. They must enable 2FA before Internal opens.</p><div className="mt-3 text-right"><button className="rounded-lg bg-[#003842] px-4 py-2 text-sm font-bold text-white">Send invitation</button></div></form>}
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Member</th><th className="p-4">Role</th><th className="p-4">People</th><th className="p-4">Access</th><th className="p-4">Super Admin</th><th className="p-4">Internal</th></tr></thead><tbody>{overview.members.map((member) => <tr key={member.id} className="border-b border-slate-100 last:border-0"><td className="p-4"><div className="font-bold">{member.display_name}</div><div className="text-xs text-slate-500">{member.email}</div></td><td className="p-4 capitalize">{member.role.replace('_', ' ')}</td><td className="p-4"><Toggle value={member.role === 'founder' || member.can_manage_people} disabled={member.role === 'founder'} onChange={(value) => update(member, 'canManagePeople', value)} /></td><td className="p-4"><Toggle value={member.role === 'founder' || member.can_manage_access} disabled={member.role === 'founder'} onChange={(value) => update(member, 'canManageAccess', value)} /></td><td className="p-4"><Toggle value={member.platform_super_admin} disabled={!overview.actor.canGrantSuperAdmin} onChange={(value) => update(member, 'platformSuperAdmin', value)} /></td><td className="p-4"><Toggle value={member.internal_access} disabled={member.role === 'founder' && member.user_id === overview.actor.userId} onChange={(value) => update(member, 'internalAccess', value)} /></td></tr>)}</tbody></table></div>
  </div>
}

function Audit({ overview }: { overview: Overview }) { return <div className="space-y-5"><div><p className="text-sm font-bold text-[#42b8ac]">Accountability</p><h1 className="text-3xl font-extrabold text-[#003842]">Recent activity</h1></div><div className="rounded-2xl bg-white p-5 shadow-sm">{overview.audit.length ? overview.audit.map((item) => <div key={item.id} className="flex gap-3 border-b border-slate-100 py-3 last:border-0"><div className="mt-1 h-2 w-2 rounded-full bg-[#42b8ac]" /><div><div className="text-sm font-bold text-slate-800">{item.action.replaceAll('.', ' ')}</div><div className="text-xs text-slate-500">{item.actor_email || 'System'} · {new Date(item.created_at).toLocaleString('en-IE')}</div></div></div>) : <Empty>No activity yet.</Empty>}</div></div> }

function Field({ label, name, ...props }: { label: string; name: string; [key: string]: any }) { return <label><span className={labelClass}>{label}</span><input name={name} className={inputClass} {...props} /></label> }
function Select({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue?: string }) { return <label><span className={labelClass}>{label}</span><select name={name} defaultValue={defaultValue || options[0]} className={inputClass}>{options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select></label> }
function Check({ name, label }: { name: string; label: string }) { return <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" name={name} className="h-4 w-4 accent-[#42b8ac]" />{label}</label> }
function Toggle({ value, onChange, disabled = false }: { value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) { return <button type="button" disabled={disabled} onClick={() => onChange(!value)} className={`relative h-6 w-11 rounded-full transition ${value ? 'bg-[#42b8ac]' : 'bg-slate-200'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${value ? 'left-6' : 'left-1'}`} /></button> }
