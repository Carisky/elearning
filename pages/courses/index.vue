<template>
  <section class="pa-6">
    <div class="d-flex align-center justify-space-between flex-wrap mb-6">
      <div class="d-flex align-center flex-wrap ga-3">
        <h1 class="text-h4 font-weight-medium">Kursy</h1>
        <v-badge :content="activeFiltersCount" :model-value="activeFiltersCount > 0" color="primary">
          <v-btn
            variant="tonal"
            color="primary"
            prepend-icon="mdi-filter-variant"
            @click="filtersOpen = !filtersOpen"
          >
            Filtry
          </v-btn>
        </v-badge>
      </div>
      <v-btn variant="text" prepend-icon="mdi-cart-outline" to="/buy">Koszyk ({{ cart.count.value }})</v-btn>
    </div>

    <v-alert v-if="error" variant="tonal" type="error" class="mb-6">
      Nie udało się załadować kursów.
    </v-alert>

    <div v-if="pending" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate />
    </div>

    <div v-else>
      <v-expand-transition>
        <v-card v-if="filtersOpen" elevation="0" class="mb-6" variant="tonal" rounded="xl">
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center ga-2">
              <v-icon icon="mdi-tune-variant" />
              <span>Filtry</span>
            </div>
            <div class="d-flex align-center ga-2">
              <v-btn
                variant="text"
                size="small"
                prepend-icon="mdi-filter-remove-outline"
                :disabled="activeFiltersCount === 0"
                @click="resetFilters"
              >
                Reset
              </v-btn>
              <v-btn icon variant="text" @click="filtersOpen = false">
                <v-icon icon="mdi-close" />
              </v-btn>
            </div>
          </v-card-title>
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" md="5">
                <v-select
                  v-model="selectedCategoryId"
                  :items="categoryOptions"
                  item-title="title"
                  item-value="id"
                  label="Kategoria"
                  clearable
                  hide-details
                  variant="outlined"
                  prepend-inner-icon="mdi-shape-outline"
                />
              </v-col>

              <v-col cols="12" md="3">
                <v-select
                  v-model="priceSort"
                  :items="priceSortOptions"
                  item-title="title"
                  item-value="value"
                  label="Cena"
                  hide-details
                  variant="outlined"
                  prepend-inner-icon="mdi-sort"
                />
              </v-col>

              <v-col cols="6" md="2">
                <v-text-field
                  v-model="minPrice"
                  label="Min"
                  type="number"
                  hide-details
                  clearable
                  variant="outlined"
                  prepend-inner-icon="mdi-cash-minus"
                />
              </v-col>

              <v-col cols="6" md="2">
                <v-text-field
                  v-model="maxPrice"
                  label="Max"
                  type="number"
                  hide-details
                  clearable
                  variant="outlined"
                  prepend-inner-icon="mdi-cash-plus"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-expand-transition>

      <v-row>
        <v-col v-for="course in filteredCourses" :key="course.id" cols="12" sm="6" md="3">
        <v-card elevation="2" class="h-100 d-flex flex-column">
          <v-img
            :src="course.previewImageUrl || '/placeholders/banner-1.svg'"
            cover
            aspect-ratio="16/9"
          />
          <v-card-title class="text-wrap">{{ course.title }}</v-card-title>
          <v-card-subtitle class="text-wrap">
            Kategoria : {{ course.category?.title ?? 'Bez kategorii' }}
          </v-card-subtitle>

          <v-card-text class="flex-grow-1">
            <div class="text-h6">{{ formatMoney(course.priceCents, course.currency) }}</div>
          </v-card-text>

          <v-card-actions class="d-flex flex-wrap ga-2">
            <v-btn variant="text" color="primary" :to="`/courses/${course.slug}`">
              Więcej
            </v-btn>
            <v-btn
              variant="flat"
              color="primary"
              :disabled="cart.courseIds.value.includes(course.id)"
              @click="addToCart(course.id)"
            >
              {{ cart.courseIds.value.includes(course.id) ? 'W koszyku' : 'Dodaj do koszyka' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-alert v-if="!pending && !error && !filteredCourses.length" variant="tonal" type="info" class="mt-6">
      Brak dostępnych kursów.
    </v-alert>
    </div>
  </section>
</template>

<script setup lang="ts">
type PublicCourse = {
  id: number
  title: string
  slug: string
  priceCents: number
  currency: string
  previewImageUrl?: string | null
  category?: { id: number; title: string } | null
}

const cart = useCart()

const { data, pending, error } = await useFetch<PublicCourse[]>('/api/public-courses', {
  default: () => [],
})

const courses = computed(() => data.value ?? [])

const categoryOptions = computed(() => {
  const map = new Map<number, { id: number; title: string }>()
  for (const course of courses.value) {
    const cat = course.category
    if (cat?.id && cat.title) map.set(cat.id, { id: cat.id, title: cat.title })
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title))
})

const selectedCategoryId = ref<number | null>(null)

const priceSortOptions = [
  { title: 'Bez sortowania', value: 'none' as const },
  { title: 'Najtaniej', value: 'asc' as const },
  { title: 'Najdrożej', value: 'desc' as const },
]
const priceSort = ref<(typeof priceSortOptions)[number]['value']>('none')

const minPrice = ref('')
const maxPrice = ref('')

const filtersOpen = ref(false)

const activeFiltersCount = computed(() => {
  let count = 0
  if (selectedCategoryId.value !== null) count++
  if (priceSort.value !== 'none') count++
  if (minPrice.value.trim()) count++
  if (maxPrice.value.trim()) count++
  return count
})

const resetFilters = () => {
  selectedCategoryId.value = null
  priceSort.value = 'none'
  minPrice.value = ''
  maxPrice.value = ''
}

const toCents = (value: string): number | null => {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

const filteredCourses = computed(() => {
  const minCents = minPrice.value.trim() ? toCents(minPrice.value) : null
  const maxCents = maxPrice.value.trim() ? toCents(maxPrice.value) : null

  let list = courses.value.slice()

  if (selectedCategoryId.value !== null) {
    list = list.filter((c) => c.category?.id === selectedCategoryId.value)
  }

  if (minCents !== null) {
    list = list.filter((c) => (c.priceCents ?? 0) >= minCents)
  }

  if (maxCents !== null) {
    list = list.filter((c) => (c.priceCents ?? 0) <= maxCents)
  }

  if (priceSort.value === 'asc') {
    list.sort((a, b) => (a.priceCents ?? 0) - (b.priceCents ?? 0))
  } else if (priceSort.value === 'desc') {
    list.sort((a, b) => (b.priceCents ?? 0) - (a.priceCents ?? 0))
  }

  return list
})

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
</script>
