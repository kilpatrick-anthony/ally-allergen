# Engagement analytics

The admin analytics page includes access-source and named-access-point totals,
sessions, an ordered visitor journey, zero-result searches, a weekday/hour heatmap,
and location comparisons. The report uses the existing date and location selection
and the browser's time zone for the heatmap.

Tracking requires analytics consent. Sessions are per browser tab and access point,
expire after 30 minutes without recorded activity, and reset on both manual and
automatic kiosk reset. Sessions are not unique visitors. Historical events remain
unattributed; no session, source, or search-result data is inferred for them.

## Rollout

Apply `supabase/migrations/20261009181159_add_access_point_analytics.sql` before
deploying the application changes. The event endpoint writes the new columns and
requires this migration. On 9 October 2026, the user confirmed running this SQL
in Supabase after the initial schema check. Row-level security was enabled on the
events table at that check. Post-deployment verification remains pending.

After deployment, verify a consented visit through a website link, QR code, and
paired kiosk. Open the menu, choose Get Started, search for a missing item, and use
a filter. Confirm the source, access point, location, journey, and zero-result
search appear in the admin report. Reset the kiosk and confirm the next visitor
gets a new session. Repeat without analytics consent and confirm no events are sent.

The report reads events in pages of 1,000. At 50,000 events it asks for a shorter
range rather than showing partial totals. A query failure makes only the detailed
engagement report unavailable; the existing analytics remain accessible.

## Checks

```sh
node --test tests/*.cjs
npx tsc --noEmit
npm run build
git diff --check
```

Automated coverage includes session reuse and reset, consent, source precedence,
business/site ownership, search-result metadata, ordered journeys, time-zone
grouping, multi-page reports, and failure handling. New panel text currently uses
the existing English fallback for other admin languages.
