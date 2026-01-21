<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import RichTextEditor from '~/components/rich-text-editor.vue'

defineOptions({ name: 'CourseWizard' })

type Notification = { type: 'success' | 'error' | 'info'; message: string }
type Category = { id: number; title: string }
type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
type CourseItemType = 'CHAPTER' | 'QUIZ' | 'EXAM'
type QuestionType = 'SINGLE' | 'MULTI' | 'TEXT'

type Course = {
  id: number
  title: string
  slug: string
  status: CourseStatus
  priceCents: number
  currency: string
  categoryId: number
}

type CourseItem = {
  id: number
  courseId: number
  parentId: number | null
  title: string
  type: CourseItemType
  position: number
  isRequired: boolean
  chapter?: { contentJson?: any | null } | null
  assessment?: {
    minPassScore: number
    attemptsLimit: number | null
    timeLimitSec: number | null
    shuffleQuestions: boolean
    questions?: Array<{
      id: number
      type: QuestionType
      text: string
      points: number
      position: number
      answers?: Array<{ id: number; text: string; isCorrect: boolean; position: number }>
    }>
  } | null
}

type AnswerForm = { text: string; isCorrect: boolean; position: number }
type QuestionForm = { text: string; type: QuestionType; points: number; position: number; answers: AnswerForm[] }

const props = defineProps<{ courseId?: number }>()

const step = ref(1)
const saving = ref(false)
const courseLoading = ref(false)
const itemsLoading = ref(false)
const notification = ref<Notification | null>(null)

const statusOptions: CourseStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED']
const statusLabel: Record<CourseStatus, string> = {
  DRAFT: 'Черновик',
  PUBLISHED: 'Опубликован',
  ARCHIVED: 'Архив',
}

const typeLabel: Record<CourseItemType, string> = {
  CHAPTER: 'Раздел',
  QUIZ: 'Тест',
  EXAM: 'Экзамен',
}

const typeIcon: Record<CourseItemType, string> = {
  CHAPTER: 'mdi-book-open-page-variant',
  QUIZ: 'mdi-help-circle-outline',
  EXAM: 'mdi-school-outline',
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 128)

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: categories } = useFetch<Category[]>('/api/categories' as any, { default: () => [] })
const categoryList = computed(() => categories.value ?? [])

const internalCourseId = ref<number | null>(Number.isFinite(Number(props.courseId)) ? Number(props.courseId) : null)
watch(
  () => props.courseId,
  (id) => (internalCourseId.value = Number.isFinite(Number(id)) ? Number(id) : null),
)

const course = ref<Course | null>(null)
const courseForm = reactive({
  title: '',
  slug: '',
  categoryId: null as number | null,
  price: '0.00',
  currency: 'PLN',
  status: 'DRAFT' as CourseStatus,
})

watch(
  categoryList,
  (list) => {
    if (!list.length) return
    if (courseForm.categoryId === null) courseForm.categoryId = list[0]!.id
  },
  { immediate: true },
)

const loadCourse = async () => {
  if (!internalCourseId.value) {
    course.value = null
    return
  }
  courseLoading.value = true
  try {
    const data = await $fetch<Course>(`/api/courses/${internalCourseId.value}`)
    course.value = data
    courseForm.title = data.title ?? ''
    courseForm.slug = data.slug ?? ''
    courseForm.categoryId = data.categoryId ?? null
    courseForm.price = (data.priceCents / 100).toFixed(2)
    courseForm.currency = data.currency ?? 'PLN'
    courseForm.status = data.status ?? 'DRAFT'
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Не удалось загрузить курс') }
  } finally {
    courseLoading.value = false
  }
}

watch(internalCourseId, () => loadCourse(), { immediate: true })

const items = ref<CourseItem[]>([])
const loadItems = async () => {
  if (!internalCourseId.value) {
    items.value = []
    return
  }
  itemsLoading.value = true
  try {
    items.value = await $fetch<CourseItem[]>(`/api/course-items?courseId=${internalCourseId.value}`)
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Не удалось загрузить структуру') }
  } finally {
    itemsLoading.value = false
  }
}

