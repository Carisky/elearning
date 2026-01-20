<template>
  <section class="course-player">
    <v-container fluid class="pa-0">
      <v-row no-gutters>
        <v-col cols="12" md="4" lg="3" class="course-player-nav">
          <div class="pa-4">
            <div class="text-h6 text-wrap">{{ payload?.course.title ?? 'Kurs' }}</div>
            <div v-if="payload?.progress" class="mt-3">
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-caption">Postęp</span>
                <span class="text-caption">{{ payload.progress.progressPercent }}%</span>
              </div>
              <v-progress-linear :model-value="payload.progress.progressPercent" height="8" rounded />
            </div>
          </div>

          <v-divider />

          <v-alert v-if="error" variant="tonal" type="error" class="ma-4">
            Nie udało się załadować kursu.
          </v-alert>
          <v-alert v-else-if="pending" variant="tonal" type="info" class="ma-4">
            Ładowanie...
          </v-alert>

          <v-list v-else density="compact" class="py-0">
            <v-list-item
              v-for="item in payload?.items ?? []"
              :key="item.id"
              :active="item.id === selectedItemId"
              @click="selectItem(item.id)"
            >
              <template #prepend>
                <v-icon :color="isCompleted(item.id) ? 'green' : undefined">
                  {{ isCompleted(item.id) ? 'mdi-check-circle' : itemIcon(item.type) }}
                </v-icon>
              </template>

              <v-list-item-title class="text-wrap">{{ item.title }}</v-list-item-title>
              <v-list-item-subtitle v-if="latestAttempt(item.id)" class="text-wrap">
                Ostatni wynik: {{ latestAttempt(item.id)?.score }} pkt
                <span v-if="latestAttempt(item.id)?.passed">• Zdane</span>
                <span v-else>• Niezdane</span>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-col>

        <v-col cols="12" md="8" lg="9" class="course-player-main">
          <div class="pa-6">
            <v-alert v-if="actionError" variant="tonal" type="error" class="mb-4">
              {{ actionError }}
            </v-alert>

            <v-alert v-if="!currentItem && !pending && !error" variant="tonal" type="info">
              Brak materiałów w kursie.
            </v-alert>

            <template v-else-if="currentItem">
              <div class="d-flex flex-wrap align-center justify-space-between mb-4 gap-2">
                <div class="text-h5 text-wrap">{{ currentItem.title }}</div>
                <v-chip v-if="currentItem.type === 'CHAPTER'" variant="tonal">Materiał</v-chip>
                <v-chip v-else-if="currentItem.type === 'QUIZ'" variant="tonal">Test</v-chip>
                <v-chip v-else-if="currentItem.type === 'EXAM'" variant="tonal">Egzamin</v-chip>
              </div>

              <v-card v-if="currentItem.type === 'CHAPTER'" elevation="1">
                <v-card-text class="chapter-content">
                  {{ currentItem.chapterContent || 'Brak treści.' }}
                </v-card-text>
                <v-divider />
                <v-card-actions v-if="!isReadOnly" class="justify-end">
                  <v-btn color="primary" variant="flat" :loading="completing" @click="completeAndNext()">
                    Dalej
                  </v-btn>
                </v-card-actions>
              </v-card>

              <v-card v-else elevation="1">
                <v-card-text>
                  <v-alert v-if="assessmentError" variant="tonal" type="error" class="mb-4">
                    {{ assessmentError }}
                  </v-alert>

                  <div v-if="displayResult" class="mb-6">
                    <div class="d-flex flex-wrap align-center gap-6">
                      <v-progress-circular
                        :model-value="displayResult.percent"
                        :color="displayResult.passed ? 'green' : 'orange'"
                        size="140"
                        width="10"
                      >
                        <div class="text-center">
                          <div class="text-h6">{{ displayResult.percent }}%</div>
                          <div class="text-caption">
                            {{ displayResult.score }}/{{ displayResult.totalPoints }} pkt
                          </div>
                        </div>
                      </v-progress-circular>

                      <div>
                        <div class="text-h6 mb-2">
                          <span v-if="displayResult.passed">Zdane</span>
                          <span v-else>Niezdane</span>
                        </div>
                        <div class="text-body-2">Pytania: {{ displayResult.stats.questions }}</div>
                        <div class="text-body-2">Poprawne: {{ displayResult.stats.correct }}</div>
                        <div class="text-body-2">Błędne: {{ displayResult.stats.wrong }}</div>
                        <div class="text-body-2">Pominięte: {{ displayResult.stats.skipped }}</div>
                      </div>
                    </div>
                  </div>

                  <div v-if="isReadOnly" class="d-flex justify-end">
                    <v-btn variant="flat" color="primary" @click="finishCourse()">
                      Zakończ
                    </v-btn>
                  </div>

                  <v-form v-else-if="currentItem.assessment">
                    <div v-for="q in currentItem.assessment.questions" :key="q.id" class="mb-6">
                      <div class="font-weight-medium text-wrap mb-2">
                        {{ q.text }} <span class="text-caption">({{ q.points }} pkt)</span>
                      </div>

                      <template v-if="q.type === 'SINGLE'">
                        <v-radio-group v-model="answers[q.id]" density="compact">
                          <v-radio v-for="a in q.answers" :key="a.id" :label="a.text" :value="a.id" />
                        </v-radio-group>
                      </template>

                      <template v-else-if="q.type === 'MULTI'">
                        <div class="d-flex flex-column gap-1">
                          <v-checkbox
                            v-for="a in q.answers"
                            :key="a.id"
                            density="compact"
                            :label="a.text"
                            :model-value="multiSelected(q.id).includes(a.id)"
                            @update:model-value="toggleMulti(q.id, a.id, $event)"
                          />
                        </div>
                      </template>

                      <template v-else>
                        <v-text-field v-model="answers[q.id]" density="compact" label="Twoja odpowiedź" />
                      </template>
                    </div>

                    <div class="d-flex flex-wrap justify-end gap-2">
                      <template v-if="!assessmentResult">
                        <v-btn variant="text" :disabled="submitting" @click="resetAssessment()">
                          Wyczyść
                        </v-btn>
                        <v-btn color="primary" variant="flat" :loading="submitting" @click="submitAssessment()">
                          Zakończ
                        </v-btn>
                      </template>

                      <template v-else>
                        <v-btn variant="outlined" color="primary" :disabled="submitting" @click="resetAssessment()">
                          Spróbuj ponownie
                        </v-btn>
                        <v-btn variant="flat" color="primary" @click="finishCourse()">
                          Zakończ
                        </v-btn>
                        <v-btn
                          v-if="assessmentResult.passed && !isEndOfCourse"
                          color="success"
                          variant="flat"
                          :disabled="submitting || completing"
                          @click="goNext()"
                        >
                          Dalej
                        </v-btn>
                      </template>
                    </div>
                  </v-form>
                </v-card-text>
              </v-card>
            </template>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

