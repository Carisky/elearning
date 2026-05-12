<template>
  <section class="buy-page">
    <div class="buy-page__inner">
      <div class="buy-page__header">
        <div>
          <h1 class="buy-page__title">Zakup</h1>
          <div class="buy-page__subtitle">Sprawdź koszyk i potwierdź zakup kursu.</div>
        </div>
        <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/courses">Wróć do kursów</v-btn>
      </div>

      <v-alert v-if="checkoutError" variant="tonal" type="error" class="buy-page__notice">
        {{ checkoutError }}
      </v-alert>

      <v-alert v-if="isFastBuy" variant="tonal" type="info" class="buy-page__notice">
        Tryb szybkiego zakupu (1 klik).
      </v-alert>

      <v-alert v-if="!me" variant="tonal" type="warning" class="buy-page__notice">
        <div class="buy-login-alert">
          <div>
            <div class="buy-login-alert__title">Przed zakupem wymagane jest logowanie.</div>
            <div class="text-body-2">Zaloguj się, aby kontynuować zakup i zapisać dostęp do kursu na koncie.</div>
          </div>
          <v-btn color="primary" @click="goToLogin">Zaloguj</v-btn>
        </div>
      </v-alert>

      <div v-if="items.length" class="buy-layout">
        <v-card elevation="1" class="buy-card">
          <v-card-title class="buy-card__title">
            <span>Koszyk</span>
            <v-chip size="small" color="primary" variant="tonal">{{ items.length }}</v-chip>
          </v-card-title>
          <v-divider />

          <v-card-text class="pa-0">
            <div class="buy-items">
              <div v-for="item in items" :key="item.id" class="buy-item">
                <div class="buy-item__main">
                  <div class="buy-item__title">{{ item.title }}</div>
                  <div class="buy-item__meta">{{ item.category?.title ?? 'Bez kategorii' }}</div>
                </div>
                <div class="buy-item__side">
                  <div class="buy-item__price">{{ formatMoney(item.priceCents, item.currency) }}</div>
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
              </div>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-text class="buy-card__form">
            <v-textarea
              v-model="customerNote"
              label="Dodatkowe uwagi"
              hint="Opcjonalnie, maksymalnie 2000 znaków."
              counter="2000"
              maxlength="2000"
              rows="3"
              auto-grow
              variant="outlined"
              :disabled="checkoutLoading"
            />

            <v-checkbox v-model="acceptedTerms" :disabled="checkoutLoading" density="compact" class="mt-4">
              <template #label>
                <span>
                  Przeczytałem(-am) i akceptuję
                  <NuxtLink to="/warunki-zakupu" class="terms-link">warunki zakupu</NuxtLink>.
                </span>
              </template>
            </v-checkbox>
          </v-card-text>
        </v-card>

        <v-card elevation="1" class="buy-summary">
          <v-card-title class="buy-summary__title">Podsumowanie</v-card-title>
          <v-divider />
          <v-card-text class="buy-summary__body">
            <div class="buy-summary__row">
              <span>Kursy</span>
              <span>{{ items.length }}</span>
            </div>
            <div class="buy-summary__row">
              <span>Razem</span>
              <strong>{{ formatMoney(totalCents, currency) }}</strong>
            </div>
          </v-card-text>
          <v-divider />
          <v-card-actions class="buy-summary__actions">
            <v-btn
              v-if="!isFastBuy"
              variant="text"
              color="error"
              :disabled="checkoutLoading"
              @click="clear"
            >
              Wyczyść koszyk
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              block
              size="large"
              :loading="checkoutLoading"
              :disabled="!items.length || !acceptedTerms"
              @click="checkout"
            >
              Kup teraz
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>

      <v-alert v-else variant="tonal" type="info">
        {{ isFastBuy ? 'Nie znaleziono kursu do szybkiego zakupu.' : 'Koszyk jest pusty.' }}
      </v-alert>
    </div>
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
const customerNote = ref('')

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
  await navigateTo({ path: '/', query: { login: '1', mode: 'login', redirect } })
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

    await $fetch('/api/checkout', {
      method: 'POST',
      body: {
        ...body,
        acceptedTerms: acceptedTerms.value,
        customerNote: customerNote.value,
      },
    })

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
