import { requireAdmin } from '../../utils/auth'
import { listUserInvitesForAdmin } from '../../utils/user-invites'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return listUserInvitesForAdmin()
})

