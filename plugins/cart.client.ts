export default defineNuxtPlugin(() => {
  const cart = useCart()
  cart.hydrateFromStorage()

  watch(
    () => cart.lines.value,
    () => cart.persistToStorage(),
    { deep: true }
  )
})

