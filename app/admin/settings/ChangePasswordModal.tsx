// app/admin/settings/ChangePasswordModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount or modal close
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [timeoutId])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
      setSuccess(false)
      setLoading(false)
      if (timeoutId) {
        clearTimeout(timeoutId)
        setTimeoutId(null)
      }
    }
  }, [isOpen, timeoutId])

  const cancelOperation = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      setTimeoutId(null)
    }
    setLoading(false)
    setError('Operation cancelled')
  }

  const handleChangePassword = async () => {
    setError(null)
    setSuccess(false)
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!currentPassword) {
      setError('Current password is required')
      return
    }
    setLoading(true)
    
    // Add timeout to prevent hanging (30 seconds for API calls)
    const timeout = setTimeout(() => {
      setError('Request timed out. Please check your connection and try again.')
      setLoading(false)
      setTimeoutId(null)
    }, 30000) // 30 second timeout
    setTimeoutId(timeout)

    try {
      console.log('Calling server-side password change API...')
      
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      console.log('Server-side password change successful')
      if (timeoutId) clearTimeout(timeoutId)
      setTimeoutId(null)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => onClose(), 1500)
    } catch (err: any) {
      console.error('Password change error:', err)
      if (timeoutId) clearTimeout(timeoutId)
      setTimeoutId(null)
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    } finally {
      // Only reset loading if not successful (to allow success message to show)
      if (!success) {
        setLoading(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">{t('admin.changePassword')}</h2>
        {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
        {success && <div className="mb-2 text-green-600 text-sm">{t('admin.passwordChangedSuccessfully')}</div>}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">{t('admin.currentPassword')}</label>
          <input
            type="password"
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            placeholder={t('admin.enterCurrentPassword')}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">{t('admin.newPassword')}</label>
          <input
            type="password"
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={t('admin.enterNewPassword')}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">{t('admin.confirmNewPassword')}</label>
          <input
            type="password"
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={t('admin.confirmNewPasswordPlaceholder')}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={loading ? cancelOperation : onClose} disabled={false}>
            {loading ? t('admin.cancel') : t('admin.close')}
          </Button>
          <Button onClick={handleChangePassword} disabled={loading}>
            {loading ? t('admin.changingPassword') : t('admin.changePasswordButton')}
          </Button>
        </div>
        {loading && (
          <div className="mt-2 text-sm text-gray-600 text-center">
            {t('admin.passwordChangeNote')}
          </div>
        )}
      </div>
    </div>
  )
}
