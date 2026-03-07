// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { name, email, company, phone, message } = await request.json()

    // Validate required fields
    if (!name || !email || !company) {
      return NextResponse.json(
        { error: 'Name, email, and company are required' },
        { status: 400 }
      )
    }

    // Here you would typically:
    // 1. Send an email to your sales/support team
    // 2. Store the lead in a CRM system
    // 3. Send a confirmation email to the prospect
    // 4. Log the contact for analytics

    // For now, we'll just log it and return success
    console.log('New contact form submission:', {
      name,
      email,
      company,
      phone,
      message,
      timestamp: new Date().toISOString()
    })

    // In a real implementation, you might use a service like:
    // - SendGrid/Mailgun for emails
    // - HubSpot/Salesforce for CRM
    // - Slack webhook for notifications

    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully'
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    )
  }
}