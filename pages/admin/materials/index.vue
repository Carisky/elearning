<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { computed, reactive, ref } from 'vue'
import AdminShell from '~/components/admin-shell.vue'

type MaterialType = 'PDF' | 'VIDEO' | 'FILE'
type Material = {
  id: number
  title: string
  type: MaterialType
  url: string
  storageKey: string | null
  originalFilename: string | null
  mimeType: string | null
  sizeBytes: number | null
  description: string | null
  thumbnailUrl: string | null
  durationSec: number | null
  createdAt: string
  updatedAt: string
}

type Notification = { type: 'success' | 'error'; message: string }

const notification = ref<Notification | null>(null)
let notificationTimeout: ReturnType<typeof setTimeout> | null = null
const pushNotification = (payload: Notification) => {
  notification.value = payload
  if (notificationTimeout) clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => (notification.value = null), 4000)
}

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: materials, pending, refresh } = useFetch<Material[]>('/api/materials' as any, {
  default: () => [],
})

const list = computed(() => materials.value ?? [])

const dialog = ref(false)
const saving = ref(false)
const sourceMode = ref<'upload' | 'url'>('upload')
const uploadFile = ref<File | File[] | null>(null)
const form = reactive<{
  id: number | null
  title: string
  type: MaterialType
  url: string
  storageKey: string | null
  description: string
  thumbnailUrl: string
  durationSec: string
}>({
  id: null,
  title: '',
  type: 'PDF',
  url: '',
  storageKey: null,
  description: '',
  thumbnailUrl: '',
  durationSec: '',
})

const isLocal = computed(() => Boolean(form.storageKey) || form.url.startsWith('/api/material-files/'))

const openCreate = () => {
  form.id = null
  form.title = ''
  form.type = 'PDF'
  form.url = ''
  form.storageKey = null
  form.description = ''
  form.thumbnailUrl = ''
  form.durationSec = ''
  sourceMode.value = 'upload'
  uploadFile.value = null
  dialog.value = true
}

const openEdit = (material: Material) => {
  form.id = material.id
  form.title = material.title ?? ''
  form.type = material.type
  form.url = material.url ?? ''
  form.storageKey = material.storageKey ?? null
  form.description = material.description ?? ''
  form.thumbnailUrl = material.thumbnailUrl ?? ''
  form.durationSec = material.durationSec ? String(material.durationSec) : ''
  sourceMode.value = isLocal.value ? 'upload' : 'url'
  uploadFile.value = null
  dialog.value = true
}

const save = async () => {
  if (!form.title.trim()) {
    pushNotification({ type: 'error', message: 'Tytuł jest wymagany.' })
    return
  }

  if (!form.id && sourceMode.value === 'upload') {
    const file = Array.isArray(uploadFile.value) ? uploadFile.value[0] : uploadFile.value
    if (!file) {
      pushNotification({ type: 'error', message: 'Wybierz plik.' })
      return
    }
  } else if (!isLocal.value && !form.url.trim()) {
    pushNotification({ type: 'error', message: 'URL jest wymagany.' })
    return
  }

  saving.value = true
  try {
    if (form.id) {
      await $fetch(`/api/materials/${form.id}`, {
        method: 'PUT',
        body: {
          title: form.title,
          type: form.type,
          url: form.url,
          description: form.description,
          thumbnailUrl: form.thumbnailUrl,
          durationSec: form.durationSec,
        },
      })
      pushNotification({ type: 'success', message: 'Zapisano.' })
    } else {
      if (sourceMode.value === 'upload') {
        const file = Array.isArray(uploadFile.value) ? uploadFile.value[0] : uploadFile.value
        if (!file) {
          pushNotification({ type: 'error', message: 'Wybierz plik.' })
          return
        }
        const fd = new FormData()
        fd.set('file', file)
        fd.set('title', form.title)
        if (form.description.trim()) fd.set('description', form.description)
        if (form.thumbnailUrl.trim()) fd.set('thumbnailUrl', form.thumbnailUrl)
        if (form.durationSec.trim()) fd.set('durationSec', form.durationSec)
        await $fetch('/api/materials/upload', { method: 'POST', body: fd })
        pushNotification({ type: 'success', message: 'Wgrano.' })
      } else {
        await $fetch('/api/materials', {
          method: 'POST',
          body: {
            title: form.title,
            type: form.type,
            url: form.url,
            description: form.description,
            thumbnailUrl: form.thumbnailUrl,
            durationSec: form.durationSec,
          },
        })
        pushNotification({ type: 'success', message: 'Dodano.' })
      }
    }
    dialog.value = false
    await refresh()
  } catch (e: any) {
    pushNotification({
      type: 'error',
      message: (e?.data?.statusMessage as string) || (e?.statusMessage as string) || 'Błąd zapisu.',
    })
  } finally {
    saving.value = false
  }
}

