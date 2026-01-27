<script setup lang="ts">
import { computed } from 'vue'
import RichTextViewer from '~/components/rich-text-viewer.vue'

type DeltaPojo = { ops: any[] }

type PersonalDataPageContent = {
  seo: { title: string; description: string }
  body: DeltaPojo | null
}

type SitePageResponse = { slug: string; content: PersonalDataPageContent | null }

const createFallback = (): PersonalDataPageContent => ({
  seo: {
    title: 'Dane osobowe — E‑Learning',
    description: 'Warunki dotyczące przetwarzania danych osobowych.',
  },
  body: {
    ops: [{ insert: 'Dane osobowe\n\nUzupełnij treść w panelu administratora.\n' }],
  },
})

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: page } = await useFetch<SitePageResponse>('/api/site-pages/dane-osobowe' as any, {
  default: () => ({ slug: 'dane-osobowe', content: null }),
})

const content = computed(() => page.value?.content ?? createFallback())

useSeoMeta({
  title: computed(() => content.value.seo.title),
  description: computed(() => content.value.seo.description),
})
</script>

<template>
  <section class="py-10 py-md-14">
    <v-container>
      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
        <h1 class="text-h4 font-weight-bold">Dane osobowe</h1>
      </div>

      <v-card variant="flat" rounded="xl" class="pa-6">
        <RichTextViewer :model-value="content.body" />
      </v-card>
    </v-container>
  </section>
</template>

