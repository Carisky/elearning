<script setup lang="ts">
type LinkCta = { label: string; href: string };
type HomeStat = { value: string; label: string };
type FeatureCard = { icon: string; title: string; description: string };
type PromoTile = {
  variant: "light" | "accent";
  title: string;
  description: string;
  icon: string;
  href: string;
};
type Banner = {
  title: string;
  subtitle?: string;
  imageUrl: string;
  href: string;
};

type HomePageContent = {
  seo: { title: string; description: string };
  hero: {
    eyebrow: string;
    titleTop: string;
    titleBottom: string;
    subtitle: string;
    primaryCta: LinkCta;
    secondaryCta?: LinkCta;
    imageUrl: string;
    imageAlt?: string;
  };
  stats: HomeStat[];
  featureCards: FeatureCard[];
  promoTiles: PromoTile[];
  banners: Banner[];
};

type SitePageResponse = { slug: string; content: HomePageContent | null };

const createFallback = (): HomePageContent => ({
  seo: {
    title: "E‑Learning — nowoczesna platforma szkoleń",
    description:
      "Ucz się szybciej dzięki krótkim lekcjom, testom i śledzeniu postępów.",
  },
  hero: {
    eyebrow: "Trusted partner",
    titleTop: "Future of your",
    titleBottom: "learning today.",
    subtitle:
      "Twórz kursy, sprzedawaj dostęp, sprawdzaj wiedzę testami i analizuj postępy — wszystko w jednym miejscu.",
    primaryCta: { label: "Zobacz kursy", href: "/courses" },
    secondaryCta: { label: "Kontakt", href: "/contact-us" },
    imageUrl: "/placeholders/hero-abstract.svg",
    imageAlt: "Abstract hero image",
  },
  stats: [
    { value: "2000+", label: "Uczniów" },
    { value: "70+", label: "Lekcji" },
    { value: "12+", label: "Kursów" },
  ],
  featureCards: [
    {
      icon: "mdi-rocket-launch-outline",
      title: "Szybki start",
      description: "Utwórz kurs i opublikuj w kilka minut.",
    },
    {
      icon: "mdi-shield-check-outline",
      title: "Płatności",
      description: "Sprzedawaj dostęp lub udostępniaj za darmo.",
    },
    {
      icon: "mdi-chart-line",
      title: "Postępy",
      description: "Wyniki testów i ukończenia w jednym panelu.",
    },
  ],
  promoTiles: [
    {
      variant: "light",
      title: "Build the future of your learning",
      description: "Sekcja promocyjna — edytowalna z admina.",
      icon: "mdi-arrow-top-right",
      href: "/courses",
    },
    {
      variant: "accent",
      title: "We are here to help your business",
      description: "Placeholder — dopasuj copy do produktu.",
      icon: "mdi-arrow-top-right",
      href: "/contact-us",
    },
    {
      variant: "light",
      title: "Helping learners thrive",
      description: "Kolejna sekcja “card” jak w inspiracji.",
      icon: "mdi-arrow-top-right",
      href: "/about-us",
    },
  ],
  banners: [
    {
      title: "Banner placeholder",
      subtitle: "Miejsce na promocję / nowy kurs / webinar",
      imageUrl: "/placeholders/banner-1.svg",
      href: "/courses",
    },
  ],
});

type PublicCourse = {
  id: number;
  title: string;
  slug: string;
  priceCents: number;
  currency: string;
  category?: { id: number; title: string } | null;
};

const cart = useCart();

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: page } = await useFetch<SitePageResponse>(
  "/api/site-pages/home" as any,
  {
    default: () => ({ slug: "home", content: null }),
  },
);
const content = computed(() => page.value?.content ?? createFallback());

useSeoMeta({
  title: computed(() => content.value.seo.title),
  description: computed(() => content.value.seo.description),
});

const { data: courses } = await useFetch<PublicCourse[]>(
  "/api/public-courses",
  { default: () => [] },
);
const featuredCourses = computed(() => (courses.value ?? []).slice(0, 3));

