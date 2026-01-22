<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { reactive, ref, watch } from 'vue'
import AdminShell from '~/components/admin-shell.vue'

type Notification = { type: 'success' | 'error'; message: string }

type LinkCta = { label: string; href: string }
type HomeStat = { value: string; label: string }
type FeatureCard = { icon: string; title: string; description: string }
type PromoTile = { variant: 'light' | 'accent'; title: string; description: string; icon: string; href: string }
type Banner = { title: string; subtitle?: string; imageUrl: string; href: string }

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
  stats: HomeStat[]
  featureCards: FeatureCard[]
  promoTiles: PromoTile[]
  banners: Banner[]
}

type SitePageResponse = { slug: string; content: HomePageContent | null }

const createDefaultHomeContent = (): HomePageContent => ({
  seo: {
    title: 'E‑Learning — nowoczesna platforma szkoleń',
    description: 'Ucz się szybciej dzięki krótkim lekcjom, testom i śledzeniu postępów.',
  },
  hero: {
    eyebrow: 'Trusted partner',
    titleTop: 'Future of your',
    titleBottom: 'learning today.',
    subtitle:
      'Twórz kursy, sprzedawaj dostęp, sprawdzaj wiedzę testami i analizuj postępy — wszystko w jednym miejscu.',
    primaryCta: { label: 'Zobacz kursy', href: '/courses' },
    secondaryCta: { label: 'Kontakt', href: '/contact-us' },
    imageUrl: '/placeholders/hero-abstract.svg',
    imageAlt: 'Abstract hero image',
  },
  stats: [
    { value: '2000+', label: 'Uczniów' },
    { value: '70+', label: 'Lekcji' },
    { value: '12+', label: 'Kursów' },
  ],
  featureCards: [
    {
      icon: 'mdi-rocket-launch-outline',
      title: 'Szybki start',
      description: 'Dodaj kurs, rozdziały i testy w kilka minut w panelu admina.',
    },
    {
      icon: 'mdi-shield-check-outline',
      title: 'Dostęp i płatności',
      description: 'Sprzedawaj dostęp do kursów lub udostępniaj je za darmo.',
    },
    {
      icon: 'mdi-chart-line',
      title: 'Postępy',
      description: 'Śledź zaliczenia, wyniki i ukończenie materiałów.',
    },
  ],
  promoTiles: [
    {
      variant: 'light',
      title: 'Build the future of your learning',
      description: 'Krótki opis sekcji promocyjnej — możesz to edytować z admina.',
      icon: 'mdi-arrow-top-right',
      href: '/courses',
    },
    {
      variant: 'accent',
      title: 'We are here to help your business',
      description: 'Placeholder — podmień na copy pod Twój projekt.',
      icon: 'mdi-arrow-top-right',
      href: '/contact-us',
    },
    {
      variant: 'light',
      title: 'Helping learners thrive',
      description: 'Sekcja z CTA + mała statystyka, jak w inspiracji.',
      icon: 'mdi-arrow-top-right',
      href: '/about-us',
    },
  ],
  banners: [
    {
      title: 'Banner placeholder',
      subtitle: 'Miejsce na promocję / nowy kurs / webinar',
      imageUrl: '/placeholders/banner-1.svg',
      href: '/courses',
    },
  ],
})

const notification = ref<Notification | null>(null)
let notificationTimeout: ReturnType<typeof setTimeout> | null = null
const pushNotification = (payload: Notification) => {
  notification.value = payload
  if (notificationTimeout) clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => (notification.value = null), 4000)
}

const form = reactive<HomePageContent>(createDefaultHomeContent())
const saving = ref(false)

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: pageData, pending, refresh } = useFetch<SitePageResponse>('/api/site-pages/home' as any, {
  default: () => ({ slug: 'home', content: null }),
})

watch(
  pageData,
  (value) => {
    const content = value?.content ?? null
    const next = content ? content : createDefaultHomeContent()
    Object.assign(form, next)
  },
  { immediate: true },
)

const addStat = () => form.stats.push({ value: '', label: '' })
const removeStat = (index: number) => form.stats.splice(index, 1)

const addFeature = () => form.featureCards.push({ icon: 'mdi-star-outline', title: '', description: '' })
const removeFeature = (index: number) => form.featureCards.splice(index, 1)

const addPromo = () =>
  form.promoTiles.push({ variant: 'light', title: '', description: '', icon: 'mdi-arrow-top-right', href: '/' })
const removePromo = (index: number) => form.promoTiles.splice(index, 1)

const addBanner = () => form.banners.push({ title: '', subtitle: '', imageUrl: '/placeholders/banner-1.svg', href: '/' })
const removeBanner = (index: number) => form.banners.splice(index, 1)

