<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { computed, reactive, ref, watch } from 'vue'
import AdminShell from '~/components/admin-shell.vue'

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type Review = {
  id: number
  authorName: string
  authorTitle: string | null
  rating: number | null
  content: string
  status: ReviewStatus
  createdAt: string
  updatedAt: string
  approvedAt: string | null
  rejectedAt: string | null
  moderatedBy: { id: number; name: string | null; email: string } | null
}

type Notification = { type: 'success' | 'error'; message: string }

const statusOptions = [
  { value: 'PENDING' as const, label: 'Do akceptacji' },
  { value: 'APPROVED' as const, label: 'Zaakceptowane' },
  { value: 'REJECTED' as const, label: 'Odrzucone' },
  { value: 'ALL' as const, label: 'Wszystkie' },
]

const selectedStatus = ref<(typeof statusOptions)[number]['value']>('PENDING')
const query = computed(() => (selectedStatus.value === 'ALL' ? {} : { status: selectedStatus.value }))

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: reviews, pending, refresh } = useFetch<Review[]>('/api/reviews' as any, {
  query,
  default: () => [],
})

watch(selectedStatus, () => refresh())

const list = computed(() => reviews.value ?? [])

const statusColor: Record<ReviewStatus, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'grey',
}

const notification = ref<Notification | null>(null)
let notificationTimeout: ReturnType<typeof setTimeout> | null = null
const pushNotification = (payload: Notification) => {
  notification.value = payload
  if (notificationTimeout) clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => (notification.value = null), 4000)
}

const formatDateTime = (value: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pl-PL')
}

const updatingId = ref<number | null>(null)
const setStatus = async (id: number, status: ReviewStatus) => {
  updatingId.value = id
  try {
    await $fetch(`/api/reviews/${id}`, { method: 'PUT', body: { status } })
    pushNotification({ type: 'success', message: 'Zapisano.' })
    await refresh()
  } catch (e: any) {
    pushNotification({
      type: 'error',
      message: (e?.data?.statusMessage as string) || (e?.statusMessage as string) || 'Błąd zapisu.',
    })
  } finally {
    updatingId.value = null
  }
}

const removeReview = async (id: number) => {
  if (!confirm('Usunąć opinię?')) return
  updatingId.value = id
  try {
    await $fetch(`/api/reviews/${id}`, { method: 'DELETE' })
    pushNotification({ type: 'success', message: 'Usunięto.' })
    await refresh()
  } catch (e: any) {
    pushNotification({
      type: 'error',
      message: (e?.data?.statusMessage as string) || (e?.statusMessage as string) || 'Błąd usuwania.',
    })
  } finally {
    updatingId.value = null
  }
}

const editDialog = ref(false)
const editForm = reactive<{
  id: number | null
  authorName: string
  authorTitle: string
  rating: string
  content: string
}>({
  id: null,
  authorName: '',
  authorTitle: '',
  rating: '',
  content: '',
})

const openEdit = (review: Review) => {
  editForm.id = review.id
  editForm.authorName = review.authorName
  editForm.authorTitle = review.authorTitle ?? ''
  editForm.rating = review.rating ? String(review.rating) : ''
  editForm.content = review.content
  editDialog.value = true
}

