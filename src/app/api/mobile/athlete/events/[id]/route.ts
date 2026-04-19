import { NextRequest, NextResponse } from 'next/server'

import { buildAthleteEventPrepPlan } from '@/lib/athlete-events'
import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { handleApiError } from '@/lib/security/http'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete') {
    return NextResponse.json(
      { error: 'Athlete events are only available for athlete accounts.' },
      { status: 403 }
    )
  }

  const { id } = await params

  try {
    const { data, error } = await auth.supabase
      .from('platform_events')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    }

    const eventDate = new Date(String(data.event_date || ''))
    const diffDays = Math.max(
      1,
      Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    )

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      event: {
        id: String(data.id || ''),
        eventName: String(data.event_name || ''),
        eventType: String(data.event_type || ''),
        location: String(data.location || ''),
        eventDate: String(data.event_date || ''),
        skillLevel: String(data.skill_level || ''),
        description: data.description ? String(data.description) : null,
        registrationLink: data.registration_link ? String(data.registration_link) : null,
        daysLeft: diffDays,
        weeksLeft: Math.max(1, Math.round(diffDays / 7)),
        prepPlan: buildAthleteEventPrepPlan(String(data.event_type || '')),
      },
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/athlete/events/[id]] failed',
      publicMessage: 'Failed to load athlete event detail.',
    })
  }
}
