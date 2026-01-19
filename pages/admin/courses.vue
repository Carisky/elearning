<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { computed, reactive, ref, watch } from 'vue'
import AdminShell from '~/components/admin-shell.vue'

type Notification = { type: 'success' | 'error'; message: string }
type Category = { id: number; title: string; slug: string; sortOrder: number }
type Course = {
  id: number
  title: string
  slug: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  priceCents: number
  currency: string
  categoryId: number
  category?: { title: string } | null
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

type AnswerForm = {
  text: string
  isCorrect: boolean
  position: number
}

type QuestionForm = {
  text: string
  type: (typeof questionTypes)[number]
  points: number
  position: number
  answers: AnswerForm[]
}

const statusOptions = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
const questionTypes = ['SINGLE', 'MULTI', 'TEXT'] as const
const courseItemTypes = ['CHAPTER', 'QUIZ', 'EXAM'] as const

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 128)

const createAnswer = (position = 0): AnswerForm => ({
  text: '',
  isCorrect: false,
  position,
})

const createQuestion = (position = 0): QuestionForm => ({
  text: '',
  type: 'SINGLE',
  points: 1,
  position,
  answers: [createAnswer(0)],
})

const notification = ref<Notification | null>(null)
let notificationTimeout: ReturnType<typeof setTimeout> | null = null

const pushNotification = (payload: Notification) => {
  notification.value = payload
  if (notificationTimeout) clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => (notification.value = null), 4000)
}

const handleRequestError = (error: any, fallback: string) => {
  const message =
    (error?.data?.message as string) ||
    (error?.message as string) ||
    fallback
  pushNotification({ type: 'error', message })
}

const courseForm = reactive<{
  title: string
  slug: string
  price: string
  currency: string
  status: (typeof statusOptions)[number]
  categoryId: number | null
}>({
  title: '',
  slug: '',
  price: '0.00',
  currency: 'PLN',
  status: statusOptions[0],
  categoryId: null,
})

