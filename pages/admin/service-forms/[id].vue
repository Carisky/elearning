<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminShell from '~/components/admin-shell.vue'

type Notification = { type: 'success' | 'error'; message: string }
type ServiceForm = { id: number; title: string; slug: string; sortOrder: number }

const route = useRoute()
const serviceFormId = computed(() => Number(route.params.id))
const validId = computed(() => Number.isFinite(serviceFormId.value) && serviceFormId.value > 0)

const form = reactive({
  title: '',
  slug: '',
  sortOrder: 0,
})

const saving = ref(false)
const deleting = ref(false)
const notification = ref<Notification | null>(null)

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data, pending, refresh, error } = useFetch<ServiceForm>(() => `/api/service-forms/${serviceFormId.value}` as any, {
  watch: [serviceFormId],
  immediate: true,
})

watch(
  data,
  (value) => {
    if (!value) return
    form.title = value.title ?? ''
    form.slug = value.slug ?? ''
    form.sortOrder = value.sortOrder ?? 0
  },
  { immediate: true },
)

const save = async () => {
  if (!validId.value) return
  if (!form.title.trim()) {
    notification.value = { type: 'error', message: 'Podaj nazwę' }
    return
  }
  saving.value = true
  notification.value = null
  try {
    await $fetch(`/api/service-forms/${serviceFormId.value}`, {
      method: 'PUT',
      body: { title: form.title.trim(), slug: form.slug.trim(), sortOrder: form.sortOrder },
    })
    await refresh()
    notification.value = { type: 'success', message: 'Zapisano' }
  } catch (e: any) {
    notification.value = { type: 'error', message: e?.data?.message ?? e?.message ?? 'Nie udało się zapisać' }
  } finally {
    saving.value = false
  }
}

const deleteServiceForm = async () => {
  if (!validId.value) return
  const ok = window.confirm('Usunąć formę usługi? Operacja może być zablokowana, jeśli są przypięte kursy.')
  if (!ok) return
  deleting.value = true
  notification.value = null
  try {
    await $fetch(`/api/service-forms/${serviceFormId.value}`, { method: 'DELETE' })
    await navigateTo('/admin/service-forms')
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
            <div class="text-h5 font-weight-bold">Edycja formy usługi</div>
            <div class="text-body-2 text-medium-emphasis">
              Zmień nazwę, slug i kolejność.
            </div>
          </v-col>
          <v-col cols="12" md="6" class="d-flex justify-end">
            <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/admin/service-forms">
              Wstecz
            </v-btn>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="8" lg="6">
            <v-alert v-if="!validId" type="error" variant="tonal" class="mb-4">
              Nieprawidłowe id.
            </v-alert>
            <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
              Nie udało się załadować.
            </v-alert>
            <v-alert v-if="notification" :type="notification.type" variant="tonal" class="mb-4">
              {{ notification.message }}
            </v-alert>

            <v-card>
              <v-card-text>
                <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />
                <v-form v-else @submit.prevent="save">
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
                      @click="deleteServiceForm"
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