const removeMaterial = async (material: Material) => {
  if (!confirm(`Usunąć materiał "${material.title}"?`)) return
  try {
    await $fetch(`/api/materials/${material.id}`, { method: 'DELETE' })
    pushNotification({ type: 'success', message: 'Usunięto.' })
    await refresh()
  } catch (e: any) {
    pushNotification({
      type: 'error',
      message: (e?.data?.statusMessage as string) || (e?.statusMessage as string) || 'Błąd usuwania.',
    })
  }
}
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <v-row class="mb-4" align="center" justify="space-between">
          <v-col cols="12" md="7">
            <div class="text-h5 font-weight-bold">Materiały</div>
            <div class="text-body-2 text-medium-emphasis">
              Biblioteka materiałów (PDF / video / pliki). Materiały możesz przypisywać do kursów w edycji kursu.
            </div>
          </v-col>
          <v-col cols="12" md="5" class="d-flex justify-end gap-3 flex-wrap">
            <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="pending" @click="refresh">Odśwież</v-btn>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Dodaj materiał</v-btn>
          </v-col>
        </v-row>

        <v-alert v-if="notification" class="mb-4" variant="tonal" :type="notification.type">
          {{ notification.message }}
        </v-alert>

        <v-card>
          <v-card-text>
            <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />

            <v-table v-if="list.length" density="compact">
              <thead>
                <tr>
                  <th class="text-left">Tytuł</th>
                  <th class="text-left">Typ</th>
                  <th class="text-left">URL</th>
                  <th class="text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="material in list" :key="material.id">
                  <td class="text-wrap">{{ material.title }}</td>
                  <td>
                    <v-chip
                      size="small"
                      variant="tonal"
                      :color="material.type === 'PDF' ? 'red' : material.type === 'VIDEO' ? 'primary' : 'grey'"
                    >
                      {{ material.type }}
                    </v-chip>
                  </td>
                  <td class="text-body-2 text-medium-emphasis text-wrap">
                    <template v-if="material.storageKey">
                      {{ material.originalFilename || material.storageKey }}
                    </template>
                    <template v-else>
                      {{ material.url.length > 70 ? `${material.url.slice(0, 70)}…` : material.url }}
                    </template>
                  </td>
                  <td class="text-right">
                    <v-btn
                      v-if="material.storageKey"
                      size="small"
                      variant="text"
                      prepend-icon="mdi-download"
                      :href="material.url"
                      target="_blank"
                      rel="noopener"
                    >
                      Pobierz
                    </v-btn>
                    <v-btn size="small" variant="text" prepend-icon="mdi-pencil" @click="openEdit(material)">
                      Edytuj
                    </v-btn>
                    <v-btn size="small" variant="text" color="error" prepend-icon="mdi-delete" @click="removeMaterial(material)">
                      Usuń
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-alert v-else variant="tonal" type="info">Brak materiałów.</v-alert>
          </v-card-text>
        </v-card>

        <v-dialog v-model="dialog" max-width="720">
          <v-card>
            <v-card-title>{{ form.id ? 'Edytuj materiał' : 'Dodaj materiał' }}</v-card-title>
            <v-card-text>
              <div v-if="!form.id" class="mb-4">
                <v-btn-toggle v-model="sourceMode" mandatory>
                  <v-btn value="upload">Plik</v-btn>
                  <v-btn value="url">URL</v-btn>
                </v-btn-toggle>
              </div>

              <v-row>
                <v-col cols="12" md="8">
                  <v-text-field v-model="form.title" label="Tytuł" required />
                </v-col>
                <v-col cols="12" md="4" v-if="(form.id && !isLocal) || (!form.id && sourceMode === 'url')">
                  <v-select v-model="form.type" :items="['PDF', 'VIDEO', 'FILE']" label="Typ" />
                </v-col>
              </v-row>

              <v-file-input
                v-if="!form.id && sourceMode === 'upload'"
                v-model="uploadFile"
                label="Plik"
                accept=".pdf,.mp4,.pptx,.doc,.docx"
                :multiple="false"
                show-size
              />

              <v-text-field
                v-if="(form.id && !isLocal) || (!form.id && sourceMode === 'url')"
                v-model="form.url"
                label="URL"
                required
              />

              <v-text-field
                v-else-if="form.id && isLocal"
                v-model="form.url"
                label="URL"
                disabled
              />

              <v-text-field v-model="form.thumbnailUrl" label="Thumbnail URL (opcjonalnie)" />
              <v-text-field v-model="form.durationSec" label="Czas (sek.) (opcjonalnie)" type="number" />
              <v-textarea v-model="form.description" label="Opis (opcjonalnie)" auto-grow rows="3" />
            </v-card-text>
            <v-card-actions class="justify-end">
              <v-btn variant="text" @click="dialog = false">Anuluj</v-btn>
              <v-btn color="primary" variant="flat" :loading="saving" @click="save">Zapisz</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </section>
  </AdminShell>
</template>
