<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import AdminShell from '~/components/admin-shell.vue'

type AdminUser = {
  id: number
  email: string
  name: string | null
  role: 'USER' | 'ADMIN'
  createdAt: string
  ordersCount: number
  enrollmentsCount: number
}

const { data: users, pending, error } = await useFetch<AdminUser[]>('/api/users' as any, {
  default: () => [],
})

const formatDate = (value: string) => new Intl.DateTimeFormat('pl-PL').format(new Date(value))
const openUser = (userId: number) => navigateTo(`/admin/users/${userId}`)
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <div class="mb-6">
          <div class="text-h5 font-weight-bold">Uzytkownicy</div>
          <div class="text-body-2 text-medium-emphasis">
            Lista kont, rol oraz liczby zakupow i dostepow.
          </div>
        </div>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-6">
          Nie udalo sie zaladowac uzytkownikow.
        </v-alert>

        <v-card>
          <v-card-text>
            <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />

            <v-table v-if="users.length" density="compact">
              <thead>
                <tr>
                  <th class="text-left">Uzytkownik</th>
                  <th class="text-left">Rola</th>
                  <th class="text-left">Utworzono</th>
                  <th class="text-right">Zamowienia</th>
                  <th class="text-right">Dostepy</th>
                  <th class="text-right">Statystyki</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="user in users"
                  :key="user.id"
                  class="admin-users__row"
                  tabindex="0"
                  @click="openUser(user.id)"
                  @keydown.enter="openUser(user.id)"
                >
                  <td>
                    <div class="font-weight-medium">{{ user.name || 'Bez nazwy' }}</div>
                    <div class="text-body-2 text-medium-emphasis">{{ user.email }}</div>
                  </td>
                  <td>
                    <v-chip size="small" :color="user.role === 'ADMIN' ? 'primary' : undefined" variant="tonal">
                      {{ user.role }}
                    </v-chip>
                  </td>
                  <td>{{ formatDate(user.createdAt) }}</td>
                  <td class="text-right">{{ user.ordersCount }}</td>
                  <td class="text-right">{{ user.enrollmentsCount }}</td>
                  <td class="text-right">
                    <v-btn
                      icon="mdi-chart-box-outline"
                      variant="text"
                      size="small"
                      :aria-label="`Statystyki ${user.email}`"
                      @click.stop="openUser(user.id)"
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-alert v-else type="info" variant="tonal">
              Brak uzytkownikow.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-container>
    </section>
  </AdminShell>
</template>

<style scoped>
.admin-users__row {
  cursor: pointer;
}

.admin-users__row:hover {
  background: rgba(15, 69, 87, 0.04);
}
</style>
