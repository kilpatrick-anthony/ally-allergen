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