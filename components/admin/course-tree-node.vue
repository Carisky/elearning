<script setup lang="ts">
import { computed } from 'vue'
type CourseItemType = 'CHAPTER' | 'QUIZ' | 'EXAM'
type Node = {
  id: number
  title: string
  type: CourseItemType
  position: number
  children: Node[]
}

const props = defineProps<{
  node: Node
  activeId: number | null
  depth?: number
}>()

const emit = defineEmits<{
  (e: 'select', id: number): void
}>()

const depth = computed(() => props.depth ?? 0)

const iconFor = (type: CourseItemType) => {
  if (type === 'CHAPTER') return 'mdi-book-open-page-variant'
  if (type === 'QUIZ') return 'mdi-help-circle-outline'
  return 'mdi-school-outline'
}
</script>

<template>
  <div class="tree-node">
    <div
      class="tree-row"
      :class="{ 'tree-row--active': activeId === node.id }"
      :style="{ paddingLeft: `${depth * 16}px` }"
      @click="emit('select', node.id)"
    >
      <v-icon size="18">{{ iconFor(node.type) }}</v-icon>
      <div class="tree-title">
        <div class="tree-title__main">{{ node.title }}</div>
        <div class="tree-title__sub">#{{ node.position }} · {{ node.type }}</div>
      </div>
    </div>

    <CourseTreeNode
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :active-id="activeId"
      :depth="depth + 1"
      @select="emit('select', $event)"
    />
  </div>
</template>

<style scoped>
.tree-row {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  background: rgb(var(--v-theme-surface));
  margin-bottom: 6px;
}

.tree-row--active {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.15);
}

.tree-title__main {
  font-weight: 600;
  line-height: 1.2;
}

.tree-title__sub {
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
