<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import RichTextEditor from '~/components/rich-text-editor.vue'
import type { SupportedCurrencyCode } from '~/utils/currency'
import { currencyOptions, isSupportedCurrencyCode } from '~/utils/currency'

defineOptions({ name: 'CourseWizard' })

type Notification = { type: 'success' | 'error' | 'info'; message: string }
type Category = { id: number; title: string }
type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
type CourseItemType = 'CHAPTER' | 'QUIZ' | 'EXAM'
type QuestionType = 'SINGLE' | 'MULTI' | 'TEXT'
type MaterialType = 'PDF' | 'VIDEO' | 'FILE'
type Material = { id: number; title: string; type: MaterialType; url: string }

type Course = {
  id: number
  title: string
  slug: string
  status: CourseStatus
  priceCents: number
  currency: SupportedCurrencyCode
  categoryId: number
  isFeatured: boolean
  previewImageUrl?: string | null
  descriptionJson?: any | null
  programJson?: any | null
  instructorJson?: any | null
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
  DRAFT: 'Szkic',
  PUBLISHED: 'Opublikowany',
  ARCHIVED: 'Archiwum',
}

const typeLabel: Record<CourseItemType, string> = {
  CHAPTER: 'Rozdział',
  QUIZ: 'Test',
  EXAM: 'Egzamin',
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

// Cast to `any` to avoid Nuxt typed-route inference blowing up TS ("Excessive stack depth...")
const { data: materials, refresh: refreshMaterials } = useFetch<Material[]>('/api/materials' as any, {
  default: () => [],
})
const materialList = computed(() => materials.value ?? [])

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
  currency: 'PLN' as SupportedCurrencyCode,
  status: 'DRAFT' as CourseStatus,
  isFeatured: false,
  previewImageUrl: '',
})

const courseDescriptionDelta = ref<any | null>(null)
const courseProgramDelta = ref<any | null>(null)
const courseInstructorDelta = ref<any | null>(null)
const coursePublicTab = ref<'details' | 'program' | 'instructor'>('details')
const previewFile = ref<any>(null)
const previewUploading = ref(false)

const toDeltaCourse = (contentJson: any): any => {
  if (!contentJson) return null
  if (typeof contentJson === 'object' && Array.isArray(contentJson.ops)) return contentJson
  if (typeof contentJson === 'object' && typeof contentJson.body === 'string') {
    return { ops: [{ insert: `${contentJson.body}\n` }] }
  }
  return null
}

const firstFile = (value: any): File | null => {
  if (!value) return null
  if (Array.isArray(value)) return (value[0] as File) ?? null
  return value as File
}

const uploadPreview = async (file: File | null) => {
  previewFile.value = file
  if (!file) return
  if (!internalCourseId.value) {
    notification.value = { type: 'info', message: 'Najpierw utwórz kurs, potem dodaj obrazek.' }
    previewFile.value = null
    return
  }

  previewUploading.value = true
  notification.value = null
  try {
    const form = new FormData()
    form.append('courseId', String(internalCourseId.value))
    form.append('file', file)
    const res = await $fetch<{ url: string }>('/api/uploads/course-preview', { method: 'POST', body: form })
    courseForm.previewImageUrl = res.url
    previewFile.value = null
    notification.value = { type: 'success', message: 'Obrazek został wgrany. Zapisz kurs, aby utrwalić zmianę.' }
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Nie udało się wgrać obrazka') }
  } finally {
    previewUploading.value = false
  }
}

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
    courseForm.currency = isSupportedCurrencyCode(data.currency) ? data.currency : 'PLN'
    courseForm.status = data.status ?? 'DRAFT'
    courseForm.isFeatured = Boolean((data as any).isFeatured)
    courseForm.previewImageUrl = data.previewImageUrl ?? ''
    courseDescriptionDelta.value = toDeltaCourse(data.descriptionJson)
    courseProgramDelta.value = toDeltaCourse(data.programJson)
    courseInstructorDelta.value = toDeltaCourse(data.instructorJson)
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Nie udało się załadować kursu') }
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
    notification.value = { type: 'error', message: errorMessage(e, 'Nie udało się załadować struktury') }
  } finally {
    itemsLoading.value = false
  }
}