watch(internalCourseId, () => loadItems(), { immediate: true })

type TreeNode = CourseItem & { children: TreeNode[] }
const tree = computed<TreeNode[]>(() => {
  const map = new Map<number, TreeNode>()
  for (const item of items.value) map.set(item.id, { ...(item as any), children: [] })
  const roots: TreeNode[] = []
  for (const node of map.values()) {
    const parentId = node.parentId
    if (parentId && map.has(parentId)) map.get(parentId)!.children.push(node)
    else roots.push(node)
  }
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position)
    for (const n of nodes) sortRec(n.children)
  }
  sortRec(roots)
  return roots
})

type FlatNode = { id: number; title: string; type: CourseItemType; position: number; depth: number }
const flatNodes = computed<FlatNode[]>(() => {
  const out: FlatNode[] = []
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const n of nodes) {
      out.push({ id: n.id, title: n.title, type: n.type, position: n.position, depth })
      if (n.children?.length) walk(n.children, depth + 1)
    }
  }
  walk(tree.value, 0)
  return out
})

const selectedItemId = ref<number | null>(null)
const selectedItem = computed(() => items.value.find((i) => i.id === selectedItemId.value) ?? null)

watch(
  items,
  (list) => {
    if (!list.length) {
      selectedItemId.value = null
      return
    }
    if (!selectedItemId.value || !list.some((i) => i.id === selectedItemId.value)) {
      selectedItemId.value = list[0]!.id
    }
  },
  { immediate: true },
)

const totalItems = computed(() => items.value.length)
const canGoStructure = computed(() => Boolean(internalCourseId.value))
const canGoContent = computed(() => Boolean(internalCourseId.value) && totalItems.value > 0)
const canGoPublish = computed(() => Boolean(internalCourseId.value))

const errorMessage = (e: any, fallback: string) =>
  (e?.data?.message as string) ||
  (e?.data?.statusMessage as string) ||
  (e?.statusMessage as string) ||
  (e?.message as string) ||
  fallback

const createCourse = async () => {
  if (!courseForm.title.trim()) {
    notification.value = { type: 'error', message: 'Введите название курса' }
    return
  }
  if (!courseForm.categoryId) {
    notification.value = { type: 'error', message: 'Выберите категорию' }
    return
  }
  saving.value = true
  notification.value = null
  try {
    const created = await $fetch<Course>('/api/courses', {
      method: 'POST',
      body: {
        title: courseForm.title.trim(),
        slug: courseForm.slug.trim() || slugify(courseForm.title),
        categoryId: courseForm.categoryId,
        price: courseForm.price,
        currency: courseForm.currency,
        status: courseForm.status,
      },
    })
    internalCourseId.value = created.id
    await navigateTo(`/admin/courses/${created.id}`)
    notification.value = { type: 'success', message: 'Курс создан' }
    step.value = 2
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Не удалось создать курс') }
  } finally {
    saving.value = false
  }
}

const saveCourse = async () => {
  if (!internalCourseId.value) return createCourse()
  saving.value = true
  notification.value = null
  try {
    await $fetch(`/api/courses/${internalCourseId.value}`, {
      method: 'PUT',
      body: {
        title: courseForm.title.trim(),
        slug: courseForm.slug.trim(),
        categoryId: courseForm.categoryId,
        price: courseForm.price,
        currency: courseForm.currency,
        status: courseForm.status,
      },
    })
    await loadCourse()
    notification.value = { type: 'success', message: 'Курс сохранён' }
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Не удалось сохранить курс') }
  } finally {
    saving.value = false
  }
}

const nextPosition = computed(() => items.value.reduce((acc, it) => Math.max(acc, it.position), 0) + 1)
const addDialog = ref(false)
const addForm = reactive({
  type: 'CHAPTER' as CourseItemType,
  title: '',
  parentId: null as number | null,
  isRequired: true,
})

