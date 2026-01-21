<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#app'

const sections = [
  {
    id: 'categories',
    label: 'Категории',
    helper: 'Создание, редактирование, сортировка',
    path: '/admin/categories',
  },
  {
    id: 'courses',
    label: 'Курсы',
    helper: 'Мастер: поля, разделы, тесты/экзамены',
    path: '/admin/courses',
  },
  {
    id: 'site',
    label: 'Сайт',
    helper: 'Контент главной страницы',
    path: '/admin/site',
  },
] as const

const route = useRoute()
const activeSection = computed(() =>
  sections.find((section) => route.path.startsWith(section.path))?.id ?? sections[0].id
)
</script>

<template>
  <div class="admin-shell">
    <v-navigation-drawer permanent width="260" class="admin-shell__drawer" floating>
      <div class="admin-shell__header">
        <div class="admin-shell__label">Админка</div>
        <div class="admin-shell__subtitle">Управление платформой</div>
      </div>

      <v-divider />

      <v-list density="compact" nav>
        <v-list-item v-for="section in sections" :key="section.id" class="admin-shell__item">
          <NuxtLink
            :to="section.path"
            class="admin-shell__link"
            :class="{ 'admin-shell__link--active': activeSection === section.id }"
          >
            <div class="admin-shell__link-title">{{ section.label }}</div>
            <div class="admin-shell__link-helper">{{ section.helper }}</div>
          </NuxtLink>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <div class="admin-shell__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  align-items: stretch;
}

.admin-shell__drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  background-color: #0f4557;
  color: #fff;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 24px;
}

.admin-shell__header {
  padding: 0 16px 16px;
}

.admin-shell__label {
  font-weight: 700;
  font-size: 1.1rem;
}

.admin-shell__subtitle {
  font-size: 0.8rem;
  opacity: 0.75;
}

.admin-shell__item {
  padding: 0;
}

.admin-shell__link {
  display: block;
  width: 100%;
  padding: 12px 16px;
  color: #fff;
  text-decoration: none;
  border-left: 4px solid transparent;
}

.admin-shell__link--active {
  border-color: #8bd4c2;
  background-color: rgba(255, 255, 255, 0.05);
}

.admin-shell__link-title {
  font-weight: 600;
}

.admin-shell__link-helper {
  font-size: 0.75rem;
  opacity: 0.7;
}

.admin-shell__content {
  margin-left: 260px;
  width: calc(100% - 260px);
}
</style>