const saveEdit = async () => {
  if (!editForm.id) return
  if (!editForm.authorName.trim()) {
    pushNotification({ type: 'error', message: 'Imię i nazwisko jest wymagane.' })
    return
  }
  if (!editForm.content.trim() || editForm.content.trim().length < 10) {
    pushNotification({ type: 'error', message: 'Treść opinii jest wymagana.' })
    return
  }

  updatingId.value = editForm.id
  try {
    await $fetch(`/api/reviews/${editForm.id}`, {
      method: 'PUT',
      body: {
        authorName: editForm.authorName,
        authorTitle: editForm.authorTitle,
        rating: editForm.rating,
        content: editForm.content,
      },
    })
    pushNotification({ type: 'success', message: 'Zapisano.' })
    editDialog.value = false
    await refresh()
  } catch (e: any) {
    pushNotification({
      type: 'error',
      message: (e?.data?.statusMessage as string) || (e?.statusMessage as string) || 'Błąd zapisu.',
    })
  } finally {
    updatingId.value = null
  }
}
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <v-row class="mb-4" align="center" justify="space-between">
          <v-col cols="12" md="7">
            <div class="text-h5 font-weight-bold">Opinie</div>
            <div class="text-body-2 text-medium-emphasis">
              Moderacja opinii pokazywanych na stronie głównej.
            </div>
          </v-col>
          <v-col cols="12" md="5" class="d-flex justify-end gap-3 flex-wrap">
            <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="pending" @click="refresh">
              Odśwież
            </v-btn>
          </v-col>
        </v-row>

        <v-alert v-if="notification" class="mb-4" variant="tonal" :type="notification.type">
          {{ notification.message }}
        </v-alert>

        <v-card class="mb-4">
          <v-card-text>
            <v-chip-group v-model="selectedStatus" mandatory column>
              <v-chip v-for="opt in statusOptions" :key="opt.value" :value="opt.value" variant="tonal">
                {{ opt.label }}
              </v-chip>
            </v-chip-group>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-text>
            <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />

            <v-table v-if="list.length" density="compact">
              <thead>
                <tr>
                  <th class="text-left">Autor</th>
                  <th class="text-left">Ocena</th>
                  <th class="text-left">Status</th>
                  <th class="text-left">Treść</th>
                  <th class="text-left">Dodano</th>
                  <th class="text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="review in list" :key="review.id">
                  <td>
                    <div class="font-weight-medium">{{ review.authorName }}</div>
                    <div v-if="review.authorTitle" class="text-caption text-medium-emphasis">
                      {{ review.authorTitle }}
                    </div>
                  </td>
                  <td>
                    <span v-if="review.rating">{{ review.rating }}/5</span>
                    <span v-else class="text-medium-emphasis">—</span>
                  </td>
                  <td>
                    <v-chip size="small" variant="tonal" :color="statusColor[review.status]">
                      {{ review.status }}
                    </v-chip>
                  </td>
                  <td class="text-body-2">
                    {{ review.content.length > 110 ? `${review.content.slice(0, 110)}…` : review.content }}
                  </td>
                  <td class="text-caption text-medium-emphasis">
                    {{ formatDateTime(review.createdAt) }}
                  </td>
                  <td class="text-right">
                    <v-btn
                      size="small"
                      variant="text"
                      prepend-icon="mdi-pencil"
                      :disabled="updatingId === review.id"
                      @click="openEdit(review)"
                    >
                      Edytuj
                    </v-btn>
                    <v-btn
                      v-if="review.status !== 'APPROVED'"
                      size="small"
                      variant="text"
                      color="green"
                      prepend-icon="mdi-check"
                      :loading="updatingId === review.id"
                      @click="setStatus(review.id, 'APPROVED')"
                    >
                      Akceptuj
                    </v-btn>
                    <v-btn
                      v-if="review.status !== 'REJECTED'"
                      size="small"
                      variant="text"
                      color="grey"
                      prepend-icon="mdi-close"
                      :loading="updatingId === review.id"
                      @click="setStatus(review.id, 'REJECTED')"
                    >
                      Odrzuć
                    </v-btn>
                    <v-btn
                      size="small"
                      variant="text"
                      color="red"
                      prepend-icon="mdi-delete-outline"
                      :loading="updatingId === review.id"
                      @click="removeReview(review.id)"
                    >
                      Usuń
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-alert v-else variant="tonal" type="info">
              Brak opinii.
            </v-alert>
          </v-card-text>
        </v-card>

        <v-dialog v-model="editDialog" max-width="760">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <span>Edycja opinii</span>
              <v-btn icon variant="text" @click="editDialog = false">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </v-card-title>
            <v-divider />
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field v-model="editForm.authorName" label="Autor" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="editForm.authorTitle" label="Stanowisko / firma (opcjonalnie)" />
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field v-model="editForm.rating" label="Ocena (1–5, opcjonalnie)" />
                </v-col>
                <v-col cols="12" md="9" />
                <v-col cols="12">
                  <v-textarea v-model="editForm.content" label="Treść" rows="5" auto-grow />
                </v-col>
              </v-row>
            </v-card-text>
            <v-divider />
            <v-card-actions class="pa-4">
              <v-spacer />
              <v-btn variant="text" @click="editDialog = false">Anuluj</v-btn>
              <v-btn color="primary" :loading="updatingId === editForm.id" @click="saveEdit">
                Zapisz
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </section>
  </AdminShell>
</template>

