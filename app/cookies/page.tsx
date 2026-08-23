import type { Metadata } from 'next'
import LegalPageLayout from '@/components/legal/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How AllyJen uses cookies, local storage, and analytics technologies.',
  alternates: { canonical: '/cookies' },
}

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      summary="This policy explains the cookies and similar storage technologies used by AllyJen, why we use them, and how you can control them."
    >
      <section>
        <h2>1. What cookies and similar technologies are</h2>
        <p>Cookies are small text files stored by your browser. We also use browser local storage and session storage for requested features such as accessibility preferences, offline kiosk operation, and device pairing. Irish ePrivacy rules apply to cookies and similar storage technologies.</p>
      </section>

      <section>
        <h2>2. Your choices</h2>
        <p>Optional analytics is disabled unless you actively consent. You can accept, reject, or change your choice at any time using the <strong>Cookie settings</strong> button displayed on the website. Rejecting analytics does not prevent you from using AllyJen.</p>
      </section>

      <section>
        <h2>3. Strictly necessary storage</h2>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Name or category</th><th>Purpose</th><th>Duration</th></tr></thead>
            <tbody>
              <tr><td><code>allyjen_cookie_consent</code></td><td>Records your cookie preference so we can honour it.</td><td>180 days</td></tr>
              <tr><td><code>auth-token</code> and Supabase authentication storage</td><td>Keeps signed-in users authenticated and protects restricted areas.</td><td>Session, or up to 30 days when “remember me” is selected</td></tr>
              <tr><td><code>auth-token-impersonator</code></td><td>Maintains a secure authorised support session when an administrator uses impersonation.</td><td>Session</td></tr>
              <tr><td>Accessibility and display preferences</td><td>Remembers choices such as language, text presentation, and dark mode.</td><td>Until cleared in the browser</td></tr>
              <tr><td>Kiosk, offline, and device storage</td><td>Provides the kiosk, QR, device-pairing, and offline features explicitly requested by a business or visitor.</td><td>Session or until cleared/unpaired</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>4. Optional analytics</h2>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Provider</th><th>Technology and purpose</th><th>Typical duration</th></tr></thead>
            <tbody>
              <tr><td>Google Analytics</td><td><code>_ga</code> and <code>_ga_*</code> cookies distinguish users and sessions and help us understand website usage.</td><td>Up to 2 years, unless deleted earlier</td></tr>
              <tr><td>Vercel Analytics</td><td>Measures page views and website performance. It is loaded only after analytics consent, even where it operates without cookies.</td><td>Provider-dependent; no AllyJen analytics cookie is intentionally set</td></tr>
              <tr><td>AllyJen kiosk analytics</td><td>Records aggregate page views, searches, filters, downloads, and QR interactions so business customers can understand kiosk usage.</td><td>Loaded or recorded only after analytics consent</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>5. Third parties</h2>
        <p>Optional analytics data may be processed by Google and Vercel. Necessary service data may be processed by hosting, database, authentication, and payment providers where required to deliver the service. More information is available in our <a href="/privacy">Privacy Policy</a>.</p>
      </section>

      <section>
        <h2>6. Browser controls</h2>
        <p>You may also delete or block cookies using your browser settings. Blocking strictly necessary storage may prevent sign-in, offline operation, or other requested features from working correctly.</p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>Questions about this policy can be sent to <a href="mailto:sales@allyjen.ie">sales@allyjen.ie</a>.</p>
      </section>
    </LegalPageLayout>
  )
}
