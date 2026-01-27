<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { reactive, ref, watch } from 'vue'
import AdminShell from '~/components/admin-shell.vue'
import RichTextEditor from '~/components/rich-text-editor.vue'

type Notification = { type: 'success' | 'error'; message: string }
type DeltaPojo = { ops: any[] }

type TermsPageContent = {
  seo: { title: string; description: string }
  body: DeltaPojo | null
}

type SitePageResponse = { slug: string; content: TermsPageContent | null }

const createDefault = (): TermsPageContent => ({
  seo: {
    title: 'Warunki zakupu — E‑Learning',
    description: 'Warunki zakupu i regulamin korzystania z platformy.',
  },
  body: { ops: [{ insert: 'Warunki zakupu\n\nWpisz treść tutaj...\n' }] },
})

const notification = ref<Notification | null>(null)
let notificationTimeout: ReturnType<typeof setTimeout> | null = null
const pushNotification = (payload: Notification) => {
  notification.value = payload
  if (notificationTimeout) clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => (notification.value = null), 4000)
}

const form = reactive<TermsPageContent>(createDefault())
const saving = ref(false)

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: pageData, pending, refresh } = useFetch<SitePageResponse>('/api/site-pages/warunki-zakupu' as any, {
  default: () => ({ slug: 'warunki-zakupu', content: null }),
})

watch(
  pageData,
  (value) => {
    const content = value?.content ?? null
    Object.assign(form, content ? content : createDefault())
  },
  { immediate: true },
)

const save = async () => {
  saving.value = true
  notification.value = null
  try {
    await $fetch('/api/site-pages/warunki-zakupu', { method: 'POST', body: { content: form } })
    await refresh()
    pushNotification({ type: 'success', message: 'Zapisano.' })
  } catch (e: any) {
    pushNotification({
      type: 'error',
      message: (e?.data?.statusMessage as string) || (e?.message as string) || 'Nie udało się zapisać.',
    })
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
            <h1 class="text-h5 font-weight-bold mb-1">Warunki zakupu</h1>
            <div class="text-body-2 text-medium-emphasis">Edycja treści strony /warunki-zakupu</div>
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

        <v-card class="mb-6">
          <v-card-title>SEO</v-card-title>
          <v-divider />
          <v-card-text>
            <v-text-field v-model="form.seo.title" label="Title" class="mb-3" />
            <v-textarea v-model="form.seo.description" label="Description" rows="2" auto-grow />
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>Treść</v-card-title>
          <v-divider />
          <v-card-text>
            <RichTextEditor v-model="form.body" label="Warunki zakupu" />
          </v-card-text>
        </v-card>
      </v-container>
    </section>
  </AdminShell>
</template>

