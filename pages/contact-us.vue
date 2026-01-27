<script setup lang="ts">
import { computed, ref } from 'vue'

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

const createFallback = (): ContactUsPageContent => ({
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

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: page } = await useFetch<SitePageResponse>('/api/site-pages/contact-us' as any, {
  default: () => ({ slug: 'contact-us', content: null }),
})

const content = computed(() => page.value?.content ?? createFallback())

useSeoMeta({
  title: computed(() => content.value.seo.title),
  description: computed(() => content.value.seo.description),
})

const form = ref({ name: '', email: '', subject: '', message: '' })

const mailtoHref = computed(() => {
  const to = content.value.form.recipientEmail || 'hello@example.com'
  const prefix = content.value.form.subjectPrefix ?? ''
  const subject = `${prefix}${form.value.subject || 'Message'}`
  const body = [
    `Name: ${form.value.name}`,
    `Email: ${form.value.email}`,
    '',
    form.value.message,
  ].join('\n')

  const params = new URLSearchParams()
  params.set('subject', subject)
  params.set('body', body)
  return `mailto:${encodeURIComponent(to)}?${params.toString()}`
})

const copied = ref(false)
const copyEmail = async () => {
  copied.value = false
  const to = content.value.form.recipientEmail || 'hello@example.com'
  try {
    await navigator.clipboard.writeText(to)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // ignore
  }
}
</script>

<template>
  <div class="contact">
    <section class="contact-hero">
      <v-container class="py-10 py-md-16">
        <v-row align="center">
          <v-col cols="12" md="6">
            <v-chip color="primary" variant="tonal" class="mb-4">
              {{ content.hero.eyebrow }}
            </v-chip>
            <h1 class="contact-title">{{ content.hero.title }}</h1>
            <p class="contact-subtitle mt-4">{{ content.hero.subtitle }}</p>

            <div class="d-flex flex-wrap ga-3 mt-6">
              <v-btn color="primary" :href="mailtoHref">Napisz email</v-btn>
              <v-btn variant="tonal" prepend-icon="mdi-content-copy" @click="copyEmail">
                {{ copied ? 'Skopiowano' : 'Kopiuj email' }}
              </v-btn>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="contact-media">
              <div class="contact-media__frame">
                <v-img :src="content.hero.imageUrl" :alt="content.hero.imageAlt" aspect-ratio="1.2" cover />
              </div>
              <div class="contact-media__glow contact-media__glow--one" />
              <div class="contact-media__glow contact-media__glow--two" />
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="py-10 py-md-14">
      <v-container>
        <v-row>
          <v-col v-for="(card, idx) in content.cards" :key="`card-${idx}`" cols="12" md="4">
            <v-card class="contact-card" rounded="xl" variant="flat">
              <v-card-text>
                <div class="contact-card__icon mb-4">
                  <v-icon size="24">{{ card.icon }}</v-icon>
                </div>
                <div class="text-h6 mb-2">{{ card.title }}</div>
                <div v-for="(line, i) in card.lines" :key="`line-${idx}-${i}`" class="text-body-2 text-medium-emphasis">
                  {{ line }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="py-10 py-md-14 contact-form">
      <v-container>
        <v-row>
          <v-col cols="12" md="6">
            <h2 class="text-h5 font-weight-bold">{{ content.form.title }}</h2>
            <div v-if="content.form.subtitle" class="text-body-2 text-medium-emphasis mt-2">
              {{ content.form.subtitle }}
            </div>

            <v-card class="contact-form__card mt-6" rounded="xl" variant="flat">
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.name" label="Imię" />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.email" label="Email" type="email" />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field v-model="form.subject" label="Temat" />
                  </v-col>
                  <v-col cols="12">
                    <v-textarea v-model="form.message" label="Wiadomość" rows="6" auto-grow />
                  </v-col>
                </v-row>

                <div class="d-flex flex-wrap ga-3 mt-2">
                  <v-btn color="primary" :href="mailtoHref" prepend-icon="mdi-send">
                    Wyślij (mail)
                  </v-btn>
                  <v-btn variant="tonal" prepend-icon="mdi-email-outline" :href="`mailto:${content.form.recipientEmail}`">
                    Otwórz pocztę
                  </v-btn>
                </div>

                <div class="text-caption text-medium-emphasis mt-4">
                  Formularz otwiera Twojego klienta poczty (mailto). Możesz też podpiąć wysyłkę przez API w przyszłości.
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card class="contact-faq__card" rounded="xl" variant="flat">
              <v-card-title class="text-h6">{{ content.faq.title }}</v-card-title>
              <v-divider />
              <v-card-text>
                <v-expansion-panels variant="accordion">
                  <v-expansion-panel v-for="(item, idx) in content.faq.items" :key="`faq-${idx}`">
                    <v-expansion-panel-title>{{ item.q }}</v-expansion-panel-title>
                    <v-expansion-panel-text>{{ item.a }}</v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </div>
</template>

<style scoped>
.contact-hero {
  background:
    radial-gradient(900px circle at 20% 0%, rgba(255, 106, 61, 0.18), transparent 62%),
    radial-gradient(900px circle at 100% 20%, rgba(37, 99, 235, 0.12), transparent 58%);
}

.contact-title {
  font-size: clamp(2.2rem, 3.8vw, 3.4rem);
  line-height: 1.07;
  letter-spacing: -0.03em;
  margin: 0;
  color: rgba(17, 24, 39, 0.94);
}

.contact-subtitle {
  max-width: 42rem;
  color: rgba(17, 24, 39, 0.72);
  line-height: 1.7;
}

.contact-media {
  position: relative;
  max-width: 540px;
  margin-left: auto;
}

.contact-media__frame {
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.06);
  box-shadow:
    0 22px 70px rgba(17, 24, 39, 0.16),
    0 3px 14px rgba(17, 24, 39, 0.08);
  background: rgba(255, 255, 255, 0.7);
}

.contact-media__glow {
  position: absolute;
  filter: blur(42px);
  opacity: 0.6;
  pointer-events: none;
  border-radius: 999px;
}

.contact-media__glow--one {
  width: 230px;
  height: 230px;
  background: rgba(255, 106, 61, 0.35);
  top: -10%;
  left: -12%;
}

.contact-media__glow--two {
  width: 280px;
  height: 280px;
  background: rgba(37, 99, 235, 0.25);
  bottom: -12%;
  right: -10%;
}

.contact-card {
  border: 1px solid rgba(17, 24, 39, 0.06);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 22px 80px rgba(17, 24, 39, 0.08);
  height: 100%;
}

.contact-card__icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(255, 106, 61, 0.12);
  color: rgb(var(--v-theme-primary));
}

.contact-form {
  background: rgba(17, 24, 39, 0.02);
}

.contact-form__card,
.contact-faq__card {
  border: 1px solid rgba(17, 24, 39, 0.06);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 22px 80px rgba(17, 24, 39, 0.08);
}

.contact-faq__card :deep(.v-expansion-panel) {
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 14px;
  overflow: hidden;
}

.contact-faq__card :deep(.v-expansion-panel:not(:last-child)) {
  margin-bottom: 10px;
}
</style>