type CourseItemType = 'CHAPTER' | 'QUIZ' | 'EXAM'
type QuestionType = 'SINGLE' | 'MULTI' | 'TEXT'

type MyCoursePayload = {
  course: { id: number; title: string; slug: string }
  progress: { progressPercent: number; finished: boolean; finishedAt: string | null; updatedAt: string | null }
  completedItemIds: number[]
  latestAttemptsByItemId: Record<
    string,
    { id: number; score: number; passed: boolean; startedAt: string; finishedAt: string | null }
  >
  items: Array<{
    id: number
    type: CourseItemType
    title: string
    position: number
    isRequired: boolean
    chapterContent: string | null
    assessment: null | {
      minPassScore: number
      attemptsLimit: number | null
      timeLimitSec: number | null
      questions: Array<{
        id: number
        type: QuestionType
        text: string
        points: number
        position: number
        answers: Array<{ id: number; text: string }>
      }>
    }
  }>
}

type AssessmentResult = {
  attemptId: number
  score: number
  totalPoints: number
  percent: number
  passed: boolean
  stats: { questions: number; correct: number; wrong: number; skipped: number }
}

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))

const { data: payload, pending, error, refresh } = await useFetch<MyCoursePayload>(() => `/api/my-courses/${slug.value}`, {
  key: () => `my-course:${slug.value}`,
})

const selectedItemId = ref<number | null>(null)
const completedSet = computed(() => new Set(payload.value?.completedItemIds ?? []))

const currentItem = computed(() => {
  const items = payload.value?.items ?? []
  if (!items.length) return null
  const id = selectedItemId.value ?? items[0]?.id ?? null
  return items.find((i) => i.id === id) ?? items[0] ?? null
})

const hasPassedExam = computed(() => {
  const items = payload.value?.items ?? []
  const attempts = payload.value?.latestAttemptsByItemId ?? {}
  return items.some((item) => item.type === 'EXAM' && attempts[String(item.id)]?.passed)
})

const isReadOnly = computed(() => Boolean(payload.value?.progress?.finished) || hasPassedExam.value)

const isEndOfCourse = computed(() => {
  const items = payload.value?.items ?? []
  const current = currentItem.value
  if (!current || !items.length) return false
  const isLast = items[items.length - 1]?.id === current.id
  const finished = Boolean(payload.value?.progress?.finished)
  return isLast || finished
})

watch(
  () => payload.value?.items?.[0]?.id ?? null,
  (firstId) => {
    if (!selectedItemId.value && firstId) selectedItemId.value = firstId
  },
  { immediate: true },
)

const isCompleted = (courseItemId: number) => completedSet.value.has(courseItemId)
const itemIcon = (type: CourseItemType) => {
  if (type === 'CHAPTER') return 'mdi-file-document-outline'
  if (type === 'QUIZ') return 'mdi-help-circle-outline'
  return 'mdi-school-outline'
}

