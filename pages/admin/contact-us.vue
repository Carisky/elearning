<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { reactive, ref, watch } from 'vue'
import AdminShell from '~/components/admin-shell.vue'

type Notification = { type: 'success' | 'error'; message: string }

type ContactCard = { icon: string; title: string; lines: string[] }
type ContactFaqItem = { q: string; a: string }

type ContactUsPageContent = {
  seo: { title: string; description: string }
  hero: { eyebrow: string; title: string; subtitle: string; imageUrl: string; imageAlt?: string }
  cards: ContactCard[]
  form: { title: string; subtitle?: string; recipientEmail: string; subjectPrefix?: string }
  faq: { title: string; items: ContactFaqItem[] }
}

type SitePageResponse = { slug: string; content: ContactUsPageContent | null }

const createDefault = (): ContactUsPageContent => ({
  seo: {
    title: 'Contact — E‑Learning',
    description: 'Get in touch: support, partnerships, and general questions.',
  },
  hero: {
    eyebrow: 'Contact',
    title: 'Let’s talk',
    subtitle:
      'Send a message, ask a question, or propose a partnership. We usually respond within 1–2 business days.',
    imageUrl: '/placeholders/contact-hero.svg',
    imageAlt: 'Abstract contact illustration',
  },
  cards: [
    { icon: 'mdi-email-outline', title: 'Email', lines: ['hello@example.com', 'support@example.com'] },
    { icon: 'mdi-phone-outline', title: 'Phone', lines: ['+48 000 000 000', 'Mon–Fri, 10:00–18:00'] },
    { icon: 'mdi-map-marker-outline', title: 'Office', lines: ['Warsaw, PL', 'Business Center — Floor 4'] },
  ],
  form: {
    title: 'Send us a message',
    subtitle: 'We’ll get back to you as soon as we can.',
    recipientEmail: 'hello@example.com',
    subjectPrefix: '[E‑Learning] ',
  },
  faq: {
    title: 'Quick answers',
    items: [
      { q: 'Is this page editable?', a: 'Yes — update it in Admin → Kontakt.' },
      { q: 'Do you offer demos?', a: 'Yes — send a message and we will schedule a call.' },
      { q: 'Support hours?', a: 'Mon–Fri, 10:00–18:00 (CET).' },
    ],
  },
})

const notification = ref<Notification | null>(null)
let notificationTimeout: ReturnType<typeof setTimeout> | null = null
const pushNotification = (payload: Notification) => {
  notification.value = payload
  if (notificationTimeout) clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => (notification.value = null), 4000)
}

const form = reactive<ContactUsPageContent>(createDefault())
const saving = ref(false)

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: pageData, pending, refresh } = useFetch<SitePageResponse>('/api/site-pages/contact-us' as any, {
  default: () => ({ slug: 'contact-us', content: null }),
})

watch(
  pageData,
  (value) => {
    const content = value?.content ?? null
    const next = content ? content : createDefault()
    Object.assign(form, next)
    if (!form.cards) form.cards = []
    if (!form.faq) form.faq = { title: 'FAQ', items: [] }
    if (!form.faq.items) form.faq.items = []
  },
  { immediate: true },
)

const addCard = () => form.cards.push({ icon: 'mdi-star-outline', title: '', lines: [''] })
const removeCard = (index: number) => form.cards.splice(index, 1)
const addLine = (cardIndex: number) => form.cards[cardIndex]?.lines?.push('') ?? null
const removeLine = (cardIndex: number, lineIndex: number) => form.cards[cardIndex]?.lines?.splice(lineIndex, 1)

const addFaq = () => form.faq.items.push({ q: '', a: '' })
const removeFaq = (index: number) => form.faq.items.splice(index, 1)

const save = async () => {
  saving.value = true
  notification.value = null
  try {
    await $fetch('/api/site-pages/contact-us', { method: 'POST', body: { content: form } })
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
            <h1 class="text-h5 font-weight-bold mb-1">Kontakt</h1>
            <div class="text-body-2 text-medium-emphasis">Edycja treści strony /contact-us</div>
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
                <span>Cards</span>
                <v-btn variant="text" @click="addCard">Dodaj</v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text>
                <v-card v-for="(card, idx) in form.cards" :key="`card-${idx}`" class="mb-4" variant="tonal">
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span>Card #{{ idx + 1 }}</span>
                    <v-btn icon variant="text" @click="removeCard(idx)">
                      <v-icon>mdi-delete-outline</v-icon>
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                    <v-row class="ga-4">
                      <v-col cols="12" md="4">
                        <v-text-field v-model="card.icon" label="Icon (mdi-*)" />
                      </v-col>
                      <v-col cols="12" md="8">
                        <v-text-field v-model="card.title" label="Title" />
                      </v-col>
                      <v-col cols="12">
                        <div class="d-flex align-center justify-space-between mb-2">
                          <div class="text-subtitle-2">Lines</div>
                          <v-btn variant="text" size="small" @click="addLine(idx)">Dodaj</v-btn>
                        </div>
                        <v-row v-for="(line, lineIdx) in card.lines" :key="`line-${idx}-${lineIdx}`" class="mb-2">
                          <v-col cols="12" md="11">
                            <v-text-field v-model="card.lines[lineIdx]" label="Line" />
                          </v-col>
                          <v-col cols="12" md="1" class="d-flex align-center justify-end">
                            <v-btn icon variant="text" @click="removeLine(idx, lineIdx)">
                              <v-icon>mdi-close</v-icon>
                            </v-btn>
                          </v-col>
                        </v-row>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-card-text>
            </v-card>

            <v-card class="mb-6">
              <v-card-title>Form</v-card-title>
              <v-divider />
              <v-card-text>
                <v-text-field v-model="form.form.title" label="Title" class="mb-3" />
                <v-text-field v-model="form.form.subtitle" label="Subtitle" class="mb-3" />
                <v-text-field v-model="form.form.recipientEmail" label="Recipient email" class="mb-3" />
                <v-text-field v-model="form.form.subjectPrefix" label="Subject prefix" />
              </v-card-text>
            </v-card>

            <v-card>
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
          </v-col>

          <v-col cols="12" lg="4">
            <v-card class="mb-4">
              <v-card-title>Podgląd obrazka</v-card-title>
              <v-divider />
              <v-card-text>
                <v-img :src="form.hero.imageUrl" aspect-ratio="1.2" cover rounded />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </AdminShell>
</template>

