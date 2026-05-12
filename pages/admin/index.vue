<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import AdminShell from '~/components/admin-shell.vue'

type AdminStats = {
  users: number
  courses: number
  orders: number
  enrollments: number
  revenueCents: number
  pendingReviews: number
  activeInvites: number
  latestOrders: Array<{
    id: number
    status: string
    totalCents: number
    currency: string
    createdAt: string
    user: { email: string; name: string | null }
  }>
}

const { data: stats, pending, error } = await useFetch<AdminStats>('/api/admin/stats' as any, {
  default: () => ({
    users: 0,
    courses: 0,
    orders: 0,
    enrollments: 0,
    revenueCents: 0,
    pendingReviews: 0,
    activeInvites: 0,
    latestOrders: [],
  }),
})

const statCards = computed(() => [
  { label: 'Użytkownicy', value: stats.value.users, icon: 'mdi-account-group-outline' },
  { label: 'Kursy', value: stats.value.courses, icon: 'mdi-school-outline' },
  { label: 'Zamówienia', value: stats.value.orders, icon: 'mdi-receipt-text-outline' },
  { label: 'Dostępy', value: stats.value.enrollments, icon: 'mdi-shield-check-outline' },
  { label: 'Opinie do moderacji', value: stats.value.pendingReviews, icon: 'mdi-comment-alert-outline' },
  { label: 'Aktywne zaproszenia', value: stats.value.activeInvites, icon: 'mdi-email-fast-outline' },
])

const formatMoney = (priceCents: number, currency: string) => {
  const amount = (priceCents ?? 0) / 100
  try {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const formatDate = (value: string) => new Intl.DateTimeFormat('pl-PL').format(new Date(value))
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <div class="mb-6">
          <div class="text-h5 font-weight-bold">Statystyki</div>
          <div class="text-body-2 text-medium-emphasis">
            Podstawowe wskaźniki platformy Akademia TSL.
          </div>
        </div>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-6">
          Nie udało się załadować statystyk.
        </v-alert>

        <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />

        <v-row class="mb-6">
          <v-col v-for="card in statCards" :key="card.label" cols="12" sm="6" lg="4">
            <v-card elevation="1">
              <v-card-text class="d-flex align-center ga-4">
                <v-avatar color="primary" variant="tonal">
                  <v-icon :icon="card.icon" />
                </v-avatar>
                <div>
                  <div class="text-body-2 text-medium-emphasis">{{ card.label }}</div>
                  <div class="text-h5 font-weight-bold">{{ card.value }}</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" lg="4">
            <v-card elevation="1">
              <v-card-title>Przychód</v-card-title>
              <v-card-text>
                <div class="text-h4 font-weight-bold">
                  {{ formatMoney(stats.revenueCents, 'PLN') }}
                </div>
                <div class="text-body-2 text-medium-emphasis mt-2">
                  Suma opłaconych zamówień.
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="8">
            <v-card elevation="1">
              <v-card-title>Ostatnie zamówienia</v-card-title>
              <v-card-text>
                <v-table v-if="stats.latestOrders.length" density="compact">
                  <thead>
                    <tr>
                      <th class="text-left">ID</th>
                      <th class="text-left">Użytkownik</th>
                      <th class="text-left">Status</th>
                      <th class="text-left">Data</th>
                      <th class="text-right">Kwota</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="order in stats.latestOrders" :key="order.id">
                      <td>#{{ order.id }}</td>
                      <td>{{ order.user.name || order.user.email }}</td>
                      <td>{{ order.status }}</td>
                      <td>{{ formatDate(order.createdAt) }}</td>
                      <td class="text-right">{{ formatMoney(order.totalCents, order.currency) }}</td>
                    </tr>
                  </tbody>
                </v-table>
                <v-alert v-else type="info" variant="tonal">
                  Brak zamówień.
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </AdminShell>
</template>
