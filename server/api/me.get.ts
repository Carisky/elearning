import { getSessionUser, getTokenFromEvent, setAuthToken } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) return null

  // Ensure auth cookie is available on all routes (Path=/), even for older sessions
  // that were created with Path=/api.
  const token = getTokenFromEvent(event)
  if (token) setAuthToken(event, token)

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
})