watch(internalCourseId, () => loadItems(), { immediate: true })

const courseMaterialsLoading = ref(false)
const courseMaterialsSaving = ref(false)
const selectedMaterialIds = ref<number[]>([])

const loadCourseMaterials = async () => {
  if (!internalCourseId.value) {
    selectedMaterialIds.value = []
    return
  }
  courseMaterialsLoading.value = true
  try {
    const rows = await $fetch<Array<{ id: number; position: number }>>(
      `/api/course-materials?courseId=${internalCourseId.value}`,
    )
    selectedMaterialIds.value = [...rows]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((r) => r.id)
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Nie udało się załadować materiałów') }
  } finally {
    courseMaterialsLoading.value = false
  }
}

watch(internalCourseId, () => loadCourseMaterials(), { immediate: true })

const saveCourseMaterials = async () => {
  if (!internalCourseId.value) return
  courseMaterialsSaving.value = true
  notification.value = null
  try {
    await $fetch('/api/course-materials', {
      method: 'POST',
      body: { courseId: internalCourseId.value, materialIds: selectedMaterialIds.value },
    })
    notification.value = { type: 'success', message: 'Materiały zostały zapisane.' }
    await loadCourseMaterials()
    await refreshMaterials()
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Nie udało się zapisać materiałów') }
  } finally {
    courseMaterialsSaving.value = false
  }
}

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
    notification.value = { type: 'error', message: 'Podaj nazwę kursu' }
    return
  }
  if (!courseForm.categoryId) {
    notification.value = { type: 'error', message: 'Wybierz kategorię' }
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
        isFeatured: courseForm.isFeatured,
        previewImageUrl: courseForm.previewImageUrl.trim() || null,
        descriptionJson: courseDescriptionDelta.value,
        programJson: courseProgramDelta.value,
        instructorJson: courseInstructorDelta.value,
      },
    })
    internalCourseId.value = created.id
    await navigateTo(`/admin/courses/${created.id}`)
    notification.value = { type: 'success', message: 'Kurs został utworzony' }
    step.value = 2
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Nie udało się utworzyć kursu') }
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
        isFeatured: courseForm.isFeatured,
        previewImageUrl: courseForm.previewImageUrl.trim() || null,
        descriptionJson: courseDescriptionDelta.value,
        programJson: courseProgramDelta.value,
        instructorJson: courseInstructorDelta.value,
      },
    })
    await loadCourse()
    notification.value = { type: 'success', message: 'Kurs został zapisany' }
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Nie udało się zapisać kursu') }
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
    notification.value = { type: 'error', message: 'Podaj nazwę' }
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
    notification.value = { type: 'success', message: 'Element został dodany' }
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Nie udało się dodać') }
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

const parentSelectItems = computed(() => {
  const rootOption = { id: null as number | null, title: '— bez rodzica —' }
  const current = selectedItem.value
  if (!current) return [rootOption]
  return [rootOption, ...items.value.filter((i) => i.id !== current.id)]
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
    notification.value = { type: 'success', message: 'Zmiany zostały zapisane' }
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Nie udało się zapisać') }
  } finally {
    saving.value = false
  }
}

const deleteItem = async () => {
  const item = selectedItem.value
  if (!item) return
  const ok = window.confirm(`Usunąć "${item.title}"? Zostaną usunięte także elementy zagnieżdżone.`)
  if (!ok) return
  saving.value = true
  notification.value = null
  try {
    await $fetch(`/api/course-items/${item.id}`, { method: 'DELETE' })
    selectedItemId.value = null
    await loadItems()
    notification.value = { type: 'success', message: 'Element został usunięty' }
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Nie udało się usunąć') }
  } finally {
    saving.value = false
  }
}

