import { requireAdmin } from '../../../utils/auth'
import { deleteUserInviteForAdmin } from '../../../utils/user-invites'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return deleteUserInviteForAdmin(event.context.params?.id)
})
