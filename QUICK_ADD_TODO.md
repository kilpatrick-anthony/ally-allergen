# AllyJen Quick Add — working checklist

Goal: let an owner or staff member capture a new ingredient or bought-in product
on their phone during a delivery, then complete and review it in the admin portal.

Start with the existing mobile website. An App Store release is a separate future
project. The sessions below are a suggested sequence for the next few days, not
a promise that each phase will take one day. Re-estimate after the initial review.

## Session 1 — Review the current system and agree the first version

- [ ] Walk through ingredient and bought-in product creation on a phone.
- [x] Inspect existing forms, validation, photo/document storage, roles and location access in the repository.
- [x] Trace how ingredients and products reach recipes, allergen calculations, customer menus, reports and exports.
- [x] Document the recommended draft-storage design before changing the database: a separate capture area (see design review).
- [x] Agree approval roles: staff capture and submit; owners/managers approve, including their own entries, with an audit record.
- [x] Use the proposed defaults for this implementation: staff see/edit their own drafts; owners/managers see/edit drafts in their business.
- [x] Implement minimum draft fields: name and record type required; location, supplier and notes optional. Photos are in Session 3.
- [x] Confirm approval requirements: selected supplier, readable label evidence, explicit allergen assessment, and label/declaration checks for bought-in products (confirmed 10 October).
- [x] Sketch the phone and desktop flows and refine the implementation estimate.

Deliverable: an agreed flow, permissions matrix and draft-storage design.

Review and proposed design: [QUICK_ADD_DESIGN.md](QUICK_ADD_DESIGN.md). The code
review and implementation are complete. See the latest release notes below for
deployment status; physical-phone validation remains open.

## Session 2 — Build the basic Quick Add flow

- [x] Add a prominent Quick Add action to the admin dashboard and relevant Ingredients/Menu pages.
- [x] Offer Ingredient and Bought-in product as the first two options.
- [x] Build a short form that works comfortably on phone and desktop screens.
- [x] Preselect the current location when appropriate; offer only locations the user may access.
- [x] Reuse the supplier picker and decide how an unknown supplier is captured without slowing down the delivery.
- [x] Save drafts without requiring every field from the full editor.
- [x] Show clear saving, success and failure states; preserve entered details after a failed save.
- [x] Offer Add another and View draft after saving.
- [x] Prevent accidental duplicate saves and warn before discarding unsaved changes.

Deliverable: a usable text-based capture flow backed by persisted drafts.

## Session 3 — Add label photos and the review workflow

- [x] Add camera and image-picker controls to saved drafts; physical-phone support still needs the Session 4 trial.
- [x] Allow multiple label photos, with preview, removal and upload retry; reviewers must check readability.
- [ ] Check image size, supported formats, orientation and mobile upload behaviour.
- [x] Enforce the same live business/ownership access for photos as draft records. Location remains delivery context, as agreed in the design.
- [x] Add Draft, Ready for review and Approved for use states with permitted transitions.
- [x] Add an Items needing review list with name, type, location, author and missing details.
- [x] Let a reviewer open photos and complete the record in the appropriate editor.
- [x] Record who created, submitted and approved an entry, with timestamps.
- [x] Keep approval separate from publishing a customer-facing menu item.

Deliverable: staff can capture a delivery item and a manager can complete its review.

## Session 4 — Verify behaviour and trial a real delivery

- [x] Confirm missing allergen details appear as unknown, never as no allergens. Automated checks passed; real-device trial remains below.
- [x] Confirm drafts cannot accidentally enter published menus or be used as approved inputs to allergen calculations. Automated checks passed; real-device trial remains below.
- [ ] Check draft handling in searches, recipe selectors, totals, reports and exports.
- [x] Test staff and owner permissions, including direct API requests across businesses and locations. Automated checks passed; real-device trial remains below.
- [x] Test required-field validation, duplicate taps, interrupted photo uploads and failed saves. Automated checks passed; real-device trial remains below.
- [ ] Test on a real iPhone, an Android phone if available, and desktop.
- [ ] Check labels, keyboard navigation, focus, touch targets and translations.
- [x] Run relevant automated tests, TypeScript checks and the production build for Session 2; repeat for later implementation phases.
- [ ] Trial several products from a delivery and record any awkward steps.
- [ ] Adjust the flow based on that feedback.

Deliverable: a tested first version with any remaining issues explicitly recorded.

## Release

- [x] Prepare database migrations and document deployment order and recovery steps.
- [x] Review the completed change and arrange approval to release it (user requested continuation on 10 October).
- [x] Apply the Session 2 draft-storage migration and verify table/access controls.
- [x] Apply any later migrations and deploy the approved version.
- [ ] Verify capture, photo upload, review and publication separation in the deployed app.
- [x] Update this checklist with the result and any follow-up work.

## Later enhancements — outside the first version

- [ ] Quick Add for prepared menu items and simple recipes.
- [ ] Photo-assisted extraction of label information, with mandatory human review.
- [ ] Barcode lookup, including how to handle missing or outdated product information.
- [ ] Offline capture and reliable later synchronisation.
- [ ] Optional notifications when drafts need review.
- [ ] Assess whether an iPhone/iPad app adds enough value beyond the mobile portal.

## First-version acceptance criteria

- A staff member can capture a new ingredient or bought-in product from their phone without using an office computer.
- They can save an incomplete draft, attach readable label photos and quickly add another item.
- An authorised reviewer can find, complete and approve the entry.
- Unreviewed or incomplete information cannot silently become customer-facing allergen information.
- Existing ingredient, recipe and menu workflows continue to work.

## Progress notes

