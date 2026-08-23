import type { Metadata } from 'next'
import LegalPageLayout from '@/components/legal/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How AllyJen Solutions Limited collects, uses, and protects personal data.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      summary="This policy describes how AllyJen Solutions Limited processes personal data when you visit our website, contact us, or use the AllyJen platform."
    >
      <section>
        <h2>1. Who we are</h2>
        <p>AllyJen Solutions Limited (CRO No. 811542), Republic of Ireland, is the controller for our website, sales, account, and service-administration activities. Business customers may act as controllers for personal data they enter into AllyJen, with AllyJen acting as their processor.</p>
        <p>Contact: <a href="mailto:sales@allyjen.ie">sales@allyjen.ie</a> or +353 89 658 0997.</p>
      </section>

      <section>
        <h2>2. Data we process</h2>
        <ul>
          <li>Account and business details, including names, email addresses, roles, organisation details, and login records.</li>
          <li>Enquiries, demo bookings, support communications, and information submitted through forms.</li>
          <li>Subscription, billing, and transaction references. Payment-card details are processed by Stripe and are not stored by AllyJen.</li>
          <li>Menu, ingredient, supplier, allergen, training, compliance, kiosk, and device information supplied while using the service.</li>
          <li>Security and technical information such as IP address, browser/device information, audit logs, and service diagnostics.</li>
          <li>Website and kiosk usage information where analytics consent has been given.</li>
        </ul>
      </section>

      <section>
        <h2>3. Why we process data and our legal bases</h2>
        <ul>
          <li><strong>Contract:</strong> to create accounts, provide subscriptions, operate the service, process requested payments, and provide support.</li>
          <li><strong>Legitimate interests:</strong> to secure, maintain, troubleshoot, and improve the service; prevent misuse; and communicate with business contacts, balanced against individual rights.</li>
          <li><strong>Consent:</strong> for optional website and kiosk analytics and where we specifically ask for consent. Consent can be withdrawn at any time.</li>
          <li><strong>Legal obligation:</strong> to maintain records or respond to lawful requests where required.</li>
        </ul>
      </section>

      <section>
        <h2>4. Service providers and disclosures</h2>
        <p>We use vetted providers to operate AllyJen, including Vercel for hosting and performance services, Supabase for database and authentication services, Stripe for payment processing, and Google Analytics only where analytics consent is granted. Providers process data under their own terms and applicable data-processing commitments. We may also disclose information where legally required or as part of a properly managed corporate transaction.</p>
      </section>

      <section>
        <h2>5. International transfers</h2>
        <p>Some providers may process data outside the European Economic Area. Where this happens, we require an applicable safeguard such as an adequacy decision or approved Standard Contractual Clauses, together with supplementary measures where appropriate.</p>
      </section>

      <section>
        <h2>6. Retention</h2>
        <p>We retain personal data only for as long as needed for the purpose for which it was collected, including the duration of an account or contract and any period required for security, dispute, tax, accounting, or legal obligations. Consent records are normally retained for 180 days. We delete or anonymise data when it is no longer required.</p>
      </section>

      <section>
        <h2>7. Your rights</h2>
        <p>Subject to applicable law, you may ask for access to, correction of, deletion of, or restriction of your personal data; object to certain processing; request portability; and withdraw consent without affecting earlier lawful processing. You may also complain to Ireland’s Data Protection Commission at <a href="https://www.dataprotection.ie" rel="noreferrer">dataprotection.ie</a>.</p>
      </section>

      <section>
        <h2>8. Security and automated decisions</h2>
        <p>We use technical and organisational safeguards designed to protect personal data, including access controls, secure authentication, and audit records. AllyJen does not use website visitors’ personal data to make solely automated decisions that produce legal or similarly significant effects.</p>
      </section>

      <section>
        <h2>9. Cookies and changes to this policy</h2>
        <p>See our <a href="/cookies">Cookie Policy</a> for details of browser storage and analytics choices. We may update this policy as the service or legal requirements change and will show the new date on this page.</p>
      </section>
    </LegalPageLayout>
  )
}
