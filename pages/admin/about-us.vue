<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { reactive, ref, watch } from 'vue'
import AdminShell from '~/components/admin-shell.vue'
import RichTextEditor from '~/components/rich-text-editor.vue'

type Notification = { type: 'success' | 'error'; message: string }
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

const createDefault = (): AboutUsPageContent => ({
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

const notification = ref<Notification | null>(null)
let notificationTimeout: ReturnType<typeof setTimeout> | null = null
const pushNotification = (payload: Notification) => {
  notification.value = payload
  if (notificationTimeout) clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => (notification.value = null), 4000)
}

const form = reactive<AboutUsPageContent>(createDefault())
const saving = ref(false)

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: pageData, pending, refresh } = useFetch<SitePageResponse>('/api/site-pages/about-us' as any, {
  default: () => ({ slug: 'about-us', content: null }),
})

watch(
  pageData,
  (value) => {
    const content = value?.content ?? null
    const next = content ? content : createDefault()
    Object.assign(form, next)

    if (!form.cta.secondaryCta) {
      form.cta.secondaryCta = { label: '', href: '' }
    }
  },
  { immediate: true },
)

const addStat = () => form.stats.push({ value: '', label: '' })
const removeStat = (index: number) => form.stats.splice(index, 1)

const addSection = () => form.sections.push({ title: 'New section', body: { ops: [{ insert: 'Write here...\n' }] }, align: 'left' })
const removeSection = (index: number) => form.sections.splice(index, 1)

const addValue = () => form.values.push({ icon: 'mdi-star-outline', title: '', description: '' })
const removeValue = (index: number) => form.values.splice(index, 1)

const addMember = () => form.team.members.push({ name: '', role: '', bio: '' })
const removeMember = (index: number) => form.team.members.splice(index, 1)

const addFaq = () => form.faq.items.push({ q: '', a: '' })
const removeFaq = (index: number) => form.faq.items.splice(index, 1)

