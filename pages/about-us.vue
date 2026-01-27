<script setup lang="ts">
import { computed } from 'vue'
import RichTextViewer from '~/components/rich-text-viewer.vue'

type LinkCta = { label: string; href: string }
type DeltaPojo = { ops: any[] }

type AboutSection = {
  title: string
  body: DeltaPojo | null
  align?: 'left' | 'right'
}

type AboutValue = { icon: string; title: string; description: string }
type TeamMember = { name: string; role: string; bio?: string; avatarUrl?: string }
type AboutFaqItem = { q: string; a: string }

type AboutUsPageContent = {
  seo: { title: string; description: string }
  hero: { eyebrow: string; title: string; subtitle: string; imageUrl: string; imageAlt?: string }
  stats: Array<{ value: string; label: string }>
  sections: AboutSection[]
  values: AboutValue[]
  team: { title: string; subtitle?: string; members: TeamMember[] }
  faq: { title: string; items: AboutFaqItem[] }
  cta: { title: string; subtitle: string; primaryCta: LinkCta; secondaryCta?: LinkCta }
}

type SitePageResponse = { slug: string; content: AboutUsPageContent | null }

const createFallback = (): AboutUsPageContent => ({
  seo: {
    title: 'About us — E‑Learning',
    description: 'Who we are, what we build, and how we help learners grow.',
  },
  hero: {
    eyebrow: 'About the platform',
    title: 'We help teams learn faster',
    subtitle:
      'A modern learning platform for courses, assessments, progress tracking and monetization — built to be simple for creators and delightful for students.',
    imageUrl: '/placeholders/about-hero.svg',
    imageAlt: 'Abstract team illustration',
  },
  stats: [
    { value: '4.9/5', label: 'Average rating' },
    { value: '24/7', label: 'Self‑paced learning' },
    { value: '100%', label: 'Progress visibility' },
  ],
  sections: [
    {
      title: 'Our mission',
      body: {
        ops: [
          {
            insert:
              'Make learning practical, measurable and accessible.\n\nWe believe knowledge sticks when it is structured into short lessons, reinforced with quizzes, and supported by clear progress.\n',
          },
        ],
      },
      align: 'left',
    },
    {
      title: 'What we value',
      body: {
        ops: [
          {
            insert:
              'Clarity over complexity.\nQuality over quantity.\nIteration over perfection.\n\nWe ship improvements continuously and keep the platform easy to use.\n',
          },
        ],
      },
      align: 'right',
    },
  ],
  values: [
    {
      icon: 'mdi-compass-outline',
      title: 'Clear learning paths',
      description: 'Courses are structured, progress is visible, and next steps are obvious.',
    },
    {
      icon: 'mdi-check-decagram-outline',
      title: 'Built‑in assessment',
      description: 'Quizzes and exams make learning measurable and actionable.',
    },
    {
      icon: 'mdi-speedometer',
      title: 'Fast and focused',
      description: 'Short lessons, quick feedback, and a clean interface keep learners engaged.',
    },
  ],
  team: {
    title: 'Small team, big focus',
    subtitle: 'We are builders who care about learning outcomes.',
    members: [
      { name: 'Alex', role: 'Product', bio: 'Turns ideas into simple flows and sharp UX.' },
      { name: 'Sam', role: 'Engineering', bio: 'Builds reliable systems and fast pages.' },
      { name: 'Taylor', role: 'Content', bio: 'Crafts lessons that are clear, useful, and testable.' },
    ],
  },
  faq: {
    title: 'FAQ',
    items: [
      { q: 'Can I edit this page from the admin panel?', a: 'Yes — this page content is editable in Admin → About us.' },
      { q: 'Do you support rich text?', a: 'Yes — the long sections use a rich text editor.' },
      { q: 'Where is this stored?', a: 'In the database as a SitePage record with slug "about-us".' },
    ],
  },
  cta: {
    title: 'Ready to learn?',
    subtitle: 'Explore courses and start your journey today.',
    primaryCta: { label: 'Browse courses', href: '/courses' },
    secondaryCta: { label: 'Contact us', href: '/contact-us' },
  },
})

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: page } = await useFetch<SitePageResponse>('/api/site-pages/about-us' as any, {
  default: () => ({ slug: 'about-us', content: null }),
})