const openAdd = (preset?: Partial<typeof addForm>) => {
  addForm.type = preset?.type ?? 'CHAPTER'
  addForm.title = preset?.title ?? ''
  addForm.parentId = preset?.parentId ?? null
  addForm.isRequired = preset?.isRequired ?? true
  addDialog.value = true
}

const createItem = async () => {
  if (!internalCourseId.value) return
  if (!addForm.title.trim()) {
    notification.value = { type: 'error', message: 'Введите название' }
    return
  }
  saving.value = true
  notification.value = null
  try {
    const created = await $fetch<CourseItem>('/api/course-items', {
      method: 'POST',
      body: {
        courseId: internalCourseId.value,
        parentId: addForm.parentId,
        type: addForm.type,
        title: addForm.title.trim(),
        position: nextPosition.value,
        isRequired: addForm.isRequired,
      },
    })
    addDialog.value = false
    await loadItems()
    selectedItemId.value = created.id
    notification.value = { type: 'success', message: 'Элемент добавлен' }
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Не удалось добавить') }
  } finally {
    saving.value = false
  }
}

const itemEdit = reactive({
  title: '',
  position: 1,
  parentId: null as number | null,
  isRequired: true,
})

watch(
  selectedItem,
  (item) => {
    if (!item) return
    itemEdit.title = item.title
    itemEdit.position = item.position
    itemEdit.parentId = item.parentId
    itemEdit.isRequired = item.isRequired
  },
  { immediate: true },
)

const updateItemMeta = async () => {
  const item = selectedItem.value
  if (!item) return
  saving.value = true
  notification.value = null
  try {
    await $fetch(`/api/course-items/${item.id}`, {
      method: 'PUT',
      body: {
        title: itemEdit.title.trim(),
        position: itemEdit.position,
        parentId: itemEdit.parentId,
        isRequired: itemEdit.isRequired,
      },
    })
    await loadItems()
    notification.value = { type: 'success', message: 'Изменения сохранены' }
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Не удалось сохранить') }
  } finally {
    saving.value = false
  }
}

const deleteItem = async () => {
  const item = selectedItem.value
  if (!item) return
  const ok = window.confirm(`Удалить "${item.title}"? Удалятся и вложенные элементы.`)
  if (!ok) return
  saving.value = true
  notification.value = null
  try {
    await $fetch(`/api/course-items/${item.id}`, { method: 'DELETE' })
    selectedItemId.value = null
    await loadItems()
    notification.value = { type: 'success', message: 'Элемент удалён' }
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Не удалось удалить') }
  } finally {
    saving.value = false
  }
}

const toDelta = (contentJson: any): any => {
  if (!contentJson) return null
  if (typeof contentJson === 'object' && Array.isArray(contentJson.ops)) return contentJson
  if (typeof contentJson === 'object' && typeof contentJson.body === 'string') {
    return { ops: [{ insert: `${contentJson.body}\n` }] }
  }
  return null
}

const chapterDelta = ref<any>(null)
const assessmentForm = reactive({
  minPassScore: 0,
  attemptsLimit: 0,
  timeLimitSec: 0,
  shuffleQuestions: false,
})
const questions = ref<QuestionForm[]>([])

const createAnswer = (position = 0): AnswerForm => ({ text: '', isCorrect: false, position })
const createQuestion = (position = 0): QuestionForm => ({
  text: '',
  type: 'SINGLE',
  points: 1,
  position,
  answers: [createAnswer(0)],
})

