import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/email'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function cleanLine(value: unknown, maxLength: number) {
  return clean(value, maxLength).replace(/[\r\n]+/g, ' ')
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = cleanLine(body.name, 100)
    const email = cleanLine(body.email, 254)
    const message = clean(body.message, 3000)
    const character = cleanLine(body.character, 20) === 'Jen' ? 'Jen' : 'Ally'
    const context = cleanLine(body.context, 200)
    const website = clean(body.website, 200)

    if (website) return NextResponse.json({ success: true })
    if (!name || !email || !message) return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 })
    if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })

    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>')
    const safeContext = escapeHtml(context || 'Not provided')
    const submittedAt = new Date().toLocaleString('en-IE', { timeZone: 'Europe/Dublin' })
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'info@allyjen.ie'

    const [teamDelivery, confirmationDelivery] = await Promise.allSettled([
      sendMail({
        to: supportEmail,
        replyTo: email,
        subject: `New message via ${character} from ${name}`,
        html: `<h2>New message via ${character}</h2><p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p><p><strong>Page/context:</strong> ${safeContext}</p><p><strong>Message:</strong></p><p>${safeMessage}</p><hr><p style="color:#999;font-size:12px">Submitted at ${submittedAt}</p>`,
        text: `New message via ${character}\n\nName: ${name}\nEmail: ${email}\nPage/context: ${context || 'Not provided'}\n\nMessage:\n${message}\n\nSubmitted at ${submittedAt}`,
      }),
      sendMail({
        to: email,
        subject: `We've received your message – AllyJen`,
        html: `<h2>Thanks for your message, ${safeName}.</h2><p>We've received your message via ${character}. A member of the AllyJen team will respond as quickly as possible.</p><p><strong>Your message:</strong></p><p>${safeMessage}</p><p>Best regards,<br>The AllyJen Team</p>`,
        text: `Thanks for your message, ${name}.\n\nWe've received it via ${character}. A member of the AllyJen team will respond as quickly as possible.\n\nBest regards,\nThe AllyJen Team`,
      }),
    ])

    if (teamDelivery.status === 'rejected') throw teamDelivery.reason
    if (confirmationDelivery.status === 'rejected') {
      console.error('Support message confirmation email error:', confirmationDelivery.reason)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Support message error:', error)
    return NextResponse.json({ error: 'We could not send your message. Please try again or email info@allyjen.ie.' }, { status: 500 })
  }
}
