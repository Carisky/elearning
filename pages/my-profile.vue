<template>
  <section class="pa-8">
    <v-card elevation="2" class="mx-auto" max-width="560">
      <v-card-title>Moje konto</v-card-title>
      <v-card-text>
        <div v-if="!user">
          <p>Ładowanie danych użytkownika...</p>
        </div>
        <div v-else>
          <p><strong>Имя:</strong> {{ user.name || 'Без имени' }}</p>
          <p><strong>Email:</strong> {{ user.email }}</p>
        </div>
      </v-card-text>
    </v-card>
  </section>
</template>

<script setup>
definePageMeta({ middleware: 'auth' })
const { data: user } = await useFetch('/api/me', { default: null })
</script>
