<script setup lang="ts">
type LinkCta = { label: string; href: string }
type HomeStat = { value: string; label: string }

type HomePageContent = {
  seo: { title: string; description: string }
  hero: {
    eyebrow: string
    titleTop: string
    titleBottom: string
    subtitle: string
    primaryCta: LinkCta
    secondaryCta?: LinkCta
    imageUrl: string
    imageAlt?: string
  }
  quote: { text: string; author?: string }
  bestsellers: { title: string; subtitle?: string }
  why: { title: string; body: string }
  stats: HomeStat[]
}

type SitePageResponse = { slug: string; content: any | null }

type PublicCourse = {
  id: number
  title: string
  slug: string
  priceCents: number
  currency: string
  isFeatured?: boolean
  previewImageUrl?: string | null
  descriptionText?: string | null
  category?: { id: number; title: string } | null
}

type PublicReview = {
  id: number
  authorName: string
  authorTitle: string | null
  rating: number | null
  content: string
  approvedAt: string | null
  createdAt: string
}

const createFallback = (): HomePageContent => ({
  seo: {
    title: 'TSL Silesia Group — szkolenia online',
    description: 'Praktyczne kursy i szkolenia dla branży TSL. Ucz się szybko i konkretnie — we własnym tempie.',
  },
  hero: {
    eyebrow: 'TSL Silesia Group',
    titleTop: 'Szkolenia, które',
    titleBottom: 'dają realne efekty.',
    subtitle:
      'Krótkie lekcje, sprawdzanie wiedzy testami i materiały, do których możesz wracać. Zbuduj pewność w codziennej pracy w TSL.',
    primaryCta: { label: 'Zobacz kursy', href: '/courses' },
    secondaryCta: { label: 'Kontakt', href: '/contact-us' },
    imageUrl: '/placeholders/hero-abstract.svg',
    imageAlt: 'TSL Silesia Group',
  },
  quote: {
    text: '„Najlepsza inwestycja w TSL to wiedza, którą możesz wykorzystać od razu.”',
    author: 'TSL Silesia Group',
  },
  bestsellers: {
    title: 'Najczęściej wybierane',
    subtitle: 'Bestsellery',
  },
  why: {
    title: 'Dlaczego TSL Silesia Group?',
    body:
      'Stawiamy na praktykę i konkret: krótkie lekcje, realne przykłady oraz materiały, do których wrócisz w każdej chwili.\n\nUczysz się we własnym tempie, a wiedzę weryfikujesz testami.\n\nTo szkolenia tworzone przez ludzi z branży – dla ludzi z branży.',
  },
  stats: [
    { value: '700+', label: 'zadowolonych absolwentów' },
    { value: '300+', label: 'zrealizowanych szkoleń' },
  ],
})

const normalizeHomeContent = (raw: any): HomePageContent => {
  const fallback = createFallback()
  if (!raw || typeof raw !== 'object') return fallback

  return {
    ...fallback,
    ...raw,
    seo: { ...fallback.seo, ...(raw.seo ?? {}) },
    hero: { ...fallback.hero, ...(raw.hero ?? {}) },
    quote: { ...fallback.quote, ...(raw.quote ?? {}) },
    bestsellers: { ...fallback.bestsellers, ...(raw.bestsellers ?? {}) },
    why: { ...fallback.why, ...(raw.why ?? {}) },
    stats: Array.isArray(raw.stats) ? raw.stats : fallback.stats,
  }
}

const cart = useCart()

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: page } = await useFetch<SitePageResponse>('/api/site-pages/home' as any, {
  default: () => ({ slug: 'home', content: null }),
})

const content = computed(() => normalizeHomeContent(page.value?.content))
const stats = computed(() => (content.value.stats ?? []).slice(0, 2))

useSeoMeta({
  title: computed(() => content.value.seo.title),
  description: computed(() => content.value.seo.description),
})

const { data: featuredCourses } = await useFetch<PublicCourse[]>('/api/public-courses' as any, {
  query: { featured: '1', limit: 6 },
  default: () => [],
})
const { data: latestCourses } = await useFetch<PublicCourse[]>('/api/public-courses' as any, {
  query: { limit: 6 },
  default: () => [],
})

const bestsellers = computed(() => {
  const list = (featuredCourses.value?.length ? featuredCourses.value : latestCourses.value) ?? []
  return list.slice(0, 6)
})

const { data: approvedReviews } = await useFetch<PublicReview[]>('/api/public-reviews' as any, {
  query: { limit: 6 },
  default: () => [],
})

