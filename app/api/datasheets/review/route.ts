// app/api/datasheets/review/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mark datasheet as reviewed
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { datasheetId, reviewNotes, nextReviewDate } = await request.json()

    if (!datasheetId) {
      return NextResponse.json(
        { error: 'Missing datasheet ID' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // Update datasheet
    const { data, error } = await supabase
      .from('datasheets')
      .update({
        last_reviewed_at: new Date().toISOString(),
        last_reviewed_by: user?.id,
        review_notes: reviewNotes,
        next_review_date: nextReviewDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', datasheetId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update datasheet' },
        { status: 500 }
      )
    }

    // Create new reminder if next_review_date is set
    if (nextReviewDate) {
      const reminderDate = new Date(nextReviewDate)
      reminderDate.setDate(reminderDate.getDate() - 7) // 7 days before review

      await supabase
        .from('datasheet_review_reminders')
        .insert({
          datasheet_id: datasheetId,
          reminder_date: reminderDate.toISOString().split('T')[0],
          recipient_emails: [],
          status: 'pending'
        })
    }

    return NextResponse.json({
      success: true,
      datasheet: data
    })

  } catch (error) {
    console.error('Error marking datasheet as reviewed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get datasheets needing review
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const daysAhead = parseInt(searchParams.get('daysAhead') || '7')

    // Use the database function
    const { data, error } = await supabase
      .rpc('get_datasheets_needing_review', { days_ahead: daysAhead })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch review notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notifications: data })

  } catch (error) {
    console.error('Error fetching review notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