const save = async () => {
  saving.value = true
  notification.value = null
  try {
    await $fetch('/api/site-pages/about-us', { method: 'POST', body: { content: form } })
    await refresh()
    pushNotification({ type: 'success', message: 'Zapisano.' })
  } catch (e: any) {
    pushNotification({ type: 'error', message: e?.data?.message ?? e?.message ?? 'Nie udało się zapisać' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AdminShell>
    <section class="py-8">
      <v-container>
        <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
          <div>
            <h1 class="text-h5 font-weight-bold mb-1">About us</h1>
            <div class="text-body-2 text-medium-emphasis">Edycja treści strony /about-us</div>
          </div>
          <div class="d-flex ga-3">
            <v-btn variant="tonal" :loading="pending" prepend-icon="mdi-refresh" @click="refresh">Odśwież</v-btn>
            <v-btn color="primary" :loading="saving" prepend-icon="mdi-content-save" @click="save">Zapisz</v-btn>
          </div>
        </div>

        <v-alert
          v-if="notification"
          class="mb-6"
          variant="tonal"
          :type="notification.type === 'error' ? 'error' : 'success'"
        >
          {{ notification.message }}
        </v-alert>

        <v-row class="ga-6">
          <v-col cols="12" lg="8">
            <v-card class="mb-6">
              <v-card-title>SEO</v-card-title>
              <v-divider />
              <v-card-text>
                <v-text-field v-model="form.seo.title" label="Title" class="mb-3" />
                <v-textarea v-model="form.seo.description" label="Description" rows="2" auto-grow />
              </v-card-text>
            </v-card>

            <v-card class="mb-6">
              <v-card-title>Hero</v-card-title>
              <v-divider />
              <v-card-text>
                <v-row class="ga-4">
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.hero.eyebrow" label="Eyebrow" class="mb-3" />
                    <v-text-field v-model="form.hero.title" label="Title" class="mb-3" />
                    <v-textarea v-model="form.hero.subtitle" label="Subtitle" rows="3" auto-grow />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.hero.imageUrl" label="Image URL" class="mb-3" />
                    <v-text-field v-model="form.hero.imageAlt" label="Image alt" />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="mb-6">
              <v-card-title class="d-flex align-center justify-space-between">
                <span>Stats</span>
                <v-btn variant="text" @click="addStat">Dodaj</v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text>
                <v-row v-for="(item, idx) in form.stats" :key="`stat-${idx}`" class="mb-2">
                  <v-col cols="12" md="4">
                    <v-text-field v-model="item.value" label="Value" />
                  </v-col>
                  <v-col cols="12" md="7">
                    <v-text-field v-model="item.label" label="Label" />
                  </v-col>
                  <v-col cols="12" md="1" class="d-flex align-center justify-end">
                    <v-btn icon variant="text" @click="removeStat(idx)">
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="mb-6">
              <v-card-title class="d-flex align-center justify-space-between">
                <span>Sections</span>
                <v-btn variant="text" @click="addSection">Dodaj</v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text>
                <v-card
                  v-for="(section, idx) in form.sections"
                  :key="`section-${idx}`"
                  class="mb-4"
                  variant="tonal"
                >
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span>Section #{{ idx + 1 }}</span>
                    <v-btn icon variant="text" @click="removeSection(idx)">
                      <v-icon>mdi-delete-outline</v-icon>
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                    <v-row class="ga-4">
                      <v-col cols="12" md="8">
                        <v-text-field v-model="section.title" label="Title" class="mb-3" />
                        <RichTextEditor v-model="section.body" label="Body" />
                      </v-col>
                      <v-col cols="12" md="4">
                        <v-select v-model="section.align" :items="['left', 'right']" label="Align" />
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-card-text>
            </v-card>

            <v-card class="mb-6">
              <v-card-title class="d-flex align-center justify-space-between">
                <span>Values</span>
                <v-btn variant="text" @click="addValue">Dodaj</v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text>
                <v-row v-for="(item, idx) in form.values" :key="`value-${idx}`" class="mb-2">
                  <v-col cols="12" md="3">
                    <v-text-field v-model="item.icon" label="Icon (mdi-*)" />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field v-model="item.title" label="Title" />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field v-model="item.description" label="Description" />
                  </v-col>
                  <v-col cols="12" md="1" class="d-flex align-center justify-end">
                    <v-btn icon variant="text" @click="removeValue(idx)">
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="mb-6">
              <v-card-title>Team</v-card-title>
              <v-divider />
              <v-card-text>
                <v-text-field v-model="form.team.title" label="Title" class="mb-3" />
                <v-text-field v-model="form.team.subtitle" label="Subtitle" class="mb-6" />

                <div class="d-flex align-center justify-space-between mb-3">
                  <div class="text-subtitle-2">Members</div>
                  <v-btn variant="text" @click="addMember">Dodaj</v-btn>
                </div>
                <v-row v-for="(member, idx) in form.team.members" :key="`member-${idx}`" class="mb-2">
                  <v-col cols="12" md="3">
                    <v-text-field v-model="member.name" label="Name" />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field v-model="member.role" label="Role" />
                  </v-col>
                  <v-col cols="12" md="5">
                    <v-text-field v-model="member.bio" label="Bio" />
                  </v-col>
                  <v-col cols="12" md="1" class="d-flex align-center justify-end">
                    <v-btn icon variant="text" @click="removeMember(idx)">
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="mb-6">
              <v-card-title class="d-flex align-center justify-space-between">
                <span>FAQ</span>
                <v-btn variant="text" @click="addFaq">Dodaj</v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text>
                <v-card v-for="(item, idx) in form.faq.items" :key="`faq-${idx}`" class="mb-3" variant="tonal">
                  <v-card-text>
                    <v-row class="ga-4">
                      <v-col cols="12" md="5">
                        <v-text-field v-model="item.q" label="Question" />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field v-model="item.a" label="Answer" />
                      </v-col>
                      <v-col cols="12" md="1" class="d-flex align-center justify-end">
                        <v-btn icon variant="text" @click="removeFaq(idx)">
                          <v-icon>mdi-delete-outline</v-icon>
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-card-text>
            </v-card>

            <v-card>
              <v-card-title>CTA</v-card-title>
              <v-divider />
              <v-card-text>
                <v-text-field v-model="form.cta.title" label="Title" class="mb-3" />
                <v-textarea v-model="form.cta.subtitle" label="Subtitle" rows="2" auto-grow class="mb-4" />

                <v-row class="ga-4">
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.cta.primaryCta.label" label="Primary label" class="mb-3" />
                    <v-text-field v-model="form.cta.primaryCta.href" label="Primary href" />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.cta.secondaryCta.label" label="Secondary label" class="mb-3" />
                    <v-text-field v-model="form.cta.secondaryCta.href" label="Secondary href" />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="4">
            <v-card class="mb-4">
              <v-card-title>Podgląd obrazka</v-card-title>
              <v-divider />
              <v-card-text>
                <v-img :src="form.hero.imageUrl" aspect-ratio="1.2" cover rounded />
              </v-card-text>
            </v-card>

            <v-card variant="tonal">
              <v-card-title>Wskazówki</v-card-title>
              <v-divider />
              <v-card-text class="text-body-2 text-medium-emphasis">
                Tekst w sekcjach jest w RichText (Quill). Reszta to zwykłe pola tekstowe.
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </AdminShell>
</template>