const editCourseForm = reactive<{
  title: string
  slug: string
  status: (typeof statusOptions)[number]
  currency: string
  categoryId: number | null
  price: string
}>({
  title: '',
  slug: '',
  status: statusOptions[0],
  currency: 'PLN',
  categoryId: null,
  price: '0.00',
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

const questions = ref<QuestionForm[]>([createQuestion()])

const selectedCourse = ref<Course | null>(null)
const courseItems = ref<CourseItemResponse[]>([])
const courseItemsLoading = ref(false)

const newCourseDialog = ref(false)
const editCourseDialog = ref(false)
const editTab = ref<'course' | 'content'>('course')

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: categories, refresh: refreshCategories } = useFetch<Category[]>(
  '/api/categories' as any,
  { default: () => [] }
)
const { data: courses, refresh: refreshCourses } = useFetch<Course[]>(
  '/api/courses' as any,
  { default: () => [] }
)

const categoryList = computed(() => categories.value ?? [])
const courseList = computed(() => courses.value ?? [])
const firstCategoryId = computed(() => categoryList.value[0]?.id ?? null)

watch(
  categoryList,
  (list) => {
    const first = list?.[0]
    if (!first) return
    if (courseForm.categoryId === null) courseForm.categoryId = first.id
    if (editCourseForm.categoryId === null) editCourseForm.categoryId = first.id
  },
  { immediate: true }
)

const positionify = (value: unknown, fallback: number) => {
  const candidate = Number(value)
  return Number.isFinite(candidate) ? candidate : fallback
}

const selectCourse = (course: Course) => {
  selectedCourse.value = course
}

const openCourseEditor = (course: Course) => {
  selectCourse(course)
  editTab.value = 'course'
  editCourseDialog.value = true
}

watch(
  editCourseDialog,
  (isOpen) => {
    if (isOpen) return
    selectedCourse.value = null
    courseItems.value = []
    courseItemForm.courseId = null
  },
  { immediate: true }
)

watch(
  selectedCourse,
  (course) => {
    if (!course) return
    editCourseForm.title = course.title
    editCourseForm.slug = course.slug
    editCourseForm.status = course.status
    editCourseForm.categoryId = course.categoryId
    editCourseForm.price = (course.priceCents / 100).toFixed(2)
    editCourseForm.currency = course.currency
    courseItemForm.courseId = course.id
    fetchCourseItems()
  },
  { immediate: false }
)

const submitCourse = async () => {
  if (!courseForm.title.trim() || !courseForm.categoryId) {
    pushNotification({ type: 'error', message: 'Укажите название и категорию' })
    return
  }

  try {
    await $fetch('/api/courses' as any, {
      method: 'POST',
      body: {
        title: courseForm.title.trim(),
        slug: courseForm.slug.trim() || slugify(courseForm.title),
        categoryId: courseForm.categoryId,
        price: Number.isFinite(Number(courseForm.price)) ? Number(courseForm.price) : 0,
        currency: courseForm.currency.trim() || 'PLN',
        status: courseForm.status,
      },
    })
    await refreshCourses()
    pushNotification({ type: 'success', message: 'Курс создан' })
    courseForm.title = ''
    courseForm.slug = ''
    courseForm.price = '0.00'
    courseForm.currency = 'PLN'
    courseForm.status = statusOptions[0]
    courseForm.categoryId = firstCategoryId.value
    newCourseDialog.value = false
  } catch (error) {
    handleRequestError(error, 'Не удалось создать курс')
  }
}

const updateCourse = async () => {
  if (!selectedCourse.value) return
  try {
    await $fetch(`/api/courses/${selectedCourse.value.id}` as any, {
      method: 'PUT',
      body: {
        title: editCourseForm.title.trim(),
        slug: editCourseForm.slug.trim() || slugify(editCourseForm.title),
        categoryId: editCourseForm.categoryId,
        price: Number.isFinite(Number(editCourseForm.price)) ? Number(editCourseForm.price) : 0,
        currency: editCourseForm.currency.trim() || 'PLN',
        status: editCourseForm.status,
      },
    })
    await refreshCourses()
    pushNotification({ type: 'success', message: 'Курс сохранён' })
  } catch (error) {
    handleRequestError(error, 'Не удалось сохранить курс')
  }
}

const fetchCourseItems = async () => {
  if (!courseItemForm.courseId) {
    courseItems.value = []
    return
  }
  courseItemsLoading.value = true
  try {
    courseItems.value = await $fetch<CourseItemResponse[]>(
      `/api/course-items?courseId=${courseItemForm.courseId}` as any
    )
  } catch (error) {
    handleRequestError(error, 'Не удалось загрузить элементы курса')
  } finally {
    courseItemsLoading.value = false
  }
}

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
  const candidate = questions.value[questionIndex]
  if (!candidate) return
  candidate.answers.push(createAnswer(candidate.answers.length))
}

const removeAnswer = (questionIndex: number, answerIndex: number) => {
  const candidate = questions.value[questionIndex]
  if (!candidate || candidate.answers.length === 1) return
  candidate.answers.splice(answerIndex, 1)
}

