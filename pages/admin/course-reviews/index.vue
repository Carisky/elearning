<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { computed, ref, watch } from 'vue'
import AdminShell from '~/components/admin-shell.vue'

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type CourseReview = {
  id: number
  authorName: string
  authorTitle: string | null
  rating: number
  content: string
  status: ReviewStatus
  createdAt: string
  updatedAt: string
  approvedAt: string | null
  rejectedAt: string | null
  course: { id: number; title: string; slug: string }
  user: { id: number; email: string; name: string | null }
  moderatedBy: { id: number; email: string; name: string | null } | null
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
const { data: reviews, pending, refresh } = useFetch<CourseReview[]>('/api/course-reviews' as any, {
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

const updatingId = ref<number | null>(null)
const setStatus = async (id: number, status: ReviewStatus) => {
  updatingId.value = id
  try {
    await $fetch(`/api/course-reviews/${id}`, { method: 'PUT', body: { status } })
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
    await $fetch(`/api/course-reviews/${id}`, { method: 'DELETE' })
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
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <v-row class="mb-4" align="center" justify="space-between">
          <v-col cols="12" md="7">
            <div class="text-h5 font-weight-bold">Opinie kursów</div>
            <div class="text-body-2 text-medium-emphasis">
              Opinie dodawane po ukończeniu kursu (widoczne publicznie po akceptacji).
            </div>
          </v-col>
          <v-col cols="12" md="5" class="d-flex justify-end gap-3 flex-wrap">
            <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="pending" @click="refresh">Odśwież</v-btn>
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
                  <th class="text-left">Kurs</th>
                  <th class="text-left">Autor</th>
                  <th class="text-left">Ocena</th>
                  <th class="text-left">Status</th>
                  <th class="text-left">Treść</th>
                  <th class="text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="review in list" :key="review.id">
                  <td>
                    <div class="font-weight-medium">{{ review.course.title }}</div>
                    <div class="text-caption text-medium-emphasis">{{ review.course.slug }}</div>
                  </td>
                  <td>
                    <div class="font-weight-medium">{{ review.authorName }}</div>
                    <div v-if="review.authorTitle" class="text-caption text-medium-emphasis">{{ review.authorTitle }}</div>
                    <div class="text-caption text-medium-emphasis">{{ review.user.email }}</div>
                  </td>
                  <td>{{ review.rating }}/5</td>
                  <td>
                    <v-chip size="small" variant="tonal" :color="statusColor[review.status]">{{ review.status }}</v-chip>
                  </td>
                  <td class="text-body-2">
                    {{ review.content.length > 110 ? `${review.content.slice(0, 110)}…` : review.content }}
                  </td>
                  <td class="text-right">
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
                      color="error"
                      prepend-icon="mdi-delete"
                      :loading="updatingId === review.id"
                      @click="removeReview(review.id)"
                    >
                      Usuń
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-alert v-else variant="tonal" type="info">Brak opinii.</v-alert>
          </v-card-text>
        </v-card>
      </v-container>
    </section>
  </AdminShell>
</template>

