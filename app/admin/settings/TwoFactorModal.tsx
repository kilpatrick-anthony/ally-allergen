// app/admin/settings/TwoFactorModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, ShieldCheck } from 'lucide-react'

interface TwoFactorModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function TwoFactorModal({ isOpen, onClose, onSuccess }: TwoFactorModalProps) {
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const enableTwoFactor = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to enable 2FA')
      }

      setQrCodeUrl(data.qrCodeUrl)
      setSecret(data.secret)
      setStep('verify')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyTwoFactor = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: verificationCode,
          secret: secret
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify 2FA code')
      }

      setBackupCodes(data.backupCodes)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setStep('setup')
    setError(null)
    setQrCodeUrl('')
    setSecret('')
    setVerificationCode('')
    setBackupCodes([])
    setCopied(false)
  }

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      setCopied(true)
    } catch {
      setError('Could not copy automatically. Please select and copy the codes manually.')
    }
  }

  const finishSetup = () => {
    onSuccess()
  }

  useEffect(() => {
    if (!isOpen) {
      resetModal()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="two-factor-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">
          <span id="two-factor-title">
            {backupCodes.length > 0 ? 'Save Your Backup Codes' : step === 'setup' ? 'Enable Two-Factor Authentication' : 'Verify Setup'}
          </span>
        </h2>

        {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

        {step === 'setup' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Two-factor authentication adds an extra layer of security to your account.
              You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
            </div>
            <Button onClick={enableTwoFactor} disabled={loading} className="w-full">
              {loading ? 'Setting up...' : 'Set up Two-Factor Authentication'}
            </Button>
          </div>
        )}

        {step === 'verify' && backupCodes.length === 0 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="bg-gray-100 p-4 rounded-lg inline-block mb-4">
                <QRCodeSVG value={qrCodeUrl} size={200} />
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Scan this QR code with your authenticator app
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Or manually enter: <code className="bg-gray-100 px-2 py-1 rounded">{secret}</code>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Enter verification code
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <Button onClick={verifyTwoFactor} disabled={loading || verificationCode.length !== 6} className="w-full">
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </div>
        )}

        {backupCodes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 font-medium text-green-700">
              <ShieldCheck className="h-5 w-5" /> Two-factor authentication is enabled
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Each code works once. Save them in your password manager now—you will not be able to view them again after closing this window.
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm" aria-label="Backup codes">
                {backupCodes.map((code, index) => (
                  <div key={index}>{code}</div>
                ))}
              </div>
            </div>
            <Button variant="outline" onClick={copyBackupCodes} className="w-full">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Copied' : 'Copy all backup codes'}
            </Button>
            <Button onClick={finishSetup} className="w-full">I have saved my codes</Button>
          </div>
        )}

        {backupCodes.length === 0 && <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>}
      </div>
    </div>
  )
}
