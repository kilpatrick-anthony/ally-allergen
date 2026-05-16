// app/api/careers/alert/route.ts
// Handles job alert sign-ups from the careers page.
// Notifies admin and sends a confirmation to the applicant.

import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const { name, email, role, message } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
    }

    const safeName = name.trim()
    const safeEmail = email.trim().toLowerCase()
    const safeRole = typeof role === 'string' && role.trim() ? role.trim() : 'Not specified'
    const safeMessage = typeof message === 'string' ? message.trim() : ''
    const submittedAt = new Date().toLocaleString('en-IE', { timeZone: 'Europe/Dublin' })
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'anthony@allyjen.ie'

    // Notify admin
    await sendMail({
      to: adminEmail,
      subject: `👋 New Careers Alert Sign-up — ${safeName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#003842;padding:24px;border-radius:12px 12px 0 0">
            <h2 style="color:#42b8ac;margin:0">New Job Alert Sign-up</h2>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0">Submitted ${submittedAt}</p>
          </div>
          <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;font-weight:bold;color:#374151;width:140px">Name</td><td style="padding:8px 0;color:#111827">${safeName}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold;color:#374151">Email</td><td style="padding:8px 0;color:#111827"><a href="mailto:${safeEmail}" style="color:#42b8ac">${safeEmail}</a></td></tr>
              <tr><td style="padding:8px 0;font-weight:bold;color:#374151">Area of Interest</td><td style="padding:8px 0;color:#111827">${safeRole}</td></tr>
              ${safeMessage ? `<tr><td style="padding:8px 0;font-weight:bold;color:#374151;vertical-align:top">Message</td><td style="padding:8px 0;color:#111827">${safeMessage.replace(/\n/g, '<br>')}</td></tr>` : ''}
            </table>
          </div>
        </div>
      `,
      text: `New Careers Alert Sign-up\n\nName: ${safeName}\nEmail: ${safeEmail}\nArea: ${safeRole}${safeMessage ? `\n\nMessage:\n${safeMessage}` : ''}\n\nSubmitted at ${submittedAt}`,
    })

    // Confirmation to the sign-up
    await sendMail({
      to: safeEmail,
      subject: `You're on the AllyJen jobs list, ${safeName.split(' ')[0]}!`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#003842;padding:28px 32px;border-radius:8px 8px 0 0">
            <img src="https://allyjen.ie/Logo-AllyJen.svg" alt="AllyJen" height="48" style="display:block" />
          </div>
          <div style="background:#f9fafb;padding:28px 32px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none">
            <h2 style="margin:0 0 12px;color:#003842">Thanks for your interest, ${safeName.split(' ')[0]}!</h2>
            <p style="margin:0 0 16px;color:#374151;line-height:1.6">
              We've added you to our job alerts list. When a position opens up that might suit you, we'll be in touch.
            </p>
            <p style="margin:0 0 16px;color:#374151;line-height:1.6">
              In the meantime, feel free to explore what we're building at
              <a href="https://allyjen.ie" style="color:#42b8ac;text-decoration:none">allyjen.ie</a>.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
            <p style="margin:0;color:#9ca3af;font-size:12px">
              AllyJen Solutions Limited — CRO No. 811542, Republic of Ireland.<br>
              You received this because you signed up for job alerts at <a href="https://allyjen.ie/careers" style="color:#42b8ac;text-decoration:none">allyjen.ie/careers</a>.
            </p>
          </div>
        </div>
      `,
      text: `Thanks for your interest, ${safeName.split(' ')[0]}!\n\nWe've added you to our job alerts list. When a position opens up, we'll be in touch.\n\nIn the meantime, explore what we're building at https://allyjen.ie\n\n— The AllyJen Team`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[careers/alert] Error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
