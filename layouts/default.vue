<template>
  <v-app
    :class="[
      'site-shell',
      isAdminRoute ? 'site-shell--admin' : 'site-shell--public',
    ]"
  >
    <v-app-bar elevate-on-scroll height="64" class="site-appbar">
      <v-app-bar-nav-icon
        class="d-flex d-md-none"
        @click="mobileNav = !mobileNav"
      />
      <v-toolbar-title v-if="isAdminRoute" class="font-weight-medium">
        Panel Administratora
      </v-toolbar-title>

      <NuxtLink v-else class="nav-brand ml-8" to="/"> <v-container>E-Learning</v-container> </NuxtLink>
      <v-spacer />

      <div class="d-none d-md-flex align-center">
        <template v-if="isAdminRoute">
          <NuxtLink class="nav-link mr-4" to="/admin">Admin Panel</NuxtLink>
          <v-btn text @click="handleLogout">Wyloguj</v-btn>
        </template>

        <template v-else>
          <NuxtLink class="nav-link mr-4" to="/about-us">O NAS</NuxtLink>
          <NuxtLink class="nav-link mr-4" to="/courses">KURSY</NuxtLink>
          <NuxtLink class="nav-link mr-4" to="/contact-us">KONTAKT</NuxtLink>

          <template v-if="me">
            <NuxtLink class="nav-link mr-4" to="/my-profile"
              >Moje konto</NuxtLink
            >
          </template>
          <v-btn icon variant="text" class="me-2" to="/buy">
            <v-badge
              :content="cart.count.value"
              :model-value="cart.count.value > 0"
              color="primary"
            >
              <v-icon>mdi-cart</v-icon>
            </v-badge>
          </v-btn>
          <template v-if="me">
            <v-btn text @click="handleLogout">Wyloguj</v-btn>
          </template>
          <template v-else>
            <v-btn text class="me-2" @click="openLogin">Zaloguj</v-btn>
          </template>
          <v-btn color="primary" variant="flat" class="ms-2" to="/courses">
            Get started
          </v-btn>
        </template>
      </div>
    </v-app-bar>

    <v-navigation-drawer
      v-model="mobileNav"
      temporary
      class="site-shell-mobile-drawer"
      width="220"
    >
      <v-list class="px-0">
        <v-list-item class="mobile-nav-heading">
          <v-list-item-title class="text-h6">E-Learning</v-list-item-title>
        </v-list-item>
        <v-divider />

        <template v-if="isAdminRoute">
          <v-list-item>
            <NuxtLink class="mobile-nav-link" to="/admin" @click="closeNav">
              Admin Panel
            </NuxtLink>
          </v-list-item>
          <v-list-item>
            <v-btn text class="mobile-nav-action" block @click="handleLogout">
              Wyloguj
            </v-btn>
          </v-list-item>
        </template>
        <template v-else>
          <v-list-item v-for="link in publicNavLinks" :key="link.to">
            <NuxtLink class="mobile-nav-link" :to="link.to" @click="closeNav">
              {{ link.label }}
            </NuxtLink>
          </v-list-item>

          <v-list-item>
            <NuxtLink class="mobile-nav-link" to="/buy" @click="closeNav">
              KOSZYK ({{ cart.count.value }})
            </NuxtLink>
          </v-list-item>

          <v-divider class="my-3" />

          <template v-if="me">
            <v-list-item>
              <NuxtLink
                class="mobile-nav-link"
                to="/my-profile"
                @click="closeNav"
              >
                Moje konto
              </NuxtLink>
            </v-list-item>
            <v-list-item>
              <v-btn text class="mobile-nav-action" block @click="handleLogout">
                Wyloguj
              </v-btn>
            </v-list-item>
          </template>
          <template v-else>
            <v-list-item>
              <v-btn text class="mobile-nav-action" block @click="openLogin">
                Zaloguj
              </v-btn>
            </v-list-item>
          </template>
        </template>
      </v-list>
    </v-navigation-drawer>

    <v-main class="site-main">
      <NuxtPage />
    </v-main>

    <SiteFooter v-if="!isAdminRoute" />

    <v-dialog v-if="!me" v-model="loginDialog"  max-width="960" persistent>
      <v-card class="auth-card pa-6">
        <v-row no-gutters>
          <v-col cols="12" md="6" class="auth-panel">
            <div class="auth-header">
              <v-avatar size="40" color="grey-lighten-2" />
              <v-btn icon variant="text" class="auth-close" @click="closeLogin">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>

            <h2 class="text-h5 font-weight-semibold mb-1">
              {{ authMode === "login" ? "Zaloguj się" : "Utwórz konto" }}
            </h2>
            <div class="text-body-2 text-medium-emphasis mb-6">
              <template v-if="authMode === 'login'">
                Nie masz konta?
                <v-btn variant="text" class="auth-link" @click="setAuthMode('register')">
                  Zarejestruj się
                </v-btn>
              </template>
              <template v-else>
                Masz już konto?
                <v-btn variant="text" class="auth-link" @click="setAuthMode('login')">
                  Zaloguj
                </v-btn>
              </template>
            </div>

            <v-alert
              v-if="authMode === 'login' && loginError"
              variant="tonal"
              density="compact"
              class="mb-4"
              type="error"
            >
              {{ loginError }}
            </v-alert>
            <v-alert
              v-else-if="authMode === 'register' && registerError"
              variant="tonal"
              density="compact"
              class="mb-4"
              type="error"
            >
              {{ registerError }}
            </v-alert>
            <v-alert
              v-if="authMode === 'register' && registerSuccess"
              variant="tonal"
              density="compact"
              class="mb-4"
              type="success"
            >
              {{ registerSuccess }}
            </v-alert>

            <v-form @submit.prevent="authMode === 'login' ? submitLogin() : submitRegister()">
              <template v-if="authMode === 'login'">
                <v-text-field
                  v-model="loginForm.email"
                  label="Email"
                  type="email"
                  autocomplete="email"
                  required
                  variant="outlined"
                  class="mb-3"
                />
                <v-text-field
                  v-model="loginForm.password"
                  label="Hasło"
                  :type="passwordFieldType"
                  autocomplete="current-password"
                  required
                  variant="outlined"
                  class="mb-1"
                />
              </template>
              <template v-else>
                <v-text-field
                  v-model="registerForm.name"
                  label="Imię"
                  autocomplete="name"
                  required
                  variant="outlined"
                  class="mb-3"
                />
                <v-alert v-if="invitePreview" type="info" variant="tonal" class="mb-4">
                  Zaproszenie dla: <strong>{{ invitePreview.email }}</strong>
                  <template v-if="invitePreview.courses?.length">
                    <div class="mt-2">
                      Kursy:
                      <span v-for="(c, idx) in invitePreview.courses" :key="c.id">
                        {{ c.title }}<span v-if="idx < invitePreview.courses.length - 1">, </span>
                      </span>
                    </div>
                  </template>
                </v-alert>
                <v-text-field
                  v-model="registerForm.email"
                  label="Email"
                  type="email"
                  autocomplete="email"
                  required
                  variant="outlined"
                  :disabled="Boolean(inviteToken)"
                  class="mb-3"
                />
                <v-text-field
                  v-model="registerForm.password"
                  label="Hasło"
                  :type="passwordFieldType"
                  autocomplete="new-password"
                  required
                  variant="outlined"
                  class="mb-1"
                />
              </template>

              <div v-if="authMode === 'register'" class="text-caption text-medium-emphasis mt-1 mb-2">
                Użyj co najmniej 8 znaków. Dla bezpieczeństwa dodaj cyfry i znaki specjalne.
              </div>

              <v-checkbox
                v-model="showPassword"
                label="Pokaż hasło"
                density="compact"
                hide-details
                class="mb-6"
              />

              <div class="d-flex align-center justify-space-between ga-3">
                <v-btn variant="text" class="auth-link px-0" @click="closeLogin">Anuluj</v-btn>
                <v-btn
                  type="submit"
                  class="auth-submit"
                  color="primary"
                  rounded="pill"
                  :loading="authMode === 'login' ? loginLoading : registerLoading"
                >
                  {{ authMode === "login" ? "Zaloguj się" : "Utwórz konto" }}
                </v-btn>
              </div>
            </v-form>
          </v-col>

          <v-col cols="12" md="6" class="auth-illustration d-none d-md-flex">
            <div class="auth-illustration-inner">
              <svg viewBox="0 0 420 320" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="85" cy="78" r="12" stroke="currentColor" stroke-width="3" opacity="0.75" />
                <circle cx="344" cy="84" r="10" stroke="currentColor" stroke-width="3" opacity="0.5" />
                <circle cx="320" cy="260" r="10" stroke="currentColor" stroke-width="3" opacity="0.5" />
                <path
                  d="M122 216 L196 78 L318 128 L282 258 Z"
                  stroke="currentColor"
                  stroke-width="3"
                  opacity="0.75"
                />
                <path
                  d="M164 246 L106 150 L244 116 L344 206 Z"
                  stroke="currentColor"
                  stroke-width="3"
                  opacity="0.75"
                />
                <path d="M250 138 L250 250" stroke="currentColor" stroke-width="3" opacity="0.6" />
                <path
                  d="M270 206 C280 196, 292 196, 302 206"
                  stroke="currentColor"
                  stroke-width="3"
                  opacity="0.6"
                />
                <path
                  d="M268 220 C280 210, 292 210, 304 220"
                  stroke="currentColor"
                  stroke-width="3"
                  opacity="0.35"
                />
                <g opacity="0.75" fill="currentColor">
                  <rect x="96" y="262" width="12" height="12" rx="3" />
                  <rect x="114" y="262" width="12" height="12" rx="3" />
                  <rect x="132" y="262" width="12" height="12" rx="3" />
                  <rect x="150" y="262" width="12" height="12" rx="3" />
                </g>
              </svg>
            </div>
          </v-col>
        </v-row>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { useRouter, useRoute } from "#imports";
