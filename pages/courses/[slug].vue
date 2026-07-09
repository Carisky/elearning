<script setup lang="ts">
import RichTextViewer from '~/components/rich-text-viewer.vue'

type PublicCourseDetail = {
  id: number
  title: string
  slug: string
  priceCents: number
  currency: string
  previewImageUrl: string | null
  shortDescription: string | null
  hoursTotal: number | null
  descriptionJson: any | null
  programJson: any | null
  instructorJson: any | null
  descriptionText: string
  category?: { id: number; title: string } | null
  subcategory?: { id: number; title: string; categoryId: number } | null
  serviceForm?: { id: number; title: string } | null
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

const courseSummary = computed(() => {
  const text = course.value?.shortDescription || course.value?.descriptionText || ''
  return text.trim() || 'Praktyczny kurs z dostępem po zakupie.'
})

const courseFacts = computed(() => {
  if (!course.value) return []

  return [
    course.value.hoursTotal ? `${course.value.hoursTotal} godz.` : null,
    course.value.serviceForm?.title ?? null,
    course.value.subcategory?.title ?? null,
  ].filter((fact): fact is string => Boolean(fact))
})

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

const buyNowTarget = computed(() => {
  if (!course.value) return '/buy'
  return { path: '/buy', query: { fastbuy: String(course.value.id) } }
})
</script>

<template>
  <section class="course-page">
    <div class="course-page__nav">
      <v-btn variant="text" to="/courses" prepend-icon="mdi-arrow-left">Wróć do kursów</v-btn>
      <v-btn variant="text" to="/buy">Koszyk ({{ cart.count.value }})</v-btn>
    </div>

    <v-alert v-if="error" variant="tonal" type="error" class="course-page__alert">
      Nie udało się załadować kursu.
    </v-alert>

    <div v-else-if="pending" class="course-page__loading">
      <v-progress-circular indeterminate />
    </div>

    <template v-else-if="course">
      <section class="course-hero">
        <div class="course-hero__inner">
          <div class="course-hero__content">
            <div class="course-hero__category">
              {{ course.category?.title ?? 'Bez kategorii' }}
            </div>
            <h1 class="course-hero__title">{{ course.title }}</h1>
            <p class="course-hero__summary">{{ courseSummary }}</p>
            <div class="course-hero__meta">
              <span v-for="fact in courseFacts" :key="fact">{{ fact }}</span>
            </div>
          </div>
        </div>
      </section>

      <div class="course-detail-layout">
        <main class="course-detail-layout__main">
          <v-tabs v-model="tab" color="primary" class="course-tabs">
            <v-tab value="details">Szczegóły</v-tab>
            <v-tab value="program">Program</v-tab>
            <v-tab value="instructor">Prowadzący</v-tab>
            <v-tab value="reviews">Opinie</v-tab>
          </v-tabs>

          <v-window v-model="tab" class="course-content">
            <v-window-item value="details">
              <RichTextViewer v-if="course.descriptionJson" :model-value="course.descriptionJson" />
              <div v-else class="course-empty">Brak informacji.</div>
            </v-window-item>

            <v-window-item value="program">
              <RichTextViewer v-if="course.programJson" :model-value="course.programJson" />
              <div v-else class="course-empty">Brak informacji.</div>
            </v-window-item>

            <v-window-item value="instructor">
              <RichTextViewer v-if="course.instructorJson" :model-value="course.instructorJson" />
              <div v-else class="course-empty">Brak informacji.</div>
            </v-window-item>

            <v-window-item value="reviews">
              <v-progress-linear v-if="reviewsPending" indeterminate color="primary" class="mb-4" />

              <v-alert v-else-if="reviewsError" variant="tonal" type="error" class="mb-4">
                Nie udało się załadować opinii.
              </v-alert>

              <v-alert v-else-if="!(courseReviews?.length ?? 0)" variant="tonal" type="info" class="mb-4">
                Brak opinii.
              </v-alert>

              <div v-else class="course-reviews">
                <v-card v-for="review in courseReviews" :key="review.id" variant="outlined" class="course-review">
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
              </div>
            </v-window-item>
          </v-window>
        </main>

        <aside class="course-detail-layout__side">
          <v-card class="course-purchase-card" elevation="3">
            <div class="course-purchase-card__media">
              <v-img :src="course.previewImageUrl || '/placeholders/banner-1.svg'" cover aspect-ratio="16/9" />
              <div class="course-purchase-card__preview">
                <v-icon icon="mdi-play-circle-outline" size="22" />
                <span>Podgląd kursu</span>
              </div>
            </div>

            <v-card-text class="course-purchase-card__body">
              <div class="course-purchase-card__price">
                {{ formatMoney(course.priceCents, course.currency) }}
              </div>

              <v-btn
                color="primary"
                variant="flat"
                block
                size="large"
                :disabled="cart.courseIds.value.includes(course.id)"
                @click="addToCart"
              >
                {{ cart.courseIds.value.includes(course.id) ? 'W koszyku' : 'Dodaj do koszyka' }}
              </v-btn>

              <v-btn
                color="primary"
                variant="outlined"
                block
                size="large"
                :to="buyNowTarget"
              >
                Kup teraz
              </v-btn>

              <div class="course-purchase-card__note">
                Dostęp do kursu zostanie przypisany do Twojego konta po zakupie.
              </div>
            </v-card-text>
          </v-card>
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped>
.course-page {
  min-height: 100vh;
  background: var(--bg-page, #f7f8fa);
}

.course-page__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px 24px;
}

.course-page__alert,
.course-page__loading {
  max-width: 1180px;
  margin: 24px auto;
}

.course-page__loading {
  display: flex;
  justify-content: center;
  padding: 48px 24px;
}

.course-hero {
  background: #1f1f1f;
  color: #ffffff;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(0, 0, 0, 0.18);
}

.course-hero__inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 44px 24px 52px;
}

