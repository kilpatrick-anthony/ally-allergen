// app/super-admin/components/BusinessDetailsModal.tsx
'use client'

import { useState } from 'react'
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Building,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  DollarSign
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

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

interface BusinessDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  business: Business | null
}

export function BusinessDetailsModal({ isOpen, onClose, business }: BusinessDetailsModalProps) {
  if (!business) return null

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

  const getPlanDetails = (plan: string) => {
    switch (plan) {
      case 'starter':
        return { price: '$99/mo', features: ['Basic allergen management', 'Up to 50 products', 'Email support'] }
      case 'pro':
        return { price: '$299/mo', features: ['Advanced allergen management', 'Unlimited products', 'Priority support', 'Custom reports'] }
      case 'enterprise':
        return { price: '$499/mo', features: ['Full enterprise features', 'Multi-location support', 'Dedicated support', 'API access'] }
      default:
        return { price: 'Unknown', features: [] }
    }
  }

  const planDetails = getPlanDetails(business.plan)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Business Details">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {business.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Business ID: {business.id}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(business.status)}
            {getSubscriptionBadge(business.subscriptionStatus)}
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white">{business.contactEmail}</span>
              </div>
              {business.contactName && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{business.contactName}</span>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{business.phone}</span>
                </div>
              )}
              {business.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-900 dark:text-white">{business.address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Details
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                <Badge variant="default">{business.plan.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Price:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{planDetails.price}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                {getSubscriptionBadge(business.subscriptionStatus)}
              </div>
              {business.revenue && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Monthly Revenue:</span>
                  <span className="font-semibold text-green-600">${business.revenue}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plan Features */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Plan Features
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {planDetails.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Created:</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(business.createdAt).toLocaleDateString()}
              </span>
            </div>
            {business.trialEndsAt && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Trial Ends:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(business.trialEndsAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {business.status === 'trial' && business.trialEndsAt && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Days Remaining:</span>
                <span className={`font-semibold ${
                  new Date(business.trialEndsAt) < new Date() ? 'text-red-600' : 'text-green-600'
                }`}>
                  {Math.max(0, Math.ceil((new Date(business.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              // In a real implementation, this would open an edit modal
              alert('Edit functionality would be implemented here')
            }}
          >
            Edit Business
          </Button>
        </div>
      </div>
    </Modal>
  )
}