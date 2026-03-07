# Stripe Integration Setup

This application includes Stripe integration for collecting subscription payments from businesses using your platform.

## Setup Instructions

### 1. Create a Stripe Account
1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete the account verification process

### 2. Get Your API Keys
1. In your Stripe dashboard, go to Developers > API keys
2. Copy your **Publishable key** and **Secret key**
3. For Connect (to accept payments on behalf of businesses), you'll need to set up Stripe Connect

### 3. Configure Environment Variables
Update your `.env.local` file with the following variables:

```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key
STRIPE_CLIENT_ID=ca_your_stripe_connect_client_id
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_APP_URL=https://your-app-url.com
```

### 4. Set Up Webhooks
1. In Stripe Dashboard, go to Developers > Webhooks
2. Add endpoint: `https://your-app-url.com/api/stripe/webhooks`
3. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 5. Connect Your Stripe Account
1. In the app, go to Settings > Billing
2. Click "Connect Stripe" to link your Stripe account
3. Complete the OAuth flow

## Features Included

- **Stripe Account Connection**: Connect your Stripe account to start accepting payments
- **Payment Method Management**: Add/manage payment methods for your own billing
- **Customer Subscription Tracking**: View and manage subscriptions from businesses
- **Webhook Handling**: Automatic updates when subscription events occur
- **Subscription Analytics**: Basic dashboard showing active/trial/past due subscriptions

## Next Steps

1. Set up subscription products and prices in your Stripe dashboard
2. Implement the actual subscription creation flow for businesses
3. Add customer portal functionality for businesses to manage their own subscriptions
4. Implement proper error handling and user feedback

## Security Notes

- Never expose secret keys in client-side code
- Always verify webhook signatures
- Store sensitive payment data securely
- Use HTTPS for all Stripe communications