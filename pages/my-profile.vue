<template>
  <section class="pa-6">
    <v-container>
      <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
        <div>
          <h1 class="text-h4 font-weight-medium">Moje Konto</h1>
          <div class="text-body-2 text-medium-emphasis">Twoje kursy, postęp i wyniki testów.</div>
        </div>

        <v-btn
          color="primary"
          variant="flat"
          :loading="learningLast"
          :disabled="pendingCourses || !myCourses.length"
          prepend-icon="mdi-play-circle-outline"
          @click="learnLast()"
        >
          Ucz się
        </v-btn>
      </div>

      <v-card elevation="2" rounded="xl">
        <v-card-text>
          <div v-if="pendingMe" class="d-flex justify-center py-10">
            <v-progress-circular indeterminate />
          </div>

          <v-alert v-else-if="!user" variant="tonal" type="warning">
            Brak dostępu. Zaloguj się ponownie.
          </v-alert>

          <template v-else>
            <div class="d-flex flex-wrap align-center ga-4 mb-6">
              <v-avatar color="primary" size="56">
                <span class="text-h6">{{ userInitials }}</span>
              </v-avatar>
              <div class="d-flex flex-column">
                <div class="text-h6">{{ user.name || user.email }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ user.email }}</div>
              </div>
            </div>

            <v-tabs v-model="tab" density="comfortable">
              <v-tab value="account">Moje konto</v-tab>
              <v-tab value="courses">Moje kursy</v-tab>
            </v-tabs>

            <v-divider class="my-4" />

            <v-window v-model="tab">
              <v-window-item value="account">
                <v-row class="ga-4">
                  <v-col cols="12" md="6">
                    <v-card variant="tonal" rounded="xl">
                      <v-card-title>Profil</v-card-title>
                      <v-card-text class="text-body-2">
                        <div><strong>Imię i nazwisko:</strong> {{ user.name || '—' }}</div>
                        <div><strong>Email:</strong> {{ user.email }}</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-window-item>

              <v-window-item value="courses">
                <v-alert v-if="coursesError" variant="tonal" type="error" class="mb-4">
                  Nie udało się załadować kursów.
                </v-alert>

                <div v-else>
                  <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-4">
                    <div class="text-subtitle-1 font-weight-medium">Moje kursy</div>

                    <v-chip-group v-model="courseFilter" mandatory selected-class="text-primary">
                      <v-chip value="all" variant="tonal">Wszystkie</v-chip>
                      <v-chip value="inProgress" variant="tonal">W trakcie</v-chip>
                      <v-chip value="completed" variant="tonal">Ukończone</v-chip>
                    </v-chip-group>
                  </div>

                  <div v-if="pendingCourses" class="d-flex justify-center py-10">
                    <v-progress-circular indeterminate />
                  </div>

                  <v-alert v-else-if="!filteredCourses.length" variant="tonal" type="info">
                    Brak kursów dla wybranego filtra.
                  </v-alert>

                  <v-row v-else class="ga-4">
                    <v-col v-for="enrollment in filteredCourses" :key="enrollment.course.id" cols="12">
                      <v-card elevation="1" rounded="xl" class="course-tile">
                        <div class="d-flex flex-wrap align-center justify-space-between ga-4 pa-4">
                          <div class="d-flex align-center ga-4">
                            <v-img
                              :src="enrollment.course.previewImageUrl || '/placeholders/banner-1.svg'"
                              width="96"
                              height="64"
                              cover
                              class="rounded-lg"
                            />

                            <div class="d-flex flex-column">
                              <div class="text-subtitle-1 font-weight-medium text-wrap">
                                {{ enrollment.course.title }}
                              </div>
                              <div class="text-body-2 text-medium-emphasis">
                                Aktywowano: {{ formatDate(enrollment.activatedAt) }}
                              </div>
                            </div>
                          </div>

                          <div class="d-flex align-center ga-6">
                            <v-progress-circular
                              :model-value="enrollment.progress.progressPercent"
                              :size="44"
                              :width="6"
                              color="primary"
                            >
                              <span class="text-caption">{{ enrollment.progress.progressPercent }}%</span>
                            </v-progress-circular>

                            <div class="d-flex flex-wrap align-center ga-2">
                              <v-btn variant="tonal" :to="`/my-courses/${enrollment.course.slug}/materials`" prepend-icon="mdi-folder-open">
                                Materiały
                              </v-btn>
                              <v-btn color="primary" variant="flat" :to="`/my-courses/${enrollment.course.slug}`">
                                Ucz się
                              </v-btn>
                            </div>
                          </div>
                        </div>

                        <v-divider />

                        <v-row class="ma-0 pa-2 text-center">
                          <v-col cols="12" sm="2">
                            <div class="text-caption text-medium-emphasis">PRE-TEST</div>
                            <div class="text-body-2">{{ formatAttempt(enrollment.preTest) }}</div>
                          </v-col>
                          <v-col cols="12" sm="2">
                            <div class="text-caption text-medium-emphasis">TEST KOŃCOWY</div>
                            <div class="text-body-2">{{ formatAttempt(enrollment.postTest) }}</div>
                          </v-col>
                          <v-col cols="12" sm="2">
                            <div class="text-caption text-medium-emphasis">STATUS</div>
                            <div class="text-body-2">{{ courseStatus(enrollment.progress) }}</div>
                          </v-col>
                          <v-col cols="12" sm="3">
                            <div class="text-caption text-medium-emphasis">DOSTĘP</div>
                            <div class="text-body-2">
                              {{
                                enrollment.expiresAt
                                  ? `${formatDate(enrollment.activatedAt)} - ${formatDate(enrollment.expiresAt)}`
                                  : 'Bez terminu'
                              }}
                            </div>
                          </v-col>
                          <v-col cols="12" sm="3">
                            <div class="text-caption text-medium-emphasis">DATA UKOŃCZENIA</div>
                            <div class="text-body-2">
                              {{ enrollment.progress.finishedAt ? formatDate(enrollment.progress.finishedAt) : '—' }}
                            </div>
                          </v-col>
                        </v-row>
                      </v-card>
                    </v-col>
                  </v-row>
                </div>
              </v-window-item>
            </v-window>
          </template>
        </v-card-text>
      </v-card>
    </v-container>
  </section>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

