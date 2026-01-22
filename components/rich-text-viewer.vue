<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef } from 'vue'

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

const content = computed(() => toDeltaInstance(props.modelValue))
</script>

<template>
  <ClientOnly>
    <div class="rtv">
      <component
        :is="QuillEditor"
        v-if="QuillEditor"
        :content="content"
        content-type="delta"
        theme="snow"
        read-only
        toolbar=""
      />
    </div>
    <template #fallback>
      <div class="rtv-fallback" />
    </template>
  </ClientOnly>
</template>

<style scoped>
.rtv :deep(.ql-toolbar) {
  display: none;
}

.rtv :deep(.ql-container) {
  border: 0;
}

.rtv :deep(.ql-editor) {
  padding: 0;
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.75;
}

.rtv-fallback {
  min-height: 24px;
}
</style>
