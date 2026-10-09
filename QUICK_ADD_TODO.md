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
- [x] Draft approval requirements using existing review checks; owner confirmation remains pending.
- [x] Sketch the phone and desktop flows and refine the implementation estimate.

Deliverable: an agreed flow, permissions matrix and draft-storage design.

Review and proposed design: [QUICK_ADD_DESIGN.md](QUICK_ADD_DESIGN.md). The code
review is complete; physical-phone validation and the remaining product decisions
are still open. Session 2 is implemented locally, and its database migration has been applied to the connected project. Deployment remains pending.

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

- [ ] Support taking a photo or selecting existing images on supported phones.
- [ ] Allow multiple readable label photos, with preview, removal and upload retry.
- [ ] Check image size, supported formats, orientation and mobile upload behaviour.
- [ ] Enforce business/location access for photos as well as draft records.
- [ ] Add Draft, Ready for review and Approved for use states with permitted transitions.
- [ ] Add an Items needing review list with name, type, location, author and missing details.
- [ ] Let a reviewer open photos and complete the record in the appropriate editor.
- [ ] Record who created, submitted and approved an entry, with timestamps.
- [ ] Keep approval separate from publishing a customer-facing menu item.

Deliverable: staff can capture a delivery item and a manager can complete its review.

## Session 4 — Verify behaviour and trial a real delivery

- [ ] Confirm missing allergen details appear as unknown, never as no allergens.
- [ ] Confirm drafts cannot accidentally enter published menus or be used as approved inputs to allergen calculations.
- [ ] Check draft handling in searches, recipe selectors, totals, reports and exports.
- [ ] Test staff and owner permissions, including direct API requests across businesses and locations.
- [ ] Test required-field validation, duplicate taps, interrupted photo uploads and failed saves.
- [ ] Test on a real iPhone, an Android phone if available, and desktop.
- [ ] Check labels, keyboard navigation, focus, touch targets and translations.
- [x] Run relevant automated tests, TypeScript checks and the production build for Session 2; repeat for later implementation phases.
- [ ] Trial several products from a delivery and record any awkward steps.
- [ ] Adjust the flow based on that feedback.

Deliverable: a tested first version with any remaining issues explicitly recorded.

## Release

- [ ] Prepare database migrations and document deployment order and recovery steps.
- [ ] Review the completed change and arrange approval to release it.
- [x] Apply the Session 2 draft-storage migration and verify table/access controls.
- [ ] Apply any later migrations and deploy the approved version.
- [ ] Verify capture, photo upload, review and publication separation in the deployed app.
- [ ] Update this checklist with the result and any follow-up work.

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

## Final task — update the Help section

- [ ] Add a Quick Add guide to AllyJen's admin Help section, matching the completed first-version workflow.
- [ ] Explain where to find Quick Add on computers, tablets and phones; adding ingredients or bought-in products; attaching label photos; saving drafts; and using Add another.
- [ ] Explain how staff submit drafts, how owners/managers review and approve them, and how approval differs from publishing a menu item.
- [ ] Cover finding and resuming drafts, missing information and retrying failed photo uploads.
- [ ] Check the guide against the released screens and add it to Help navigation/search and supported translations.
