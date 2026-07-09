<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import AdminShell from '~/components/admin-shell.vue'

type ExamAttempt = {
  id: number
  score: number
  totalPoints: number
  percent: number
  passed: boolean
  startedAt: string
  finishedAt: string | null
}

type UserExamStats = {
  itemId: number
  title: string
  minPassScore: number
  attemptsCount: number
  passedAttempts: number
  failedAttempts: number
  latestAttempt: ExamAttempt | null
}

type UserCourseStats = {
  id: number
  title: string
  slug: string
  activatedAt: string
  expiresAt: string | null
  source: string
  progressPercent: number
  materialReadPercent: number
  finished: boolean
  finishedAt: string | null
  latestActivityAt: string
  requiredItemsCount: number
  completedItemsCount: number
  exams: UserExamStats[]
}

type AdminUserDetail = {
  user: {
    id: number
    email: string
    name: string | null
    role: 'USER' | 'ADMIN'
    createdAt: string
    updatedAt: string
  }
  summary: {
    enrolledCourses: number
    completedCourses: number
    currentCourses: number
    passedExams: number
    failedExams: number
    averageCourseProgress: number
    materialReadPercent: number
  }
  currentCourse: null | {
    id: number
    title: string
    slug: string
    progressPercent: number
    materialReadPercent: number
    latestActivityAt: string
  }
  courses: UserCourseStats[]
}

const route = useRoute()
const userId = computed(() => String(route.params.id ?? ''))

const { data: detail, pending, error } = await useFetch<AdminUserDetail>(
  () => `/api/admin/users/${userId.value}`,
  { key: () => `admin-user:${userId.value}` },
)

const formatDate = (value: string | null) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pl-PL').format(new Date(value))
}

const courseStatus = (course: UserCourseStats) => {
  if (course.finished) return 'Ukonczony'
  if (course.progressPercent > 0) return 'W trakcie'
  return 'Nie zaczety'
}

const courseStatusColor = (course: UserCourseStats) => {
  if (course.finished) return 'success'
  if (course.progressPercent > 0) return 'primary'
  return undefined
}

const examStatusLabel = (exam: UserExamStats) => {
  if (!exam.latestAttempt) return 'Brak proby'
  return exam.latestAttempt.passed ? 'Zdany' : 'Niezdany'
}

