// app/super-admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Building,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Key,
  Lock,
  Download,
  RefreshCw,
  Zap
} from 'lucide-react'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { BusinessSetupModal } from './components/BusinessSetupModal'
import { BusinessDetailsModal } from './components/BusinessDetailsModal'

interface Business {
  id: string
  name: string
  contactEmail: string
  contactName?: string
  phone?: string
  address?: string
  status: 'active' | 'inactive' | 'trial' | 'suspended'
  plan: 'starter' | 'pro' | 'enterprise'
  createdAt: string
  trialEndsAt?: string
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trial'
  revenue?: number
  setupMilestones?: {
    sitesCount?: number
    devicesCount?: number
    menuItemsCount?: number
  }
  deviceStatus?: {
    online?: number
    offline?: number
  }
  lastActivityAt?: string | null
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBusinessDetails, setShowBusinessDetails] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false)
  const [setPasswordBusiness, setSetPasswordBusiness] = useState<Business | null>(null)
  const [setPasswordValue, setSetPasswordValue] = useState('')
  const [setPasswordConfirm, setSetPasswordConfirm] = useState('')
  const [setPasswordError, setSetPasswordError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editBusiness, setEditBusiness] = useState<Business | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    ownerName: '',
    phone: '',
    address: '',
    plan: 'starter',
    status: 'active'
  })
  const [editError, setEditError] = useState('')
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [demoForm, setDemoForm] = useState({ ownerEmail: '', ownerName: '', businessName: '', locationName: '' })
  const [demoLoading, setDemoLoading] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const handleCreateDemoAccount = async () => {
    if (!demoForm.ownerEmail.trim()) {
      setActionNotice({ type: 'error', text: 'Owner email is required to create a demo account.' })
      return
    }
    setDemoLoading(true)
    try {
      const res = await fetch('/api/super-admin/demo-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerEmail: demoForm.ownerEmail.trim(),
          ownerName: demoForm.ownerName.trim() || 'Demo User',
          businessName: demoForm.businessName.trim() || 'Demo Restaurant',
          locationName: demoForm.locationName.trim() || 'Main Location',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create demo account')
      await loadBusinesses()
      setLastCreatedBusiness({
        businessId: data.businessId,
        businessName: data.businessName,
        ownerEmail: data.ownerEmail,
      })
      setActionNotice({ type: 'success', text: `Demo account "${data.businessName}" created with ${data.menuItemsSeeded} sample menu items. Password setup email sent to ${data.ownerEmail}.` })
      setShowDemoModal(false)
      setDemoForm({ ownerEmail: '', ownerName: '', businessName: '', locationName: '' })
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Failed to create demo account.' })
    } finally {
      setDemoLoading(false)
    }
  }

  const [lastCreatedBusiness, setLastCreatedBusiness] = useState<{
    businessId?: string
    businessName: string
    ownerEmail: string
  } | null>(null)

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/super-admin/business')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load businesses')
      setBusinesses(data.businesses || [])
      setFilteredBusinesses(data.businesses || [])
    } catch (error) {
      console.error('Failed to load businesses:', error)
    }
  }

  useEffect(() => {
    // Check if user is super admin
    const checkSuperAdmin = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const session = await response.json()

        // For now, we'll check if the user has a specific email or role
        // In production, you'd have a proper role-based system
        if (!session?.authenticated) {
          router.push('/auth/signin?redirect=/super-admin')
          return
        }

        const isAdmin = session?.user?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ||
                       session?.user?.role === 'super_admin'

        if (!isAdmin) {
          router.push('/admin')
          return
        }

        setIsSuperAdmin(true)
        await loadBusinesses()
      } catch (error) {
        console.error('Failed to check admin status:', error)
        router.push('/auth/signin')
      } finally {
        setLoading(false)
      }
    }

    checkSuperAdmin()
  }, [router])

  useEffect(() => {
    // Filter businesses based on search and filters
    let filtered = businesses

    if (searchTerm) {
      filtered = filtered.filter(business =>
        business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(business => business.status === statusFilter)
    }

    if (planFilter !== 'all') {
      filtered = filtered.filter(business => business.plan === planFilter)
    }

    setFilteredBusinesses(filtered)
  }, [businesses, searchTerm, statusFilter, planFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'trial':
        return <Badge variant="warning">Trial</Badge>
      case 'inactive':
        return <Badge variant="warning">Inactive</Badge>
      case 'suspended':
        return <Badge variant="error">Suspended</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getSubscriptionBadge = (subscriptionStatus?: string) => {
    switch (subscriptionStatus) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'past_due':
        return <Badge variant="warning">Past Due</Badge>
      case 'canceled':
        return <Badge variant="error">Canceled</Badge>
      case 'trial':
        return <Badge variant="info">Trial</Badge>
      default:
        return <Badge variant="default">Unknown</Badge>
    }
  }

  const handleCreateBusiness = async (result: any) => {
    // BusinessSetupModal already called the API — just refresh the list
    await loadBusinesses()
    setLastCreatedBusiness({
      businessId: result?.businessId,
      businessName: result?.businessName || result?.name || 'New business',
      ownerEmail: result?.ownerEmail || result?.contactEmail || ''
    })
    const siteText = result?.firstSiteName ? ` First site "${result.firstSiteName}" was also created.` : ''
    setActionNotice({ type: 'success', text: `New business created successfully.${siteText}` })
  }

  const getSetupProgress = (business: Business) => {
    const steps = [
      (business.setupMilestones?.sitesCount || 0) > 0,
      (business.setupMilestones?.devicesCount || 0) > 0,
      (business.setupMilestones?.menuItemsCount || 0) > 0
    ]
    const completed = steps.filter(Boolean).length
    return {
      completed,
      total: steps.length,
      label: completed === steps.length ? 'Complete' : 'In Progress',
      detail: `${business.setupMilestones?.sitesCount || 0} sites, ${business.setupMilestones?.devicesCount || 0} devices, ${business.setupMilestones?.menuItemsCount || 0} menu items`
    }
  }

  const getNeedsAttention = (business: Business) => {
    const issues: string[] = []
    if ((business.setupMilestones?.sitesCount || 0) === 0) issues.push('No site')
    if ((business.setupMilestones?.devicesCount || 0) === 0) issues.push('No device')
    if ((business.setupMilestones?.menuItemsCount || 0) === 0) issues.push('No active menu')
    if (business.status === 'suspended') issues.push('Suspended')
    if (business.status === 'trial' && business.trialEndsAt) {
      const daysLeft = Math.ceil((new Date(business.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysLeft <= 7) issues.push(daysLeft < 0 ? 'Trial expired' : 'Trial ending soon')
    }
    if ((business.deviceStatus?.offline || 0) > 0) issues.push(`${business.deviceStatus?.offline} offline device${business.deviceStatus?.offline === 1 ? '' : 's'}`)
    return issues
  }

  const formatLastActivity = (value?: string | null) => {
    if (!value) return 'No kiosk activity'
    const diffMs = Date.now() - new Date(value).getTime()
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 1) return 'Active just now'
    if (minutes < 60) return `Active ${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Active ${hours}h ago`
    const days = Math.floor(hours / 24)
    return `Active ${days}d ago`
  }

  const getRecentBusinessMatch = () => {
    if (!lastCreatedBusiness) return null

    return businesses.find((business) =>
      business.id === lastCreatedBusiness.businessId ||
      (lastCreatedBusiness.ownerEmail && business.contactEmail === lastCreatedBusiness.ownerEmail)
    ) || null
  }

  const handleCopyOwnerEmail = async () => {
    if (!lastCreatedBusiness?.ownerEmail) {
      setActionNotice({ type: 'error', text: 'No owner email available to copy.' })
      return
    }

    try {
      await navigator.clipboard.writeText(lastCreatedBusiness.ownerEmail)
      setActionNotice({ type: 'success', text: `Copied ${lastCreatedBusiness.ownerEmail} to clipboard.` })
    } catch {
      setActionNotice({ type: 'error', text: 'Unable to copy email to clipboard.' })
    }
  }

  const handleOpenRecentBusiness = () => {
    const business = getRecentBusinessMatch()
    if (!business) {
      setActionNotice({ type: 'error', text: 'Could not find the newly created business in the list yet.' })
      return
    }
    handleViewBusinessDetails(business)
  }

  const handleSetPasswordForRecentBusiness = () => {
    const business = getRecentBusinessMatch()
    if (!business) {
      setActionNotice({ type: 'error', text: 'Could not find the newly created business in the list yet.' })
      return
    }
    handleSetPassword(business)
  }

  const handleViewBusinessDetails = (business: Business) => {
    setSelectedBusiness(business)
    setShowBusinessDetails(true)
  }

  const handleEditBusiness = (business: Business) => {
    setEditBusiness(business)
    setEditForm({
      name: business.name || '',
      ownerName: business.contactName || '',
      phone: business.phone || '',
      address: business.address || '',
      plan: business.plan || 'starter',
      status: business.status || 'active'
    })
    setEditError('')
    setShowEditModal(true)
  }

  const handleEditBusinessSubmit = async () => {
    if (!editBusiness) return
    if (!editForm.name.trim()) {
      setEditError('Business name is required.')
      return
    }

    setIsLoading(true)
    setEditError('')
    try {
      const response = await fetch(`/api/super-admin/business/${editBusiness.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          ownerName: editForm.ownerName.trim(),
          phone: editForm.phone.trim(),
          address: editForm.address.trim(),
          plan: editForm.plan,
          status: editForm.status
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update business')

      await loadBusinesses()
      setShowEditModal(false)
      setShowBusinessDetails(false)
      setActionNotice({ type: 'success', text: `Business "${editForm.name}" updated successfully.` })
    } catch (error: any) {
      setEditError(error.message || 'Failed to update business.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuspendBusiness = async (business: Business) => {
    if (!confirm(`Are you sure you want to suspend "${business.name}"? This will disable their access.`)) {
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(`/api/super-admin/business/${business.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'suspended' })
      })
      if (!response.ok) throw new Error('Failed to suspend business')
      await loadBusinesses()
      if (selectedBusiness?.id === business.id) {
        setSelectedBusiness(prev => prev ? { ...prev, status: 'suspended' } : prev)
      }
      setActionNotice({ type: 'success', text: `Business "${business.name}" has been suspended.` })
    } catch (error) {
      setActionNotice({ type: 'error', text: 'Failed to suspend business.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivateBusiness = async (business: Business) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/super-admin/business/${business.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      })
      if (!response.ok) throw new Error('Failed to activate business')
      await loadBusinesses()
      if (selectedBusiness?.id === business.id) {
        setSelectedBusiness(prev => prev ? { ...prev, status: 'active' } : prev)
      }
      setActionNotice({ type: 'success', text: `Business "${business.name}" has been activated.` })
    } catch (error) {
      setActionNotice({ type: 'error', text: 'Failed to activate business.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (business: Business) => {
    if (!confirm(`Send password reset email to ${business.contactEmail}?`)) {
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(`/api/super-admin/business/${business.id}/reset-password`, {
        method: 'POST'
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send reset email')
      setActionNotice({ type: 'success', text: `Password reset email sent to ${data.email}.` })
    } catch (error: any) {
      setActionNotice({ type: 'error', text: error.message || 'Failed to send password reset email.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetPassword = (business: Business) => {
    setSetPasswordBusiness(business)
    setSetPasswordValue('')
    setSetPasswordConfirm('')
    setSetPasswordError('')
    setShowSetPasswordModal(true)
  }

  const handleSetPasswordSubmit = async () => {
    if (setPasswordValue.length < 8) {
      setSetPasswordError('Password must be at least 8 characters.')
      return
    }
    if (setPasswordValue !== setPasswordConfirm) {
      setSetPasswordError('Passwords do not match.')
      return
    }
    if (!setPasswordBusiness) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/super-admin/business/${setPasswordBusiness.id}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: setPasswordValue })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to set password')
      setShowSetPasswordModal(false)
      setActionNotice({ type: 'success', text: `Password set successfully for ${data.email}.` })
    } catch (error: any) {
      setSetPasswordError(error.message || 'Failed to set password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportData = () => {
    // In a real implementation, this would export business data
    const csvContent = [
      ['Name', 'Email', 'Status', 'Plan', 'Revenue', 'Created'],
      ...filteredBusinesses.map(b => [
        b.name,
        b.contactEmail,
        b.status,
        b.plan,
        b.revenue?.toString() || '0',
        b.createdAt
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'businesses-export.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  // Derived stats
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const totalBusinesses = businesses.length
  const activeCount = businesses.filter(b => b.status === 'active').length
  const trialCount = businesses.filter(b => b.status === 'trial').length
  const suspendedCount = businesses.filter(b => b.status === 'suspended').length
  const estimatedMRR = businesses
    .filter(b => b.status === 'active')
    .reduce((sum, b) => sum + (b.revenue || 0), 0)
  const newThisMonth = businesses.filter(b => new Date(b.createdAt) >= firstOfMonth).length
  const needsSetupCount = businesses.filter(b => getSetupProgress(b).completed < 3).length
  const offlineDeviceCount = businesses.reduce((sum, b) => sum + (b.deviceStatus?.offline || 0), 0)
  const onlineDeviceCount = businesses.reduce((sum, b) => sum + (b.deviceStatus?.online || 0), 0)
  const attentionBusinesses = businesses
    .map(business => ({ business, issues: getNeedsAttention(business), progress: getSetupProgress(business) }))
    .filter(item => item.issues.length > 0)
    .slice(0, 6)
  const recentlyActiveBusinesses = businesses
    .filter(business => business.lastActivityAt)
    .sort((a, b) => new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime())
    .slice(0, 5)

  return (
    <>
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin Command Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage customer setup, monitor kiosk health, and keep the platform moving.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            icon={<Zap className="h-4 w-4" />}
            onClick={() => setShowDemoModal(true)}
          >
            Create Demo
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Business
          </Button>
        </div>
      </div>

      {actionNotice && (
        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm flex items-center justify-between ${
          actionNotice.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{actionNotice.text}</span>
          <button
            type="button"
            className="ml-4 font-medium opacity-80 hover:opacity-100"
            onClick={() => setActionNotice(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {lastCreatedBusiness && (
        <Card className="mb-6 border border-[#42b8ac]/30 bg-[#42b8ac]/5">
          <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">New customer ready</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {lastCreatedBusiness.businessName}
                {lastCreatedBusiness.ownerEmail ? ` (${lastCreatedBusiness.ownerEmail})` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyOwnerEmail}>
                Copy Owner Email
              </Button>
              <Button variant="outline" size="sm" onClick={handleSetPasswordForRecentBusiness}>
                Set Temporary Password
              </Button>
              <Button variant="primary" size="sm" onClick={handleOpenRecentBusiness}>
                Open Business Details
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <div className="p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalBusinesses}</p>
            <p className="text-xs text-gray-400 mt-1">businesses</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Active</p>
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-gray-400 mt-1">paid subscribers</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">On Trial</p>
            <p className="text-3xl font-bold text-amber-500">{trialCount}</p>
            <p className="text-xs text-gray-400 mt-1">{suspendedCount > 0 ? `${suspendedCount} suspended` : 'no suspensions'}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Needs Setup</p>
            <p className="text-3xl font-bold text-amber-500">{needsSetupCount}</p>
            <p className="text-xs text-gray-400 mt-1">incomplete accounts</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Devices</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{onlineDeviceCount}/{onlineDeviceCount + offlineDeviceCount}</p>
            <p className="text-xs text-gray-400 mt-1">{offlineDeviceCount} offline</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Est. MRR</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">€{estimatedMRR.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">active accounts only</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">New</p>
            <p className="text-3xl font-bold text-[#42b8ac]">{newThisMonth}</p>
            <p className="text-xs text-gray-400 mt-1">joined this month</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 mb-8">
        <Card>
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Needs Attention</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Accounts with setup gaps or operational issues.</p>
            </div>
            <Badge variant={attentionBusinesses.length > 0 ? 'warning' : 'success'}>
              {attentionBusinesses.length > 0 ? `${attentionBusinesses.length} to review` : 'Clear'}
            </Badge>
          </div>
          <div className="p-5">
            {attentionBusinesses.length === 0 ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                All businesses have the core setup pieces in place.
              </div>
            ) : (
              <div className="space-y-3">
                {attentionBusinesses.map(({ business, issues, progress }) => (
                  <div key={business.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white">{business.name}</p>
                        {getStatusBadge(business.status)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {progress.detail} &middot; {formatLastActivity(business.lastActivityAt)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {issues.map(issue => (
                          <span key={issue} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                            {issue}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleViewBusinessDetails(business)}>
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Setup Flow</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">The fastest path for a new business user.</p>
          </div>
          <div className="p-5 space-y-4">
            {[
              ['Create owner and business', 'Use Add Business to create the login and customer record.'],
              ['Add first site', 'Create the customer location that the kiosk will use.'],
              ['Pair kiosk device', 'Generate a setup code and link the physical tablet.'],
              ['Publish active menu', 'Add menu items, allergens, colours, and icons.'],
            ].map(([title, desc], index) => (
              <div key={title} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#42b8ac]/10 text-sm font-bold text-[#0f766e]">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
            <Button variant="primary" className="w-full" onClick={() => setShowCreateModal(true)}>
              Start New Business Setup
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mb-8">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Platform Activity</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Latest businesses with kiosk activity.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/super-admin/analytics')}>
            Open Analytics
          </Button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
          {recentlyActiveBusinesses.length === 0 ? (
            <div className="md:col-span-5 text-sm text-gray-500 dark:text-gray-400">No kiosk activity recorded yet.</div>
          ) : (
            recentlyActiveBusinesses.map(business => (
              <button
                key={business.id}
                type="button"
                className="text-left rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:border-[#42b8ac]/60 hover:bg-[#42b8ac]/5 transition-colors"
                onClick={() => handleViewBusinessDetails(business)}
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{business.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatLastActivity(business.lastActivityAt)}</p>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <button
          type="button"
          className="h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-[#42b8ac]/50 hover:bg-[#42b8ac]/5 transition-colors text-gray-700 dark:text-gray-300 text-sm font-medium"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-5 w-5" />
          Add Business
        </button>
        <button
          type="button"
          className="h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-[#42b8ac]/50 hover:bg-[#42b8ac]/5 transition-colors text-gray-700 dark:text-gray-300 text-sm font-medium"
          onClick={loadBusinesses}
          disabled={isLoading}
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          type="button"
          className="h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-gray-900 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors text-amber-600 text-sm font-medium"
          onClick={() => { setStatusFilter('trial'); setPlanFilter('all'); setSearchTerm('') }}
        >
          <AlertCircle className="h-5 w-5" />
          View Trials
        </button>
        <button
          type="button"
          className="h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[#42b8ac]/40 bg-white dark:bg-gray-900 hover:bg-[#42b8ac]/5 transition-colors text-[#42b8ac] text-sm font-medium"
          onClick={() => setShowDemoModal(true)}
        >
          <Zap className="h-5 w-5" />
          Create Demo
        </button>
        <button
          type="button"
          className="h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-colors text-gray-700 dark:text-gray-300 text-sm font-medium"
          onClick={handleExportData}
        >
          <Download className="h-5 w-5" />
          Export CSV
        </button>
      </div>

      {/* Search & Filters + table */}
      <Card className="mb-6">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'trial', label: 'Trial' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'suspended', label: 'Suspended' }
                ]}
              />
              <Select
                value={planFilter}
                onChange={(value) => setPlanFilter(value)}
                options={[
                  { value: 'all', label: 'All Plans' },
                  { value: 'starter', label: 'Starter' },
                  { value: 'pro', label: 'Pro' },
                  { value: 'enterprise', label: 'Enterprise' }
                ]}
              />
              {(searchTerm || statusFilter !== 'all' || planFilter !== 'all') && (
                <button
                  type="button"
                  className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50"
                  onClick={() => { setSearchTerm(''); setStatusFilter('all'); setPlanFilter('all') }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {filteredBusinesses.length !== businesses.length && (
            <p className="text-xs text-gray-400 mt-2">
              Showing {filteredBusinesses.length} of {businesses.length} businesses
            </p>
          )}
        </div>

        {/* Businesses Table */}
        <div>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Setup</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBusinesses.map((business) => {
                const progress = getSetupProgress(business)
                const menuOpen = openMenuId === business.id

                return (
                <tr key={business.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  {/* Business name + plan + joined */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{business.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      <span className="capitalize">{business.plan}</span> &middot; joined {new Date(business.createdAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </div>
                  </td>

                  {/* Owner email */}
                  <td className="px-4 py-3">
                    {business.contactName && (
                      <div className="text-sm text-gray-900 dark:text-white">{business.contactName}</div>
                    )}
                    <div className="text-xs text-gray-400 max-w-[180px] truncate">{business.contactEmail}</div>
                  </td>

                  {/* Single status badge */}
                  <td className="px-4 py-3">
                    {getStatusBadge(business.status)}
                  </td>

                  {/* Setup progress */}
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{progress.detail}</div>
                    <div className="mt-1 h-1.5 w-24 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${progress.completed === progress.total ? 'bg-green-500' : 'bg-amber-400'}`}
                        style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                      />
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setOpenMenuId(null); handleViewBusinessDetails(business) }}
                      >
                        View
                      </Button>

                      {/* State-based dropdown — no <details> */}
                      <div className="relative">
                        <button
                          type="button"
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                          onClick={() => setOpenMenuId(menuOpen ? null : business.id)}
                          aria-label="More actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {menuOpen && (
                          <>
                            {/* Click-outside backdrop */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-1">
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={() => { setOpenMenuId(null); handleEditBusiness(business) }}
                              >
                                Edit Customer
                              </button>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={() => { setOpenMenuId(null); handleSetPassword(business) }}
                              >
                                Set Temporary Password
                              </button>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={() => { setOpenMenuId(null); handleResetPassword(business) }}
                              >
                                Send Password Reset Email
                              </button>
                              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                              {business.status === 'active' || business.status === 'trial' ? (
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={() => { setOpenMenuId(null); handleSuspendBusiness(business) }}
                                >
                                  Suspend Business
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                  onClick={() => { setOpenMenuId(null); handleActivateBusiness(business) }}
                                >
                                  Activate Business
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredBusinesses.length === 0 && (
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No businesses found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {businesses.length === 0 ? 'No businesses registered yet.' : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        )}
      </Card>

      {/* Demo Account Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Create Demo Account</h2>
            <p className="text-sm text-gray-500 mb-6">
              Creates a fully-seeded account with a sample location, device, and 8 menu items — ready to demonstrate in under a minute.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prospect Email *</label>
                <input
                  type="email"
                  value={demoForm.ownerEmail}
                  onChange={e => setDemoForm(p => ({ ...p, ownerEmail: e.target.value }))}
                  placeholder="prospect@restaurant.ie"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={demoForm.ownerName}
                  onChange={e => setDemoForm(p => ({ ...p, ownerName: e.target.value }))}
                  placeholder="Demo User"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
                <input
                  type="text"
                  value={demoForm.businessName}
                  onChange={e => setDemoForm(p => ({ ...p, businessName: e.target.value }))}
                  placeholder="Demo Restaurant"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Name</label>
                <input
                  type="text"
                  value={demoForm.locationName}
                  onChange={e => setDemoForm(p => ({ ...p, locationName: e.target.value }))}
                  placeholder="Main Location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDemoModal(false)} disabled={demoLoading}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={handleCreateDemoAccount} disabled={demoLoading}>
                {demoLoading ? 'Creating…' : 'Create Demo Account'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Business Setup Modal */}
      <BusinessSetupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateBusiness}
      />

      {/* Business Details Modal */}
      <BusinessDetailsModal
        isOpen={showBusinessDetails}
        onClose={() => setShowBusinessDetails(false)}
        business={selectedBusiness}
        onEdit={handleEditBusiness}
        onResetPassword={handleResetPassword}
        onSetPassword={handleSetPassword}
        onToggleStatus={(business) => {
          if (business.status === 'suspended') {
            handleActivateBusiness(business)
          } else {
            handleSuspendBusiness(business)
          }
        }}
      />

      {/* Edit Business Modal */}
      {showEditModal && editBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Customer</h2>
                <p className="text-sm text-gray-500 mt-1">{editBusiness.contactEmail}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                <XCircle className="h-5 w-5" />
              </Button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => { setEditForm(p => ({ ...p, name: e.target.value })); setEditError('') }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner Name</label>
                <input
                  type="text"
                  value={editForm.ownerName}
                  onChange={e => setEditForm(p => ({ ...p, ownerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
                <select
                  value={editForm.plan}
                  onChange={e => setEditForm(p => ({ ...p, plan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-sm"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={isLoading}>Cancel</Button>
              <Button variant="primary" onClick={handleEditBusinessSubmit} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {showSetPasswordModal && setPasswordBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Set Password</h2>
            <p className="text-sm text-gray-500 mb-6">
              Setting a temporary password for{' '}
              <span className="font-semibold">{setPasswordBusiness.name}</span>
              {' '}({setPasswordBusiness.contactEmail})
            </p>
            {setPasswordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {setPasswordError}
              </div>
            )}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    value={setPasswordValue}
                    onChange={e => { setSetPasswordValue(e.target.value); setSetPasswordError('') }}
                    placeholder="At least 8 characters"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    value={setPasswordConfirm}
                    onChange={e => { setSetPasswordConfirm(e.target.value); setSetPasswordError('') }}
                    placeholder="Repeat password"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowSetPasswordModal(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={handleSetPasswordSubmit} disabled={isLoading}>
                {isLoading ? 'Setting…' : 'Set Password'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
