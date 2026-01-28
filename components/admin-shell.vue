<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#app'

const sections = [
  {
    id: 'categories',
    label: 'Kategorie',
    helper: 'Tworzenie, edycja, sortowanie',
    path: '/admin/categories',
  },
  {
    id: 'courses',
    label: 'Kursy',
    helper: 'Kreator: pola, rozdziały, testy/egzaminy',
    path: '/admin/courses',
  },
  {
    id: 'user-invites',
    label: 'Zaproszenia',
    helper: 'Tworzenie zaproszeń i dostępów',
    path: '/admin/user-invites',
  },
  {
    id: 'materials',
    label: 'Materiały',
    helper: 'Biblioteka PDF / video',
    path: '/admin/materials',
  },
  {
    id: 'course-reviews',
    label: 'Opinie kursów',
    helper: 'Opinie po ukończeniu kursu',
    path: '/admin/course-reviews',
  },
  {
    id: 'site',
    label: 'Strona',
    helper: 'Treść strony głównej',
    path: '/admin/site',
  },
  {
    id: 'reviews',
    label: 'Opinie',
    helper: 'Moderacja opinii',
    path: '/admin/reviews',
  },
  {
    id: 'about-us',
    label: 'O nas',
    helper: 'Treść strony O nas',
    path: '/admin/about-us',
  },
  {
    id: 'contact-us',
    label: 'Kontakt',
    helper: 'Treść strony Kontakt',
    path: '/admin/contact-us',
  },
  {
    id: 'warunki-zakupu',
    label: 'Warunki zakupu',
    helper: 'Treść strony z regulaminem',
    path: '/admin/warunki-zakupu',
  },
  {
    id: 'dane-osobowe',
    label: 'Dane osobowe',
    helper: 'Treść strony o danych osobowych',
    path: '/admin/dane-osobowe',
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
        <div class="admin-shell__label">Admin</div>
        <div class="admin-shell__subtitle">Zarządzanie platformą</div>
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
  flex: 1;
  min-width: 0;
}

.admin-shell__content :deep(.v-container) {
  max-width: none !important;
}
</style>