const latestAttempt = (courseItemId: number) => {
  const map = payload.value?.latestAttemptsByItemId ?? {}
  return map[String(courseItemId)] ?? null
}

const selectItem = (id: number) => {
  selectedItemId.value = id
  resetAssessment()
}

const completing = ref(false)
const actionError = ref<string>('')
const completeItem = async (courseItemId: number) => {
  if (isReadOnly.value) return

  completing.value = true
  actionError.value = ''
  try {
    const res = await $fetch<{ ok: true; progress: { progressPercent: number; finished: boolean } }>(
      '/api/my-course-item-progress',
      {
        method: 'POST',
        body: { courseItemId },
      },
    )
    if (payload.value) {
      payload.value.completedItemIds = Array.from(new Set([...(payload.value.completedItemIds ?? []), courseItemId]))
      payload.value.progress = {
        ...payload.value.progress,
        progressPercent: res.progress.progressPercent,
        finished: res.progress.finished,
      }
    }
    await refresh()
    await refreshNuxtData('my-courses')
  } catch (e: any) {
    actionError.value = e?.data?.message ?? e?.message ?? 'Nie udało się zapisać postępu.'
  } finally {
    completing.value = false
  }
}

const goNext = () => {
  const items = payload.value?.items ?? []
  const current = currentItem.value
  if (!current) return
  const idx = items.findIndex((i) => i.id === current.id)
  const next = idx >= 0 ? items[idx + 1] : null
  if (next) selectItem(next.id)
}

const completeAndNext = async () => {
  const current = currentItem.value
  if (!current) return
  await completeItem(current.id)
  goNext()
}

const answers = reactive<Record<number, any>>({})
const assessmentResult = ref<AssessmentResult | null>(null)
const assessmentError = ref<string>('')
const submitting = ref(false)

const totalPointsFor = (item: MyCoursePayload['items'][number] | null) => {
  if (!item?.assessment) return 0
  return item.assessment.questions.reduce((acc, q) => acc + (q.points ?? 0), 0)
}

const displayResult = computed<AssessmentResult | null>(() => {
  if (assessmentResult.value) return assessmentResult.value
  const item = currentItem.value
  if (!item || item.type === 'CHAPTER') return null
  const attempt = latestAttempt(item.id)
  if (!attempt) return null

  const totalPoints = totalPointsFor(item)
  const percent = totalPoints > 0 ? Math.round((attempt.score / totalPoints) * 100) : 0

  return {
    attemptId: attempt.id,
    score: attempt.score,
    totalPoints,
    percent,
    passed: attempt.passed,
    stats: {
      questions: item.assessment?.questions?.length ?? 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
    },
  }
})

const resetAssessment = () => {
  assessmentResult.value = null
  assessmentError.value = ''
  for (const key of Object.keys(answers)) delete (answers as any)[key]
}

const finishCourse = async () => {
  await navigateTo('/my-profile?tab=courses')
}

const multiSelected = (questionId: number): number[] => {
  const raw = answers[questionId]
  return Array.isArray(raw) ? raw : []
}

const toggleMulti = (questionId: number, answerId: number, checked: boolean) => {
  const current = new Set<number>(multiSelected(questionId))
  if (checked) current.add(answerId)
  else current.delete(answerId)
  answers[questionId] = Array.from(current)
}

const submitAssessment = async () => {
  if (isReadOnly.value) return

  const item = currentItem.value
  if (!item?.assessment) return

  submitting.value = true
  assessmentError.value = ''
  actionError.value = ''
  try {
    const res = await $fetch<{
      ok: true
      attemptId: number
      score: number
      totalPoints: number
      percent: number
      passed: boolean
      stats: { questions: number; correct: number; wrong: number; skipped: number }
    }>('/api/assessment-attempts', {
      method: 'POST',
      body: { courseItemId: item.id, answers },
    })

    assessmentResult.value = {
      attemptId: res.attemptId,
      score: res.score,
      totalPoints: res.totalPoints,
      percent: res.percent,
      passed: res.passed,
      stats: res.stats,
    }

    await refresh()
    await refreshNuxtData('my-courses')
    if (res.passed && payload.value) {
      payload.value.completedItemIds = Array.from(new Set([...(payload.value.completedItemIds ?? []), item.id]))
    }
  } catch (e: any) {
    assessmentError.value = e?.data?.message ?? e?.message ?? 'Nie udało się wysłać odpowiedzi.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.course-player {
  min-height: calc(100vh - 64px);
}

.course-player-nav {
  border-right: 1px solid rgba(15, 69, 87, 0.15);
  background: rgba(209, 225, 203, 0.4);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
}

.course-player-nav :deep(.v-list) {
  flex: 1;
  overflow: auto;
}

.course-player-main {
  background: transparent;
}

.chapter-content {
  white-space: pre-wrap;
  line-height: 1.6;
}

.gap-2 {
  gap: 8px;
}

.gap-6 {
  gap: 24px;
}
</style>