const fallbackReviews = (): PublicReview[] => [
  {
    id: -1,
    authorName: 'Katarzyna W.',
    authorTitle: 'Spedytor / dział operacyjny',
    rating: 5,
    content:
      'Bardzo praktyczne szkolenie – dużo przykładów z życia i konkretne wskazówki do pracy. Polecam każdemu, kto chce uporządkować wiedzę w TSL.',
    approvedAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: -2,
    authorName: 'Michał P.',
    authorTitle: 'Kierownik transportu',
    rating: 5,
    content:
      'Świetnie przygotowane materiały i prowadzenie krok po kroku. Najbardziej doceniam jasne omówienie dokumentów i procedur.',
    approvedAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: -3,
    authorName: 'Anna S.',
    authorTitle: 'Absolwentka kursu',
    rating: 4,
    content:
      'Kurs zrozumiały i dobrze zorganizowany. Fajne krótkie lekcje, które można przerabiać we własnym tempie.',
    approvedAt: null,
    createdAt: new Date().toISOString(),
  },
]

const reviews = computed(() => (approvedReviews.value?.length ? approvedReviews.value : fallbackReviews()).slice(0, 6))

const whyParagraphs = computed(() =>
  (content.value.why.body ?? '')
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean),
)

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

<template>
  <div class="home">
    <section class="home-hero">
      <v-container class="py-10 py-md-14">
        <div class="hero-grid">
          <div class="hero-left">
            <v-chip color="primary" variant="tonal" class="mb-4">
              {{ content.hero.eyebrow }}
            </v-chip>

            <h1 class="hero-title">
              <span class="hero-title__top">{{ content.hero.titleTop }}</span>
              <span class="hero-title__bottom">{{ content.hero.titleBottom }}</span>
            </h1>

            <p class="hero-subtitle mt-4">
              {{ content.hero.subtitle }}
            </p>

            <div class="hero-cta mt-6">
              <v-btn color="primary" :to="content.hero.primaryCta.href">
                {{ content.hero.primaryCta.label }}
              </v-btn>
              <v-btn v-if="content.hero.secondaryCta" variant="tonal" :to="content.hero.secondaryCta.href">
                {{ content.hero.secondaryCta.label }}
              </v-btn>
            </div>

            <v-card class="quote-card mt-8" variant="tonal">
              <v-card-text>
                <div class="quote-text">
                  {{ content.quote.text }}
                </div>
                <div v-if="content.quote.author" class="quote-author mt-2">
                  — {{ content.quote.author }}
                </div>
              </v-card-text>
            </v-card>
          </div>

          <div class="hero-right">
            <v-img
              :src="content.hero.imageUrl"
              :alt="content.hero.imageAlt ?? ''"
              class="hero-image"
              cover
              rounded="xl"
            />
          </div>
        </div>
      </v-container>
    </section>

    <section class="home-band home-band--stats">
      <v-container class="py-8 py-md-10">
        <div class="band-header">
          <div class="band-title">Statystyki</div>
        </div>
        <div class="stats-grid">
          <v-card v-for="(s, idx) in stats" :key="`stat-${idx}`" class="stat-card" variant="flat">
            <v-card-text>
              <div class="stat-value">{{ s.value }}</div>
              <div class="stat-label">{{ s.label }}</div>
            </v-card-text>
          </v-card>
        </div>
      </v-container>
    </section>

    <section class="home-band">
      <v-container class="py-10 py-md-12">
        <div class="band-header">
          <div class="band-eyebrow">{{ content.bestsellers.subtitle }}</div>
          <div class="band-title">{{ content.bestsellers.title }}</div>
        </div>

        <v-row class="mt-2" align="stretch">
          <v-col v-for="course in bestsellers" :key="course.id" cols="12" sm="6" lg="4">
            <v-card class="course-card" variant="flat">
              <v-img
                v-if="course.previewImageUrl"
                :src="course.previewImageUrl"
                height="160"
                cover
              />
              <v-sheet v-else height="160" class="d-flex align-center justify-center course-card__placeholder">
                <div class="text-medium-emphasis">Brak obrazka</div>
              </v-sheet>
              <v-card-text>
                <div class="text-caption text-medium-emphasis mb-1">
                  {{ course.category?.title ?? '—' }}
                </div>
                <div class="text-subtitle-1 font-weight-bold">
                  {{ course.title }}
                </div>
                <div v-if="course.descriptionText" class="text-body-2 text-medium-emphasis mt-2">
                  {{ course.descriptionText }}
                </div>
                <div class="d-flex align-center justify-space-between mt-4">
                  <div class="font-weight-bold">
                    {{ formatMoney(course.priceCents, course.currency) }}
                  </div>
                  <div class="d-flex gap-2">
                    <v-btn size="small" variant="text" :to="`/courses/${course.slug}`">
                      Szczegóły
                    </v-btn>
                    <v-btn size="small" color="primary" variant="tonal" @click="addToCart(course.id)">
                      Do koszyka
                    </v-btn>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="home-band home-band--why">
      <v-container class="py-10 py-md-12">
        <div class="band-header">
          <div class="band-title">{{ content.why.title }}</div>
        </div>
        <div class="why-body mt-4">
          <p v-for="(p, idx) in whyParagraphs" :key="`why-${idx}`" class="why-paragraph">
            {{ p }}
          </p>
        </div>
      </v-container>
    </section>

    <section class="home-band">
      <v-container class="py-10 py-md-12">
        <div class="band-header">
          <div class="band-title">Opinie</div>
          <div class="band-subtitle text-medium-emphasis">
            Kilka opinii od uczestników.
          </div>
        </div>

        <v-row class="mt-2" align="stretch">
          <v-col v-for="review in reviews" :key="review.id" cols="12" md="6" lg="4">
            <v-card class="review-card" variant="flat">
              <v-card-text>
                <div class="review-content">
                  {{ review.content }}
                </div>

                <div class="d-flex align-center justify-space-between mt-5">
                  <div>
                    <div class="font-weight-medium">{{ review.authorName }}</div>
                    <div v-if="review.authorTitle" class="text-caption text-medium-emphasis">
                      {{ review.authorTitle }}
                    </div>
                  </div>
                  <div v-if="review.rating" class="review-rating">
                    {{ review.rating }}/5
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </div>
</template>

