# Homepage pricing review

The homepage presents three enquiry-only plans. Prices come from `lib/plans.ts`; this change does not alter plan IDs, permissions, billing, or subscription entitlements.

## Evidence used

- QR Lite: the existing plan and previous homepage describe QR signage, setup help, self-managed menu updates, reports, analytics and email support. Its annual amount remains €99.
- Self-Managed: `lib/plans.ts` includes full platform, kiosk/QR access and email support; amount remains €39.99/month.
- Fully Managed: the plan includes Self-Managed features, team-managed menus and priority support; amount remains €79.99/month. Updates depend on customer-provided ingredient and supplier information.
- Setup: the previous homepage's “How It Works” says AllyJen configures the allergen system. The new copy avoids promising unconfirmed shipping or hardware accessories.
- Billing: `lib/stripe.ts` supports monthly/yearly cycles. Deal commitments are configurable in `lib/deal-terms.ts`; the setup form defaults to 12 months but allows other agreed terms. Consequently the homepage does not promise month-to-month cancellation or a universal minimum term.
- Reports and analytics have no QR Lite plan exclusion in the inspected admin/reporting code.
- Structured data previously claimed a zero-priced free trial without verified public availability. This offer object has been removed, retaining the organization, software application and website descriptions.

## Commercial confirmations and remaining question

- The user confirmed QR Lite should exclude the device/kiosk offer, with any exceptions discussed directly. Public copy directs standard kiosk use to Self-Managed/Fully Managed. No permission enforcement was added.
- The user confirmed the €299 one-off purchase includes a customer-owned tablet and stand, remote configuration, and courier delivery ready for plug and play. These details are now stated in the hardware panel and setup wording. No specifications or warranty promises are added.
- The existing `public/unnamed.webp` photo is used by the OAKBERRY case study and depicts the actual AllyJen counter tablet in use. The panel reuses it with an OAKBERRY caption and no model/specification claims.
- Compatibility with customer-owned tablets remains unconfirmed and is not advertised.
- Offer availability is the next 10 locations as requested. There is no verified allocation source, so no remaining-places counter or automatic reservation is shown.

## Enquiry behaviour

Every pricing, kiosk and group-pricing button scrolls to the existing contact form and selects its enquiry type. The user's typed message is preserved. The selected type is included in the existing `message` payload, so the existing email and CRM handlers are given this context without API/schema changes. No button charges a customer or reserves a place.

## Verification notes

The production build passes. Browser checks cover narrow/mobile/tablet/desktop widths, all five enquiry buttons, focus, preserving the typed message, and the selected-type payload using a mocked contact endpoint. Service workers are blocked in those fixture contexts.

During the first browser check, one test enquiry bypassed the browser mock through the production-mode service worker and reached the existing contact endpoint. This generated a test notification; no customer records were used. The server reported that HubSpot's form rejects API submissions because CAPTCHA is enabled. The API currently logs that error without failing the email path. The user subsequently confirmed disabling CAPTCHA on the HubSpot form. Live receipt after that setting change has not been rechecked; browser submission checks remain mocked.
