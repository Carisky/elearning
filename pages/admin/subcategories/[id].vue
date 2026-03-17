<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminShell from '~/components/admin-shell.vue'

type Notification = { type: 'success' | 'error'; message: string }
type Category = { id: number; title: string }
type Subcategory = { id: number; title: string; slug: string; sortOrder: number; categoryId: number }

const route = useRoute()
const subcategoryId = computed(() => Number(route.params.id))
const validId = computed(() => Number.isFinite(subcategoryId.value) && subcategoryId.value > 0)

const form = reactive({
  categoryId: null as number | null,
  title: '',
  slug: '',
  sortOrder: 0,
})

const saving = ref(false)
const deleting = ref(false)
const notification = ref<Notification | null>(null)

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: categories } = useFetch<Category[]>('/api/categories' as any, { default: () => [] })
const categoryList = computed(() => categories.value ?? [])

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data, pending, refresh, error } = useFetch<Subcategory>(() => `/api/subcategories/${subcategoryId.value}` as any, {
  watch: [subcategoryId],
  immediate: true,
})

watch(
  data,
  (value) => {
    if (!value) return
    form.categoryId = value.categoryId ?? null
    form.title = value.title ?? ''
    form.slug = value.slug ?? ''
    form.sortOrder = value.sortOrder ?? 0
  },
  { immediate: true },
)

const save = async () => {
  if (!validId.value) return
  if (!form.title.trim()) {
    notification.value = { type: 'error', message: 'Podaj nazwę podkategorii' }
    return
  }
  if (!form.categoryId) {
    notification.value = { type: 'error', message: 'Wybierz kategorię' }
    return
  }

  saving.value = true
  notification.value = null
  try {
    await $fetch(`/api/subcategories/${subcategoryId.value}`, {
      method: 'PUT',
      body: {
        categoryId: form.categoryId,
        title: form.title.trim(),
        slug: form.slug.trim(),
        sortOrder: form.sortOrder,
      },
    })
    await refresh()
    notification.value = { type: 'success', message: 'Podkategoria została zapisana' }
  } catch (e: any) {
    notification.value = { type: 'error', message: e?.data?.message ?? e?.message ?? 'Nie udało się zapisać' }
  } finally {
    saving.value = false
  }
}

const deleteSubcategory = async () => {
  if (!validId.value) return
  const ok = window.confirm('Usunąć podkategorię? Operacja może być zablokowana, jeśli są przypięte kursy.')
  if (!ok) return
  deleting.value = true
  notification.value = null
  try {
    await $fetch(`/api/subcategories/${subcategoryId.value}`, { method: 'DELETE' })
    await navigateTo('/admin/subcategories')
  } catch (e: any) {
    notification.value = { type: 'error', message: e?.data?.message ?? e?.message ?? 'Nie udało się usunąć' }
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <v-row class="mb-4" align="center" justify="space-between">
          <v-col cols="12" md="6">
            <div class="text-h5 font-weight-bold">Edycja podkategorii</div>
            <div class="text-body-2 text-medium-emphasis">
              Zmień nazwę, slug, kategorię i kolejność.
            </div>
          </v-col>
          <v-col cols="12" md="6" class="d-flex justify-end">
            <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/admin/subcategories">
              Wstecz
            </v-btn>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="8" lg="6">
            <v-alert v-if="!validId" type="error" variant="tonal" class="mb-4">
              Nieprawidłowe id podkategorii.
            </v-alert>
            <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
              Nie udało się załadować podkategorii.
            </v-alert>
            <v-alert v-if="notification" :type="notification.type" variant="tonal" class="mb-4">
              {{ notification.message }}
            </v-alert>

            <v-card>
              <v-card-text>
                <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />
                <v-form v-else @submit.prevent="save">
                  <v-select
                    v-model="form.categoryId"
                    :items="categoryList"
                    item-title="title"
                    item-value="id"
                    label="Kategoria"
                    class="mb-3"
                  />
                  <v-text-field v-model="form.title" label="Nazwa" required class="mb-3" />
                  <v-text-field v-model="form.slug" label="Slug" class="mb-3" />
                  <v-text-field v-model.number="form.sortOrder" label="Sortowanie" type="number" class="mb-6" />

                  <div class="d-flex flex-wrap gap-3 align-center">
                    <v-btn type="submit" color="primary" :loading="saving" prepend-icon="mdi-content-save">
                      Zapisz
                    </v-btn>
                    <v-btn
                      color="error"
                      variant="tonal"
                      :loading="deleting"
                      prepend-icon="mdi-delete"
                      @click="deleteSubcategory"
                    >
                      Usuń
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

