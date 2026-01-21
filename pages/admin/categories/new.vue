<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { reactive, ref } from 'vue'
import AdminShell from '~/components/admin-shell.vue'

type Notification = { type: 'success' | 'error'; message: string }

const form = reactive({
  title: '',
  slug: '',
  sortOrder: 0,
})

const saving = ref(false)
const notification = ref<Notification | null>(null)

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 128)

const save = async () => {
  if (!form.title.trim()) {
    notification.value = { type: 'error', message: 'Введите название категории' }
    return
  }
  saving.value = true
  notification.value = null
  try {
    await $fetch('/api/categories', {
      method: 'POST',
      body: {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        sortOrder: form.sortOrder,
      },
    })
    await navigateTo('/admin/categories')
  } catch (e: any) {
    notification.value = {
      type: 'error',
      message: e?.data?.message ?? e?.message ?? 'Не удалось создать категорию',
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <v-row class="mb-4" align="center" justify="space-between">
          <v-col cols="12" md="6">
            <div class="text-h5 font-weight-bold">Новая категория</div>
            <div class="text-body-2 text-medium-emphasis">
              Создайте категорию для группировки курсов.
            </div>
          </v-col>
          <v-col cols="12" md="6" class="d-flex justify-end">
            <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/admin/categories">
              Назад
            </v-btn>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="8" lg="6">
            <v-alert v-if="notification" :type="notification.type" variant="tonal" class="mb-4">
              {{ notification.message }}
            </v-alert>

            <v-card>
              <v-card-text>
                <v-form @submit.prevent="save">
                  <v-text-field v-model="form.title" label="Название" required class="mb-3" />
                  <v-text-field
                    v-model="form.slug"
                    label="Slug (опционально)"
                    hint="Если не задан, будет создан автоматически"
                    persistent-hint
                    class="mb-3"
                  />
                  <v-text-field
                    v-model.number="form.sortOrder"
                    label="Сортировка"
                    type="number"
                    class="mb-6"
                  />

                  <div class="d-flex gap-3">
                    <v-btn type="submit" color="primary" :loading="saving" prepend-icon="mdi-content-save">
                      Создать
                    </v-btn>
                    <v-btn variant="tonal" :disabled="saving" to="/admin/categories">
                      Отмена
                    </v-btn>
                  </div>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </AdminShell>
</template>

