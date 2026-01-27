<script setup lang="ts">
import RichTextViewer from '~/components/rich-text-viewer.vue'

type PublicCourseDetail = {
  id: number
  title: string
  slug: string
  priceCents: number
  currency: string
  previewImageUrl: string | null
  descriptionJson: any | null
  programJson: any | null
  instructorJson: any | null
  descriptionText: string
  category?: { id: number; title: string } | null
}

type PublicCourseReview = {
  id: number
  authorName: string
  authorTitle: string | null
  rating: number
  content: string
  approvedAt: string | null
  createdAt: string
}

const route = useRoute()
const cart = useCart()

const slug = computed(() => String(route.params.slug ?? ''))

const { data, pending, error } = await useFetch<PublicCourseDetail>(() => `/api/public-courses/${slug.value}`, {
  default: () => null as any,
})

const { data: courseReviews, pending: reviewsPending, error: reviewsError } = await useFetch<PublicCourseReview[]>(
  () => `/api/public-course-reviews?slug=${encodeURIComponent(slug.value)}`,
  { key: () => `public-course-reviews:${slug.value}`, default: () => [] as any },
)

const course = computed(() => data.value ?? null)
const tab = ref<'details' | 'program' | 'instructor' | 'reviews'>('details')

useSeoMeta({
  title: computed(() => course.value?.title ?? 'Kurs'),
})

const formatMoney = (priceCents: number, currency: string) => {
  const amount = (priceCents ?? 0) / 100
  try {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const addToCart = async () => {
  if (!course.value) return
  await cart.addCourse(course.value.id)
}
</script>

<template>
  <section class="pa-6">
    <div class="d-flex align-center justify-space-between flex-wrap mb-6">
      <v-btn variant="text" to="/courses" prepend-icon="mdi-arrow-left">Wróć do kursów</v-btn>
      <v-btn variant="text" to="/buy">Koszyk ({{ cart.count.value }})</v-btn>
    </div>

    <v-alert v-if="error" variant="tonal" type="error" class="mb-6">
      Nie udało się załadować kursu.
    </v-alert>

    <div v-else-if="pending" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate />
    </div>

    <v-card v-else-if="course" elevation="2">
      <v-img :src="course.previewImageUrl || '/placeholders/banner-1.svg'" cover aspect-ratio="21/9" />

      <v-card-title class="text-wrap">{{ course.title }}</v-card-title>
      <v-card-subtitle class="text-wrap">
        {{ course.category?.title ?? 'Bez kategorii' }}
      </v-card-subtitle>

      <v-card-text>
        <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
          <div class="text-h5">{{ formatMoney(course.priceCents, course.currency) }}</div>
          <div class="d-flex flex-wrap ga-2">
            <v-btn
              color="primary"
              variant="flat"
              :disabled="cart.courseIds.value.includes(course.id)"
              @click="addToCart"
            >
              {{ cart.courseIds.value.includes(course.id) ? 'W koszyku' : 'Dodaj do koszyka' }}
            </v-btn>
          </div>
        </div>

        <v-tabs v-model="tab" color="primary">
          <v-tab value="details">Szczegóły</v-tab>
          <v-tab value="program">Program</v-tab>
          <v-tab value="instructor">Prowadzący</v-tab>
          <v-tab value="reviews">Opinie</v-tab>
        </v-tabs>

        <v-window v-model="tab" class="mt-4">
          <v-window-item value="details">
            <RichTextViewer v-if="course.descriptionJson" :model-value="course.descriptionJson" />
            <div v-else class="text-medium-emphasis">Brak informacji.</div>
          </v-window-item>

          <v-window-item value="program">
            <RichTextViewer v-if="course.programJson" :model-value="course.programJson" />
            <div v-else class="text-medium-emphasis">Brak informacji.</div>
          </v-window-item>

          <v-window-item value="instructor">
            <RichTextViewer v-if="course.instructorJson" :model-value="course.instructorJson" />
            <div v-else class="text-medium-emphasis">Brak informacji.</div>
          </v-window-item>

          <v-window-item value="reviews">
            <v-progress-linear v-if="reviewsPending" indeterminate color="primary" class="mb-4" />

            <v-alert v-else-if="reviewsError" variant="tonal" type="error" class="mb-4">
              Nie udało się załadować opinii.
            </v-alert>

            <v-alert v-else-if="!(courseReviews?.length ?? 0)" variant="tonal" type="info" class="mb-4">
              Brak opinii.
            </v-alert>

            <v-row v-else class="ga-4">
              <v-col v-for="review in courseReviews" :key="review.id" cols="12" md="6">
                <v-card variant="outlined" rounded="lg">
                  <v-card-text>
                    <div class="text-body-2 text-wrap">{{ review.content }}</div>

                    <div class="d-flex align-center justify-space-between mt-5">
                      <div>
                        <div class="font-weight-medium">{{ review.authorName }}</div>
                        <div v-if="review.authorTitle" class="text-caption text-medium-emphasis">
                          {{ review.authorTitle }}
                        </div>
                      </div>
                      <div class="text-caption text-medium-emphasis">{{ review.rating }}/5</div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </section>
</template>