const blocksToDelta = (blocks: any[]): any => {
  const ops: any[] = []
  for (const b of blocks ?? []) {
    if (!b || typeof b !== 'object') continue
    if (b.type === 'h1' || b.type === 'h2' || b.type === 'h3') {
      const level = b.type === 'h1' ? 1 : b.type === 'h2' ? 2 : 3
      const text = typeof b.text === 'string' ? b.text : ''
      if (text) ops.push({ insert: text })
      ops.push({ insert: '\n', attributes: { header: level } })
      continue
    }
    if (b.type === 'p') {
      const text = typeof b.text === 'string' ? b.text : ''
      if (text) ops.push({ insert: text })
      ops.push({ insert: '\n' })
      continue
    }
    if (b.type === 'ul' && Array.isArray(b.items)) {
      for (const it of b.items) {
        const text = typeof it === 'string' ? it : ''
        if (text) ops.push({ insert: text })
        ops.push({ insert: '\n', attributes: { list: 'bullet' } })
      }
      continue
    }
    if (typeof b.text === 'string' && b.text.trim()) {
      ops.push({ insert: b.text })
      ops.push({ insert: '\n' })
    }
  }
  return { ops }
}

const toDelta = (contentJson: any): any => {
  if (!contentJson) return null
  if (typeof contentJson === 'object' && Array.isArray(contentJson.ops)) return contentJson
  if (typeof contentJson === 'object' && typeof contentJson.body === 'string') {
    return { ops: [{ insert: `${contentJson.body}\n` }] }
  }
  if (typeof contentJson === 'object' && Array.isArray(contentJson.blocks)) {
    return blocksToDelta(contentJson.blocks)
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
    chapterDelta.value = item?.type === 'CHAPTER' ? (toDelta(item.chapter?.contentJson) ?? { ops: [] }) : null

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
    notification.value = { type: 'success', message: 'Treść została zapisana' }
  } catch (e: any) {
    notification.value = { type: 'error', message: errorMessage(e, 'Nie udało się zapisać treści') }
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
              {{ internalCourseId ? 'Kreator kursu' : 'Tworzenie kursu' }}
            </div>
            <v-chip v-if="internalCourseId" size="small" variant="tonal" prepend-icon="mdi-identifier">
              ID: {{ internalCourseId }}
            </v-chip>
            <v-chip size="small" variant="tonal" prepend-icon="mdi-layers-triple-outline">
              Elementów: {{ totalItems }}
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
            Do listy kursów
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
            title="Pola kursu"
            subtitle="Nazwa, cena, kategoria"
            editable
            @click="step = 1"
          />
          <v-divider />
          <v-stepper-item
            :value="2"
            title="Struktura"
            subtitle="Rozdziały i zagnieżdżenia"
            :disabled="!canGoStructure"
            :editable="canGoStructure"
            @click="canGoStructure && (step = 2)"
          />
          <v-divider />
          <v-stepper-item
            :value="3"
            title="Treść"
            subtitle="Rich text, testy, egzaminy"
            :disabled="!canGoContent"
            :editable="canGoContent"
            @click="canGoContent && (step = 3)"
          />
          <v-divider />
          <v-stepper-item
            :value="4"
            title="Publikacja"
            subtitle="Status"
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
                    <span>Pola podstawowe</span>
                    <v-chip size="small" variant="tonal" prepend-icon="mdi-flag-outline">
                      {{ statusLabel[courseForm.status] }}
                    </v-chip>
                  </v-card-title>
                  <v-card-text>
                    <v-alert variant="tonal" type="info" class="mb-4">
                      Pola → struktura → treść → publikacja. Kroki pomagają się nie pogubić.
                    </v-alert>
                    <v-progress-linear v-if="courseLoading" indeterminate color="primary" class="mb-4" />
                    <v-form @submit.prevent="saveCourse">
                      <v-text-field v-model="courseForm.title" label="Nazwa kursu" required class="mb-3" />
                      <v-text-field
                        v-model="courseForm.slug"
                        label="Slug (opcjonalnie)"
                        hint="Jeśli puste, zostanie wygenerowane automatycznie"
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
                            label="Kategoria"
                            class="mb-3"
                          />
                        </v-col>
                        <v-col cols="12" md="5">
                          <v-select v-model="courseForm.status" :items="statusOptions" label="Status" class="mb-3" />
                        </v-col>
                      </v-row>

                      <v-switch
                        v-model="courseForm.isFeatured"
                        color="primary"
                        inset
                        label="Bestseller (promowane na stronie głównej)"
                        class="mb-3"
                      />

                      <v-row>
                        <v-col cols="12" md="7">
                          <v-text-field v-model="courseForm.price" label="Cena" type="number" class="mb-3" />
                        </v-col>
                        <v-col cols="12" md="5">
                          <v-select
                            v-model="courseForm.currency"
                            :items="currencyOptions"
                            item-title="view"
                            item-value="code"
                            label="Waluta"
                            class="mb-3"
                          />
                        </v-col>
                      </v-row>

                      <v-divider class="my-6" />

                      <div class="text-subtitle-1 font-weight-medium mb-3">Opis i podgląd</div>

                      <v-row class="mb-3" align="start">
                        <v-col cols="12" md="5">
                          <v-img
                            v-if="courseForm.previewImageUrl"
                            :src="courseForm.previewImageUrl"
                            aspect-ratio="16/9"
                            cover
                            class="rounded-lg border"
                          />
                          <v-sheet v-else class="d-flex align-center justify-center rounded-lg border pa-6" height="160">
                            <div class="text-medium-emphasis">Brak obrazka preview</div>
                          </v-sheet>
                        </v-col>
                        <v-col cols="12" md="7">
                          <v-text-field
                            v-model="courseForm.previewImageUrl"
                            label="URL obrazka preview (opcjonalnie)"
                            hint="Możesz wkleić link lub wgrać plik"
                            persistent-hint
                            class="mb-3"
                          />
                          <v-file-input
                            :model-value="previewFile"
                            :disabled="!internalCourseId || previewUploading"
                            :loading="previewUploading"
                            accept="image/*"
                            label="Wgraj obrazek preview"
                            prepend-icon="mdi-image"
                            class="mb-2"
                            @update:model-value="(v) => uploadPreview(firstFile(v))"
                          />
                          <div v-if="!internalCourseId" class="text-caption text-medium-emphasis">
                            Aby wgrać obrazek, najpierw utwórz kurs.
                          </div>
                          <div class="d-flex flex-wrap gap-3 mt-3">
                            <v-btn
                              variant="tonal"
                              prepend-icon="mdi-image-remove-outline"
                              :disabled="!courseForm.previewImageUrl"
                              @click="courseForm.previewImageUrl = ''"
                            >
                              Wyczyść obrazek
                            </v-btn>
                          </div>
                        </v-col>
                      </v-row>

                      <v-tabs v-model="coursePublicTab" color="primary" class="mt-2">
                        <v-tab value="details">Szczegóły</v-tab>
                        <v-tab value="program">Program</v-tab>
                        <v-tab value="instructor">Prowadzący</v-tab>
                      </v-tabs>

                      <v-window v-model="coursePublicTab" class="mt-4">
                        <v-window-item value="details">
                          <RichTextEditor
                            v-model="courseDescriptionDelta"
                            label="Szczegóły (zakładka publiczna)"
                            placeholder="Opis, korzyści, wymagania..."
                            height="260px"
                          />
                        </v-window-item>

                        <v-window-item value="program">
                          <RichTextEditor
                            v-model="courseProgramDelta"
                            label="Program (zakładka publiczna)"
                            placeholder="Plan, agenda, co jest w środku..."
                            height="260px"
                          />
                        </v-window-item>

                        <v-window-item value="instructor">
                          <RichTextEditor
                            v-model="courseInstructorDelta"
                            label="Prowadzący (zakładka publiczna)"
                            placeholder="Kim jest prowadzący, doświadczenie, certyfikaty..."
                            height="260px"
                          />
                        </v-window-item>
                      </v-window>

                      <div class="d-flex flex-wrap gap-3">
                        <v-btn color="primary" type="submit" :loading="saving" prepend-icon="mdi-content-save">
                          {{ internalCourseId ? 'Zapisz' : 'Utwórz kurs' }}
                        </v-btn>
                        <v-btn variant="tonal" :disabled="!canGoStructure" prepend-icon="mdi-arrow-right" @click="step = 2">
                          Do struktury
                        </v-btn>
                      </div>
                    </v-form>
                  </v-card-text>
                </v-card>

                <v-card class="mt-6">
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span>Materiały (PDF / video / pliki)</span>
                    <v-btn variant="text" size="small" to="/admin/materials" prepend-icon="mdi-open-in-new">
                      Biblioteka
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                    <v-alert v-if="!internalCourseId" variant="tonal" type="info" class="mb-4">
                      Najpierw utwórz kurs, aby przypisać materiały.
                    </v-alert>

                    <v-progress-linear v-if="courseMaterialsLoading" indeterminate color="primary" class="mb-4" />

                    <v-autocomplete
                      v-model="selectedMaterialIds"
                      :items="materialList"
                      item-title="title"
                      item-value="id"
                      label="Przypisane materiały"
                      multiple
                      chips
                      closable-chips
                      :disabled="!internalCourseId || courseMaterialsSaving"
                      class="mb-3"
                    >
                      <template #item="{ props: itemProps, item }">
                        <v-list-item v-bind="itemProps">
                          <template #prepend>
                            <v-icon>{{
                              item.raw.type === 'PDF'
                                ? 'mdi-file-pdf-box'
                                : item.raw.type === 'VIDEO'
                                  ? 'mdi-play-circle-outline'
                                  : 'mdi-file-outline'
                            }}</v-icon>
                          </template>
                          <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
                          <v-list-item-subtitle class="text-medium-emphasis">{{ item.raw.url }}</v-list-item-subtitle>
                        </v-list-item>
                      </template>
                    </v-autocomplete>

                    <div class="d-flex justify-end gap-3 flex-wrap">
                      <v-btn
                        variant="tonal"
                        :disabled="!internalCourseId"
                        prepend-icon="mdi-refresh"
                        @click="loadCourseMaterials"
                      >
                        Odśwież
                      </v-btn>
                      <v-btn
                        color="primary"
                        variant="flat"
                        :loading="courseMaterialsSaving"
                        :disabled="!internalCourseId"
                        prepend-icon="mdi-content-save"
                        @click="saveCourseMaterials"
                      >
                        Zapisz materiały
                      </v-btn>
                    </div>
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
                    <span>Drzewo kursu</span>
                    <v-menu>
                      <template #activator="{ props: menuProps }">
                        <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" v-bind="menuProps">
                          Dodaj
                        </v-btn>
                      </template>
                      <v-list density="compact">
                        <v-list-item @click="openAdd({ type: 'CHAPTER' })">
                          <template #prepend><v-icon>{{ typeIcon.CHAPTER }}</v-icon></template>
                          <v-list-item-title>Rozdział</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="openAdd({ type: 'QUIZ' })">
                          <template #prepend><v-icon>{{ typeIcon.QUIZ }}</v-icon></template>
                          <v-list-item-title>Test</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="openAdd({ type: 'EXAM' })">
                          <template #prepend><v-icon>{{ typeIcon.EXAM }}</v-icon></template>
                          <v-list-item-title>Egzamin</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </v-card-title>
                  <v-card-text>
                    <v-progress-linear v-if="itemsLoading" indeterminate color="primary" class="mb-4" />
                    <v-alert v-if="!itemsLoading && !tree.length" variant="tonal" type="info" class="mb-4">
                      Dodaj pierwszy rozdział lub test.
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
                    <span>Ustawienia elementu</span>
                    <div class="d-flex gap-2">
                      <v-btn
                        v-if="selectedItem?.type === 'CHAPTER'"
                        size="small"
                        variant="text"
                        prepend-icon="mdi-plus"
                        @click="openAdd({ type: 'CHAPTER', parentId: selectedItemId })"
                      >
                        Podrozdział
                      </v-btn>
                      <v-btn size="small" variant="text" prepend-icon="mdi-delete" color="error" @click="deleteItem">
                        Usuń
                      </v-btn>
                    </div>
                  </v-card-title>
                  <v-card-text>
                    <template v-if="selectedItem">
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
                        <v-text-field v-model="itemEdit.title" label="Nazwa" class="mb-3" />
                        <v-row>
                          <v-col cols="12" md="4">
                            <v-text-field v-model.number="itemEdit.position" label="Pozycja" type="number" class="mb-3" />
                          </v-col>
                          <v-col cols="12" md="8">
                            <v-select
                              v-model="itemEdit.parentId"
                              :items="parentSelectItems"
                              item-title="title"
                              item-value="id"
                              label="Rodzic"
                              class="mb-3"
                            />
                          </v-col>
                        </v-row>
                        <v-switch v-model="itemEdit.isRequired" label="Wymagany" class="mb-4" />

                        <div class="d-flex flex-wrap gap-3">
                          <v-btn color="primary" type="submit" :loading="saving" prepend-icon="mdi-content-save">
                            Zapisz
                          </v-btn>
                          <v-btn variant="tonal" prepend-icon="mdi-arrow-right" :disabled="!canGoContent" @click="step = 3">
                            Do treści
                          </v-btn>
                        </div>
                      </v-form>
                    </template>
                    <v-alert v-else variant="tonal" type="info">
                      Wybierz element w drzewie.
                    </v-alert>
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
                    <span>Nawigacja</span>
                    <v-btn size="small" variant="text" prepend-icon="mdi-refresh" @click="loadItems">
                      Odśwież
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
                    <span>Edytor</span>
                    <v-btn color="primary" :loading="saving" prepend-icon="mdi-content-save" @click="saveSelectedContent">
                      Zapisz treść
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                    <v-alert v-if="!selectedItem" variant="tonal" type="info">Wybierz element po lewej.</v-alert>

                    <template v-else-if="selectedItem?.type === 'CHAPTER'">
                      <RichTextEditor
                        :key="selectedItemId ?? 'chapter'"
                        v-model="chapterDelta"
                        label="Treść rozdziału"
                        placeholder="Wpisz tekst..."
                      />
                    </template>

                    <template v-else>
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-text-field v-model.number="assessmentForm.minPassScore" label="Minimalna liczba punktów" type="number" />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-checkbox v-model="assessmentForm.shuffleQuestions" label="Losuj kolejność pytań" />
                        </v-col>
                      </v-row>
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-text-field v-model.number="assessmentForm.attemptsLimit" label="Limit prób (0 = bez limitu)" type="number" />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field v-model.number="assessmentForm.timeLimitSec" label="Limit czasu, sek (0 = bez limitu)" type="number" />
                        </v-col>
                      </v-row>

                      <v-divider class="my-4" />

                      <div class="d-flex align-center justify-space-between mb-3">
                        <div class="text-subtitle-1 font-weight-medium">Pytania</div>
                        <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addQuestion">
                          Dodaj pytanie
                        </v-btn>
                      </div>

                      <div v-for="(q, qIdx) in questions" :key="`q-${qIdx}`" class="mb-4">
                        <v-card variant="outlined">
                          <v-card-title class="d-flex align-center justify-space-between">
                            <div class="d-flex align-center gap-2">
                              <v-badge :content="qIdx + 1" color="primary" inline>
                                <v-icon>mdi-comment-question-outline</v-icon>
                              </v-badge>
                              <span class="text-subtitle-2">Pytanie</span>
                            </div>
                            <v-btn icon size="small" variant="text" @click="removeQuestion(qIdx)" :disabled="questions.length === 1">
                              <v-icon>mdi-close</v-icon>
                            </v-btn>
                          </v-card-title>
                          <v-card-text>
                            <v-text-field v-model="q.text" label="Treść pytania" class="mb-3" />
                            <v-row>
                              <v-col cols="12" md="5">
                                <v-select v-model="q.type" :items="['SINGLE', 'MULTI', 'TEXT']" label="Typ" />
                              </v-col>
                              <v-col cols="12" md="4">
                                <v-text-field v-model.number="q.points" type="number" label="Punkty" />
                              </v-col>
                              <v-col cols="12" md="3">
                                <v-text-field v-model.number="q.position" type="number" label="Pozycja" />
                              </v-col>
                            </v-row>

                            <div v-if="q.type !== 'TEXT'">
                              <div class="d-flex align-center justify-space-between mt-2 mb-2">
                                <div class="text-subtitle-2">Odpowiedzi</div>
                                <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="addAnswer(qIdx)">
                                  Dodaj
                                </v-btn>
                              </div>
                              <div v-for="(a, aIdx) in q.answers" :key="`a-${qIdx}-${aIdx}`" class="d-flex align-center gap-3 mb-2">
                                <v-text-field v-model="a.text" :label="`Odpowiedź ${aIdx + 1}`" class="flex-grow-1" />
                                <v-checkbox v-model="a.isCorrect" label="Poprawna" hide-details />
                                <v-btn icon size="small" variant="text" @click="removeAnswer(qIdx, aIdx)" :disabled="q.answers.length === 1">
                                  <v-icon>mdi-close</v-icon>
                                </v-btn>
                              </div>
                            </div>
                            <v-alert v-else variant="tonal" type="info" class="mt-3">
                              Dla pytania typu TEXT odpowiedzi nie są tworzone.
                            </v-alert>
                          </v-card-text>
                        </v-card>
                      </div>
                    </template>

                    <v-divider class="my-6" />

                    <div class="d-flex flex-wrap gap-3">
                      <v-btn variant="tonal" prepend-icon="mdi-arrow-left" @click="step = 2">
                        Wróć do struktury
                      </v-btn>
                      <v-btn
                        color="primary"
                        variant="tonal"
                        prepend-icon="mdi-arrow-right"
                        :disabled="!canGoPublish"
                        @click="step = 4"
                      >
                        Do publikacji
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
                  <v-card-title>Publikacja</v-card-title>
                  <v-card-text>
                    <v-alert variant="tonal" type="info" class="mb-4">
                      Publikacja zmienia status kursu.
                    </v-alert>
                    <div class="d-flex flex-wrap gap-3">
                      <v-btn color="primary" :loading="saving" prepend-icon="mdi-content-save" @click="saveCourse">
                        Zapisz ustawienia
                      </v-btn>
                      <v-btn variant="tonal" color="green" prepend-icon="mdi-publish" @click="courseForm.status = 'PUBLISHED'; saveCourse()">
                        Opublikuj
                      </v-btn>
                      <v-btn variant="tonal" color="orange" prepend-icon="mdi-archive-outline" @click="courseForm.status = 'ARCHIVED'; saveCourse()">
                        Archiwizuj
                      </v-btn>
                      <v-spacer />
                      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="step = 3">
                        Wróć do treści
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="5">
                <v-card variant="tonal">
                  <v-card-title>Szybki podgląd</v-card-title>
                  <v-card-text>
                    <v-list density="compact">
                      <v-list-item>
                        <v-list-item-title>Status</v-list-item-title>
                        <v-list-item-subtitle>{{ statusLabel[courseForm.status] }}</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-title>Elementy</v-list-item-title>
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
            <span>Dodaj element</span>
            <v-chip size="small" variant="tonal" :prepend-icon="typeIcon[addForm.type]">
              {{ typeLabel[addForm.type] }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-form @submit.prevent="createItem">
              <v-select v-model="addForm.type" :items="['CHAPTER', 'QUIZ', 'EXAM']" label="Typ" class="mb-3" />
              <v-text-field v-model="addForm.title" label="Nazwa" class="mb-3" />
              <v-select
                v-model="addForm.parentId"
                :items="[{ id: null, title: '— bez rodzica —' }, ...items.filter((i) => i.type === 'CHAPTER')]"
                item-title="title"
                item-value="id"
                label="Rodzic (tylko rozdział)"
                class="mb-3"
              />
              <v-switch v-model="addForm.isRequired" label="Wymagany" class="mb-2" />
              <div class="text-caption text-medium-emphasis mb-4">Pozycja: #{{ nextPosition }}</div>
              <div class="d-flex gap-3">
                <v-btn color="primary" type="submit" :loading="saving" prepend-icon="mdi-plus">Dodaj</v-btn>
                <v-btn variant="tonal" :disabled="saving" @click="addDialog = false">Anuluj</v-btn>
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


