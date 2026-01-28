export default defineNuxtRouteMiddleware(async () => {
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const user = await $fetch('/api/me', { headers }).catch(() => null)
  if (!user || user.role !== 'ADMIN') {
    return navigateTo('/')
  }
})
