<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef, watch } from 'vue'

const QuillEditor = process.client
  ? defineAsyncComponent(async () => {
      const mod = await import('@vueup/vue-quill')
      return mod.QuillEditor
    })
  : null

type DeltaPojo = { ops: any[] }
type DeltaLike = DeltaPojo | null

const props = defineProps<{
  modelValue: DeltaLike
  placeholder?: string
  label?: string
  readonly?: boolean
  height?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: DeltaLike): void
}>()

const deltaCtor = shallowRef<any>(null)
if (process.client) {
  import('quill-delta')
    .then((mod: any) => (deltaCtor.value = mod?.default ?? mod))
    .catch(() => (deltaCtor.value = null))
}

const toDeltaInstance = (value: any) => {
  if (!value) return null
  if (typeof value === 'object' && typeof value.slice === 'function') return value
  const Delta = deltaCtor.value
  if (!Delta) return null
  if (typeof value === 'object' && Array.isArray(value.ops)) return new Delta(value.ops)
  return null
}

const toPojo = (value: any): DeltaLike => {
  if (!value) return null
  if (typeof value === 'object' && Array.isArray(value.ops)) return { ops: value.ops }
  return null
}

const editorContent = shallowRef<any>(null)
watch(
  () => [props.modelValue, deltaCtor.value] as const,
  ([value]) => {
    editorContent.value = toDeltaInstance(value)
  },
  { immediate: true },
)

const content = computed({
  get: () => editorContent.value,
  set: (value) => emit('update:modelValue', toPojo(value)),
})

const styleVars = computed(() => ({
  '--rte-min-height': props.height ?? '220px',
}))
</script>

<template>
  <div class="rte" :style="styleVars">
    <div v-if="label" class="text-subtitle-2 mb-2">
      {{ label }}
    </div>

    <ClientOnly>
      <component
        :is="QuillEditor"
        v-if="QuillEditor"
        v-model:content="content"
        content-type="delta"
        theme="snow"
        :read-only="readonly"
        :placeholder="placeholder"
        toolbar="full"
        class="rte__editor"
      />
      <template #fallback>
        <v-skeleton-loader type="article" />
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.rte :deep(.ql-toolbar) {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-bottom: 0;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  background: rgb(var(--v-theme-surface));
}

.rte :deep(.ql-container) {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  background: rgb(var(--v-theme-surface));
}

.rte :deep(.ql-editor) {
  min-height: var(--rte-min-height);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.7;
}

.rte :deep(.ql-editor.ql-blank::before) {
  color: rgba(0, 0, 0, 0.45);
  font-style: normal;
}
</style>
