import type { Metadata } from 'next'
import LegalPageLayout from '@/components/legal/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing access to and use of the AllyJen platform.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      summary="These terms govern access to and use of the AllyJen website, business platform, customer-facing kiosks, QR pages, and related services."
    >
      <section>
        <h2>1. About these terms</h2>
        <p>The service is provided by AllyJen Solutions Limited (CRO No. 811542), Republic of Ireland. By creating an account or using a paid service, you agree to these terms and any order form or subscription terms agreed with us.</p>
      </section>

      <section>
        <h2>2. Accounts and authorised use</h2>
        <p>You must provide accurate information, protect account credentials, assign access only to authorised personnel, and notify us promptly of suspected unauthorised access. You may use AllyJen only for lawful business purposes and must not interfere with, probe, copy, or misuse the service.</p>
      </section>

      <section>
        <h2>3. Allergen and menu responsibilities</h2>
        <p>AllyJen is an information-management tool and does not replace food-business procedures, staff training, supplier verification, professional advice, or legal obligations. Unless an agreed managed-service order expressly says otherwise, the customer is responsible for the accuracy, completeness, review, and timely updating of all menu, ingredient, supplier, allergen, and dietary information.</p>
        <p>Customers must maintain appropriate controls for cross-contamination and direct customers with allergies to trained staff where required. AI-generated or automated suggestions must be reviewed by a competent person before being relied upon.</p>
      </section>

      <section>
        <h2>4. Subscriptions and payment</h2>
        <p>Fees, plan limits, billing dates, minimum terms, renewals, and cancellation arrangements are set out in the applicable order or checkout. Unless stated otherwise, fees exclude applicable taxes. Failure to pay may result in suspension after reasonable notice.</p>
      </section>

      <section>
        <h2>5. Customer content and data</h2>
        <p>You retain ownership of content you submit. You grant AllyJen the limited rights needed to host, process, display, back up, and transmit that content to provide and secure the service. You confirm that you have the rights and lawful basis needed to submit it.</p>
      </section>

      <section>
        <h2>6. Availability and changes</h2>
        <p>We aim to provide a reliable service but do not guarantee uninterrupted or error-free operation. We may perform maintenance, address security issues, and make reasonable changes to features. Offline or printed allergen information should be refreshed whenever source data changes.</p>
      </section>

      <section>
        <h2>7. Intellectual property</h2>
        <p>AllyJen and its licensors retain all rights in the software, branding, documentation, templates, and service design. These terms grant only a limited, non-exclusive, non-transferable right to use the service during an active subscription.</p>
      </section>

      <section>
        <h2>8. Liability</h2>
        <p>Nothing in these terms excludes liability that cannot legally be excluded. To the extent permitted by law, neither party is liable for indirect or consequential loss. Any additional liability limits or service commitments are set out in the applicable business order. Customers remain responsible for food safety and the allergen information they publish through the service.</p>
      </section>

      <section>
        <h2>9. Ending access</h2>
        <p>Either party may end the service in accordance with the applicable order. We may suspend or terminate access for material breach, unlawful use, serious security risk, or non-payment. Provisions intended to survive termination, including payment, intellectual-property, liability, and confidentiality provisions, will continue.</p>
      </section>

      <section>
        <h2>10. Governing law and contact</h2>
        <p>These terms are governed by Irish law, and the Irish courts have jurisdiction, subject to any mandatory rights that apply. Questions may be sent to <a href="mailto:sales@allyjen.ie">sales@allyjen.ie</a>.</p>
      </section>
    </LegalPageLayout>
  )
}