const content = computed(() => page.value?.content ?? createFallback())

useSeoMeta({
  title: computed(() => content.value.seo.title),
  description: computed(() => content.value.seo.description),
})
</script>

<template>
  <div class="about">
    <section class="about-hero">
      <v-container class="py-10 py-md-16">
        <v-row align="center">
          <v-col cols="12" md="6">
            <v-chip color="primary" variant="tonal" class="mb-4">
              {{ content.hero.eyebrow }}
            </v-chip>
            <h1 class="about-title">{{ content.hero.title }}</h1>
            <p class="about-subtitle mt-4">{{ content.hero.subtitle }}</p>

            <div class="d-flex flex-wrap ga-3 mt-6">
              <v-btn color="primary" :to="content.cta.primaryCta.href">
                {{ content.cta.primaryCta.label }}
              </v-btn>
              <v-btn v-if="content.cta.secondaryCta" variant="tonal" :to="content.cta.secondaryCta.href">
                {{ content.cta.secondaryCta.label }}
              </v-btn>
            </div>

            <div class="about-stats mt-8">
              <div v-for="(item, idx) in content.stats" :key="`stat-${idx}`" class="about-stat">
                <div class="about-stat__value">{{ item.value }}</div>
                <div class="about-stat__label">{{ item.label }}</div>
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="about-media">
              <div class="about-media__frame">
                <v-img :src="content.hero.imageUrl" :alt="content.hero.imageAlt" aspect-ratio="1.1" cover />
              </div>
              <div class="about-media__glow about-media__glow--one" />
              <div class="about-media__glow about-media__glow--two" />
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="py-10 py-md-14">
      <v-container>
        <v-row>
          <v-col v-for="(section, idx) in content.sections" :key="`section-${idx}`" cols="12" md="6">
            <v-card class="about-card" rounded="xl" variant="flat">
              <v-card-title class="text-h6">{{ section.title }}</v-card-title>
              <v-divider />
              <v-card-text>
                <RichTextViewer :model-value="section.body" />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="about-values py-10 py-md-14">
      <v-container>
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-6">
          <h2 class="text-h5">Why people choose us</h2>
          <v-chip variant="tonal" color="primary" prepend-icon="mdi-sparkles">Made for creators</v-chip>
        </div>

        <v-row>
          <v-col v-for="(item, idx) in content.values" :key="`value-${idx}`" cols="12" md="4">
            <v-card class="about-card" rounded="xl" variant="flat">
              <v-card-text>
                <div class="about-value__icon mb-4">
                  <v-icon size="24">{{ item.icon }}</v-icon>
                </div>
                <div class="text-h6 mb-2">{{ item.title }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ item.description }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="py-10 py-md-14">
      <v-container>
        <div class="mb-6">
          <h2 class="text-h5">{{ content.team.title }}</h2>
          <div v-if="content.team.subtitle" class="text-body-2 text-medium-emphasis mt-1">
            {{ content.team.subtitle }}
          </div>
        </div>

        <v-row>
          <v-col v-for="(member, idx) in content.team.members" :key="`member-${idx}`" cols="12" md="4">
            <v-card class="about-card" rounded="xl" variant="flat">
              <v-card-text>
                <div class="d-flex align-center ga-4">
                  <v-avatar size="44" color="primary" variant="tonal">
                    <v-img v-if="member.avatarUrl" :src="member.avatarUrl" cover />
                    <span v-else class="font-weight-bold">{{ member.name.slice(0, 1).toUpperCase() }}</span>
                  </v-avatar>
                  <div class="min-w-0">
                    <div class="text-subtitle-1 font-weight-bold text-truncate">{{ member.name }}</div>
                    <div class="text-body-2 text-medium-emphasis text-truncate">{{ member.role }}</div>
                  </div>
                </div>

                <div v-if="member.bio" class="text-body-2 text-medium-emphasis mt-4">
                  {{ member.bio }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="py-10 py-md-14">
      <v-container>
        <div class="mb-6">
          <h2 class="text-h5">{{ content.faq.title }}</h2>
        </div>

        <v-expansion-panels variant="accordion" class="about-faq">
          <v-expansion-panel v-for="(item, idx) in content.faq.items" :key="`faq-${idx}`">
            <v-expansion-panel-title>{{ item.q }}</v-expansion-panel-title>
            <v-expansion-panel-text>{{ item.a }}</v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-container>
    </section>

    <section class="py-10 py-md-14">
      <v-container>
        <v-card class="about-cta" rounded="xl" variant="flat">
          <v-card-text class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between ga-6">
            <div>
              <div class="text-h5 font-weight-bold">{{ content.cta.title }}</div>
              <div class="text-body-2 mt-2 about-cta__subtitle">{{ content.cta.subtitle }}</div>
            </div>

            <div class="d-flex flex-wrap ga-3">
              <v-btn color="primary" :to="content.cta.primaryCta.href">
                {{ content.cta.primaryCta.label }}
              </v-btn>
              <v-btn v-if="content.cta.secondaryCta" variant="tonal" :to="content.cta.secondaryCta.href">
                {{ content.cta.secondaryCta.label }}
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-container>
    </section>
  </div>
</template>

<style scoped>
.about-hero {
  background:
    radial-gradient(900px circle at 20% 0%, rgba(255, 106, 61, 0.18), transparent 62%),
    radial-gradient(900px circle at 100% 20%, rgba(37, 99, 235, 0.12), transparent 58%);
}

.about-title {
  font-size: clamp(2.2rem, 3.8vw, 3.4rem);
  line-height: 1.07;
  letter-spacing: -0.03em;
  margin: 0;
  color: rgba(17, 24, 39, 0.94);
}

.about-subtitle {
  max-width: 42rem;
  color: rgba(17, 24, 39, 0.72);
  line-height: 1.7;
}

.about-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.about-stat {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(17, 24, 39, 0.06);
  border-radius: 16px;
  padding: 12px 14px;
}

.about-stat__value {
  font-weight: 900;
  color: rgba(17, 24, 39, 0.92);
}

.about-stat__label {
  font-size: 0.82rem;
  color: rgba(17, 24, 39, 0.62);
}

.about-media {
  position: relative;
  max-width: 540px;
  margin-left: auto;
}

.about-media__frame {
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.06);
  box-shadow:
    0 22px 70px rgba(17, 24, 39, 0.16),
    0 3px 14px rgba(17, 24, 39, 0.08);
  background: rgba(255, 255, 255, 0.7);
}

