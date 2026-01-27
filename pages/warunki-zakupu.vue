<script setup lang="ts">
import { computed } from 'vue'
import RichTextViewer from '~/components/rich-text-viewer.vue'

type DeltaPojo = { ops: any[] }

type TermsPageContent = {
  seo: { title: string; description: string }
  body: DeltaPojo | null
}

type SitePageResponse = { slug: string; content: TermsPageContent | null }

const createFallback = (): TermsPageContent => ({
  seo: {
    title: 'Warunki zakupu — E‑Learning',
    description: 'Warunki zakupu i regulamin korzystania z platformy.',
  },
  body: {
    ops: [{ insert: 'Warunki zakupu\n\nUzupełnij treść w panelu administratora.\n' }],
  },
})

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: page } = await useFetch<SitePageResponse>('/api/site-pages/warunki-zakupu' as any, {
  default: () => ({ slug: 'warunki-zakupu', content: null }),
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
        <h1 class="text-h4 font-weight-bold">Warunki zakupu</h1>
      </div>

      <v-card variant="flat" rounded="xl" class="pa-6">
        <RichTextViewer :model-value="content.body" />
      </v-card>
    </v-container>
  </section>
</template>

