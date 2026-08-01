'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js'

export interface StripeCardElementHandle {
  createPaymentMethod: (billingName?: string) => Promise<{ paymentMethodId?: string; error?: string }>
}

interface StripeCardElementFieldProps {
  disabled?: boolean
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      '::placeholder': {
        color: '#9ca3af',
      },
    },
    invalid: {
      color: '#dc2626',
    },
  },
}

const StripeCardElementField = forwardRef<StripeCardElementHandle, StripeCardElementFieldProps>(
  ({ disabled = false }, ref) => {
    const stripe = useStripe()
    const elements = useElements()
    const [cardError, setCardError] = useState('')

    useImperativeHandle(ref, () => ({
      async createPaymentMethod(billingName?: string) {
        if (!stripe || !elements) {
          return { error: 'Stripe is not ready yet. Please wait a moment and try again.' }
        }

        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
          return { error: 'Card field is not available. Please refresh and try again.' }
        }

        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: billingName || undefined,
          },
        })

        if (error) {
          const message = error.message || 'Failed to validate card details.'
          setCardError(message)
          return { error: message }
        }

        setCardError('')
        return { paymentMethodId: paymentMethod?.id }
      },
    }))

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Card Details
        </label>
        <div className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        {cardError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{cardError}</p>
        )}
        {disabled && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Saving is disabled while Stripe is loading.
          </p>
        )}
      </div>
    )
  }
)

StripeCardElementField.displayName = 'StripeCardElementField'

export default StripeCardElementField
