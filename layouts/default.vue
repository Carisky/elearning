<template>
  <v-app class="site-shell">
    <v-app-bar elevate-on-scroll height="64">
      <v-toolbar-title class="font-weight-medium">
        {{ isAdmin ? 'Панель администратора' : 'E-Learning' }}
      </v-toolbar-title>
      <v-spacer />

      <template v-if="isAdmin">
        <NuxtLink class="nav-link mr-4" to="/admin">Admin Panel</NuxtLink>
        <v-btn text @click="handleLogout">Wyloguj</v-btn>
      </template>

      <template v-else>
        <NuxtLink class="nav-link mr-4" to="/about-us">O NAS</NuxtLink>
        <NuxtLink class="nav-link mr-4" to="/courses">KURSY</NuxtLink>
        <NuxtLink class="nav-link mr-4" to="/contact-us">KONTAKT</NuxtLink>
        <template v-if="me">
          <NuxtLink class="nav-link mr-4" to="/my-profile">Moje konto</NuxtLink>
          <v-btn text @click="handleLogout">Wyloguj</v-btn>
        </template>
        <template v-else>
          <v-btn text class="me-2" @click="openLogin">Zaloguj</v-btn>
        </template>
      </template>
    </v-app-bar>

    <v-main class="pa-10">
      <NuxtPage />
    </v-main>

    <v-dialog v-if="!me" v-model="loginDialog" max-width="420" persistent>
      <v-card>
        <v-card-title>
          {{ authMode === 'login' ? 'Logowanie' : 'Rejestracja' }}
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="authMode === 'login' && loginError"
            variant="tonal"
            dense
            class="mb-3"
          >
            {{ loginError }}
          </v-alert>
          <v-alert
            v-else-if="authMode === 'register' && registerError"
            variant="tonal"
            dense
            class="mb-3"
          >
            {{ registerError }}
          </v-alert>
          <v-alert
            v-if="authMode === 'register' && registerSuccess"
            variant="text"
            dense
            class="mb-3"
          >
            {{ registerSuccess }}
          </v-alert>
          <v-form
            @submit.prevent="authMode === 'login' ? submitLogin() : submitRegister()"
          >
            <template v-if="authMode === 'login'">
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
            </template>
            <template v-else>
              <v-text-field
                label="Имя"
                v-model="registerForm.name"
                required
              />
              <v-text-field
                label="Email"
                v-model="registerForm.email"
                type="email"
                required
              />
              <v-text-field
                label="Hasło"
                v-model="registerForm.password"
                type="password"
                required
              />
            </template>
          </v-form>
          <p class="text-caption">
            <template v-if="authMode === 'login'">
              Nie masz konta?
              <v-btn text variant="text" class="pa-0" @click="setAuthMode('register')">
                Zarejestruj śię
              </v-btn>
            </template>
            <template v-else>
              Jusz masz konto?
              <v-btn text variant="text" class="pa-0" @click="setAuthMode('login')">
                Zaloguj
              </v-btn>
            </template>
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeLogin">Anuluj</v-btn>
          <v-btn
            :loading="authMode === 'login' ? loginLoading : registerLoading"
            color="primary"
            @click="authMode === 'login' ? submitLogin() : submitRegister()"
          >
            {{ authMode === 'login' ? 'Zaloguj' : 'Zarejestruj' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRouter, useRoute } from '#imports'
type MePayload = { id: number; email: string; name: string | null; role: 'USER' | 'ADMIN' }

const { data: me, refresh: refreshUser } = await useFetch<MePayload | null>('/api/me', { default: () => null })
const isAdmin = computed(() => me.value?.role === 'ADMIN')

const authMode = ref<'login' | 'register'>('login')
const loginDialog = ref(false)
const loginError = ref('')
const loginLoading = ref(false)
const loginForm = reactive({ email: '', password: '' })
const registerForm = reactive({ name: '', email: '', password: '' })
const registerError = ref('')
const registerSuccess = ref('')
const registerLoading = ref(false)

const router = useRouter()
const route = useRoute()

const setAuthMode = (mode: 'login' | 'register') => {
  authMode.value = mode
  loginError.value = ''
  registerError.value = ''
  registerSuccess.value = ''
}

const openLogin = () => {
  setAuthMode('login')
  loginDialog.value = true
}

const closeLogin = () => {
  loginDialog.value = false
  setAuthMode('login')
}

const submitLogin = async () => {
  loginError.value = ''
  loginLoading.value = true
  try {
    const payload = await $fetch('/api/login', {
      method: 'POST',
      body: loginForm,
    })
    await refreshUser()
    closeLogin()
    loginForm.email = ''
    loginForm.password = ''
    const destination = payload?.role === 'ADMIN' ? '/admin' : '/'
    if (route.path !== destination) {
      router.replace(destination)
    }
  } catch (error: any) {
    loginError.value = error?.data?.message ?? error?.message ?? 'Ошибка при входе'
  } finally {
    loginLoading.value = false
  }
}

const submitRegister = async () => {
  registerError.value = ''
  registerSuccess.value = ''
  registerLoading.value = true
  try {
    await $fetch('/api/register', {
      method: 'POST',
      body: registerForm,
    })
    registerSuccess.value = 'Zarejestrowano.'
    registerForm.name = ''
    registerForm.email = ''
    registerForm.password = ''
  } catch (err: any) {
    registerError.value =
      err?.data?.message ?? err?.message ?? 'Nie udalo śie zarejestrować'
  } finally {
    registerLoading.value = false
  }
}

const handleLogout = async () => {
  await $fetch('/api/logout', { method: 'POST' })
  await refreshUser()
  router.replace('/')
}

watch(
  () => isAdmin.value,
  (admin) => {
    if (admin && process.client && !route.path.startsWith('/admin')) {
      router.replace('/admin')
    }
  }
)
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

.site-shell .v-main {
  background-color: transparent;
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
</style>
