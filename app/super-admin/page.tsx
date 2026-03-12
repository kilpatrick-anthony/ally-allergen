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
  Settings,
  BarChart3,
  DollarSign,
  Eye,
  UserX,
  UserCheck,
  Key,
  Lock,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react'
import { Container } from '../components/layout/Container'
import { Card } from '../components/layout/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../../components/ui/Select'
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

  const handleCreateBusiness = async (_result: any) => {
    // BusinessSetupModal already called the API — just refresh the list
    await loadBusinesses()
  }

  const handleViewBusinessDetails = (business: Business) => {
    setSelectedBusiness(business)
    setShowBusinessDetails(true)
  }

  const handleEditBusiness = (business: Business) => {
    // In a real implementation, this would open an edit modal
    alert(`Edit functionality for "${business.name}" would be implemented here`)
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
      alert(`Business "${business.name}" has been suspended`)
    } catch (error) {
      alert('Failed to suspend business')
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
      alert(`Business "${business.name}" has been activated`)
    } catch (error) {
      alert('Failed to activate business')
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
      alert(`Password reset email sent to ${data.email}`)
    } catch (error: any) {
      alert(error.message || 'Failed to send password reset email')
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
      alert(`Password set successfully for ${data.email}. You can now log in as this user.`)
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
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative h-12 w-12 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-[#003842]/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#42b8ac] animate-spin"></div>
              <div className="absolute inset-1 rounded-full border-4 border-transparent border-b-[#003842] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            </div>
            <p className="text-gray-600">Loading super admin dashboard...</p>
          </div>
        </div>
      </Container>
    )
  }

  if (!isSuperAdmin) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-purple-400 to-purple-600 dark:from-purple-500 dark:to-gray-700 rounded-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Super Admin Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Manage businesses, subscriptions, and platform settings
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setShowCreateModal(true)}
          >
            Add New Business
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm">Add Business</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => window.open('/api/debug-db', '_blank')}
          >
            <BarChart3 className="h-6 w-6" />
            <span className="text-sm">View Analytics</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => window.open('/api/test-db', '_blank')}
          >
            <Settings className="h-6 w-6" />
            <span className="text-sm">System Status</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => window.open('/api/health', '_blank')}
          >
            <CheckCircle className="h-6 w-6" />
            <span className="text-sm">Health Check</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search businesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'trial', label: 'Trial' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
                className="w-32"
              />
              <Select
                value={planFilter}
                onChange={setPlanFilter}
                options={[
                  { value: 'all', label: 'All Plans' },
                  { value: 'starter', label: 'Starter' },
                  { value: 'pro', label: 'Pro' },
                  { value: 'enterprise', label: 'Enterprise' }
                ]}
                className="w-32"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setPlanFilter('all')
              }}
            >
              Clear Filters
            </Button>
            <Button
              variant="outline"
              icon={Download}
              onClick={handleExportData}
            >
              Export Data
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Businesses</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{businesses.length}</p>
              </div>
              <Building className="h-8 w-8 text-[#42b8ac]" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Subscriptions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {businesses.filter(b => b.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${businesses.reduce((sum, b) => sum + (b.revenue || 0), 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Setup</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {businesses.filter(b => b.status === 'trial' || b.subscriptionStatus === 'past_due').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search businesses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

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
          </div>
        </div>
      </Card>

      {/* Businesses Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBusinesses.map((business) => (
                <tr key={business.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {business.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Created {new Date(business.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {business.contactName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {business.contactEmail}
                    </div>
                    {business.phone && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {business.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(business.status)}
                      {getSubscriptionBadge(business.subscriptionStatus)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="default">
                      {business.plan}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {business.revenue ? `$${business.revenue}/mo` : 'Trial'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                        onClick={() => handleViewBusinessDetails(business)}
                        title="View Details"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Edit}
                        onClick={() => handleEditBusiness(business)}
                        title="Edit Business"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Lock}
                        onClick={() => handleSetPassword(business)}
                        title="Set Password"
                        className="text-blue-600 hover:text-blue-700"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Key}
                        onClick={() => handleResetPassword(business)}
                        title="Send Reset Email"
                      />
                      {business.status === 'active' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={UserX}
                          onClick={() => handleSuspendBusiness(business)}
                          title="Suspend Business"
                          className="text-red-600 hover:text-red-700"
                        />
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={UserCheck}
                          onClick={() => handleActivateBusiness(business)}
                          title="Activate Business"
                          className="text-green-600 hover:text-green-700"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBusinesses.length === 0 && (
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No businesses found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </Card>

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
      />

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
    </Container>
  )
}