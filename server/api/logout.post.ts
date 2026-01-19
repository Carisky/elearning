import { clearAuthToken } from '../utils/auth'

export default defineEventHandler((event) => {
  clearAuthToken(event)
  return { success: true }
})