const save = async () => {
  saving.value = true
  try {
    await $fetch('/api/site-pages/home', { method: 'POST', body: { content: form } })
    await refresh()
    pushNotification({ type: 'success', message: 'Zapisano.' })
  } catch (error: any) {
    pushNotification({
      type: 'error',
      message: (error?.data?.message as string) || (error?.message as string) || 'Nie udało się zapisać.',
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <v-row>
          <v-col cols="12">
            <v-alert v-if="notification" :type="notification.type" variant="tonal">
              {{ notification.message }}
            </v-alert>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" lg="8">
              <v-card>
              <v-card-title class="d-flex align-center justify-space-between">
                Treść strony — Strona główna
                <v-btn color="primary" :loading="saving" @click="save">Zapisz</v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text>
                <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />

                <h3 class="text-h6 mb-3">SEO</h3>
                <v-text-field v-model="form.seo.title" label="Tytuł" class="mb-3" />
                <v-textarea v-model="form.seo.description" label="Opis" rows="2" class="mb-6" />

                <h3 class="text-h6 mb-3">Sekcja hero</h3>
                <v-text-field v-model="form.hero.eyebrow" label="Nadtytuł" class="mb-3" />
                <v-text-field v-model="form.hero.titleTop" label="Tytuł (linia 1)" class="mb-3" />
                <v-text-field v-model="form.hero.titleBottom" label="Tytuł (linia 2)" class="mb-3" />
                <v-textarea v-model="form.hero.subtitle" label="Podtytuł" rows="3" class="mb-3" />

                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.hero.primaryCta.label" label="Tekst przycisku (główny)" class="mb-3" />
                    <v-text-field v-model="form.hero.primaryCta.href" label="Link (główny)" class="mb-3" />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.hero.secondaryCta!.label" label="Tekst przycisku (dodatkowy)" class="mb-3" />
                    <v-text-field v-model="form.hero.secondaryCta!.href" label="Link (dodatkowy)" class="mb-3" />
                  </v-col>
                </v-row>

                <v-text-field v-model="form.hero.imageUrl" label="URL obrazka hero" class="mb-3" />
                <v-text-field v-model="form.hero.imageAlt" label="ALT obrazka hero" class="mb-6" />

                <h3 class="text-h6 mb-3 d-flex align-center justify-space-between">
                  Statystyki
                  <v-btn variant="text" @click="addStat">Dodaj</v-btn>
                </h3>
                <v-row v-for="(item, idx) in form.stats" :key="`stat-${idx}`" class="mb-2">
                  <v-col cols="12" md="4">
                    <v-text-field v-model="item.value" label="Wartość" />
                  </v-col>
                  <v-col cols="12" md="7">
                    <v-text-field v-model="item.label" label="Etykieta" />
                  </v-col>
                  <v-col cols="12" md="1" class="d-flex align-center justify-end">
                    <v-btn icon variant="text" @click="removeStat(idx)">
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>

                <v-divider class="my-6" />

                <h3 class="text-h6 mb-3 d-flex align-center justify-space-between">
                  Karty funkcji
                  <v-btn variant="text" @click="addFeature">Dodaj</v-btn>
                </h3>
                <v-row v-for="(item, idx) in form.featureCards" :key="`feature-${idx}`" class="mb-2">
                  <v-col cols="12" md="3">
                    <v-text-field v-model="item.icon" label="Ikona (mdi-*)" />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field v-model="item.title" label="Tytuł" />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field v-model="item.description" label="Opis" />
                  </v-col>
                  <v-col cols="12" md="1" class="d-flex align-center justify-end">
                    <v-btn icon variant="text" @click="removeFeature(idx)">
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>

                <v-divider class="my-6" />

                <h3 class="text-h6 mb-3 d-flex align-center justify-space-between">
                  Sekcje promocyjne
                  <v-btn variant="text" @click="addPromo">Dodaj</v-btn>
                </h3>
                <v-row v-for="(item, idx) in form.promoTiles" :key="`promo-${idx}`" class="mb-2">
                  <v-col cols="12" md="2">
                    <v-select v-model="item.variant" :items="['light', 'accent']" label="Wariant" />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field v-model="item.title" label="Tytuł" />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field v-model="item.description" label="Opis" />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-text-field v-model="item.href" label="Link" />
                  </v-col>
                  <v-col cols="12" md="1" class="d-flex align-center justify-end">
                    <v-btn icon variant="text" @click="removePromo(idx)">
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>

                <v-divider class="my-6" />

                <h3 class="text-h6 mb-3 d-flex align-center justify-space-between">
                  Banery
                  <v-btn variant="text" @click="addBanner">Dodaj</v-btn>
                </h3>
                <v-row v-for="(item, idx) in form.banners" :key="`banner-${idx}`" class="mb-2">
                  <v-col cols="12" md="3">
                    <v-text-field v-model="item.title" label="Tytuł" />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field v-model="item.subtitle" label="Podtytuł" />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field v-model="item.imageUrl" label="URL obrazka" />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-text-field v-model="item.href" label="Link" />
                  </v-col>
                  <v-col cols="12" md="1" class="d-flex align-center justify-end">
                    <v-btn icon variant="text" @click="removeBanner(idx)">
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="4">
            <v-card class="mb-4">
              <v-card-title>Podgląd</v-card-title>
              <v-divider />
              <v-card-text>
                <div class="text-caption mb-2">Obrazek hero</div>
                <v-img :src="form.hero.imageUrl" aspect-ratio="1" cover rounded />
                <div class="text-caption mt-4 mb-2">Baner</div>
                <v-img :src="form.banners[0]?.imageUrl" aspect-ratio="2.6" cover rounded />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </AdminShell>
</template>
