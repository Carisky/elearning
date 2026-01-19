<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { reactive, ref, watch } from 'vue'
import AdminShell from '~/components/admin-shell.vue'
import { $fetch as ofetch } from 'ofetch'

type Notification = { type: 'success' | 'error'; message: string }

const courseItemTypes = ['CHAPTER', 'QUIZ', 'EXAM'] as const
const questionTypes = ['SINGLE', 'MULTI', 'TEXT'] as const

type Course = {
  id: number
  title: string
}

type CourseItemResponse = {
  id: number
  title: string
  type: 'CHAPTER' | 'QUIZ' | 'EXAM'
  position: number
  chapter?: { contentJson?: { body?: string } | null } | null
  assessment?: {
    questions?: {
      id: number
      answers?: Array<{ id: number; text: string; isCorrect: boolean; position: number }>
    }[]
  } | null
}

const createAnswer = (position = 0) => ({
  text: '',
  isCorrect: false,
  position,
})

const createQuestion = (position = 0) => ({
  text: '',
  type: 'SINGLE' as (typeof questionTypes)[number],
  points: 1,
  position,
  answers: [createAnswer(0)],
})

const courseItemForm = reactive({
  courseId: null as number | null,
  title: '',
  position: 1,
  type: 'CHAPTER' as (typeof courseItemTypes)[number],
  isRequired: true,
  chapterContent: '',
})

const assessmentForm = reactive({
  minPassScore: 0,
  attemptsLimit: 0,
  timeLimitSec: 0,
  shuffleQuestions: false,
})

const questions = ref([createQuestion()])
const notification = ref<Notification | null>(null)
let notificationTimeout: ReturnType<typeof setTimeout> | null = null

const pushNotification = (payload: Notification) => {
  notification.value = payload
  if (notificationTimeout) {
    clearTimeout(notificationTimeout)
  }
  notificationTimeout = setTimeout(() => (notification.value = null), 4000)
}

const handleRequestError = (error: any, fallback: string) => {
  const message =
    (error?.data?.message as string) ||
    (error?.message as string) ||
    fallback
  pushNotification({ type: 'error', message })
}

const courseItems = ref<CourseItemResponse[]>([])
const courseItemsLoading = ref(false)

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: courses } = useFetch<Course[]>('/api/courses' as any, { default: () => [] })

const fetchCourseItems = async () => {
  if (!courseItemForm.courseId) {
    courseItems.value = []
    return
  }
  courseItemsLoading.value = true
  try {
    courseItems.value = await ofetch<CourseItemResponse[]>(`/api/course-items?courseId=${courseItemForm.courseId}`)
  } catch (error) {
    handleRequestError(error, 'Не удалось загрузить содержимое курса')
  } finally {
    courseItemsLoading.value = false
  }
}

watch(
  courses,
  (list) => {
    const availableCourses = list ?? []
    if (!availableCourses.length) {
      courseItemForm.courseId = null
      courseItems.value = []
      return
    }
    const firstCourse = availableCourses[0]
    if (!firstCourse) {
      courseItemForm.courseId = null
      return
    }
    if (!courseItemForm.courseId || !availableCourses.some((course) => course.id === courseItemForm.courseId)) {
      courseItemForm.courseId = firstCourse.id
    }
  },
  { immediate: true }
)

watch(() => courseItemForm.courseId, () => {
  fetchCourseItems()
})

const resetAssessmentForm = () => {
  assessmentForm.minPassScore = 0
  assessmentForm.attemptsLimit = 0
  assessmentForm.timeLimitSec = 0
  assessmentForm.shuffleQuestions = false
}

const resetCourseItemForm = () => {
  courseItemForm.title = ''
  courseItemForm.position = 1
  courseItemForm.chapterContent = ''
  courseItemForm.type = 'CHAPTER'
  courseItemForm.isRequired = true
  questions.value = [createQuestion()]
  resetAssessmentForm()
}

const addQuestion = () => {
  questions.value.push(createQuestion(questions.value.length))
}

const removeQuestion = (index: number) => {
  if (questions.value.length === 1) return
  questions.value.splice(index, 1)
}

const addAnswer = (questionIndex: number) => {
  const question = questions.value[questionIndex]
  if (!question) return
  question.answers.push(createAnswer(question.answers.length))
}

const removeAnswer = (questionIndex: number, answerIndex: number) => {
  const question = questions.value[questionIndex]
  if (!question || question.answers.length === 1) return
  question.answers.splice(answerIndex, 1)
}

