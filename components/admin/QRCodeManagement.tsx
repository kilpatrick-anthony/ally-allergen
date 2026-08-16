'use client'

import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Download, ExternalLink, Plus, QrCode, RefreshCw, Trash2, X } from 'lucide-react'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type SiteOption = { id: string; name: string }

type QRDeployment = {
  id: string
  site_id: string
  name: string
  placement: string
  public_code: string
  status: 'active' | 'inactive'
  created_at: string
  scan_count: number
  last_scanned_at: string | null
  site?: { id: string; name: string; slug: string } | null
}

interface QRCodeManagementProps {
  siteId?: string
  siteName?: string
}

export default function QRCodeManagement({ siteId, siteName }: QRCodeManagementProps) {
  const [qrCodes, setQrCodes] = useState<QRDeployment[]>([])
  const [sites, setSites] = useState<SiteOption[]>([])
  const [businessSlug, setBusinessSlug] = useState('')
  const [planType, setPlanType] = useState('starter')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [placement, setPlacement] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState(siteId || '')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const qrParams = siteId ? `?siteId=${encodeURIComponent(siteId)}` : ''
      const requests: Promise<Response>[] = [fetch(`/api/qr-codes${qrParams}`)]
      if (!siteId) requests.push(fetch('/api/sites'))
      const responses = await Promise.all(requests)
      const qrData = await responses[0].json()
      if (!responses[0].ok) throw new Error(qrData.error || 'Failed to load QR codes')
      setQrCodes(qrData.qrCodes || [])
      setBusinessSlug(qrData.businessSlug || '')
      setPlanType(qrData.planType || 'starter')

      if (responses[1]) {
        const siteData = await responses[1].json()
        if (responses[1].ok) {
          const options = (siteData.sites || []).map((site: any) => ({ id: site.id, name: site.name }))
          setSites(options)
          setSelectedSiteId((current) => current || options[0]?.id || '')
        }
      }
    } catch (loadError: any) {
      setError(loadError.message || 'Failed to load QR codes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [siteId])

  const activeCount = useMemo(() => qrCodes.filter((code) => code.status === 'active').length, [qrCodes])
  const totalScans = useMemo(() => qrCodes.reduce((total, code) => total + code.scan_count, 0), [qrCodes])

  const getUrl = (deployment: QRDeployment) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const params = new URLSearchParams({ site_id: deployment.site_id, qr: deployment.public_code })
    return `${origin}/kiosk/${businessSlug}?${params.toString()}`
  }

  const createQRCode = async () => {
    if (!name.trim() || !selectedSiteId) return
    try {
      setSaving(true)
      setError(null)
      const response = await fetch('/api/qr-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: selectedSiteId, name, placement }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create QR code')
      setQrCodes((current) => [{ ...data.qrCode, scan_count: 0, last_scanned_at: null }, ...current])
      setName('')
      setPlacement('')
      setShowCreate(false)
    } catch (createError: any) {
      setError(createError.message || 'Failed to create QR code')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (deployment: QRDeployment) => {
    const status = deployment.status === 'active' ? 'inactive' : 'active'
    const response = await fetch(`/api/qr-codes/${deployment.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || 'Failed to update QR code')
      return
    }
    setQrCodes((current) => current.map((code) => code.id === deployment.id ? { ...code, ...data.qrCode } : code))
  }

  const removeQRCode = async (deployment: QRDeployment) => {
    if (!confirm(`Delete “${deployment.name}”? Its printed QR code will stop being tracked.`)) return
    const response = await fetch(`/api/qr-codes/${deployment.id}`, { method: 'DELETE' })
    const data = response.ok ? null : await response.json()
    if (!response.ok) {
      setError(data?.error || 'Failed to delete QR code')
      return
    }
    setQrCodes((current) => current.filter((code) => code.id !== deployment.id))
  }

  const copyUrl = async (deployment: QRDeployment) => {
    await navigator.clipboard.writeText(getUrl(deployment))
    setCopiedId(deployment.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadSVG = (deployment: QRDeployment) => {
    const svg = document.getElementById(`managed-qr-${deployment.id}`)
    if (!(svg instanceof SVGElement)) return
    const source = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${deployment.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'allergen-menu'}.svg`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const renderToCanvas = (deployment: QRDeployment) => new Promise<HTMLCanvasElement>((resolve, reject) => {
    const svg = document.getElementById(`managed-qr-${deployment.id}`)
    if (!(svg instanceof SVGElement)) return reject(new Error('QR code preview is unavailable'))
    const source = new XMLSerializer().serializeToString(svg)
    const image = new Image()
    const objectUrl = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1024
      canvas.height = 1024
      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Could not prepare QR code image'))
        return
      }
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not prepare QR code image'))
    }
    image.src = objectUrl
  })

  const downloadPNG = async (deployment: QRDeployment) => {
    try {
      const canvas = await renderToCanvas(deployment)
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${deployment.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'allergen-menu'}.png`
      link.click()
    } catch (downloadError: any) {
      setError(downloadError.message)
    }
  }

  const downloadPDF = async (deployment: QRDeployment) => {
    try {
      const [{ default: jsPDF }, canvas] = await Promise.all([
        import('jspdf'),
        renderToCanvas(deployment),
      ])
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
      pdf.setTextColor('#003842')
      pdf.setFontSize(24)
      pdf.text('Scan for allergen information', 105, 35, { align: 'center' })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 45, 55, 120, 120)
      pdf.setFontSize(16)
      pdf.text(deployment.site?.name || siteName || '', 105, 190, { align: 'center' })
      pdf.setFontSize(11)
      pdf.setTextColor('#4b5563')
      pdf.text('Open the live AllyJen allergen menu on your phone. No app required.', 105, 202, { align: 'center' })
      pdf.save(`${deployment.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'allergen-menu'}-sign.pdf`)
    } catch (downloadError: any) {
      setError(downloadError.message || 'Failed to create QR sign')
    }
  }

  if (loading) {
    return <Card><div className="flex items-center justify-center gap-2 py-12 text-gray-600"><RefreshCw className="h-5 w-5 animate-spin" />Loading QR codes…</div></Card>
  }

  return (
    <div className="space-y-6">
      {planType === 'qr_lite' && (
        <div className="rounded-xl border border-[#42b8ac]/30 bg-[#f0faf9] p-4 text-sm text-[#134e4a]">
          <strong>QR Lite:</strong> create and download a code below—no kiosk device or pairing step is required.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-gray-500">QR codes</p><p className="mt-1 text-2xl font-bold text-[#003842]">{qrCodes.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Active</p><p className="mt-1 text-2xl font-bold text-emerald-600">{activeCount}</p></Card>
        <Card><p className="text-sm text-gray-500">Total scans</p><p className="mt-1 text-2xl font-bold text-[#003842]">{totalScans}</p></Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="text-lg font-semibold text-[#003842]">QR codes{siteName ? ` for ${siteName}` : ''}</h3><p className="mt-1 text-sm text-gray-600">Create separate codes for entrances, counters, tables, or printed materials.</p></div>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Create QR Code</Button>
        </div>
      </Card>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {showCreate && (
        <Card className="border-2 border-[#42b8ac]">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold text-[#003842]">Create QR code</h3><button type="button" aria-label="Close" onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-gray-500" /></button></div>
          <div className="grid gap-4 md:grid-cols-3">
            {!siteId && <label className="text-sm font-medium text-gray-700">Site<select value={selectedSiteId} onChange={(event) => setSelectedSiteId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">Choose a site…</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
            <label className="text-sm font-medium text-gray-700">Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Front entrance" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-gray-700">Placement <span className="font-normal text-gray-400">(optional)</span><input value={placement} onChange={(event) => setPlacement(event.target.value)} placeholder="Window beside main door" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button variant="primary" disabled={saving || !name.trim() || !selectedSiteId} onClick={createQRCode}>{saving ? 'Creating…' : 'Create'}</Button></div>
        </Card>
      )}

      {qrCodes.length === 0 ? (
        <Card className="py-12 text-center"><QrCode className="mx-auto mb-3 h-12 w-12 text-gray-300" /><h3 className="font-semibold text-gray-900">No QR codes yet</h3><p className="mt-1 text-sm text-gray-500">Create one to give customers mobile access without setting up hardware.</p></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {qrCodes.map((deployment) => {
            const url = getUrl(deployment)
            return (
              <Card key={deployment.id}>
                <div className="flex gap-4">
                  <div className="shrink-0 rounded-xl border border-gray-200 bg-white p-2"><QRCodeSVG id={`managed-qr-${deployment.id}`} value={url} size={112} level="H" fgColor="#003842" /></div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-semibold text-gray-900">{deployment.name}</h3><p className="text-xs text-gray-500">{deployment.site?.name || siteName}{deployment.placement ? ` · ${deployment.placement}` : ''}</p></div><Badge variant={deployment.status === 'active' ? 'success' : 'default'}>{deployment.status === 'active' ? 'Active' : 'Inactive'}</Badge></div><p className="mt-3 break-all text-xs text-gray-500">{url}</p><div className="mt-3 flex gap-4 text-xs text-gray-600"><span><strong>{deployment.scan_count}</strong> scans</span><span>{deployment.last_scanned_at ? `Last ${new Date(deployment.last_scanned_at).toLocaleDateString()}` : 'Not scanned yet'}</span></div></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <Button size="sm" variant="outline" onClick={() => copyUrl(deployment)}>{copiedId === deployment.id ? <Check className="mr-1 h-4 w-4 text-green-600" /> : <Copy className="mr-1 h-4 w-4" />}{copiedId === deployment.id ? 'Copied' : 'Copy'}</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadSVG(deployment)}><Download className="mr-1 h-4 w-4" />SVG</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadPNG(deployment)}><Download className="mr-1 h-4 w-4" />PNG</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadPDF(deployment)}><Download className="mr-1 h-4 w-4" />PDF</Button>
                  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><ExternalLink className="mr-1 h-4 w-4" />Open</a>
                  <Button size="sm" variant="ghost" onClick={() => toggleStatus(deployment)}>{deployment.status === 'active' ? 'Deactivate' : 'Activate'}</Button>
                </div>
                <div className="mt-3 flex justify-end"><button type="button" onClick={() => removeQRCode(deployment)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" />Delete</button></div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