import SiteFooter from "~/components/site-footer.vue";
type MePayload = {
  id: number;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
};

const publicNavLinks = [
  { label: "O NAS", to: "/about-us" },
  { label: "KURSY", to: "/courses" },
  { label: "KONTAKT", to: "/contact-us" },
];

const mobileNav = ref(false);
const closeNav = () => {
  mobileNav.value = false;
};

const { data: me, refresh: refreshUser } = await useFetch<MePayload | null>(
  "/api/me",
  { key: "me", default: () => null },
);
const isAdmin = computed(() => me.value?.role === "ADMIN");

const cart = useCart();

const authMode = ref<"login" | "register">("login");
const loginDialog = ref(false);
const loginError = ref("");
const loginLoading = ref(false);
const loginForm = reactive({ email: "", password: "" });
const registerForm = reactive({ name: "", email: "", password: "" });
const registerError = ref("");
const registerSuccess = ref("");
const registerLoading = ref(false);
const showPassword = ref(false);
const passwordFieldType = computed(() => (showPassword.value ? "text" : "password"));

type InvitePreview = {
  email: string;
  expiresAt: string;
  status: string;
  courses: Array<{ id: number; title: string }>;
};

const inviteToken = ref("");
const invitePreview = ref<InvitePreview | null>(null);

