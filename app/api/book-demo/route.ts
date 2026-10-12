// app/api/book-demo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { name, email, company, phone, teamSize, message, privacyAccepted } = await request.json()

    if (!name || !email || !company || privacyAccepted !== true) {
      return NextResponse.json({ error: 'Name, email, and company are required' }, { status: 400 })
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 })
    }

    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'anthony@allyjen.ie'
    const submittedAt = new Date().toLocaleString('en-IE', { timeZone: 'Europe/Dublin' })

    // Notify admin
    await sendMail({
      to: adminEmail,
      subject: `🎯 New Demo Request — ${company}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #003842; padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #42b8ac; margin: 0;">New Demo Request</h2>
            <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0;">Submitted ${submittedAt}</p>
          </div>
          <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold; color: #374151; width: 130px;">Name</td><td style="padding: 8px 0; color: #111827;">${name}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Email</td><td style="padding: 8px 0; color: #111827;"><a href="mailto:${email}" style="color: #42b8ac;">${email}</a></td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Company</td><td style="padding: 8px 0; color: #111827;">${company}</td></tr>
              ${phone ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Phone</td><td style="padding: 8px 0; color: #111827;">${phone}</td></tr>` : ''}
              ${teamSize ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Team Size</td><td style="padding: 8px 0; color: #111827;">${teamSize}</td></tr>` : ''}
              ${message ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #374151; vertical-align: top;">Notes</td><td style="padding: 8px 0; color: #111827;">${message.replace(/\n/g, '<br>')}</td></tr>` : ''}
            </table>
            <div style="margin-top: 20px; padding: 12px 16px; background: #fff; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 13px; color: #6b7280;">Quick action: reply to this email or open super-admin to create their demo account.</p>
            </div>
          </div>
        </div>
      `,
      text: `New Demo Request\n\nName: ${name}\nEmail: ${email}\nCompany: ${company}${phone ? `\nPhone: ${phone}` : ''}${teamSize ? `\nTeam Size: ${teamSize}` : ''}${message ? `\n\nNotes:\n${message}` : ''}\n\nSubmitted at ${submittedAt}`,
    })

    // Submit the demo request to the published AllyJen HubSpot form as well as notifying the team.
    const hubspotPortalId = '149233820'
    const hubspotFormId = '1fc460a4-02d7-4a08-9d64-ea4d1fa902e9'
    const nameParts = String(name).trim().split(/\\s+/)
    const hubspotFields = [
      { name: 'firstname', value: nameParts[0] || '' },
      { name: 'lastname', value: nameParts.slice(1).join(' ') },
      { name: 'email', value: email },
      { name: 'company', value: company },
      { name: 'phone', value: phone || '' },
      { name: 'message', value: [`Business: ${company}`, teamSize ? `Locations: ${teamSize}` : '', message || ''].filter(Boolean).join('\\n\\n') },
    ]
    try {
      const hubspotResponse = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${hubspotPortalId}/${hubspotFormId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: hubspotFields, context: { pageUri: 'https://allyjen.ie/book-demo', pageName: 'AllyJen book a demo form' } }),
      })
      if (!hubspotResponse.ok) console.error('HubSpot demo form submission failed:', await hubspotResponse.text())
    } catch (hubspotError) {
      console.error('HubSpot demo form submission error:', hubspotError)
    }

    // Confirmation to prospect
    await sendMail({
      to: email,
      subject: `Demo request confirmed — AllyJen`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #003842; padding: 24px; border-radius: 12px 12px 0 0;">
            <img src="https://allyjen.ie/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg" alt="AllyJen" style="height: 40px; display: block; margin-bottom: 12px;" />
            <h2 style="color: white; margin: 0;">We'll be in touch soon!</h2>
          </div>
          <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="color: #374151;">Hi ${name},</p>
            <p style="color: #374151;">Thanks for requesting a demo of AllyJen! We've received your request for <strong>${company}</strong> and will be in touch within one business day to arrange a time that works for you.</p>
            <p style="color: #374151;">In the meantime, feel free to reply to this email if you have any questions.</p>
            <p style="color: #374151; margin-top: 24px;">Best regards,<br><strong>The AllyJen Team</strong></p>
          </div>
        </div>
      `,
      text: `Hi ${name},\n\nThanks for requesting a demo of AllyJen! We've received your request and will be in touch within one business day.\n\nBest regards,\nThe AllyJen Team`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Book demo error:', error)
    return NextResponse.json({ error: 'Failed to submit request. Please email us directly.' }, { status: 500 })
  }
}