watch(
  selectedItem,
  (item) => {
    chapterDelta.value = item?.type === 'CHAPTER' ? toDelta(item.chapter?.contentJson) : null

    if (item?.type === 'QUIZ' || item?.type === 'EXAM') {
      const a = item.assessment
      assessmentForm.minPassScore = a?.minPassScore ?? 0
      assessmentForm.attemptsLimit = a?.attemptsLimit ?? 0
      assessmentForm.timeLimitSec = a?.timeLimitSec ?? 0
      assessmentForm.shuffleQuestions = Boolean(a?.shuffleQuestions)

      const q = (a?.questions ?? []).slice().sort((x, y) => x.position - y.position)
      questions.value =
        q.length
          ? q.map((qq) => ({
              text: qq.text ?? '',
              type: qq.type ?? 'SINGLE',
              points: qq.points ?? 1,
              position: qq.position ?? 0,
              answers:
                qq.type === 'TEXT'
                  ? []
                  : (qq.answers ?? [])
                      .slice()
                      .sort((x, y) => x.position - y.position)
                      .map((aa) => ({
                        text: aa.text ?? '',
                        isCorrect: Boolean(aa.isCorrect),
                        position: aa.position ?? 0,
                      })),
            }))
          : [createQuestion(0)]
    } else {
      questions.value = [createQuestion(0)]
      assessmentForm.minPassScore = 0
      assessmentForm.attemptsLimit = 0
      assessmentForm.timeLimitSec = 0
      assessmentForm.shuffleQuestions = false
    }
  },
  { immediate: true },
)

const addQuestion = () => questions.value.push(createQuestion(questions.value.length))
const removeQuestion = (idx: number) => {
  if (questions.value.length === 1) return
  questions.value.splice(idx, 1)
}
const addAnswer = (qIdx: number) => questions.value[qIdx]?.answers.push(createAnswer(questions.value[qIdx]!.answers.length))
const removeAnswer = (qIdx: number, aIdx: number) => {
  const q = questions.value[qIdx]
  if (!q || q.answers.length === 1) return
  q.answers.splice(aIdx, 1)
}

