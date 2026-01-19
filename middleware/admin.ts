export default defineNuxtRouteMiddleware(async () => {
  const user = await $fetch('/api/me').catch(() => null)
  if (!user || user.role !== 'ADMIN') {
    return navigateTo('/')
  }
})
