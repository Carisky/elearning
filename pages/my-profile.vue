<template>
  <section class="pa-8">
    <v-card elevation="2" class="mx-auto" max-width="560">
      <v-card-title>Moje konto</v-card-title>
      <v-card-text>
        <div v-if="pendingMe">
          <p>Ładowanie danych użytkownika...</p>
        </div>
        <div v-else-if="!user">
          <v-alert variant="tonal" type="warning">
            Brak dostępu. Zaloguj się ponownie.
          </v-alert>
        </div>
        <div v-else>
          <p><strong>Imię:</strong> {{ user.name || 'Bez imienia' }}</p>
          <p><strong>Email:</strong> {{ user.email }}</p>

          <v-divider class="my-4" />

          <div>
            <div class="text-h6 mb-2">Moje kursy</div>
            <v-alert v-if="coursesError" variant="tonal" type="error" class="mb-3">
              Nie udało się załadować kursów.
            </v-alert>
            <v-alert v-else-if="pendingCourses" variant="tonal" type="info" class="mb-3">
              Ładowanie kursów...
            </v-alert>
            <v-alert v-else-if="!myCourses.length" variant="tonal" type="info" class="mb-0">
              Brak aktywnych kursów.
            </v-alert>
            <v-list v-else density="compact">
              <v-list-item v-for="enrollment in myCourses" :key="enrollment.course.id">
                <v-list-item-title class="text-wrap">{{ enrollment.course.title }}</v-list-item-title>
                <v-list-item-subtitle>
                  Aktywowano: {{ new Date(enrollment.activatedAt).toLocaleDateString('pl-PL') }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </section>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

type MePayload = { id: number; email: string; name: string | null; role: 'USER' | 'ADMIN' }
type MyEnrollment = {
  activatedAt: string
  course: { id: number; title: string; slug: string }
}

const { data: user, pending: pendingMe } = await useFetch<MePayload | null>('/api/me', { key: 'me', default: () => null })
const { data: myCourses, pending: pendingCourses, error: coursesError } = await useFetch<MyEnrollment[]>(
  '/api/my-courses',
  { default: () => [] }
)
</script>