const saveSelectedContent = async () => {
  const item = selectedItem.value
  if (!item) return
  saving.value = true
  notification.value = null
  try {
    if (item.type === 'CHAPTER') {
      await $fetch(`/api/course-items/${item.id}`, { method: 'PUT', body: { chapterContent: chapterDelta.value } })
    } else {
      await $fetch(`/api/course-items/${item.id}`, {
        method: 'PUT',
        body: {
          assessment: {
            minPassScore: assessmentForm.minPassScore,
            attemptsLimit: assessmentForm.attemptsLimit || null,
            timeLimitSec: assessmentForm.timeLimitSec || null,
            shuffleQuestions: assessmentForm.shuffleQuestions,
            questions: questions.value.map((q, idx) => ({
              type: q.type,
              text: q.text,
              points: q.points,
              position: q.position ?? idx,
              answers: q.type === 'TEXT' ? [] : q.answers,
            })),
          },
        },
      })
    }
    await loadItems()
    notification.value = { type: 'success', message: 'Контент сохранён' }
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Не удалось сохранить контент') }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="pa-2">
    <v-container fluid class="pa-0">
      <v-row class="mb-4" align="center" justify="space-between">
        <v-col cols="12" lg="8">
          <div class="d-flex align-center flex-wrap gap-3">
            <div class="text-h5 font-weight-bold">
              {{ internalCourseId ? 'Мастер курса' : 'Создание курса' }}
            </div>
            <v-chip v-if="internalCourseId" size="small" variant="tonal" prepend-icon="mdi-identifier">
              ID: {{ internalCourseId }}
            </v-chip>
            <v-chip size="small" variant="tonal" prepend-icon="mdi-layers-triple-outline">
              Элементов: {{ totalItems }}
            </v-chip>
            <v-chip v-if="course" size="small" variant="tonal" prepend-icon="mdi-flag-outline">
              {{ statusLabel[course.status] }}
            </v-chip>
          </div>
          <div v-if="course" class="text-caption text-medium-emphasis mt-1">
            {{ course.title }}
          </div>
        </v-col>
        <v-col cols="12" lg="4" class="d-flex justify-end">
          <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/admin/courses">
            К списку курсов
          </v-btn>
        </v-col>
      </v-row>

      <v-alert v-if="notification" :type="notification.type" variant="tonal" class="mb-4">
        {{ notification.message }}
      </v-alert>

      <v-stepper v-model="step" elevation="0">
        <v-stepper-header>
          <v-stepper-item
            :value="1"
            title="Поля курса"
            subtitle="Название, цена, категория"
            editable
            @click="step = 1"
          />
          <v-divider />
          <v-stepper-item
            :value="2"
            title="Структура"
            subtitle="Разделы и вложенность"
            :disabled="!canGoStructure"
            :editable="canGoStructure"
            @click="canGoStructure && (step = 2)"
          />
          <v-divider />
          <v-stepper-item
            :value="3"
            title="Контент"
            subtitle="Rich text, тесты, экзамены"
            :disabled="!canGoContent"
            :editable="canGoContent"
            @click="canGoContent && (step = 3)"
          />
          <v-divider />
          <v-stepper-item
            :value="4"
            title="Публикация"
            subtitle="Статус"
            :disabled="!canGoPublish"
            :editable="canGoPublish"
            @click="canGoPublish && (step = 4)"
          />
        </v-stepper-header>

        <v-stepper-window>
          <v-stepper-window-item :value="1">
            <v-row>
              <v-col cols="12">
                <v-card>
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span>Основные поля</span>
                    <v-chip size="small" variant="tonal" prepend-icon="mdi-flag-outline">
                      {{ statusLabel[courseForm.status] }}
                    </v-chip>
                  </v-card-title>
                  <v-card-text>
                    <v-alert variant="tonal" type="info" class="mb-4">
                      Поля → структура → контент → публикация. Шаги помогают не потеряться.
                    </v-alert>
                    <v-progress-linear v-if="courseLoading" indeterminate color="primary" class="mb-4" />
                    <v-form @submit.prevent="saveCourse">
                      <v-text-field v-model="courseForm.title" label="Название курса" required class="mb-3" />
                      <v-text-field
                        v-model="courseForm.slug"
                        label="Slug (опционально)"
                        hint="Если пусто, будет создан автоматически при создании"
                        persistent-hint
                        class="mb-3"
                      />

                      <v-row>
                        <v-col cols="12" md="7">
                          <v-select
                            v-model="courseForm.categoryId"
                            :items="categoryList"
                            item-title="title"
                            item-value="id"
                            label="Категория"
                            class="mb-3"
                          />
                        </v-col>
                        <v-col cols="12" md="5">
                          <v-select v-model="courseForm.status" :items="statusOptions" label="Статус" class="mb-3" />
                        </v-col>
                      </v-row>

                      <v-row>
                        <v-col cols="12" md="7">
                          <v-text-field v-model="courseForm.price" label="Цена" type="number" class="mb-3" />
                        </v-col>
                        <v-col cols="12" md="5">
                          <v-text-field v-model="courseForm.currency" label="Валюта" class="mb-3" />
                        </v-col>
                      </v-row>

                      <div class="d-flex flex-wrap gap-3">
                        <v-btn color="primary" type="submit" :loading="saving" prepend-icon="mdi-content-save">
                          {{ internalCourseId ? 'Сохранить' : 'Создать курс' }}
                        </v-btn>
                        <v-btn variant="tonal" :disabled="!canGoStructure" prepend-icon="mdi-arrow-right" @click="step = 2">
                          К структуре
                        </v-btn>
                      </div>
                    </v-form>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-stepper-window-item>

          <v-stepper-window-item :value="2">
            <v-row>
              <v-col cols="12" lg="5">
                <v-card>
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span>Дерево курса</span>
                    <v-menu>
                      <template #activator="{ props: menuProps }">
                        <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" v-bind="menuProps">
                          Добавить
                        </v-btn>
                      </template>
                      <v-list density="compact">
                        <v-list-item @click="openAdd({ type: 'CHAPTER' })">
                          <template #prepend><v-icon>{{ typeIcon.CHAPTER }}</v-icon></template>
                          <v-list-item-title>Раздел</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="openAdd({ type: 'QUIZ' })">
                          <template #prepend><v-icon>{{ typeIcon.QUIZ }}</v-icon></template>
                          <v-list-item-title>Тест</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="openAdd({ type: 'EXAM' })">
                          <template #prepend><v-icon>{{ typeIcon.EXAM }}</v-icon></template>
                          <v-list-item-title>Экзамен</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </v-card-title>
                  <v-card-text>
                    <v-progress-linear v-if="itemsLoading" indeterminate color="primary" class="mb-4" />
                    <v-alert v-if="!itemsLoading && !tree.length" variant="tonal" type="info" class="mb-4">
                      Добавьте первый раздел или тест.
                    </v-alert>
                    <v-list density="compact" class="py-0">
                      <v-list-item
                        v-for="node in flatNodes"
                        :key="node.id"
                        :active="node.id === selectedItemId"
                        @click="selectedItemId = node.id"
                      >
                        <template #prepend>
                          <v-icon size="18">{{ typeIcon[node.type] }}</v-icon>
                        </template>
                        <v-list-item-title class="text-wrap" :style="{ paddingLeft: `${node.depth * 14}px` }">
                          {{ node.title }}
                        </v-list-item-title>
                        <v-list-item-subtitle class="text-medium-emphasis">
                          #{{ node.position }} · {{ typeLabel[node.type] }}
                        </v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" lg="7">
                <v-card>
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span>Настройки элемента</span>
                    <div class="d-flex gap-2">
                      <v-btn
                        v-if="selectedItem?.type === 'CHAPTER'"
                        size="small"
                        variant="text"
                        prepend-icon="mdi-plus"
                        @click="openAdd({ type: 'CHAPTER', parentId: selectedItemId })"
                      >
                        Подраздел
                      </v-btn>
                      <v-btn size="small" variant="text" prepend-icon="mdi-delete" color="error" @click="deleteItem">
                        Удалить
                      </v-btn>
                    </div>
                  </v-card-title>
                  <v-card-text>
                    <v-alert v-if="!selectedItem" variant="tonal" type="info">
                      Выберите элемент в дереве.
                    </v-alert>
                    <div v-else>
                      <div class="d-flex align-center gap-3 mb-4">
                        <v-icon>{{ typeIcon[selectedItem.type] }}</v-icon>
                        <div>
                          <div class="text-subtitle-1 font-weight-medium">{{ selectedItem.title }}</div>
                          <div class="text-caption text-medium-emphasis">{{ typeLabel[selectedItem.type] }}</div>
                        </div>
                        <v-spacer />
                        <v-chip size="small" variant="tonal" prepend-icon="mdi-sort-numeric-ascending">
                          #{{ selectedItem.position }}
                        </v-chip>
                      </div>

                      <v-form @submit.prevent="updateItemMeta">
                        <v-text-field v-model="itemEdit.title" label="Название" class="mb-3" />
                        <v-row>
                          <v-col cols="12" md="4">
                            <v-text-field v-model.number="itemEdit.position" label="Позиция" type="number" class="mb-3" />
                          </v-col>
                          <v-col cols="12" md="8">
                            <v-select
                              v-model="itemEdit.parentId"
                              :items="[{ id: null, title: '— без родителя —' }, ...items.filter((i) => i.id !== selectedItem.id)]"
                              item-title="title"
                              item-value="id"
                              label="Родитель"
                              class="mb-3"
                            />
                          </v-col>
                        </v-row>
                        <v-switch v-model="itemEdit.isRequired" label="Обязательный" class="mb-4" />

                        <div class="d-flex flex-wrap gap-3">
                          <v-btn color="primary" type="submit" :loading="saving" prepend-icon="mdi-content-save">
                            Сохранить
                          </v-btn>
                          <v-btn variant="tonal" prepend-icon="mdi-arrow-right" :disabled="!canGoContent" @click="step = 3">
                            К контенту
                          </v-btn>
                        </div>
                      </v-form>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-stepper-window-item>

          <v-stepper-window-item :value="3">
            <v-row>
              <v-col cols="12" lg="4">
                <v-card>
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span>Навигация</span>
                    <v-btn size="small" variant="text" prepend-icon="mdi-refresh" @click="loadItems">
                      Обновить
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                    <v-list density="compact" class="py-0">
                      <v-list-item
                        v-for="node in flatNodes"
                        :key="node.id"
                        :active="node.id === selectedItemId"
                        @click="selectedItemId = node.id"
                      >
                        <template #prepend>
                          <v-icon size="18">{{ typeIcon[node.type] }}</v-icon>
                        </template>
                        <v-list-item-title class="text-wrap" :style="{ paddingLeft: `${node.depth * 14}px` }">
                          {{ node.title }}
                        </v-list-item-title>
                        <v-list-item-subtitle class="text-medium-emphasis">
                          #{{ node.position }} · {{ typeLabel[node.type] }}
                        </v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" lg="8">
                <v-card>
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span>Редактор</span>
                    <v-btn color="primary" :loading="saving" prepend-icon="mdi-content-save" @click="saveSelectedContent">
                      Сохранить контент
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                    <v-alert v-if="!selectedItem" variant="tonal" type="info">Выберите элемент слева.</v-alert>

                    <template v-else-if="selectedItem.type === 'CHAPTER'">
                      <RichTextEditor v-model="chapterDelta" label="Контент раздела" placeholder="Введите текст..." />
                    </template>

                    <template v-else>
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-text-field v-model.number="assessmentForm.minPassScore" label="Минимальный балл" type="number" />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-checkbox v-model="assessmentForm.shuffleQuestions" label="Перемешивать вопросы" />
                        </v-col>
                      </v-row>
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-text-field v-model.number="assessmentForm.attemptsLimit" label="Лимит попыток (0 = без лимита)" type="number" />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field v-model.number="assessmentForm.timeLimitSec" label="Лимит времени, сек (0 = без лимита)" type="number" />
                        </v-col>
                      </v-row>

                      <v-divider class="my-4" />

                      <div class="d-flex align-center justify-space-between mb-3">
                        <div class="text-subtitle-1 font-weight-medium">Вопросы</div>
                        <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addQuestion">
                          Добавить вопрос
                        </v-btn>
                      </div>

                      <div v-for="(q, qIdx) in questions" :key="`q-${qIdx}`" class="mb-4">
                        <v-card variant="outlined">
                          <v-card-title class="d-flex align-center justify-space-between">
                            <div class="d-flex align-center gap-2">
                              <v-badge :content="qIdx + 1" color="primary" inline>
                                <v-icon>mdi-comment-question-outline</v-icon>
                              </v-badge>
                              <span class="text-subtitle-2">Вопрос</span>
                            </div>
                            <v-btn icon size="small" variant="text" @click="removeQuestion(qIdx)" :disabled="questions.length === 1">
                              <v-icon>mdi-close</v-icon>
                            </v-btn>
                          </v-card-title>
                          <v-card-text>
                            <v-text-field v-model="q.text" label="Текст вопроса" class="mb-3" />
                            <v-row>
                              <v-col cols="12" md="5">
                                <v-select v-model="q.type" :items="['SINGLE', 'MULTI', 'TEXT']" label="Тип" />
                              </v-col>
                              <v-col cols="12" md="4">
                                <v-text-field v-model.number="q.points" type="number" label="Баллы" />
                              </v-col>
                              <v-col cols="12" md="3">
                                <v-text-field v-model.number="q.position" type="number" label="Позиция" />
                              </v-col>
                            </v-row>

                            <div v-if="q.type !== 'TEXT'">
                              <div class="d-flex align-center justify-space-between mt-2 mb-2">
                                <div class="text-subtitle-2">Ответы</div>
                                <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="addAnswer(qIdx)">
                                  Добавить
                                </v-btn>
                              </div>
                              <div v-for="(a, aIdx) in q.answers" :key="`a-${qIdx}-${aIdx}`" class="d-flex align-center gap-3 mb-2">
                                <v-text-field v-model="a.text" :label="`Ответ ${aIdx + 1}`" class="flex-grow-1" />
                                <v-checkbox v-model="a.isCorrect" label="Верный" hide-details />
                                <v-btn icon size="small" variant="text" @click="removeAnswer(qIdx, aIdx)" :disabled="q.answers.length === 1">
                                  <v-icon>mdi-close</v-icon>
                                </v-btn>
                              </div>
                            </div>
                            <v-alert v-else variant="tonal" type="info" class="mt-3">
                              Для TEXT-вопроса ответы не создаются.
                            </v-alert>
                          </v-card-text>
                        </v-card>
                      </div>
                    </template>

                    <v-divider class="my-6" />

                    <div class="d-flex flex-wrap gap-3">
                      <v-btn variant="tonal" prepend-icon="mdi-arrow-left" @click="step = 2">
                        Назад к структуре
                      </v-btn>
                      <v-btn
                        color="primary"
                        variant="tonal"
                        prepend-icon="mdi-arrow-right"
                        :disabled="!canGoPublish"
                        @click="step = 4"
                      >
                        К публикации
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-stepper-window-item>

          <v-stepper-window-item :value="4">
            <v-row>
              <v-col cols="12" md="7">
                <v-card>
                  <v-card-title>Публикация</v-card-title>
                  <v-card-text>
                    <v-alert variant="tonal" type="info" class="mb-4">
                      Публикация меняет статус курса.
                    </v-alert>
                    <div class="d-flex flex-wrap gap-3">
                      <v-btn color="primary" :loading="saving" prepend-icon="mdi-content-save" @click="saveCourse">
                        Сохранить настройки
                      </v-btn>
                      <v-btn variant="tonal" color="green" prepend-icon="mdi-publish" @click="courseForm.status = 'PUBLISHED'; saveCourse()">
                        Опубликовать
                      </v-btn>
                      <v-btn variant="tonal" color="orange" prepend-icon="mdi-archive-outline" @click="courseForm.status = 'ARCHIVED'; saveCourse()">
                        В архив
                      </v-btn>
                      <v-spacer />
                      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="step = 3">
                        Назад к контенту
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="5">
                <v-card variant="tonal">
                  <v-card-title>Быстрый обзор</v-card-title>
                  <v-card-text>
                    <v-list density="compact">
                      <v-list-item>
                        <v-list-item-title>Статус</v-list-item-title>
                        <v-list-item-subtitle>{{ statusLabel[courseForm.status] }}</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-title>Элементы</v-list-item-title>
                        <v-list-item-subtitle>{{ totalItems }}</v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-stepper-window-item>
        </v-stepper-window>
      </v-stepper>

      <v-dialog v-model="addDialog" max-width="1200" width="100%" scrollable>
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Добавить элемент</span>
            <v-chip size="small" variant="tonal" :prepend-icon="typeIcon[addForm.type]">
              {{ typeLabel[addForm.type] }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-form @submit.prevent="createItem">
              <v-select v-model="addForm.type" :items="['CHAPTER', 'QUIZ', 'EXAM']" label="Тип" class="mb-3" />
              <v-text-field v-model="addForm.title" label="Название" class="mb-3" />
              <v-select
                v-model="addForm.parentId"
                :items="[{ id: null, title: '— без родителя —' }, ...items.filter((i) => i.type === 'CHAPTER')]"
                item-title="title"
                item-value="id"
                label="Родитель (только раздел)"
                class="mb-3"
              />
              <v-switch v-model="addForm.isRequired" label="Обязательный" class="mb-2" />
              <div class="text-caption text-medium-emphasis mb-4">Позиция: #{{ nextPosition }}</div>
              <div class="d-flex gap-3">
                <v-btn color="primary" type="submit" :loading="saving" prepend-icon="mdi-plus">Добавить</v-btn>
                <v-btn variant="tonal" :disabled="saving" @click="addDialog = false">Отмена</v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-container>
  </section>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}
</style>