.course-hero__content {
  max-width: 740px;
}

.course-hero__category {
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 14px;
  font-weight: 600;
}

.course-hero__title {
  margin: 0;
  font-size: 40px;
  line-height: 1.16;
  font-weight: 800;
}

.course-hero__summary {
  max-width: 720px;
  margin: 16px 0 0;
  color: rgba(255, 255, 255, 0.86);
  font-size: 19px;
  line-height: 1.45;
}

.course-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 18px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 14px;
}

.course-detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 32px;
  align-items: start;
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.course-detail-layout__main {
  min-width: 0;
}

.course-detail-layout__side {
  margin-top: -224px;
}

.course-tabs {
  background: var(--bg-surface, #ffffff);
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 8px 8px 0 0;
}

.course-content {
  min-height: 320px;
  padding: 24px;
  background: var(--bg-surface, #ffffff);
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-top: 0;
  border-radius: 0 0 8px 8px;
}

.course-empty {
  color: rgba(26, 26, 26, 0.62);
}

.course-reviews {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.course-review {
  border-radius: 8px;
}

.course-purchase-card {
  position: sticky;
  top: 24px;
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.14);
  border-radius: 8px;
  background: var(--bg-surface, #ffffff);
  box-shadow: 0 2px 8px rgba(17, 24, 39, 0.12);
}

.course-purchase-card__media {
  position: relative;
  overflow: hidden;
  background: #111111;
}

.course-purchase-card__preview {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 10px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.76);
}

.course-purchase-card__body {
  display: grid;
  gap: 12px;
  padding: 20px;
}

.course-purchase-card__price {
  color: var(--text-primary, #1a1a1a);
  font-size: 30px;
  line-height: 1.1;
  font-weight: 800;
}

.course-purchase-card__note {
  color: rgba(26, 26, 26, 0.66);
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
}

@media (max-width: 980px) {
  .course-detail-layout {
    grid-template-columns: 1fr;
  }

  .course-detail-layout__side {
    order: -1;
    margin-top: -40px;
  }

  .course-purchase-card {
    position: static;
  }
}

@media (max-width: 720px) {
  .course-page__nav,
  .course-hero__inner,
  .course-detail-layout {
    padding-right: 16px;
    padding-left: 16px;
  }

  .course-hero__inner {
    padding-top: 32px;
    padding-bottom: 44px;
  }

  .course-hero__title {
    font-size: 30px;
  }

  .course-hero__summary {
    font-size: 16px;
  }

  .course-content {
    padding: 18px;
  }

  .course-reviews {
    grid-template-columns: 1fr;
  }
}
</style>
