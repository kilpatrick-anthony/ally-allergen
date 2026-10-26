# Platform search insights

Super Admin → Search insights (`/super-admin/insights`) reports collective recorded customer activity across businesses. It is separate from the existing platform/business analytics pages.

The default reporting period is the last complete Monday–Sunday week in Europe/Dublin. Other choices are the last 7 or 30 complete days, or inclusive custom dates of up to 366 days. Date boundaries use Irish local midnights, including daylight-saving changes. Custom periods including today are marked partial. Comparisons use the preceding equal number of calendar days.

Businesses with `plan_type = 'demo'` are excluded by default because demo creation seeds sample activity. The Include demo businesses checkbox includes them explicitly and labels copied/exported reports accordingly. Other business plans are included. Only businesses still present in the business directory contribute events.

Typed searches are grouped with case, compatibility characters and repeated whitespace normalized. These are query terms, not confirmed item orders. Allergen and dietary rankings count actual filter selections, rather than guessing a filter from words in a food name. Each normalized filter counts once per filter event. Percent changes with no previous searches are labelled New. Zero-result reports include only events with a known zero result count, and identify how many had filters active.

Sessions are scoped by business, source, access point, location and session ID. Legacy events without session IDs remain in search/view totals but do not invent sessions. Sources include QR, website, kiosk, direct and legacy/unattributed traffic. All figures depend on recorded analytics and existing consent choices.

The API (`/api/super-admin/insights`) verifies the signed session and the existing server-side `hasSuperAdminAccess` check before reading any platform activity. Responses are private/no-store. It returns aggregate counts and normalized terms, without business names, raw event rows or session identifiers. Business and event queries page explicitly with stable ordering, and aggregation consumes pages incrementally. Query failures produce an error rather than a misleading partial report. No database migration or tracking change is required.

Copy summary produces a top-five draft for manual review and posting. CSV exports include period/scope, current and prior counts, changes and business counts for the top-20 rankings. Spreadsheet formula-like terms are escaped. Nothing is published automatically.

Validation:

- `node --test tests/platform-insights.cjs` covers DST boundaries, invalid ranges, cross-business sessions, demo exclusion, filter semantics, result metadata, CSV safety, pagination beyond 1,000 rows, and API authorization/errors.
- `PLAYWRIGHT_MODULE=/path/to/playwright node scripts/verify-platform-insights-browser.cjs` against a local production build at port 3111 (or set BASE_URL). It uses isolated API fixtures to verify phone/desktop navigation, rankings, demo toggling, copying, CSV, date validation, stale-request cancellation, retry and empty states.
- A read-only production SQL aggregate verified the schema and reporting boundaries. Local authenticated live API verification requires the existing server-side Supabase/auth environment configuration; browser tests use fixtures and do not alter business data.