const submitCourseItem = async () => {
  if (!courseItemForm.courseId || !courseItemForm.title.trim()) {
    pushNotification({ type: 'error', message: 'Укажите название элемента' })
    return
  }

  const payload: Record<string, any> = {
    courseId: courseItemForm.courseId,
    type: courseItemForm.type,
    title: courseItemForm.title.trim(),
    position: positionify(courseItemForm.position, 1),
    isRequired: courseItemForm.isRequired,
  }

  if (courseItemForm.type === 'CHAPTER') {
    payload.chapterContent = courseItemForm.chapterContent.trim()
  } else {
    payload.assessment = {
      minPassScore: Math.max(0, positionify(assessmentForm.minPassScore, 0)),
      attemptsLimit: positionify(assessmentForm.attemptsLimit, 0) || undefined,
      timeLimitSec: positionify(assessmentForm.timeLimitSec, 0) || undefined,
      shuffleQuestions: assessmentForm.shuffleQuestions,
      questions: questions.value.map((question, qIndex) => ({
        type: question.type,
        text: question.text.trim(),
        points: Math.max(1, positionify(question.points, 1)),
        position: positionify(question.position, qIndex),
        answers: question.answers.map((answer, aIndex) => ({
          text: answer.text.trim(),
          isCorrect: answer.isCorrect,
          position: positionify(answer.position, aIndex),
        })),
      })),
    }
  }

  try {
    await $fetch('/api/course-items' as any, {
      method: 'POST',
      body: payload,
    })
    pushNotification({ type: 'success', message: 'Элемент сохранён' })
    resetCourseItemForm()
    await fetchCourseItems()
  } catch (error) {
    handleRequestError(error, 'Не удалось сохранить элемент')
  }
}
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <v-row v-if="notification" class="mb-4">
          <v-col cols="12">
            <v-alert :type="notification.type">
              {{ notification.message }}
            </v-alert>
          </v-col>
        </v-row>

        <v-row class="align-center mb-4">
          <v-col cols="12" class="d-flex justify-space-between align-center">
            <div>
              <h2 class="mb-0">Курсы</h2>
              <p class="text-caption">Создавайте курсы и управляйте их контентом</p>
            </div>
            <v-btn icon color="primary" @click="newCourseDialog = true">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-row>
              <v-col cols="12" sm="6" md="4" lg="3" v-for="course in courseList" :key="course.id">
                <v-card class="d-flex flex-column h-100" :elevation="2">
                  <v-card-title class="d-flex justify-space-between align-center">
                    <div>
                      <div class="text-h6">{{ course.title }}</div>
                      <div class="text-caption">{{ course.category?.title ?? 'Без категории' }}</div>
                    </div>
                    <v-btn icon @click="openCourseEditor(course)">
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                  </v-card-title>
                  <v-card-text class="flex-grow-1">
                    <div class="mb-2"><strong>Статус:</strong> {{ course.status }}</div>
                    <div class="mb-2">
                      <strong>Цена:</strong> {{ (course.priceCents / 100).toFixed(2) }} {{ course.currency }}
                    </div>
                    <div class="text-caption">Slug: {{ course.slug }}</div>
                  </v-card-text>
                  <v-card-actions>
                    <v-btn variant="text" size="small" @click="openCourseEditor(course)">Редактировать</v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>

      <v-dialog v-model="newCourseDialog" max-width="520">
        <v-card>
          <v-card-title class="headline">Новый курс</v-card-title>
          <v-card-text>
            <v-text-field v-model="courseForm.title" label="Название" required class="mb-3" />
            <v-text-field v-model="courseForm.slug" label="Slug (опционально)" class="mb-3" />
            <v-select
              v-model="courseForm.categoryId"
              :items="categoryList"
              item-title="title"
              item-value="id"
              label="Категория"
              required
              class="mb-3"
            />
            <v-text-field v-model="courseForm.price" label="Цена" suffix="PLN" type="number" class="mb-3" />
            <v-text-field v-model="courseForm.currency" label="Валюта" class="mb-3" />
            <v-select v-model="courseForm.status" :items="statusOptions" label="Статус" class="mb-3" />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="newCourseDialog = false">Отмена</v-btn>
            <v-btn color="primary" @click="submitCourse">Создать</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="editCourseDialog" max-width="980">
        <v-card v-if="selectedCourse">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Редактирование курса: {{ selectedCourse.title }}</span>
            <v-btn icon @click="editCourseDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>

          <v-tabs v-model="editTab" grow>
            <v-tab value="course">Курс</v-tab>
            <v-tab value="content">Разделы / тесты</v-tab>
          </v-tabs>
          <v-divider />

          <v-card-text style="max-height: 75vh; overflow: auto;">
            <v-window v-model="editTab">
              <v-window-item value="course">
                <v-text-field v-model="editCourseForm.title" label="Название" class="mb-3" />
                <v-text-field v-model="editCourseForm.slug" label="Slug" class="mb-3" />
                <v-select
                  v-model="editCourseForm.categoryId"
                  :items="categoryList"
                  item-title="title"
                  item-value="id"
                  label="Категория"
                  class="mb-3"
                />
                <v-select v-model="editCourseForm.status" :items="statusOptions" label="Статус" class="mb-3" />
                <v-text-field v-model="editCourseForm.price" label="Цена" suffix="PLN" type="number" class="mb-3" />
                <v-text-field v-model="editCourseForm.currency" label="Валюта" class="mb-3" />

                <v-btn color="primary" block @click="updateCourse">Сохранить курс</v-btn>
              </v-window-item>

              <v-window-item value="content">
                <v-form @submit.prevent="submitCourseItem">
                  <v-select v-model="courseItemForm.type" :items="courseItemTypes" label="Тип элемента" class="mb-3" />
                  <v-text-field v-model="courseItemForm.title" label="Название" required class="mb-3" />
                  <v-text-field v-model.number="courseItemForm.position" label="Позиция" type="number" class="mb-3" />
                  <v-checkbox v-model="courseItemForm.isRequired" label="Обязательный элемент" class="mb-3" />

                  <v-textarea
                    v-if="courseItemForm.type === 'CHAPTER'"
                    v-model="courseItemForm.chapterContent"
                    label="Содержимое раздела"
                    rows="4"
                    class="mb-3"
                  />

                  <div v-else>
                    <v-text-field
                      v-model.number="assessmentForm.minPassScore"
                      label="Мин. проходной балл"
                      type="number"
                      class="mb-3"
                    />
                    <v-text-field
                      v-model.number="assessmentForm.attemptsLimit"
                      label="Лимит попыток"
                      type="number"
                      class="mb-3"
                    />
                    <v-text-field
                      v-model.number="assessmentForm.timeLimitSec"
                      label="Таймер (сек)"
                      type="number"
                      class="mb-3"
                    />
                    <v-checkbox v-model="assessmentForm.shuffleQuestions" label="Перемешивать вопросы" class="mb-3" />

                    <div v-for="(question, qIndex) in questions" :key="`question-${qIndex}`" class="mb-3">
                      <v-card variant="outlined" class="pa-3">
                        <div class="d-flex justify-space-between align-center mb-2">
                          <strong>Вопрос {{ qIndex + 1 }}</strong>
                          <v-btn icon size="small" @click="removeQuestion(qIndex)" :disabled="questions.length === 1">
                            <v-icon>mdi-close</v-icon>
                          </v-btn>
                        </div>
                        <v-text-field v-model="question.text" label="Текст вопроса" required class="mb-3" />
                        <v-select v-model="question.type" :items="questionTypes" label="Тип" class="mb-3" />
                        <v-text-field v-model.number="question.points" label="Баллы" type="number" class="mb-3" />

                        <div class="d-flex flex-column gap-2">
                          <div
                            v-for="(answer, aIndex) in question.answers"
                            :key="`answer-${qIndex}-${aIndex}`"
                            class="d-flex gap-2 align-center"
                          >
                            <v-text-field v-model="answer.text" :label="`Ответ ${aIndex + 1}`" class="flex-grow-1" />
                            <v-checkbox v-model="answer.isCorrect" label="Верный" hide-details />
                            <v-btn
                              icon
                              size="small"
                              @click="removeAnswer(qIndex, aIndex)"
                              :disabled="question.answers.length === 1"
                            >
                              <v-icon>mdi-close</v-icon>
                            </v-btn>
                          </div>
                          <v-btn variant="text" size="small" @click="addAnswer(qIndex)">Добавить ответ</v-btn>
                        </div>
                      </v-card>
                    </div>

                    <v-btn variant="text" size="small" class="mb-3" @click="addQuestion">Добавить вопрос</v-btn>
                  </div>

                  <v-btn type="submit" color="primary" block>Сохранить элемент</v-btn>
                </v-form>

                <v-divider class="my-4" />
                <div v-if="courseItemsLoading">
                  <v-progress-linear indeterminate color="primary" />
                </div>
                <div v-else>
                  <v-list density="compact">
                    <v-list-item v-for="item in courseItems" :key="item.id">
                      <v-list-item-title>{{ item.position }}. {{ item.title }} · {{ item.type }}</v-list-item-title>
                      <v-list-item-subtitle>
                        {{
                          item.chapter?.contentJson?.body ??
                            (item.assessment?.questions?.length ?? 0) + ' вопросов'
                        }}
                      </v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </div>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-dialog>
    </section>
  </AdminShell>
</template>
