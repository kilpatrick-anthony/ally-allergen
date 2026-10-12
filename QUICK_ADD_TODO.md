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
- [x] Check draft handling in searches, recipe selectors, totals, reports and exports. Repository data-flow review passed on 11 October; authenticated delivery trial remains separate.
- [x] Test staff and owner permissions, including direct API requests across businesses and locations. Automated checks passed; real-device trial remains below.
- [x] Test required-field validation, duplicate taps, interrupted photo uploads and failed saves. Automated checks passed; real-device trial remains below.
- [ ] Test on a real iPhone, an Android phone if available, and desktop.
- [ ] Check labels, keyboard navigation, focus, touch targets and translations.
  - [x] Fix and verify focus after save/Add another, associate name errors and supplier/photo instructions, and distinguish photo retry controls (11 October).
  - [x] Translate the full Quick Add interface and verify the capture/review flow in all six languages at desktop and phone widths (11 October).
  - [x] Review local button contrast, dashboard touch targets and keyboard focus; run light/dark dialog accessibility scans (11 October).
  - [ ] Complete physical-device and assistive-technology checks, including manual review of content clipped during automated scans.
- [x] Run relevant automated tests, TypeScript checks and the production build for Session 2; repeat for later implementation phases.
- [ ] Trial several products from a delivery and record any awkward steps.
- [x] Adjust the flow based on feedback received so far; continue iterating if the remaining delivery trial finds more issues.

Deliverable: a tested first version with any remaining issues explicitly recorded.

## Release

- [x] Prepare database migrations and document deployment order and recovery steps.
- [x] Review the completed change and arrange approval to release it (user requested continuation on 10 October).
- [x] Apply the Session 2 draft-storage migration and verify table/access controls.
- [x] Apply any later migrations and deploy the approved version.
- [ ] Verify capture, photo upload, review and publication separation in the deployed app.
- [x] Update this checklist with the result and any follow-up work.

## Later enhancements — outside the first version

- [x] Quick Add for prepared menu items and simple recipes.
- [x] Photo-assisted extraction of label information, with mandatory human review.
- [x] Barcode lookup, including clear handling for missing or outdated product information.
- [ ] Offline capture and reliable later synchronisation.
- [ ] Optional notifications when drafts need review.

### Prepared menu items and recipes — 11 October 2026

- Added a Prepared menu item / recipe capture type. Staff select one or more
  existing assessed ingredients; supplier and label-photo fields are omitted
  because recipe safety is derived from those ingredient records.
- Managers confirm the ingredient list, description and availability scope.
  Approval atomically creates an inactive prepared Menu Builder item, links its
  ingredients, derives the strongest allergen levels and retains only dietary
  tags shared by every ingredient. Nothing is published automatically.
- Added the new capture and review copy in all six supported languages and a
  lightweight searchable ingredient picker for phone and desktop.
- Verification passed: 27 API/photo tests, PostgreSQL migration/transaction
  checks, production build and the complete browser journey at desktop and
  phone widths in English, Irish, Portuguese, French, Spanish and German.
- The migration and application changes were released to production on
  11 October 2026; authenticated physical-device testing remains open.

### Photo-assisted label extraction — 11 October 2026

- Added an Analyse action to each saved Quick Add label photo for ingredients
  and bought-in products. It suggests the product name, supplier, description,
  explicitly stated allergens and dietary claims, plus any reading caveats.
- Analysis runs only through the private draft-photo endpoint after the same
  live session, membership, business and draft-access checks as the photo itself.
  It does not update the database directly.
- The user must review a clear AI warning and explicitly apply the suggestions.
  The populated fields remain editable and unsaved, and the existing manager
  evidence, allergen, dietary and label confirmations are still required.
- Unmentioned or uncertain allergens remain unanswered rather than being marked
  absent. Returned values and dietary tags are allow-listed and length-limited.
- Verification passed: 28 API/photo tests, production build, and the complete
  extraction/capture/review browser journey at desktop and phone widths. The
  interaction copy is included in all six supported language catalogs. Browser
  tests use a deterministic AI response; a real label/provider trial remains.

### Prepared recipes and label extraction release — 11 October 2026

- Applied production migration `20261011204103_add_quick_add_prepared_items` and
  verified the column, restricted function grant and unchanged advisor results.