const submitCourseItem = async () => {
  if (!courseItemForm.courseId || !courseItemForm.title.trim()) {
    pushNotification({
      type: 'error',
      message: 'Выберите курс и задайте название раздела или теста',
    })
    return
  }

  const payload: Record<string, any> = {
    courseId: courseItemForm.courseId,
    type: courseItemForm.type,
    title: courseItemForm.title.trim(),
    position: Number.isFinite(Number(courseItemForm.position))
      ? Number(courseItemForm.position)
      : 1,
    isRequired: courseItemForm.isRequired,
  }

  if (courseItemForm.type === 'CHAPTER') {
    payload.chapterContent = courseItemForm.chapterContent.trim()
  } else {
    payload.assessment = {
      minPassScore: Number.isFinite(Number(assessmentForm.minPassScore))
        ? Number(assessmentForm.minPassScore)
        : 0,
      attemptsLimit: Number.isFinite(Number(assessmentForm.attemptsLimit))
        ? Number(assessmentForm.attemptsLimit)
        : undefined,
      timeLimitSec: Number.isFinite(Number(assessmentForm.timeLimitSec))
        ? Number(assessmentForm.timeLimitSec)
        : undefined,
      shuffleQuestions: assessmentForm.shuffleQuestions,
      questions: questions.value.map((question, qIndex) => ({
        type: question.type,
        text: question.text.trim(),
        points: Number.isFinite(Number(question.points)) ? Number(question.points) : 1,
        position: Number.isFinite(Number(question.position)) ? Number(question.position) : qIndex,
        answers: question.answers.map((answer, aIndex) => ({
          text: answer.text.trim(),
          isCorrect: answer.isCorrect,
          position: Number.isFinite(Number(answer.position)) ? Number(answer.position) : aIndex,
        })),
      })),
    }
  }

  try {
    await ofetch('/api/course-items', {
      method: 'POST',
      body: payload,
    })
    pushNotification({ type: 'success', message: 'Раздел сохранен' })
    resetCourseItemForm()
    await fetchCourseItems()
  } catch (error) {
    handleRequestError(error, 'Не удалось сохранить элемент курса')
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
              <v-card-title>Разделы и тесты</v-card-title>
              <v-card-text>
                <v-form @submit.prevent="submitCourseItem">
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="courseItemForm.courseId"
                        :items="courses"
                        item-title="title"
                        item-value="id"
                        label="Курс"
                        required
                        class="mb-3"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model.number="courseItemForm.position"
                        label="Позиция"
                        type="number"
                        class="mb-3"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-select
                        v-model="courseItemForm.type"
                        :items="courseItemTypes"
                        label="Тип элемента"
                        class="mb-3"
                      />
                    </v-col>
                  </v-row>

                  <v-text-field
                    v-model="courseItemForm.title"
                    label="Название раздела / теста"
                    required
                    class="mb-3"
                  />
                  <v-checkbox
                    v-model="courseItemForm.isRequired"
                    label="Обязательный элемент"
                    class="mb-3"
                  />

                  <v-textarea
                    v-if="courseItemForm.type === 'CHAPTER'"
                    v-model="courseItemForm.chapterContent"
                    label="Содержимое раздела"
                    rows="4"
                    class="mb-3"
                  />

                  <div v-else>
                    <v-row>
                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model.number="assessmentForm.minPassScore"
                          label="Мин. проходной балл"
                          type="number"
                          class="mb-3"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model.number="assessmentForm.attemptsLimit"
                          label="Лимит попыток"
                          type="number"
                          class="mb-3"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model.number="assessmentForm.timeLimitSec"
                          label="Время (сек)"
                          type="number"
                          class="mb-3"
                        />
                      </v-col>
                    </v-row>
                    <v-checkbox
                      v-model="assessmentForm.shuffleQuestions"
                      label="Перемешивать вопросы"
                      class="mb-3"
                    />

                    <div v-for="(question, qIndex) in questions" :key="`question-${qIndex}`" class="mb-4">
                      <v-card outlined>
                        <v-card-title class="d-flex justify-space-between">
                          Вопрос {{ qIndex + 1 }}
                          <v-btn icon small @click="removeQuestion(qIndex)" :disabled="questions.length === 1">
                            <v-icon>mdi-close</v-icon>
                          </v-btn>
                        </v-card-title>
                        <v-card-text>
                          <v-text-field
                            v-model="question.text"
                            label="Текст вопроса"
                            required
                            class="mb-3"
                          />
                          <v-select
                            v-model="question.type"
                            :items="questionTypes"
                            label="Тип вопроса"
                            class="mb-3"
                          />
                          <v-text-field
                            v-model.number="question.points"
                            label="Баллы за вопрос"
                            type="number"
                            class="mb-3"
                          />
                          <div class="d-flex flex-column gap-3">
                            <div
                              v-for="(answer, aIndex) in question.answers"
                              :key="`answer-${qIndex}-${aIndex}`"
                              class="d-flex align-center gap-3"
                            >
                              <v-text-field
                                v-model="answer.text"
                                :label="`Ответ ${aIndex + 1}`"
                                class="flex-grow-1"
                              />
                              <v-checkbox v-model="answer.isCorrect" label="Верный" hide-details />
                              <v-btn
                                icon
                                small
                                @click="removeAnswer(qIndex, aIndex)"
                                :disabled="question.answers.length === 1"
                              >
                                <v-icon>mdi-close</v-icon>
                              </v-btn>
                            </div>
                            <v-btn text small @click="addAnswer(qIndex)">
                              Добавить ответ
                            </v-btn>
                          </div>
                        </v-card-text>
                      </v-card>
                    </div>

                    <v-btn text small class="mb-4" @click="addQuestion">
                      Добавить вопрос
                    </v-btn>
                  </div>

                  <v-btn type="submit" color="primary">Сохранить элемент</v-btn>
                </v-form>

                <v-divider class="my-4" />

                <div v-if="courseItemsLoading">
                  <v-progress-linear indeterminate color="primary" />
                </div>
                <div v-else>
                  <v-row v-if="courseItems.length">
                    <v-col cols="12" md="6" v-for="item in courseItems" :key="item.id">
                      <v-card outlined class="mb-4">
                        <v-card-title class="justify-space-between">
                          {{ item.position }}. {{ item.title }}
                          <span>{{ item.type }}</span>
                        </v-card-title>
                        <v-card-text>
                          <template v-if="item.type === 'CHAPTER'">
                            {{ item.chapter?.contentJson?.body ?? 'Контент не задан' }}
                          </template>
                          <template v-else>
                            Вопросов: {{ item.assessment?.questions?.length ?? 0 }}
                          </template>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>
                  <div v-else class="text-caption">В этом курсе пока нет элементов.</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </AdminShell>
</template>