const formatMoney = (priceCents: number, currency: string) => {
  const amount = (priceCents ?? 0) / 100;
  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

const addToCart = async (courseId: number) => {
  await cart.addCourse(courseId);
};

const year = new Date().getFullYear();
</script>

<template>
  <div class="landing">
    <section class="landing-hero">
      <v-container class="py-10 py-md-16">
        <v-row align="start" class="ga-8">
          <v-col cols="16" md="5">
            <v-chip color="primary" variant="tonal" class="mb-4">
              {{ content.hero.eyebrow }}
            </v-chip>

            <h1 class="landing-title">
              <span class="landing-title__top">{{
                content.hero.titleTop
              }}</span>
              <span class="landing-title__bottom">{{
                content.hero.titleBottom
              }}</span>
            </h1>

            <p class="text-body-1 landing-subtitle">
              {{ content.hero.subtitle }}
            </p>

            <div class="d-flex flex-wrap ga-3 mt-6">
              <v-btn
                color="primary"
                size="large"
                rounded="lg"
                :to="content.hero.primaryCta.href"
              >
                {{ content.hero.primaryCta.label }}
              </v-btn>
              <v-btn
                v-if="content.hero.secondaryCta"
                variant="outlined"
                size="large"
                rounded="lg"
                :to="content.hero.secondaryCta.href"
              >
                {{ content.hero.secondaryCta.label }}
              </v-btn>
            </div>

            <div class="d-flex flex-wrap ga-3 mt-8">
              <div
                v-for="(s, idx) in content.stats"
                :key="`stat-${idx}`"
                class="landing-stat"
              >
                <div class="landing-stat__value">{{ s.value }}</div>
                <div class="landing-stat__label">{{ s.label }}</div>
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="landing-media">
              <v-img
                :src="content.hero.imageUrl"
                :alt="content.hero.imageAlt ?? ''"
                cover
                aspect-ratio="1"
                class="landing-media__img"
              />

              <div class="landing-float landing-float--top">
                <div class="landing-float__kpi">
                  {{ content.stats?.[0]?.value ?? "—" }}
                </div>
                <div class="landing-float__text">Growth is our priority.</div>
              </div>

              <div class="landing-float landing-float--bottom">
                <div class="landing-float__row">
                  <div class="landing-float__kpi">
                    {{ content.stats?.[1]?.value ?? "—" }}
                  </div>
                  <div class="landing-float__kpi">
                    {{ content.stats?.[2]?.value ?? "—" }}
                  </div>
                </div>
                <div class="landing-float__text">
                  Excellence through innovation
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="landing-features">
      <v-container class="py-10 py-md-14">
        <div class="landing-features-grid">
          <v-card
            v-for="(card, idx) in content.featureCards"
            :key="`feature-${idx}`"
            class="landing-card"
            rounded="xl"
            elevation="0"
          >
            <v-card-text class="pa-6">
              <div class="landing-card__icon">
                <v-icon :icon="card.icon" />
              </div>
              <div class="text-h6 font-weight-bold mt-4">{{ card.title }}</div>
              <div class="text-body-2 mt-2 text-medium-emphasis">
                {{ card.description }}
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-container>
    </section>

    <section class="landing-tiles">
      <v-container class="py-4 py-md-10">
        <div class="landing-tiles-grid">
          <v-card
            v-for="(tile, idx) in content.promoTiles"
            :key="`tile-${idx}`"
            class="landing-tile"
            :class="
              tile.variant === 'accent'
                ? 'landing-tile--accent'
                : 'landing-tile--light'
            "
            rounded="xl"
            elevation="0"
            :to="tile.href"
          >
            <v-card-text class="pa-6">
              <div class="d-flex justify-space-between align-center">
                <div class="text-h6 font-weight-bold">{{ tile.title }}</div>
                <v-btn icon variant="text" class="landing-tile__btn">
                  <v-icon :icon="tile.icon" />
                </v-btn>
              </div>
              <div class="text-body-2 mt-2">{{ tile.description }}</div>
            </v-card-text>
          </v-card>
        </div>
      </v-container>
    </section>

    <section class="landing-courses" v-if="featuredCourses.length">
      <v-container class="py-10 py-md-14">
        <div class="landing-courses-layout">
          <div class="landing-courses-left">
            <div
              class="d-flex align-center justify-space-between flex-wrap ga-4 mb-6"
            >
              <div>
                <div class="text-overline text-primary">Courses</div>
                <h2 class="text-h4 font-weight-bold">Popularne kursy</h2>
              </div>
              <div class="landing-courses-right d-none d-md-flex">
                <v-btn color="primary" variant="flat" rounded="lg" to="/courses"
                  >Zobacz wszystkie</v-btn
                >
              </div>
            </div>

            <v-row wrap class="ga-6">
              <v-col
                v-for="course in featuredCourses"
                :key="course.id"
                cols="12"
                md="4"
              >
                <v-card class="landing-course h-100" rounded="xl" elevation="0">
                  <v-card-text class="pa-6 d-flex flex-column h-100">
                    <div>
                      <div class="text-h6 font-weight-bold">
                        {{ course.title }}
                      </div>

                      <div class="text-body-2 text-medium-emphasis mt-1">
                        {{ course.category?.title ?? "Bez kategorii" }}
                      </div>
                    </div>

                    <div
                      class="d-flex align-center justify-space-between mt-auto"
                    >
                      <div class="text-h6">
                        {{ formatMoney(course.priceCents, course.currency) }}
                      </div>

                      <v-btn
                        color="primary"
                        variant="flat"
                        rounded="lg"
                        :disabled="cart.courseIds.value.includes(course.id)"
                        @click="addToCart(course.id)"
                      >
                        {{
                          cart.courseIds.value.includes(course.id)
                            ? "W koszyku"
                            : "Dodaj"
                        }}
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </div>
      </v-container>
    </section>

    <section class="landing-banner" v-if="content.banners?.length">
      <v-container class="py-4 py-md-10">
        <v-card
          class="landing-banner__card"
          rounded="xl"
          elevation="0"
          :to="content.banners[0].href"
        >
          <v-row class="ma-0">
            <v-col cols="12" md="7" class="pa-8">
              <div class="text-overline text-primary">New</div>
              <div class="text-h4 font-weight-bold mt-1">
                {{ content.banners[0].title }}
              </div>
              <div
                v-if="content.banners[0].subtitle"
                class="text-body-1 text-medium-emphasis mt-3"
              >
                {{ content.banners[0].subtitle }}
              </div>
              <v-btn color="primary" variant="flat" rounded="lg" class="mt-6"
                >Sprawdź</v-btn
              >
            </v-col>
            <v-col cols="12" md="5" class="pa-0">
              <v-img
                :src="content.banners[0].imageUrl"
                cover
                height="100%"
                class="landing-banner__img"
              />
            </v-col>
          </v-row>
        </v-card>
      </v-container>
    </section>

    <section class="landing-footer">
      <v-container class="py-10">
        <div class="d-flex flex-wrap justify-space-between align-center ga-4">
          <div class="text-body-2 text-medium-emphasis">
            © {{ year }} E‑Learning
          </div>
          <div class="d-flex ga-4">
            <NuxtLink class="landing-footer__link" to="/about-us"
              >O nas</NuxtLink
            >
            <NuxtLink class="landing-footer__link" to="/courses"
              >Kursy</NuxtLink
            >
            <NuxtLink class="landing-footer__link" to="/contact-us"
              >Kontakt</NuxtLink
            >
          </div>
        </div>
      </v-container>
    </section>
  </div>
</template>

<style scoped>
.landing-title {
  font-size: clamp(2.3rem, 4vw, 3.6rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0;
}

.landing-title__top {
  display: block;
  color: rgba(17, 24, 39, 0.92);
}

.landing-title__bottom {
  display: block;
  color: rgba(17, 24, 39, 0.92);
}

.landing-subtitle {
  max-width: 36rem;
  color: rgba(17, 24, 39, 0.72);
}

<<<<<<< ours
.landing-hero-grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.landing-hero-right {
  display: flex;
  justify-content: center;
}

=======
>>>>>>> theirs
.landing-stat {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(17, 24, 39, 0.06);
  border-radius: 16px;
  padding: 12px 14px;
  min-width: 130px;
}

.landing-stat__value {
  font-weight: 800;
  font-size: 1.05rem;
  color: rgba(17, 24, 39, 0.92);
}

.landing-stat__label {
  font-size: 0.8rem;
  color: rgba(17, 24, 39, 0.62);
}

.landing-media {
  position: relative;
  max-width: 520px;
  margin-left: auto;
}

.landing-features-grid,
.landing-tiles-grid {
  display: grid;
  gap: 24px;
}

.landing-courses-layout {
  display: grid;
  gap: 28px;
}

.landing-courses-right {
  align-items: center;
  justify-content: center;
}

.landing-media__img {
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.06);
  box-shadow:
    0 22px 70px rgba(17, 24, 39, 0.16),
    0 3px 14px rgba(17, 24, 39, 0.08);
}

.landing-float {
  position: absolute;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(17, 24, 39, 0.06);
  border-radius: 18px;
  padding: 14px 16px;
  width: 220px;
  box-shadow: 0 14px 45px rgba(17, 24, 39, 0.12);
}

.landing-float--top {
  top: 12%;
  left: -10%;
}

.landing-float--bottom {
  bottom: 10%;
  right: -6%;
}

.landing-float__kpi {
  font-weight: 900;
  font-size: 1.15rem;
  color: rgb(var(--v-theme-primary));
}

.landing-float__row {
  display: flex;
  gap: 14px;
}

.landing-float__text {
  margin-top: 6px;
  font-size: 0.82rem;
  color: rgba(17, 24, 39, 0.62);
}

.landing-card {
  border: 1px solid rgba(17, 24, 39, 0.06);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 60px rgba(17, 24, 39, 0.08);
}

.landing-card__icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(255, 106, 61, 0.12);
  color: rgb(var(--v-theme-primary));
}