- Released commit `d7f9884c20bdc8e3dcfc02ee07afcc20b8192261` as production
  deployment `dpl_5U6EFh9J8SVZfgYKy1JzRWUXBd5g`. The live version matched,
  unauthenticated draft/extraction requests returned 401 and the initial Vercel
  runtime-error scan was clean.
- `GEMINI_API_KEY` is not yet configured in Vercel. The deployed extraction UI
  therefore falls back safely to manual entry until a production provider key
  is added; prepared recipes and the rest of Quick Add are available.

### Vercel AI Gateway migration — 12 October 2026

- Replaced the three direct Gemini API integrations with Vercel AI Gateway using
  `google/gemini-2.5-flash`. Production authentication uses Vercel's automatic
  OIDC deployment token, so AllyJen no longer needs a Gemini API key.
- Local development may use an uncommitted `AI_GATEWAY_API_KEY`; the manual-entry
  fallback remains available if Gateway authentication, credits or providers are
  unavailable. Human review and the existing allergen-safety checks are unchanged.
- Local verification passed: 28 Quick Add API/photo tests, TypeScript and the
  production build.
- Released the merged `main` commit `d2aca9f6827619172fd6b21dba29f2281553d198`
  to production as deployment `dpl_7kDLNGSqjkpRq6GUMZrzSprFDZe7`. The live
  version matched and the health endpoint confirmed its Supabase connection.
  A signed-in real-label Gateway request remains the final functional check.

### Live label-analysis feedback — 12 October 2026

- A signed-in production test confirmed that photo analysis runs successfully
  through Vercel AI Gateway without a Gemini key.
- Corrected runtime authentication to read Vercel's short-lived OIDC token from
  the function request header. Released commit `9af990e0e60ee1c4baedc3513069384535a715ae`
  as production deployment `dpl_CRDFZkhczX85fmody5xfinGCmaux`.
- A real package then exposed two mapping issues: visible wheat set only the
  parent gluten result, and the visible brand was suggested as the supplier.
  Extraction now preserves explicitly named gluten and tree-nut subtype levels,
  leaves unmentioned subtypes not reviewed, always leaves supplier selection to
  the user, and asks for a brand-aware consumer product name.
- Regression coverage includes wheat and hazelnut subtype suggestions, rejection
  of invented subtype values, an empty supplier suggestion and the production
  OIDC-header path. All 28 focused tests, TypeScript and the production build
  passed. Released commit `032c4840b3f7ed6ba43d497ffa25513245b2ddee`
  as production deployment `dpl_4VYz9YkUnnMUyaoxa5jaP2ULP35E`; the owner
  confirmed the corrected live test passed.

### Barcode lookup — 12 October 2026

- Added an authenticated Quick Add lookup for 8–14 digit food barcodes using
  the Open Food Facts v3 product API. It suggests a brand-aware product name,
  category, ingredient text, positively declared allergens and explicit dietary
  labels; it never selects or invents a supplier.
- Users may type the printed barcode number or take/select a barcode photo.
  Common retail EAN, UPC, Code 128 and ITF formats are decoded locally in the browser; the image is not
  uploaded or saved. An unreadable or oversized photo falls back to another
  photo or manual number entry without changing the draft.
- The initial generic decoder did not recognise several well-framed real phone
  photos. It was replaced with a retail-barcode reader using EAN/UPC/Code 128/ITF
  hints, high-resolution downscaling, central crops, contrast enhancement and
  rotation attempts. A further physical-phone retest remains required.
- Results are review-only suggestions. The form identifies Open Food Facts as
  community data, shows the source record and its last-updated date when known,
  and tells the user to verify every value against the current physical label.
  Missing products and provider failures have separate messages and always leave
  photo analysis and manual entry available.
- Only positive allergen claims are mapped; missing database values remain not
  reviewed. Wheat and named tree-nut subtypes are preserved when the provider
  supplies them. The saved draft note records the barcode and verification need.
- Verification passed: 30 focused API/photo tests, TypeScript, a live success
  and missing-product API check, and the production build. A signed-in phone
  trial with several real delivery products remains part of Session 4.
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

## Delivery-trial feedback — 10 October 2026

