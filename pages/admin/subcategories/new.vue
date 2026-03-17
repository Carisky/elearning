<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { computed, reactive, ref, watch } from 'vue'
import AdminShell from '~/components/admin-shell.vue'

type Notification = { type: 'success' | 'error'; message: string }
type Category = { id: number; title: string }

const form = reactive({
  categoryId: null as number | null,
  title: '',
  slug: '',
  sortOrder: 0,
})

const saving = ref(false)
const notification = ref<Notification | null>(null)

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: categories } = useFetch<Category[]>('/api/categories' as any, { default: () => [] })
const categoryList = computed(() => categories.value ?? [])

watch(
  categoryList,
  (list) => {
    if (!list.length) return
    if (form.categoryId === null) form.categoryId = list[0]!.id
  },
  { immediate: true },
)

const save = async () => {
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
    await $fetch('/api/subcategories', {
      method: 'POST',
      body: {
        categoryId: form.categoryId,
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        sortOrder: form.sortOrder,
      },
    })
    await navigateTo('/admin/subcategories')
  } catch (e: any) {
    notification.value = {
      type: 'error',
      message: e?.data?.message ?? e?.message ?? 'Nie udało się utworzyć podkategorii',
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
            <div class="text-h5 font-weight-bold">Nowa podkategoria</div>
            <div class="text-body-2 text-medium-emphasis">
              Utwórz podkategorię dla kursów.
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
            <v-alert v-if="notification" :type="notification.type" variant="tonal" class="mb-4">
              {{ notification.message }}
            </v-alert>

            <v-card>
              <v-card-text>
                <v-form @submit.prevent="save">
                  <v-select
                    v-model="form.categoryId"
                    :items="categoryList"
                    item-title="title"
                    item-value="id"
                    label="Kategoria"
                    class="mb-3"
                  />
                  <v-text-field v-model="form.title" label="Nazwa" required class="mb-3" />
                  <v-text-field
                    v-model="form.slug"
                    label="Slug (opcjonalnie)"
                    hint="Jeśli puste, zostanie wygenerowane automatycznie"
                    persistent-hint
                    class="mb-3"
                  />
                  <v-text-field v-model.number="form.sortOrder" label="Sortowanie" type="number" class="mb-6" />

                  <div class="d-flex gap-3">
                    <v-btn type="submit" color="primary" :loading="saving" prepend-icon="mdi-content-save">
                      Utwórz
                    </v-btn>
                    <v-btn variant="tonal" :disabled="saving" to="/admin/subcategories">
                      Anuluj
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
