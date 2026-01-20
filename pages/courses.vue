<template>
  <section class="pa-6">
    <div class="d-flex align-center justify-space-between flex-wrap mb-6">
      <h1 class="text-h4 font-weight-medium">Kursy</h1>
      <v-btn variant="text" to="/buy">Koszyk ({{ cart.count.value }})</v-btn>
    </div>

    <v-alert v-if="error" variant="tonal" type="error" class="mb-6">
      Nie udało się załadować kursów.
    </v-alert>

    <div v-if="pending" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate />
    </div>

    <v-row v-else>
      <v-col v-for="course in courses" :key="course.id" cols="12" sm="6" md="4">
        <v-card elevation="2" class="h-100 d-flex flex-column">
          <v-card-title class="text-wrap">{{ course.title }}</v-card-title>
          <v-card-subtitle class="text-wrap">
            {{ course.category?.title ?? 'Bez kategorii' }}
          </v-card-subtitle>

          <v-card-text class="flex-grow-1">
            <div class="text-h6">{{ formatMoney(course.priceCents, course.currency) }}</div>
          </v-card-text>

          <v-card-actions class="d-flex flex-wrap ga-2">
            <v-btn
              variant="flat"
              color="primary"
              :disabled="cart.courseIds.value.includes(course.id)"
              @click="addToCart(course.id)"
            >
              {{ cart.courseIds.value.includes(course.id) ? 'W koszyku' : 'Dodaj do koszyka' }}
            </v-btn>
            <v-btn variant="outlined" color="primary" @click="fastBuy(course.id)">
              Kup 1 klik
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-alert v-if="!pending && !error && !courses.length" variant="tonal" type="info" class="mt-6">
      Brak dostępnych kursów.
    </v-alert>
  </section>
</template>

<script setup lang="ts">
type PublicCourse = {
  id: number
  title: string
  slug: string
  priceCents: number
  currency: string
  category?: { id: number; title: string } | null
}

const cart = useCart()

const { data, pending, error } = await useFetch<PublicCourse[]>('/api/public-courses', {
  default: () => [],
})

const courses = computed(() => data.value ?? [])

const formatMoney = (priceCents: number, currency: string) => {
  const amount = (priceCents ?? 0) / 100
  try {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const addToCart = async (courseId: number) => {
  await cart.addCourse(courseId)
}

const fastBuy = async (courseId: number) => {
  await navigateTo({ path: '/buy', query: { fastbuy: String(courseId) } })
}
</script>
