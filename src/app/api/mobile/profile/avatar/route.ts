import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'

import { authenticateMobileApiRequest } from '@/lib/mobile/auth'
import { jsonError, jsonResponse } from '@/lib/security/http'

const avatarPayloadSchema = z.object({
  avatarUrl: z.string().url('A valid avatar URL is required.'),
})

function revalidateAvatarPaths() {
  revalidatePath('/athlete')
  revalidatePath('/coach')
  revalidatePath('/dashboard')
}

export async function POST(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const parsed = avatarPayloadSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return jsonError(request, 400, 'Invalid avatar payload.', {
      details: parsed.error.flatten(),
    })
  }

  const { error } = await auth.supabase
    .from('profiles')
    .update({
      avatar_url: parsed.data.avatarUrl,
    })
    .eq('id', auth.user.userId)

  if (error) {
    return jsonError(request, 400, 'Unable to update avatar right now.')
  }

  revalidateAvatarPaths()

  return jsonResponse(request, {
    success: true,
    avatarUrl: parsed.data.avatarUrl,
  })
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  const { error } = await auth.supabase
    .from('profiles')
    .update({
      avatar_url: null,
    })
    .eq('id', auth.user.userId)

  if (error) {
    return jsonError(request, 400, 'Unable to remove avatar right now.')
  }

  revalidateAvatarPaths()

  return jsonResponse(request, {
    success: true,
    avatarUrl: null,
  })
}
