<template>
  <section class="courses-page">
    <div class="courses-page__header">
      <h1 class="courses-page__title">Kursy</h1>
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

    <v-alert v-if="error" variant="tonal" type="error" class="mb-6">
      Nie udało się załadować kursów.
    </v-alert>

    <div v-if="pending" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate />
    </div>

    <div v-else class="courses-layout" :class="{ 'courses-layout--with-filters': filtersOpen }">
      <aside v-if="filtersOpen" class="course-filters">
        <div class="course-filters__header">
          <div>
            <div class="course-filters__eyebrow">Wyszukiwanie</div>
            <h2 class="course-filters__title">Filtry kursów</h2>
          </div>
          <v-btn icon variant="text" size="small" class="course-filters__close" @click="filtersOpen = false">
            <v-icon icon="mdi-close" />
          </v-btn>
        </div>

        <div class="course-filters__section">
          <div class="course-filters__section-title">
            <v-icon icon="mdi-shape-outline" size="18" />
            <span>Kategoria</span>
          </div>
          <v-autocomplete
            v-model="selectedCategoryId"
            v-model:search="categorySearch"
            :items="categorySuggestions"
            :loading="categoryLoading"
            item-title="title"
            item-value="id"
            label="Szukaj kategorii"
            placeholder="np. agencja"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            no-filter
            no-data-text="Brak pasujących kategorii"
            class="course-filters__autocomplete"
          />
        </div>

        <div class="course-filters__section">
          <div class="course-filters__section-title">
            <v-icon icon="mdi-cash-multiple" size="18" />
            <span>Cena</span>
          </div>
          <div class="course-filters__price-row">
            <v-text-field
              v-model="filters.minPrice"
              label="od"
              type="number"
              density="compact"
              hide-details
              variant="outlined"
            />
            <v-text-field
              v-model="filters.maxPrice"
              label="do"
              type="number"
              density="compact"
              hide-details
              variant="outlined"
            />
          </div>
        </div>

        <div class="course-filters__section">
          <div class="course-filters__section-title">
            <v-icon icon="mdi-sort" size="18" />
            <span>Sortuj</span>
          </div>
          <v-radio-group v-model="filters.sort" hide-details density="compact" class="course-filters__options">
            <v-radio
              v-for="option in sortOptions"
              :key="option.value"
              :label="option.title"
              :value="option.value"
              color="primary"
              density="compact"
            />
          </v-radio-group>
        </div>

        <v-checkbox
          v-model="filters.bestsellersOnly"
          label="Bestsellery"
          color="primary"
          density="compact"
          hide-details
          class="course-filters__bestseller"
        />

        <v-btn
          block
          variant="tonal"
          color="primary"
          prepend-icon="mdi-filter-remove-outline"
          :disabled="activeFiltersCount === 0"
          class="course-filters__clear"
          @click="resetFilters"
        >
          Wyczyść filtry
        </v-btn>
      </aside>

      <div class="courses-layout__content">
        <v-row>
          <v-col v-for="course in filteredCourses" :key="course.id" cols="12" sm="6" lg="4">
            <v-card elevation="2" class="h-100 d-flex flex-column">
              <v-img
                :src="course.previewImageUrl || '/placeholders/banner-1.svg'"
                cover
                aspect-ratio="16/9"
              />
              <v-card-title class="text-wrap">{{ course.title }}</v-card-title>
              <v-card-subtitle class="text-wrap">
                Kategoria: {{ course.category?.title ?? 'Bez kategorii' }}
              </v-card-subtitle>

              <v-card-text class="flex-grow-1">
                <v-chip v-if="course.isFeatured" color="primary" variant="tonal" size="small" class="mb-3">
                  Bestseller
                </v-chip>
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
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  countActiveCourseFilters,
  createDefaultCourseFilters,
  filterAndSortCourses,
  type CourseFilterState,
} from '~/utils/course-filters'

type PublicCourse = {
  id: number
  title: string
  slug: string
  priceCents: number
  currency: string
  isFeatured?: boolean | null
  createdAt?: string | null
  previewImageUrl?: string | null
  category?: { id: number; title: string } | null
}

type CategorySuggestion = {
  id: number
  title: string
}

const cart = useCart()

const { data, pending, error } = await useFetch<PublicCourse[]>('/api/public-courses', {
  default: () => [],
})

const courses = computed(() => data.value ?? [])

const sortOptions = [
  { title: 'Od najtańszych', value: 'price_asc' as const },
  { title: 'Od najdroższych', value: 'price_desc' as const },
  { title: 'Od najnowszych', value: 'newest' as const },
  { title: 'Domyślnie', value: 'default' as const },
]

const filters = reactive<CourseFilterState>(createDefaultCourseFilters())
const filtersOpen = ref(false)
const categorySearch = ref('')
const categorySuggestions = ref<CategorySuggestion[]>([])
const categoryLoading = ref(false)
let categorySearchTimer: ReturnType<typeof setTimeout> | null = null

const selectedCategoryId = computed<number | null>({
  get: () => filters.categoryId,
  set: (value) => {
    filters.categoryId = typeof value === 'number' ? value : null
  },
})

const activeFiltersCount = computed(() => countActiveCourseFilters(filters))

const resetFilters = () => {
  Object.assign(filters, createDefaultCourseFilters())
  categorySearch.value = ''
  void loadCategorySuggestions('')
}

const filteredCourses = computed(() => filterAndSortCourses(courses.value, filters))

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

const loadCategorySuggestions = async (search: string) => {
  categoryLoading.value = true
  try {
    categorySuggestions.value = await $fetch<CategorySuggestion[]>('/api/public-categories', {
      query: { q: search.trim() },
    })
  } finally {
    categoryLoading.value = false
  }
}

watch(categorySearch, (value) => {
  if (categorySearchTimer) clearTimeout(categorySearchTimer)
  categorySearchTimer = setTimeout(() => {
    void loadCategorySuggestions(String(value ?? ''))
  }, 250)
})

onMounted(() => {
  void loadCategorySuggestions('')
})
</script>
