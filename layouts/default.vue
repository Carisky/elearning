<template>
  <v-app class="site-shell">
    <v-app-bar elevate-on-scroll height="64">
      <v-toolbar-title class="font-weight-medium">E-Learning</v-toolbar-title>
      <v-spacer />
      <NuxtLink class="nav-link mr-4" to="/about-us">O NAS</NuxtLink>
      <NuxtLink class="nav-link mr-4" to="/courses">KURSY</NuxtLink>
      <NuxtLink class="nav-link mr-4" to="/contact-us">KONTAKT</NuxtLink>
      <v-btn text class="me-2" @click="openLogin">Zaloguj</v-btn>
      <v-btn text @click="handleLogout">Wyloguj</v-btn>
    </v-app-bar>

    <v-main class="pa-10">
      <NuxtPage />
    </v-main>

    <v-dialog v-model="loginDialog" width="420" persistent>
      <v-card>
        <v-card-title>Logowanie</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="submitLogin">
            <v-text-field
              label="Email"
              v-model="loginForm.email"
              type="email"
              required
            />
            <v-text-field
              label="Hasło"
              v-model="loginForm.password"
              type="password"
              required
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeLogin">Anuluj</v-btn>
          <v-btn color="primary" @click="submitLogin">Zaloguj</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
const loginDialog = ref(false)
const loginForm = reactive({ email: '', password: '' })

const openLogin = () => {
  loginDialog.value = true
}

const closeLogin = () => {
  loginDialog.value = false
}

const submitLogin = () => {
  console.info('Login payload', { ...loginForm })
  closeLogin()
}

const handleLogout = async () => {
  await $fetch('/api/logout', { method: 'POST' })
}
</script>

<style>
.site-shell {
  min-height: 100vh;
  background-color: #F2E7CF;
}

.site-shell v-app-bar {
  background: #D1E1CB !important;
}

.site-shell .v-toolbar-title,
.site-shell .nav-link,
.site-shell .v-btn {
  color: #0F4557 !important;
}

.site-shell .v-btn--text:hover {
  background-color: rgba(120, 206, 139, 0.12);
}

.site-shell .v-card {
  background-color: #D1E1CB !important;
  color: #0F4557 !important;
}

.site-shell .v-alert {
  background-color: rgba(209, 225, 203, 0.9);
  color: #0F4557;
}

.site-shell .v-btn[class*='v-btn--text']:hover {
  color: #1FAD83 !important;
}

.nav-link {
  color: #0F4557;
  text-transform: uppercase;
  font-size: 0.9rem;
}

.nav-link:hover {
  text-decoration: none;
  color: #1FAD83;
}

body {
  background-color: #F2E7CF;
  color: #0F4557;
}

.site-shell .v-main {
  background-color: transparent;
}
</style>
