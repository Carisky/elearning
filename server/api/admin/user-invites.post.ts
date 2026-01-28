import { readBody } from 'h3'
import { requireAdmin } from '../../utils/auth'
import { createUserInvite } from '../../utils/user-invites'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody<{ email?: unknown; courseIds?: unknown }>(event)
  return createUserInvite(admin.id, { email: body?.email, courseIds: body?.courseIds })
})

