

<template>
  <section class="users-page pa-6">
    <v-card elevation="4" class="mx-auto" max-width="960">
      <v-card-title>
        <div>
          <h1 class="mb-1">Users</h1>
          <p class="text-body-2">Registered students and instructors from the database.</p>
        </div>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <v-alert v-if="!users?.length" dense variant="tonal" class="mb-4">
          No users yet. Post to `/api/users` to see the list populate.
        </v-alert>
        <v-list v-else two-line>
          <v-list-item v-for="user in users" :key="user.id">
            <v-list-item-content>
              <v-list-item-title>{{ user.name || 'Unnamed' }}</v-list-item-title>
              <v-list-item-subtitle>{{ user.email }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </section>
</template>

<script setup>
const { data: users } = await useFetch('/api/users')
</script>