type MePayload = { id: number; email: string; name: string | null; role: 'USER' | 'ADMIN' }
type AttemptSummary = { score: number | null; totalPoints: number; passed: boolean | null }
type MyEnrollment = {
  activatedAt: string
  expiresAt: string | null
  course: { id: number; title: string; slug: string; previewImageUrl: string | null }
  progress: { progressPercent: number; finished: boolean; finishedAt: string | null }
  preTest: AttemptSummary | null
  postTest: AttemptSummary | null
}

const route = useRoute()
const tab = ref<'account' | 'courses'>(route.query.tab === 'courses' ? 'courses' : 'account')

watch(
  () => route.query.tab,
  (value) => {
    tab.value = value === 'courses' ? 'courses' : 'account'
  },
)

const { data: user, pending: pendingMe } = await useFetch<MePayload | null>('/api/me', { key: 'me', default: () => null })
const { data: myCourses, pending: pendingCourses, error: coursesError } = await useFetch<MyEnrollment[]>(
  '/api/my-courses',
  { key: 'my-courses', default: () => [] },
)

const userInitials = computed(() => {
  const u = user.value
  const base = (u?.name || u?.email || '').trim()
  if (!base) return 'U'
  const parts = base.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? 'U'
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : ''
  return `${first}${last}`.toUpperCase()
})

const courseFilter = ref<'all' | 'inProgress' | 'completed'>('all')
const filteredCourses = computed(() => {
  const list = myCourses.value ?? []
  if (courseFilter.value === 'completed') return list.filter((e) => Boolean(e.progress?.finished))
  if (courseFilter.value === 'inProgress') return list.filter((e) => !e.progress?.finished && (e.progress?.progressPercent ?? 0) > 0)
  return list
})

const formatDate = (value: string) => new Date(value).toLocaleDateString('pl-PL')

const courseStatus = (progress: { progressPercent: number; finished: boolean }) => {
  if (progress.finished) return 'ukończone'
  if ((progress.progressPercent ?? 0) > 0) return 'w trakcie'
  return 'nie rozpoczęte'
}

const formatAttempt = (attempt: AttemptSummary | null) => {
  if (!attempt || attempt.score === null) return '—'
  if (attempt.totalPoints > 0) return `${attempt.score}/${attempt.totalPoints}`
  return `${attempt.score} pkt`
}

const learningLast = ref(false)
const learnLast = async () => {
  if (pendingCourses.value) return
  learningLast.value = true
  try {
    let slug: string | null = null

    if (process.client) {
      slug = window.localStorage.getItem('elearning:lastCourseSlug')
    }

    if (!slug) {
      const res = await $fetch<{ slug: string | null }>('/api/my-last-course').catch(() => ({ slug: null }))
      slug = res.slug
    }

    if (!slug) {
      slug = myCourses.value?.[0]?.course?.slug ?? null
    }

    if (slug) {
      await navigateTo(`/my-courses/${slug}`)
    }
  } finally {
    learningLast.value = false
  }
}
</script>

<style scoped>
.course-tile :deep(.v-img__img) {
  border-radius: 10px;
}
</style>
