# Printable QR signs

Reports includes a prominent sign download panel above the report statistics. It lists active QR codes with their locations and downloads the selected code directly. If no active codes are available, it links to Access Points to create or activate one. Loading failures can be retried.

Both that panel and the PDF button in Access Points → QR codes use `public/Template - QR.pdf`. The original PDF artwork and page dimensions are retained. `lib/pdf/qrSignPDF.ts` overlays the selected code in the white circle, accounting for the template's nonzero page origin. The code includes a four-module white quiet zone and keeps its existing business, site and scan-tracking URL. No business data is written when downloading a sign.

The supplied circle's centre and QR size are measured in PDF points in that helper. Update those measurements if the template layout changes.

Verification:

- `node --test tests/qr-sign-pdf.cjs`
- `PLAYWRIGHT_MODULE=/path/to/playwright node scripts/verify-qr-sign-browser.cjs` against a local production build on port 3111 (or set `BASE_URL`). It downloads signs for two businesses and locations, and checks template-fetch failure feedback. All API data is mocked.
- Render each PDF listed in `/tmp/qr-sign-manifest.json` to `${path}.png`, then run `node scripts/verify-qr-sign-scans.cjs` to decode the printed codes and verify the exact URLs. The PDFs can be rendered with PyMuPDF or another standard PDF renderer.

Reporting and action-layout checks: `PLAYWRIGHT_MODULE=/path/to/playwright node scripts/verify-report-qr-sign-browser.cjs`. This uses fixtures to verify code selection, download/empty/retry states, and full activate/deactivate labels in English, Irish and German at phone and desktop widths. Its generated PDFs are listed in `/tmp/report-sign-manifest.json` and can be checked with the scan script.
