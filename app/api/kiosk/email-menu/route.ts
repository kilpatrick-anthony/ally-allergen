// app/api/kiosk/email-menu/route.ts
// Emails a customer their allergen PDF from the kiosk "Email Menu" button.
// The PDF is generated client-side and sent as a base64 string.

import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/email'

// Simple email regex — not exhaustive but catches obvious mistakes at the boundary
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, pdfBase64, businessName, filteredCount } = body

    // --- Input validation ------------------------------------------------
    if (!to || typeof to !== 'string' || !EMAIL_RE.test(to.trim())) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
    }
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return NextResponse.json({ error: 'PDF data is missing.' }, { status: 400 })
    }
    // Guard against unreasonably large payloads (>10 MB base64 ≈ 7.5 MB PDF)
    if (pdfBase64.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF is too large to email.' }, { status: 413 })
    }

    const safeName = typeof businessName === 'string' ? businessName : 'the venue'
    const filterNote =
      typeof filteredCount === 'number' && filteredCount > 0
        ? ` (filtered to ${filteredCount} item${filteredCount !== 1 ? 's' : ''})`
        : ''
    const fileName = `${safeName.replace(/[^a-z0-9]/gi, '_')}_allergen_guide.pdf`
    const recipientEmail = to.trim().toLowerCase()

    await sendMail({
      to: recipientEmail,
      subject: `Your allergen guide from ${safeName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
          <div style="background:#003842;padding:28px 32px;border-radius:8px 8px 0 0">
            <img src="https://allyjen.ie/Logo-AllyJen.svg" alt="AllyJen" height="40" style="display:block" />
          </div>
          <div style="background:#f9fafb;padding:28px 32px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none">
            <h2 style="margin:0 0 12px;color:#003842">Your allergen guide is attached${filterNote}</h2>
            <p style="margin:0 0 16px;color:#374151;line-height:1.6">
              Please find your personalised allergen guide from <strong>${safeName}</strong> attached to this email as a PDF.
              It contains allergen information for all menu items, compliant with EU Regulation No.&nbsp;1169/2011.
            </p>
            <p style="margin:0 0 16px;color:#374151;line-height:1.6">
              <strong>Important:</strong> Always speak to a member of staff if you have a severe allergy or require extra reassurance before ordering.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
            <p style="margin:0;color:#9ca3af;font-size:12px">
              Powered by <a href="https://allyjen.ie" style="color:#42b8ac;text-decoration:none">AllyJen</a> &mdash;
              allergen compliance made easy for Irish &amp; EU food businesses.
            </p>
          </div>
        </div>
      `,
      text: `Your allergen guide from ${safeName}\n\nPlease find your allergen guide attached.\n\nAlways speak to staff if you have a severe allergy before ordering.\n\nPowered by AllyJen — allyjen.ie`,
      attachments: [
        {
          filename: fileName,
          content: pdfBase64,
          encoding: 'base64',
          contentType: 'application/pdf',
        },
      ],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[email-menu] Error:', error)
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
  }
}
