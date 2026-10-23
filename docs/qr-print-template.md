# Printable QR signs

The PDF button in Access Points → QR codes uses `public/Template - QR.pdf`. The original PDF artwork and page dimensions are retained. `lib/pdf/qrSignPDF.ts` overlays the selected code in the white circle, accounting for the template's nonzero page origin. The code includes a four-module white quiet zone and keeps its existing business, site and scan-tracking URL. No business data is written when downloading a sign.

The supplied circle's centre and QR size are measured in PDF points in that helper. Update those measurements if the template layout changes.

Verification:

- `node --test tests/qr-sign-pdf.cjs`
- `PLAYWRIGHT_MODULE=/path/to/playwright node scripts/verify-qr-sign-browser.cjs` against a local production build on port 3111 (or set `BASE_URL`). It downloads signs for two businesses and locations, and checks template-fetch failure feedback. All API data is mocked.
- Render each PDF listed in `/tmp/qr-sign-manifest.json` to `${path}.png`, then run `node scripts/verify-qr-sign-scans.cjs` to decode the printed codes and verify the exact URLs. The PDFs can be rendered with PyMuPDF or another standard PDF renderer.
