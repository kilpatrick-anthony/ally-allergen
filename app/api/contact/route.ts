// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { name, email, company, phone, message, privacyAccepted } = await request.json()

    // Validate required fields
    if (!name || !email || !company || privacyAccepted !== true) {
      return NextResponse.json(
        { error: 'Name, email, and company are required' },
        { status: 400 }
      )
    }

    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'anthony@allyjen.ie'
    const submittedAt = new Date().toLocaleString('en-IE', { timeZone: 'Europe/Dublin' })

    // Send notification to admin
    await sendMail({
      to: adminEmail,
      subject: `New contact form submission from ${company}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        ${message ? `<p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>` : ''}
        <hr>
        <p style="color:#999;font-size:12px">Submitted at ${submittedAt}</p>
      `,
      text: `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nCompany: ${company}${phone ? `\nPhone: ${phone}` : ''}${message ? `\n\nMessage:\n${message}` : ''}\n\nSubmitted at ${submittedAt}`
    })

    // Submit the enquiry to the AllyJen HubSpot form so it creates/updates the contact record.
    // The website retains its own acknowledgement email as a fallback if HubSpot is unavailable.
    const hubspotPortalId = '149233820'
    const hubspotFormId = '1fc460a4-02d7-4a08-9d64-ea4d1fa902e9'
    const nameParts = String(name).trim().split(/\\s+/)
    const hubspotFields = [
      { name: 'firstname', value: nameParts[0] || '' },
      { name: 'lastname', value: nameParts.slice(1).join(' ') },
      { name: 'email', value: email },
      { name: 'phone', value: phone || '' },
      { name: 'message', value: [`Business: ${company}`, message || ''].filter(Boolean).join('\\n\\n') },
    ]
    try {
      const hubspotResponse = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${hubspotPortalId}/${hubspotFormId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: hubspotFields, context: { pageUri: 'https://allyjen.ie/', pageName: 'AllyJen website contact form' } }),
      })
      if (!hubspotResponse.ok) console.error('HubSpot form submission failed:', await hubspotResponse.text())
    } catch (hubspotError) {
      console.error('HubSpot form submission error:', hubspotError)
    }

    // Send confirmation to the submitter
    await sendMail({
      to: email,
      subject: `We've received your enquiry – AllyJen`,
      html: `
        <h2>Thanks for getting in touch, ${name}!</h2>
        <p>We've received your enquiry and will get back to you within one business day.</p>
        <p>Here's a copy of what you sent us:</p>
        <ul>
          <li><strong>Company:</strong> ${company}</li>
          ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
          ${message ? `<li><strong>Message:</strong> ${message}</li>` : ''}
        </ul>
        <p>Best regards,<br>The AllyJen Team</p>
      `,
      text: `Thanks for getting in touch, ${name}!\n\nWe've received your enquiry and will get back to you within one business day.\n\nBest regards,\nThe AllyJen Team`
    })

    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully'
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send your message. Please try again or email us directly.' },
      { status: 500 }
    )
  }
}