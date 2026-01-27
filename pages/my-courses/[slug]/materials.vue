<template>
  <section class="pa-6">
    <v-container>
      <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
        <div>
          <h1 class="text-h5 font-weight-medium">Materiały</h1>
          <div class="text-body-2 text-medium-emphasis">{{ payload?.course.title ?? 'Kurs' }}</div>
        </div>

        <v-btn variant="tonal" prepend-icon="mdi-arrow-left" :to="`/my-courses/${slug}`">
          Wróć do kursu
        </v-btn>
      </div>

      <v-alert v-if="error" variant="tonal" type="error" class="mb-4">
        Nie udało się załadować materiałów.
      </v-alert>

      <v-card v-else elevation="2" rounded="xl">
        <v-card-text>
          <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />

          <v-alert v-else-if="!orderedMaterials.length" variant="tonal" type="info">
            Brak materiałów dla tego kursu.
          </v-alert>

          <v-row v-else class="ga-4">
            <v-col v-for="material in orderedMaterials" :key="material.id" cols="12">
              <v-card variant="outlined" rounded="lg">
                <v-card-title class="d-flex align-center ga-2">
                  <v-icon>{{ materialIcon(material.type) }}</v-icon>
                  <span class="text-wrap">{{ material.title }}</span>
                </v-card-title>
                <v-card-text>
                  <div v-if="material.description" class="text-body-2 text-medium-emphasis mb-3">
                    {{ material.description }}
                  </div>

                  <template v-if="material.type === 'VIDEO'">
                    <video
                      class="w-100"
                      controls
                      preload="metadata"
                      :src="material.url"
                      style="max-height: 520px; background: #000;"
                    />
                    <div class="mt-3">
                      <v-btn
                        color="primary"
                        variant="tonal"
                        prepend-icon="mdi-download"
                        :href="`${material.url}?download=1`"
                        target="_blank"
                        rel="noopener"
                      >
                        Pobierz wideo
                      </v-btn>
                    </div>
                  </template>

                  <template v-else>
                    <v-btn
                      color="primary"
                      variant="tonal"
                      prepend-icon="mdi-download"
                      :href="material.url"
                      target="_blank"
                      rel="noopener"
                    >
                      Pobierz plik
                    </v-btn>
                  </template>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-container>
  </section>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

type MaterialType = 'PDF' | 'VIDEO' | 'FILE'

type CourseMaterialsPayload = {
  course: { id: number; title: string; slug: string }
  materials: Array<{
    id: number
    title: string
    type: MaterialType
    url: string
    description: string | null
    thumbnailUrl: string | null
    durationSec: number | null
    position: number
  }>
}

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))

const { data: payload, pending, error } = await useFetch<CourseMaterialsPayload>(
  () => `/api/my-course-materials?slug=${encodeURIComponent(slug.value)}`,
  { key: () => `my-course-materials:${slug.value}` },
)

const orderedMaterials = computed(() => {
  const materials = payload.value?.materials ?? []
  return [...materials].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
})

const materialIcon = (type: MaterialType) => {
  if (type === 'PDF') return 'mdi-file-pdf-box'
  if (type === 'VIDEO') return 'mdi-play-circle-outline'
  return 'mdi-file-outline'
}
</script>