- Planning checklist created; subsequent implementation progress is recorded below.
- 9 October 2026: completed repository review and documented the design, screen
  flow, permission matrix, promotion requirements and estimate. Owner confirmed
  owners/managers approve. Recommended separate captures because current ingredient
  creation is immediately active and existing consumers do not isolate drafts.

- 9 October 2026: implemented Session 2 locally: separate text drafts, role/ownership checks,
  idempotent creation, versioned edits, Quick Add entry points and a saved-draft list.
  Added migration `20261009214320_add_quick_add_drafts.sql`; the user applied it
  successfully and its table/access controls were verified read-only. Deployment remains pending. Photo capture, submission and approval remain Session 3.
  Verification: 23 API tests, production build, isolated schema checks and desktop/phone-sized
  browser flows passed. Physical-phone and live-database trials remain pending.

- 10 October 2026: implemented the photo portion of Session 3 locally. Save a text
  draft first, then take/select up to 12 photos. Added private storage, authenticated
  image reads, previews, removal, retry, orientation correction and metadata stripping.
  Browser conversion supports JPEG/PNG/WebP and HEIC only when the browser can decode
  it; otherwise the user receives a format message. Real-phone checks remain pending.
  Prepared `20261010182555_add_quick_add_photos.sql`; it has **not** been applied to
  the connected project. Deployment remains pending. Submission, review and atomic
  promotion were the next implementation slice (now implemented in Session 3b below).
  Owner confirmation of the proposed requirements was received during Session 3b. Verification passed: 31 API tests,
  production build, isolated PostgreSQL checks and desktop/phone-sized browser flows.
  See the design document for verification
  results, deployment order and interrupted-upload recovery.

## Final task — update the Help section

- [x] Add a Quick Add guide to AllyJen's admin Help section, matching the completed first-version workflow.
- [x] Explain where to find Quick Add on computers, tablets and phones; adding ingredients or bought-in products; attaching label photos; saving drafts; and using Add another.
- [x] Explain how staff submit drafts, how owners/managers review and approve them, and how approval differs from publishing a menu item.
- [x] Cover finding and resuming drafts, missing information and retrying failed photo uploads.
- [x] Check the guide against the released screens and add it to Help navigation/search and supported translations.


## Session 3b progress — 10 October 2026

- Owner confirmed the proposed mandatory approval checks.
- Added submission, author withdrawal, manager return with a note, versioned review
  saves and atomic approval. The queue includes status filters, author/location and
  missing review checks. Capture details/photos are locked while submitted.
- Approved ingredients get an assessed supplier variant and evidence associations;
  bought-in products are created inactive with an explicit global/location scope.
  Approval does not add dietary claims or publish a product.
- Added private business-authorized access to approved evidence and audit history.
- Prepared `20261010182600_add_quick_add_review.sql`, to follow the photo migration.
  Both new migrations and deployment remain pending. Real-device/live-storage
  testing, translations, final Help guide and release verification are still open.

- Session 3b verification passed: 35 API tests, production build/TypeScript,
  isolated PostgreSQL transaction/schema checks and desktop/phone-sized browser
  capture → submission → manager approval flows. The browser approval path uses
  the real PostgreSQL function with fixture object storage. Live and physical-device
  checks remain pending.

## Release progress — 10 October 2026

- Applied photos migration `20261010182555` and review migration `20261010182600`
  to the connected Ally project. Verified private bucket, 4 MiB storage limit, RLS
  and service-role-only approval execution. Earlier pending notes above are historical.
- Added the Help guide in English, Irish, Portuguese, French, Spanish and German,
  including navigation and full-content search. Workflow button labels retain their
  English fallback; translating the rest of Quick Add remains follow-up work.
- Production build/TypeScript and all 35 automated tests passed again.
- Deployed application commit `aedf382e313af49b09c77b949987ec16129ce6b5` to
  https://allyjen.ie; Vercel deployment `dpl_HknGZPTndigPajL4rmjTcj3VdmDP` is READY.
  The live version endpoint matches. Real-device delivery trials remain open.

- Live PostgreSQL verification passed using service-role execution in a rolled-back
  transaction: both destination types, missing-assessment rejection, idempotency,
  evidence/audit links and inactive products. No test records persisted.
- Fixed the shared language hook to restore saved preferences after hydration,
  avoiding mismatched server/browser text when opening translated Help pages.
- Authenticated live Storage verification needs a test-account session; local
  service credentials are unavailable. Keep this as part of the delivery trial.

- Help checks passed in all six languages: eight guide steps, keyboard expansion,
  content search and phone-width layout, with no page errors. Desktop/phone-sized
  capture-to-approval checks passed again after the language fix (one prior mobile
  navigation timeout did not reproduce on the complete rerun).

### Remaining release trial

1. Sign in on a real phone as staff, save an ingredient, take two label photos and
   confirm they reopen after leaving Saved drafts. Repeat with a bought-in product.
2. Retry an interrupted upload, use Add another and submit both entries.
3. As owner/manager, complete the confirmed checks and approve; confirm the product
   stays inactive in Menu Builder and the ingredient has its assessed supplier.
4. Check iPhone/Android orientation, HEIC behaviour and readability, then record
   awkward steps. Full Quick Add interface translations remain a separate follow-up.

Recovery: revert application code to the preceding deployment
`dpl_DNRwBrLzobrxxEtSxmLZW9xtAKM7` if needed; retain capture tables, approved records,
private photos and audit history. Do not drop the migrations to roll back the UI.

- Deployed Help UI checks passed in all six languages using fixture session/data
  responses; keyboard expansion, content search and phone-width layout passed.
  Live unauthenticated draft/photo/evidence requests returned 401 as expected.
  The authenticated end-to-end live-storage trial above remains unchecked.
