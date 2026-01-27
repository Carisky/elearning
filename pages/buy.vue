<template>
  <section class="pa-6">
    <div class="d-flex align-center justify-space-between flex-wrap mb-6">
      <h1 class="text-h4 font-weight-medium">Zakup</h1>
      <v-btn variant="text" to="/courses">Wróć do kursów</v-btn>
    </div>

    <v-alert v-if="checkoutError" variant="tonal" type="error" class="mb-6">
      {{ checkoutError }}
    </v-alert>

    <v-alert v-if="isFastBuy" variant="tonal" type="info" class="mb-6">
      Tryb szybkiego zakupu (1 klik).
    </v-alert>

    <v-alert v-if="!me" variant="tonal" type="warning" class="mb-6">
      Przed zakupem wymagane jest logowanie / rejestracja.
      <div class="mt-3">
        <v-btn color="primary" @click="goToLogin">Zaloguj / Zarejestruj</v-btn>
      </div>
    </v-alert>

    <v-card v-if="items.length" elevation="2">
      <v-card-title>Koszyk</v-card-title>
      <v-divider />
      <v-list>
        <v-list-item v-for="item in items" :key="item.id">
          <v-list-item-title class="text-wrap">{{ item.title }}</v-list-item-title>
          <v-list-item-subtitle class="text-wrap">
            {{ item.category?.title ?? 'Bez kategorii' }}
          </v-list-item-subtitle>
          <template #append>
            <div class="d-flex align-center ga-3">
              <div class="font-weight-medium">{{ formatMoney(item.priceCents, item.currency) }}</div>
              <v-btn
                v-if="!isFastBuy"
                size="small"
                variant="text"
                color="error"
                @click="remove(item.id)"
              >
                Usuń
              </v-btn>
            </div>
          </template>
        </v-list-item>
      </v-list>
      <v-divider />
      <v-card-text class="pb-0">
        <v-checkbox v-model="acceptedTerms" :disabled="checkoutLoading" hide-details density="compact">
          <template #label>
            <span>
              Przeczytałem(-am) i akceptuję
              <NuxtLink to="/warunki-zakupu" class="terms-link">warunki zakupu</NuxtLink>.
            </span>
          </template>
        </v-checkbox>
      </v-card-text>
      <v-card-actions class="d-flex flex-wrap justify-space-between ga-3">
        <div class="text-h6">Razem: {{ formatMoney(totalCents, currency) }}</div>
        <div class="d-flex flex-wrap ga-2">
          <v-btn v-if="!isFastBuy" variant="text" color="error" @click="clear" :disabled="checkoutLoading">
            Wyczyść koszyk
          </v-btn>
          <v-btn color="primary" :loading="checkoutLoading" :disabled="!items.length || !acceptedTerms" @click="checkout">
            Kup teraz
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>

    <v-alert v-else variant="tonal" type="info">
      {{ isFastBuy ? 'Nie znaleziono kursu do szybkiego zakupu.' : 'Koszyk jest pusty.' }}
    </v-alert>
  </section>
</template>

<script setup lang="ts">
type MePayload = { id: number; email: string; name: string | null; role: 'USER' | 'ADMIN' }
type PublicCourse = {
  id: number
  title: string
  slug: string
  priceCents: number
  currency: string
  category?: { id: number; title: string } | null
}

const route = useRoute()
const cart = useCart()

const { data: me } = await useFetch<MePayload | null>('/api/me', { key: 'me', default: () => null })
const { data: allCourses } = await useFetch<PublicCourse[]>('/api/public-courses', { default: () => [] })

const fastBuyCourseId = computed(() => {
  const value = typeof route.query.fastbuy === 'string' ? Number(route.query.fastbuy) : NaN
  return Number.isFinite(value) ? value : null
})
const isFastBuy = computed(() => fastBuyCourseId.value !== null)

const checkoutCourseIds = computed(() => {
  if (fastBuyCourseId.value !== null) return [fastBuyCourseId.value]
  return cart.courseIds.value
})

const items = computed(() => {
  const ids = new Set(checkoutCourseIds.value)
  return (allCourses.value ?? []).filter((course) => ids.has(course.id))
})

const currency = computed(() => items.value[0]?.currency ?? 'PLN')
const totalCents = computed(() => items.value.reduce((acc, course) => acc + (course.priceCents ?? 0), 0))

const checkoutLoading = ref(false)
const checkoutError = ref('')
const acceptedTerms = ref(false)

const formatMoney = (priceCents: number, currencyCode: string) => {
  const amount = (priceCents ?? 0) / 100
  try {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: currencyCode }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`
  }
}

const goToLogin = async () => {
  const redirect = route.fullPath
  await navigateTo({ path: '/', query: { login: '1', redirect } })
}

const remove = async (courseId: number) => {
  await cart.removeCourse(courseId)
}

const clear = async () => {
  await cart.clearCart()
}

const checkout = async () => {
  checkoutError.value = ''
  if (!me.value) {
    await goToLogin()
    return
  }
  if (!acceptedTerms.value) {
    checkoutError.value = 'Aby kontynuować, zaakceptuj warunki zakupu.'
    return
  }

  checkoutLoading.value = true
  try {
    const body = isFastBuy.value
      ? { courseIds: checkoutCourseIds.value }
      : { mode: 'cart' as const }

    await $fetch('/api/checkout', { method: 'POST', body: { ...body, acceptedTerms: acceptedTerms.value } })

    if (!isFastBuy.value) {
      await cart.clearCart()
    }
    await navigateTo('/my-profile')
  } catch (error: any) {
    checkoutError.value = error?.data?.message ?? error?.message ?? 'Nie udało się zrealizować zakupu.'
  } finally {
    checkoutLoading.value = false
  }
}
</script>

<style scoped>
.terms-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}
</style>