<style scoped>
.home-hero {
  background:
    radial-gradient(1200px 500px at 15% 20%, rgba(var(--v-theme-primary), 0.12), transparent 60%),
    linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(255, 255, 255, 1));
}

.hero-grid {
  display: grid;
  gap: 32px;
}

.hero-title {
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0;
}

.hero-title__top,
.hero-title__bottom {
  display: block;
  color: rgba(17, 24, 39, 0.92);
}

.hero-subtitle {
  max-width: 40rem;
  color: rgba(17, 24, 39, 0.72);
}

.hero-cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-image {
  border: 1px solid rgba(17, 24, 39, 0.06);
  box-shadow:
    0 22px 70px rgba(17, 24, 39, 0.14),
    0 3px 14px rgba(17, 24, 39, 0.08);
}

.quote-card {
  border: 1px solid rgba(17, 24, 39, 0.08);
}

.quote-text {
  font-size: 0.95rem;
  color: rgba(17, 24, 39, 0.78);
}

.quote-author {
  font-size: 0.85rem;
  color: rgba(17, 24, 39, 0.62);
}

.home-band {
  border-top: 1px solid rgba(17, 24, 39, 0.06);
  background: rgba(255, 255, 255, 0.98);
}

.home-band--stats {
  background: rgba(17, 24, 39, 0.02);
}

.home-band--why {
  background:
    linear-gradient(180deg, rgba(17, 24, 39, 0.02), rgba(17, 24, 39, 0.01));
}

.band-header {
  display: grid;
  gap: 6px;
}

.band-eyebrow {
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(17, 24, 39, 0.54);
}

.band-title {
  font-size: 1.55rem;
  font-weight: 800;
  color: rgba(17, 24, 39, 0.92);
}

.band-subtitle {
  font-size: 0.95rem;
}

.stats-grid {
  display: grid;
  gap: 16px;
  margin-top: 14px;
}

.stat-card {
  border: 1px solid rgba(17, 24, 39, 0.06);
  background: rgba(255, 255, 255, 0.9);
}

.stat-value {
  font-weight: 900;
  font-size: 1.6rem;
  color: rgb(var(--v-theme-primary));
}

.stat-label {
  color: rgba(17, 24, 39, 0.7);
}

.course-card,
.review-card {
  border: 1px solid rgba(17, 24, 39, 0.06);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 60px rgba(17, 24, 39, 0.06);
  height: 100%;
}

.course-card__placeholder {
  background: rgba(17, 24, 39, 0.03);
}

.review-content {
  color: rgba(17, 24, 39, 0.78);
  line-height: 1.55;
}

.review-rating {
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
}

.why-paragraph {
  margin: 0 0 12px;
  color: rgba(17, 24, 39, 0.76);
  line-height: 1.65;
  max-width: 62rem;
}

@media (min-width: 960px) {
  .hero-grid {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    align-items: center;
    gap: 48px;
  }
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