The owner tested Oakberry and requested optional allergen/dietary entry before the
first save, plus readable draft-card names, authors and suppliers. Added a shared
assessment editor to the initial capture and manager review. Capture fields remain
optional and unanswered allergens remain unknown. Save first, then attach photos.
Add another clears both the assessment and tags for the next product.

A new additive migration stores captured allergens and dietary tags separately
from review. Submission copies initial suggestions into a new review; managers
must confirm selected tags against label evidence. Approval copies only reviewed
tags to ingredient certifications/supplier assessments or an inactive product's
dietary labels. Existing drafts and old text-only clients remain supported.
This replaces the initial no-dietary-claims limitation; earlier notes are historical.

Draft cards now use explicit dark text on light backgrounds and light text in dark
mode for the name, captured-by/location and supplier. Help describes optional early
entry and reviewed tags. Migration `20261010184710_add_quick_add_capture_assessment.sql`
was applied and verified on the connected project. Relevant API/photo tests (23),
PostgreSQL schema/approval checks, production build/TypeScript and desktop/mobile
browser flows passed. Light/dark draft-card screenshots were inspected. Live
service-role promotion verified dietary-tag enforcement and propagation in a
rolled-back test transaction. Application deployment is in progress.

## Continuation — 11 October 2026

- Re-ran the current Quick Add API and photo suites: all 23 tests passed.
- Reviewed draft isolation in ingredient/menu searches, recipe ingredient selectors,
  dashboard counts, compliance and analytics queries, and Downloads PDF inputs.
  These consumers read inventory tables through the existing APIs, not captures.
  Downloads uses `/api/business/data`, which reads ingredients and active menu
  items. Quick Add draft-table reads remain confined to the capture/evidence paths.
  The latest transition function inserts inventory only in its approval branch;
  bought-in products are inserted inactive. This is source review plus the existing
  capture regression tests, not a new authenticated production trial.
- The live `/api/version` endpoint returned `dpl_HuHf4JFpfD5TXz2NgbMKSfbUpUcB`.
  This differs from the earlier recorded release. Its source commit has not yet
  been verified, so the latest capture-assessment deployment remains unconfirmed.
- Remaining work: accessibility/interface translations, authenticated live-storage
  capture-to-approval verification, and physical-phone delivery feedback (including
  orientation, HEIC support and interrupted uploads).

### Mobile portal feedback — 11 October 2026

- Restored the centred AllyJen logo in the mobile green header.
- Replaced the Ally/Jen contact widget below the desktop breakpoint with a
  floating Quick Add plus button. Desktop contact remains available.
- Reused the existing capture dialog, added safe-area spacing, refreshed the
  Saved drafts list after floating-button saves, and restored focus on close.
- Production build/TypeScript and 23 API/photo tests passed. Desktop and
  touch-enabled mobile browser checks passed against the local production build,
  including logo loading/centring, button position, desktop contact opening,
  capture, photos, retries, submission and approval with fixture data/storage.
  Mobile screenshot inspected. These changes have not been deployed or tested
  on a physical phone.

### Dashboard simplification — 11 October 2026

- Removed the duplicate mobile dashboard Quick Add row; desktop Quick Add now sits
  beside the title. Language settings use a compact language-name control.
- Added Saved drafts to permanent navigation and a drafts/reviews summary with
  permission-scoped exact counts and links to filtered queues. The summary hides
  on mobile when no captures are pending and refreshes after Quick Add saves.
- Prioritised drafts, compact compliance status and shortcuts on mobile, with a
  two-column totals grid below. Desktop retains four overview columns and the
  detailed compliance panel. Added new labels in all six supported languages.
- Verification: production build/TypeScript, 24 API/photo tests (including count
  pagination/ownership boundaries), and 390px/1280px browser checks passed.
  Browser checks covered Quick Add opening, filtered navigation, counts and
  empty/error/retry states with fixture API responses; screenshots inspected.
  These changes are local and have not been pushed or deployed.

### Keyboard and screen-reader improvements — 11 October 2026

- Saving moves keyboard focus to the saved confirmation. Add another and View
  draft move focus to the product-name field instead of leaving it on a removed
  control. Whitespace-only names receive focus and an associated error message.
- Supplier and photo instructions are associated with their inputs. Failed-photo
  retry buttons include the photo number in their accessible names.
