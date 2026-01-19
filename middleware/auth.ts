export default defineNuxtRouteMiddleware(async () => {
  const user = await $fetch('/api/me').catch(() => null)
  if (!user) {
    return navigateTo('/')
  }
})
