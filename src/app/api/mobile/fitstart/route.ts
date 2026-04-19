import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { fitStartSaveSchema, saveFitStartProfileForUser } from '@/lib/fitstart'
import { authenticateMobileApiRequest } from '@/lib/mobile/auth'

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'individual') {
    return NextResponse.json(
      { error: 'Only individual accounts can complete FitStart on mobile.' },
      { status: 403 }
    )
  }

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const parsed = fitStartSaveSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid FitStart payload.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const result = await saveFitStartProfileForUser({
    supabase: auth.supabase,
    userId: auth.user.userId,
    payload: parsed.data,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath('/fitstart')
  revalidatePath('/individual')
  revalidatePath('/individual/dashboard')

  return NextResponse.json(result)
}