- Extended the existing browser flow to verify forward/backward focus wrapping,
  invalid-name focus/error association, saved confirmation focus and Add another
  focus. Desktop (1280px) and touch-enabled phone-width (390px) runs passed,
  including capture, failed-save/upload retries, submission and manager approval
  using fixture data/storage and the PostgreSQL review function.
- Production build/TypeScript and all 24 Quick Add API/photo tests passed.
  React component review completed. This is a focused accessibility improvement,
  not a completed accessibility audit or physical-device/screen-reader trial.
  Full interface translations, remaining accessibility review, authenticated live
  storage verification and real-phone delivery feedback remain open.
- These changes are local and have not been pushed or deployed.

### Quick Add interface translations — 11 October 2026

- Added all 137 Quick Add messages and labels in English, Irish, Portuguese,
  French, Spanish and German, including capture, photos, error/retry states,
  review, approval, history and dietary tags. Locale catalogs are checked against
  the English keys by TypeScript. Earlier translation-pending notes are historical.
- The assessment editor now uses the shared translated allergen and subtype
  names. Display translations do not change stored allergen levels, subtype keys
  or dietary tag values.
- Extended the existing browser script to accept `QUICK_ADD_LANGUAGES` and use
  the real translation catalog for selectors. All six languages passed at 1280px
  and 390px, covering name validation, focus, failed saves, photos and upload
  retries, Add another, reopening, staff submission and manager ingredient
  approval. Checks assert that translated selections store canonical values.
- Production build/TypeScript passed. The browser runs reported no page errors
  or horizontal overflow; Irish capture and German photo screenshots were
  inspected. These checks use fixture data/storage and the PostgreSQL review
  function, not authenticated production storage or physical phones.
- Updated the design document with the multilingual verification command.
  Changes remain local, unpushed and undeployed. Remaining work includes the
  broader accessibility review, authenticated live-storage verification and
  physical-phone delivery feedback.

### Contrast, touch targets and keyboard continuation — 11 October 2026

- Added higher-contrast teal button variants for Quick Add in both themes;
  corrected the resulting-record link in dark mode and the shared ghost button’s
  dark hover text. Existing primary/outline variants elsewhere remain unchanged.
- Desktop Quick Add now identifies itself as a dialog opener and restores focus
  on close. Saved drafts return focus to the opening card link; direct draft URLs
  return focus to the page heading. Closing a draft preserves its status filter.
- Submission/approval status changes focus the review heading. Photo retry/removal
  returns focus to Choose photos when the original action control may disappear.
- Enlarged the dashboard drafts link and retry control to at least 44 × 44px.
- Production build/TypeScript passed. English and German capture-to-ingredient-
  approval browser flows passed at 1280px and 390px, including the new focus checks,
  direct-link Escape closing and retained filters. Fixture data/storage were used.
- All 32 axe scans across capture, photos, review and approval in light/dark themes
  completed with no detected violations. Some clipped offscreen text requires
  manual contrast review; this is not a complete accessibility certification.
  Inspected the updated phone-width capture screenshot. React component review
  and `git diff --check` passed.
- Changes remain local, unpushed and undeployed. Real-phone/assistive-technology
  checks and authenticated live-storage delivery verification remain open.

### Category capture — 11 October 2026

- Added an optional category to delivery capture for ingredients and bought-in
  products. The picker combines AllyJen defaults with categories already used by
  the business and still accepts a new category typed during delivery.
- Submission copies the captured category into a new manager review without
  overwriting review work. Older clients may omit the field when editing without
  clearing an existing category.
- Added the database migration, API validation and compatibility coverage, all-six-
  language help text, and accessible help associations for capture and review.
- Verification passed: 25 API/photo tests, isolated PostgreSQL migration and
  approval checks, production build/TypeScript, and complete desktop/phone-width
  browser capture-to-approval flows using the real route handlers and PostgreSQL
  transition function.
- Applied migration `20261011195851_add_quick_add_category.sql` to the connected
  Ally project and verified the column, trigger, restricted function grants and
  post-migration advisors. Deployed commit `0877021b7c6fdd78b6346c67b02aff319078d34c`
  to production as Vercel deployment `dpl_6ToKPDBuYLnYWct15sMGk82n3xJ1`.
  The live version endpoint matched, unauthenticated Quick Add/category requests
  returned 401 and the initial production error-log scan was clean.
- Authenticated live-storage and physical-phone delivery trials remain open.