const router = useRouter();
const route = useRoute();
const isAdminRoute = computed(() => route.path.startsWith("/admin"));

const setAuthMode = (mode: "login" | "register") => {
  authMode.value = mode;
  loginError.value = "";
  registerError.value = "";
  registerSuccess.value = "";
};

const openLogin = (mode: "login" | "register" = "login") => {
  closeNav();
  setAuthMode(mode);
  loginDialog.value = true;
};

const closeLogin = () => {
  loginDialog.value = false;
  setAuthMode("login");
  showPassword.value = false;
  inviteToken.value = "";
  invitePreview.value = null;
};

const loginAndRedirect = async (credentials: {
  email: string;
  password: string;
}) => {
  loginError.value = "";
  loginLoading.value = true;
  try {
    const payload = await $fetch("/api/login", {
      method: "POST",
      body: credentials,
    });
    await refreshUser();
    cart.setAuthenticatedUser(payload?.id ?? null);
    await cart.mergeLocalIntoServer();
    closeLogin();
    loginForm.email = "";
    loginForm.password = "";
    const redirect =
      typeof route.query.redirect === "string" ? route.query.redirect : "";
    const destination =
      payload?.role === "ADMIN"
        ? "/admin"
        : redirect.startsWith("/")
          ? redirect
          : "/";
    if (route.path !== destination) {
      router.replace(destination);
    }
    return payload;
  } catch (error: any) {
    loginError.value =
      error?.data?.message ?? error?.message ?? "Błąd logowania.";
    return null;
  } finally {
    loginLoading.value = false;
  }
};

const submitLogin = async () => {
  await loginAndRedirect({
    email: loginForm.email,
    password: loginForm.password,
  });
};

const submitRegister = async () => {
  registerError.value = "";
  registerSuccess.value = "";
  registerLoading.value = true;
  const credentials = {
    email: registerForm.email,
    password: registerForm.password,
  };
  try {
    await $fetch("/api/register", {
      method: "POST",
      body: {
        ...registerForm,
        inviteToken: inviteToken.value || undefined,
      },
    });
    registerSuccess.value = "Zarejestrowano.";
    const loginPayload = await loginAndRedirect(credentials);
    if (loginPayload) {
      registerForm.name = "";
      registerForm.email = "";
      registerForm.password = "";
      inviteToken.value = "";
      invitePreview.value = null;
    }
  } catch (err: any) {
    registerError.value =
      err?.data?.message ?? err?.message ?? "Nie udało się zarejestrować.";
  } finally {
    registerLoading.value = false;
  }
};