const examStatusColor = (exam: UserExamStats) => {
  if (!exam.latestAttempt) return undefined
  return exam.latestAttempt.passed ? 'success' : 'error'
}
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
          <div>
            <div class="text-h5 font-weight-bold">
              {{ detail?.user.name || detail?.user.email || 'Uzytkownik' }}
            </div>
            <div class="text-body-2 text-medium-emphasis">
              {{ detail?.user.email || 'Statystyki uzytkownika' }}
            </div>
          </div>

          <v-btn variant="tonal" prepend-icon="mdi-arrow-left" to="/admin/users">
            Wroc
          </v-btn>
        </div>

        <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />

        <v-alert v-if="error" type="error" variant="tonal" class="mb-6">
          Nie udalo sie zaladowac statystyk uzytkownika.
        </v-alert>

        <template v-if="detail">
          <v-card class="mb-6">
            <v-card-text>
              <div class="d-flex flex-wrap align-center ga-3 mb-5">
                <v-chip size="small" :color="detail.user.role === 'ADMIN' ? 'primary' : undefined" variant="tonal">
                  {{ detail.user.role }}
                </v-chip>
                <span class="text-body-2 text-medium-emphasis">
                  Konto od {{ formatDate(detail.user.createdAt) }}
                </span>
              </div>

              <v-row dense>
                <v-col cols="12" md="2">
                  <div class="admin-user-stat">
                    <div class="text-caption text-medium-emphasis">Kursy ukonczone</div>
                    <div class="text-h6">{{ detail.summary.completedCourses }} / {{ detail.summary.enrolledCourses }}</div>
                  </div>
                </v-col>
                <v-col cols="12" md="2">
                  <div class="admin-user-stat">
                    <div class="text-caption text-medium-emphasis">Aktualnie robi</div>
                    <div class="text-h6">{{ detail.summary.currentCourses }}</div>
                  </div>
                </v-col>
                <v-col cols="12" md="2">
                  <div class="admin-user-stat">
                    <div class="text-caption text-medium-emphasis">Sredni postep</div>
                    <div class="text-h6">{{ detail.summary.averageCourseProgress }}%</div>
                  </div>
                </v-col>
                <v-col cols="12" md="2">
                  <div class="admin-user-stat">
                    <div class="text-caption text-medium-emphasis">Material</div>
                    <div class="text-h6">{{ detail.summary.materialReadPercent }}%</div>
                  </div>
                </v-col>
                <v-col cols="12" md="2">
                  <div class="admin-user-stat">
                    <div class="text-caption text-medium-emphasis">Egzaminy zdane</div>
                    <div class="text-h6">{{ detail.summary.passedExams }}</div>
                  </div>
                </v-col>
                <v-col cols="12" md="2">
                  <div class="admin-user-stat">
                    <div class="text-caption text-medium-emphasis">Egzaminy niezdane</div>
                    <div class="text-h6">{{ detail.summary.failedExams }}</div>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-card class="mb-6">
            <v-card-title class="text-subtitle-1 font-weight-medium">
              Aktualny kurs
            </v-card-title>
            <v-card-text>
              <v-alert v-if="!detail.currentCourse" type="info" variant="tonal">
                Uzytkownik nie ma teraz kursu w trakcie.
              </v-alert>

              <div v-else class="admin-user-current">
                <div>
                  <div class="font-weight-medium">{{ detail.currentCourse.title }}</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Ostatnia aktywnosc: {{ formatDate(detail.currentCourse.latestActivityAt) }}
                  </div>
                </div>
                <div class="admin-user-current__progress">
                  <div class="d-flex justify-space-between text-caption mb-1">
                    <span>Postep kursu</span>
                    <span>{{ detail.currentCourse.progressPercent }}%</span>
                  </div>
                  <v-progress-linear :model-value="detail.currentCourse.progressPercent" height="8" />
                  <div class="d-flex justify-space-between text-caption mt-3 mb-1">
                    <span>Material</span>
                    <span>{{ detail.currentCourse.materialReadPercent }}%</span>
                  </div>
                  <v-progress-linear :model-value="detail.currentCourse.materialReadPercent" height="8" color="secondary" />
                </div>
              </div>
            </v-card-text>
          </v-card>

          <v-card>
            <v-card-title class="text-subtitle-1 font-weight-medium">
              Kursy uzytkownika
            </v-card-title>
            <v-card-text>
              <v-alert v-if="!detail.courses.length" type="info" variant="tonal">
                Brak dostepow do kursow.
              </v-alert>

              <v-table v-else density="compact">
                <thead>
                  <tr>
                    <th class="text-left">Kurs</th>
                    <th class="text-left">Status</th>
                    <th class="text-left">Postep</th>
                    <th class="text-left">Material</th>
                    <th class="text-left">Egzaminy</th>
                    <th class="text-left">Dostep od</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="course in detail.courses" :key="course.id">
                    <td>
                      <div class="font-weight-medium">{{ course.title }}</div>
                      <div class="text-body-2 text-medium-emphasis">
                        {{ course.completedItemsCount }} / {{ course.requiredItemsCount }} wymaganych elementow
                      </div>
                    </td>
                    <td>
                      <v-chip size="small" :color="courseStatusColor(course)" variant="tonal">
                        {{ courseStatus(course) }}
                      </v-chip>
                    </td>
                    <td class="admin-user-progress-cell">
                      <div class="d-flex justify-space-between text-caption mb-1">
                        <span>Kurs</span>
                        <span>{{ course.progressPercent }}%</span>
                      </div>
                      <v-progress-linear :model-value="course.progressPercent" height="8" />
                    </td>
                    <td class="admin-user-progress-cell">
                      <div class="d-flex justify-space-between text-caption mb-1">
                        <span>Material</span>
                        <span>{{ course.materialReadPercent }}%</span>
                      </div>
                      <v-progress-linear :model-value="course.materialReadPercent" height="8" color="secondary" />
                    </td>
                    <td>
                      <div v-if="!course.exams.length" class="text-body-2 text-medium-emphasis">
                        Brak egzaminow
                      </div>
                      <div v-else class="admin-user-exams">
                        <div v-for="exam in course.exams" :key="exam.itemId" class="admin-user-exam">
                          <div class="admin-user-exam__header">
                            <span class="admin-user-exam__title font-weight-medium">{{ exam.title }}</span>
                            <v-chip
                              class="admin-user-exam__status"
                              size="x-small"
                              :color="examStatusColor(exam)"
                              variant="tonal"
                            >
                              {{ examStatusLabel(exam) }}
                            </v-chip>
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            <template v-if="exam.latestAttempt">
                              {{ exam.latestAttempt.percent }}%,
                              {{ exam.latestAttempt.score }}/{{ exam.latestAttempt.totalPoints }} pkt,
                              prob: {{ exam.attemptsCount }}
                            </template>
                            <template v-else>
                              Brak podejsc
                            </template>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{{ formatDate(course.activatedAt) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </template>
      </v-container>
    </section>
  </AdminShell>
</template>

<style scoped>
.admin-user-stat {
  border: 1px solid rgba(15, 69, 87, 0.12);
  border-radius: 8px;
  padding: 12px;
  min-height: 76px;
}

.admin-user-current {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 420px);
  gap: 24px;
  align-items: start;
}

.admin-user-current__progress,
.admin-user-progress-cell {
  min-width: 220px;
}

.admin-user-exams {
  display: grid;
  gap: 8px;
}

.admin-user-exam {
  padding: 8px 0;
}

.admin-user-exam__header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.admin-user-exam__title {
  flex: 1 1 180px;
  min-width: 0;
}

.admin-user-exam__status {
  flex-shrink: 0;
  white-space: nowrap;
}

@media (max-width: 960px) {
  .admin-user-current {
    grid-template-columns: 1fr;
  }
}
</style>