.landing-tile {
  border: 1px solid rgba(17, 24, 39, 0.06);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
  cursor: pointer;
}

.landing-tile:hover {
  transform: translateY(-3px);
  box-shadow: 0 22px 80px rgba(17, 24, 39, 0.12);
}

.landing-tile--light {
  background: rgba(255, 255, 255, 0.86);
}

.landing-tile--accent {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.landing-tile--accent :deep(.v-btn) {
  color: rgb(var(--v-theme-on-primary));
}

.landing-tile__btn {
  opacity: 0.9;
}

.landing-course {
  border: 1px solid rgba(17, 24, 39, 0.06);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 22px 80px rgba(17, 24, 39, 0.09);
}

.landing-banner__card {
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.06);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 28px 90px rgba(17, 24, 39, 0.1);
}

.landing-banner__img {
  min-height: 220px;
}

.landing-footer__link {
  color: rgba(17, 24, 39, 0.72);
  text-decoration: none;
}

.landing-footer__link:hover {
  color: rgba(17, 24, 39, 0.92);
}

@media (min-width: 960px) {
  .landing-features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  /* PC: верхний слой 2 элемента (1+1), 2-я карточка справа, 3-я снизу слева */
  .landing-features-grid > :nth-child(2) {
    grid-row: span 2;
  }

  .landing-tiles-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  /* PC: акцентная плитка справа на 2 строки */
  .landing-tiles-grid > :nth-child(2) {
    grid-row: span 2;
  }

  .landing-courses-layout {
    grid-template-columns: 2fr 240px;
    align-items: start;

  }
}

@media (min-width: 700px) {
  .landing-hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
    gap: 48px;
  }

  .landing-hero-left {
    max-width: 560px;
  }

  .landing-hero-right {
    justify-content: flex-end;
    padding-top: 4px;
  }

  .landing-media {
    margin-left: 0;
  }
}

@media (max-width: 960px) {
  .landing-float {
    display: none;
  }
}
</style>