const handleLogout = async () => {
  closeNav();
  await $fetch("/api/logout", { method: "POST" });
  await refreshUser();
  cart.setAuthenticatedUser(null);
  router.replace("/");
};

watch(
  () => isAdmin.value,
  (admin) => {
    if (admin && process.client && route.path === "/") {
      router.replace("/admin");
    }
  },
);

watch(
  () => route.path,
  () => {
    closeNav();
  },
);

watch(
  () => me.value?.id ?? null,
  async (userId) => {
    cart.setAuthenticatedUser(userId);
    if (userId) {
      await cart.mergeLocalIntoServer();
    }
  },
  { immediate: true },
);

watch(
  () => route.query.login,
  (value) => {
    if (!value || me.value) return;
    const mode =
      typeof route.query.mode === "string" && route.query.mode === "register"
        ? "register"
        : "login";
    openLogin(mode);
  },
  { immediate: true },
);

watch(
  () => route.query.invite,
  async (value) => {
    if (!process.client) return;
    if (me.value) return;

    const token = typeof value === "string" ? value.trim() : "";
    if (!token) return;

    inviteToken.value = token;
    invitePreview.value = null;
    openLogin("register");

    try {
      const preview = await $fetch<InvitePreview>("/api/user-invites/preview", {
        query: { token },
      });
      invitePreview.value = preview;
      registerForm.email = preview.email;
    } catch (error: any) {
      invitePreview.value = null;
      registerError.value =
        error?.data?.message ??
        error?.message ??
        "Nie udaЕ‚o siД™ pobraД‡ zaproszenia.";
    }
  },
  { immediate: true },
);
</script>

<style>
.site-shell {
  min-height: 100vh;
}

.site-shell--public {
  background:
    radial-gradient(
      1200px circle at 20% 0%,
      rgba(255, 106, 61, 0.18),
      transparent 60%
    ),
    radial-gradient(
      900px circle at 100% 20%,
      rgba(37, 99, 235, 0.12),
      transparent 55%
    ),
    linear-gradient(180deg, #ffffff 0%, rgb(var(--v-theme-background)) 55%);
}

.site-shell--admin {
  background: rgb(var(--v-theme-background));
}

.auth-card {
  border-radius: 22px !important;
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.08);
}

.auth-panel {
  padding: 34px 36px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.auth-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.auth-close {
  margin-right: -8px;
}

.auth-link {
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-weight: 600;
  min-width: unset !important;
}

.auth-submit {
  min-width: 220px;
  height: 44px;
}

.auth-illustration {
  position: relative;
  color: rgba(17, 24, 39, 0.82);
  background:
    radial-gradient(
      420px circle at 20% 20%,
      rgba(var(--v-theme-primary), 0.18),
      transparent 60%
    ),
    radial-gradient(
      520px circle at 90% 10%,
      rgba(37, 99, 235, 0.14),
      transparent 60%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.85),
      rgba(255, 255, 255, 0.65)
    );
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.auth-illustration-inner {
  width: min(360px, 100%);
}

.auth-illustration svg {
  width: 100%;
  height: auto;
}

@media (max-width: 960px) {
  .auth-panel {
    padding: 26px 22px;
  }

  .auth-submit {
    min-width: 180px;
  }
}

.site-appbar {
  background: rgba(255, 255, 255, 0.75) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(17, 24, 39, 0.06);
}

.site-main {
  background-color: transparent;
}

.nav-link {
  color: rgb(var(--v-theme-on-background));
  text-transform: uppercase;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  opacity: 0.9;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 999px;
  position: relative;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    opacity 0.18s ease,
    transform 0.18s ease;
}

.nav-link:hover {
  opacity: 1;
  background: rgba(17, 24, 39, 0.06);
}

.nav-link.router-link-active,
.nav-link.router-link-exact-active {
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
  opacity: 1;
}

.nav-brand {
  color: rgb(var(--v-theme-on-background));
  text-decoration: none;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.95;
}

.nav-brand:hover {
  opacity: 1;
}

.site-shell .site-shell-mobile-drawer {
  background-color: rgba(255, 255, 255, 0.92);
  color: rgb(var(--v-theme-on-background));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.site-shell-mobile-drawer .v-list-item {
  min-height: unset;
}

.mobile-nav-heading {
  padding-top: 16px;
  padding-bottom: 8px;
}

.mobile-nav-link {
  color: rgb(var(--v-theme-on-background));
  text-transform: uppercase;
  font-weight: 600;
  width: 100%;
}

.mobile-nav-link:hover {
  opacity: 1;
}

.mobile-nav-action {
  justify-content: flex-start;
  color: rgb(var(--v-theme-on-background));
  text-transform: uppercase;
}

body {
  background-color: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}
</style>