.about-media__glow {
  position: absolute;
  filter: blur(42px);
  opacity: 0.6;
  pointer-events: none;
  border-radius: 999px;
}

.about-media__glow--one {
  width: 230px;
  height: 230px;
  background: rgba(255, 106, 61, 0.35);
  top: -10%;
  left: -12%;
}

.about-media__glow--two {
  width: 280px;
  height: 280px;
  background: rgba(37, 99, 235, 0.25);
  bottom: -12%;
  right: -10%;
}

.about-card {
  border: 1px solid rgba(17, 24, 39, 0.06);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 22px 80px rgba(17, 24, 39, 0.08);
}

.about-values {
  background: rgba(17, 24, 39, 0.02);
}

.about-value__icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(255, 106, 61, 0.12);
  color: rgb(var(--v-theme-primary));
}

.about-faq :deep(.v-expansion-panel) {
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 14px;
  overflow: hidden;
}

.about-faq :deep(.v-expansion-panel:not(:last-child)) {
  margin-bottom: 10px;
}

.about-cta {
  background:
    radial-gradient(500px circle at 20% 0%, rgba(255, 106, 61, 0.2), transparent 60%),
    radial-gradient(600px circle at 100% 30%, rgba(37, 99, 235, 0.14), transparent 55%),
    rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(17, 24, 39, 0.06);
  box-shadow: 0 26px 90px rgba(17, 24, 39, 0.1);
}

.about-cta__subtitle {
  color: rgba(17, 24, 39, 0.7);
  max-width: 40rem;
}

.min-w-0 {
  min-width: 0;
}

@media (max-width: 700px) {
  .about-stats {
    grid-template-columns: 1fr;
  }
}
</style>
