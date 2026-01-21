<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { computed, ref } from 'vue'
import AdminShell from '~/components/admin-shell.vue'

type Course = {
  id: number
  title: string
  slug: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  priceCents: number
  currency: string
  category?: { id: number; title: string } | null
}

const statusLabel: Record<Course['status'], string> = {
  DRAFT: 'Черновик',
  PUBLISHED: 'Опубликован',
  ARCHIVED: 'Архив',
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
            <div class="text-h5 font-weight-bold">Курсы</div>
            <div class="text-body-2 text-medium-emphasis">
              Создание курса, структура (разделы/подразделы), тесты и экзамены.
            </div>
          </v-col>
          <v-col cols="12" md="5" class="d-flex justify-end gap-3 flex-wrap">
            <v-btn variant="tonal" :loading="refreshing" prepend-icon="mdi-refresh" @click="hardRefresh">
              Обновить
            </v-btn>
            <v-btn color="primary" prepend-icon="mdi-plus" to="/admin/courses/new">
              Новый курс
            </v-btn>
          </v-col>
        </v-row>

        <v-card>
          <v-card-text>
            <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />

            <v-table v-if="list.length" density="compact">
              <thead>
                <tr>
                  <th class="text-left">Курс</th>
                  <th class="text-left">Категория</th>
                  <th class="text-left">Статус</th>
                  <th class="text-left">Цена</th>
                  <th class="text-right">Действия</th>
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
                  <td>{{ (course.priceCents / 100).toFixed(2) }} {{ course.currency }}</td>
                  <td class="text-right">
                    <v-btn
                      size="small"
                      variant="text"
                      prepend-icon="mdi-wrench"
                      :to="`/admin/courses/${course.id}`"
                    >
                      Открыть мастер
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-alert v-else variant="tonal" type="info">
              Курсов пока нет. Создайте первый курс.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-container>
    </section>
  </AdminShell>
</template>

