<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { computed, ref } from 'vue'
import AdminShell from '~/components/admin-shell.vue'
import { formatMoneyByView } from '~/utils/currency'
import type { SupportedCurrencyCode } from '~/utils/currency'

type Course = {
  id: number
  title: string
  slug: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  priceCents: number
  currency: SupportedCurrencyCode
  category?: { id: number; title: string } | null
}

const statusLabel: Record<Course['status'], string> = {
  DRAFT: 'Szkic',
  PUBLISHED: 'Opublikowany',
  ARCHIVED: 'Archiwum',
}

const statusColor: Record<Course['status'], string> = {
  DRAFT: 'grey',
  PUBLISHED: 'green',
  ARCHIVED: 'orange',
}

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: courses, pending, refresh } = useFetch<Course[]>('/api/courses' as any, {
  default: () => [],
})

const list = computed(() => courses.value ?? [])
const refreshing = ref(false)
const hardRefresh = async () => {
  refreshing.value = true
  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <v-row class="mb-4" align="center" justify="space-between">
          <v-col cols="12" md="7">
            <div class="text-h5 font-weight-bold">Kursy</div>
            <div class="text-body-2 text-medium-emphasis">
              Tworzenie kursów, struktura (rozdziały/podrozdziały), testy i egzaminy.
            </div>
          </v-col>
          <v-col cols="12" md="5" class="d-flex justify-end gap-3 flex-wrap">
            <v-btn variant="tonal" :loading="refreshing" prepend-icon="mdi-refresh" @click="hardRefresh">
              Odśwież
            </v-btn>
            <v-btn color="primary" prepend-icon="mdi-plus" to="/admin/courses/new">
              Nowy kurs
            </v-btn>
          </v-col>
        </v-row>

        <v-card>
          <v-card-text>
            <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />

            <v-table v-if="list.length" density="compact">
              <thead>
                <tr>
                  <th class="text-left">Kurs</th>
                  <th class="text-left">Kategoria</th>
                  <th class="text-left">Status</th>
                  <th class="text-left">Cena</th>
                  <th class="text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="course in list" :key="course.id">
                  <td>
                    <div class="font-weight-medium">{{ course.title }}</div>
                    <div class="text-caption text-medium-emphasis">{{ course.slug }}</div>
                  </td>
                  <td>{{ course.category?.title ?? '—' }}</td>
                  <td>
                    <v-chip size="small" variant="tonal" :color="statusColor[course.status]">
                      {{ statusLabel[course.status] }}
                    </v-chip>
                  </td>
                  <td>{{ formatMoneyByView(course.priceCents, course.currency) }}</td>
                  <td class="text-right">
                    <v-btn
                      size="small"
                      variant="text"
                      prepend-icon="mdi-wrench"
                      :to="`/admin/courses/${course.id}`"
                    >
                      Otwórz kreator
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-alert v-else variant="tonal" type="info">
              Brak kursów. Utwórz pierwszy kurs.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-container>
    </section>
  </AdminShell>
</template>
