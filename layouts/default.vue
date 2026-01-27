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

    <v-dialog v-if="!me" v-model="loginDialog" max-width="420" persistent>
      <v-card>
        <v-card-title>
          {{ authMode === "login" ? "Logowanie" : "Rejestracja" }}
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
            @submit.prevent="
              authMode === 'login' ? submitLogin() : submitRegister()
            "
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
              <v-text-field label="Имя" v-model="registerForm.name" required />
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
              <v-btn
                text
                variant="text"
                class="pa-0"
                @click="setAuthMode('register')"
              >
                Zarejestruj śię
              </v-btn>
            </template>
            <template v-else>
              Jusz masz konto?
              <v-btn
                text
                variant="text"
                class="pa-0"
                @click="setAuthMode('login')"
              >
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
            {{ authMode === "login" ? "Zaloguj" : "Zarejestruj" }}
          </v-btn>
        </v-card-actions>
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

const router = useRouter();
const route = useRoute();
const isAdminRoute = computed(() => route.path.startsWith("/admin"));

const setAuthMode = (mode: "login" | "register") => {
  authMode.value = mode;
  loginError.value = "";
  registerError.value = "";
  registerSuccess.value = "";
};

const openLogin = () => {
  closeNav();
  setAuthMode("login");
  loginDialog.value = true;
};

const closeLogin = () => {
  loginDialog.value = false;
  setAuthMode("login");
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
      error?.data?.message ?? error?.message ?? "Ошибка при входе";
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
      body: registerForm,
    });
    registerSuccess.value = "Zarejestrowano.";
    const loginPayload = await loginAndRedirect(credentials);
    if (loginPayload) {
      registerForm.name = "";
      registerForm.email = "";
      registerForm.password = "";
    }
  } catch (err: any) {
    registerError.value =
      err?.data?.message ?? err?.message ?? "Nie udalo śie zarejestrować";
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
    openLogin();
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
