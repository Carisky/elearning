<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { computed, ref } from 'vue'
import AdminShell from '~/components/admin-shell.vue'

type Category = { id: number; title: string; slug: string; sortOrder: number }
type Notification = { type: 'success' | 'error'; message: string }

const notification = ref<Notification | null>(null)
let notificationTimeout: ReturnType<typeof setTimeout> | null = null
const pushNotification = (payload: Notification) => {
  notification.value = payload
  if (notificationTimeout) clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => (notification.value = null), 4000)
}

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: categories, pending, refresh } = useFetch<Category[]>('/api/categories' as any, {
  default: () => [],
})

const list = computed(() => categories.value ?? [])

const deleteCategory = async (category: Category) => {
  const ok = window.confirm(`Удалить категорию "${category.title}"?`)
  if (!ok) return
  try {
    await $fetch(`/api/categories/${category.id}`, { method: 'DELETE' })
    await refresh()
    pushNotification({ type: 'success', message: 'Категория удалена' })
  } catch (e: any) {
    pushNotification({
      type: 'error',
      message: e?.data?.message ?? e?.message ?? 'Не удалось удалить категорию',
    })
  }
}
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <v-row>
          <v-col cols="12">
            <v-alert v-if="notification" :type="notification.type" variant="tonal">
              {{ notification.message }}
            </v-alert>
          </v-col>
        </v-row>

        <v-row class="mb-4" align="center" justify="space-between">
          <v-col cols="12" md="6">
            <div class="text-h5 font-weight-bold">Категории</div>
            <div class="text-body-2 text-medium-emphasis">
              Управление категориями, сортировкой и slug.
            </div>
          </v-col>
          <v-col cols="12" md="6" class="d-flex justify-end">
            <v-btn color="primary" prepend-icon="mdi-plus" to="/admin/categories/new">
              Новая категория
            </v-btn>
          </v-col>
        </v-row>

        <v-card>
          <v-card-text>
            <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />

            <v-table v-if="list.length" density="compact">
              <thead>
                <tr>
                  <th class="text-left">Название</th>
                  <th class="text-left">Slug</th>
                  <th class="text-left">Сортировка</th>
                  <th class="text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="category in list" :key="category.id">
                  <td>{{ category.title }}</td>
                  <td class="text-medium-emphasis">{{ category.slug }}</td>
                  <td>{{ category.sortOrder }}</td>
                  <td class="text-right">
                    <v-btn
                      size="small"
                      variant="text"
                      prepend-icon="mdi-pencil"
                      :to="`/admin/categories/${category.id}`"
                    >
                      Редактировать
                    </v-btn>
                    <v-btn
                      size="small"
                      variant="text"
                      color="error"
                      prepend-icon="mdi-delete"
                      @click="deleteCategory(category)"
                    >
                      Удалить
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-alert v-else variant="tonal" type="info">
              Категорий пока нет.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-container>
    </section>
  </AdminShell>
</template>


