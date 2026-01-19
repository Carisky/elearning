<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { reactive, ref } from 'vue'
import AdminShell from '~/components/admin-shell.vue'

type Notification = { type: 'success' | 'error'; message: string }
type Category = { id: number; title: string; slug: string; sortOrder: number }

const categoryForm = reactive({
  title: '',
  slug: '',
  sortOrder: 0,
})

const notification = ref<Notification | null>(null)
let notificationTimeout: ReturnType<typeof setTimeout> | null = null

const pushNotification = (payload: Notification) => {
  notification.value = payload
  if (notificationTimeout) {
    clearTimeout(notificationTimeout)
  }
  notificationTimeout = setTimeout(() => (notification.value = null), 4000)
}

const resetCategoryForm = () => {
  categoryForm.title = ''
  categoryForm.slug = ''
  categoryForm.sortOrder = 0
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 128)

const handleRequestError = (error: any, fallback: string) => {
  const message =
    (error?.data?.message as string) ||
    (error?.message as string) ||
    fallback
  pushNotification({ type: 'error', message })
}

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: categories, refresh: refreshCategories } = useFetch<Category[]>('/api/categories' as any, {
  default: () => [],
})

const submitCategory = async () => {
  if (!categoryForm.title.trim()) {
    pushNotification({ type: 'error', message: 'Название категории обязательно' })
    return
  }

  try {
    await $fetch('/api/categories', {
      method: 'POST',
      body: {
        title: categoryForm.title.trim(),
        slug: categoryForm.slug.trim() || slugify(categoryForm.title),
        sortOrder: categoryForm.sortOrder,
      },
    })
    await refreshCategories()
    pushNotification({ type: 'success', message: 'Категория сохранена' })
    resetCategoryForm()
  } catch (error) {
    handleRequestError(error, 'Не удалось сохранить категорию')
  }
}
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <v-row>
          <v-col cols="12">
            <v-alert v-if="notification" :type="notification.type">
              {{ notification.message }}
            </v-alert>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-card>
              <v-card-title>Категории</v-card-title>
              <v-card-text>
                <v-form @submit.prevent="submitCategory">
                  <v-text-field
                    v-model="categoryForm.title"
                    label="Название"
                    required
                    class="mb-3"
                  />
                  <v-text-field
                    v-model="categoryForm.slug"
                    label="Slug (необязательно)"
                    class="mb-3"
                  />
                  <v-text-field
                    v-model.number="categoryForm.sortOrder"
                    label="Порядок сортировки"
                    type="number"
                    class="mb-3"
                  />
                  <v-btn type="submit" color="primary">Сохранить категорию</v-btn>
                </v-form>

                <v-divider class="my-4" />

                <div v-if="categories?.length">
                  <v-list dense>
                    <v-list-item
                      v-for="category in categories"
                      :key="category.id"
                      class="px-0"
                    >
                      <v-list-item-content>
                        <v-list-item-title>{{ category.title }}</v-list-item-title>
                        <v-list-item-subtitle>
                          {{ category.slug }} · {{ category.sortOrder }}
                        </v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                </div>
                <div v-else class="text-caption mt-3">
                  Пока категории не созданы.
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </AdminShell>
</template>
