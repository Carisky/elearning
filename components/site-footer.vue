<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <v-footer class="site-footer" color="transparent">
    <v-container class="py-6">
      <v-row align="center" justify="space-between" class="ga-3">
        <v-col cols="12" md="6" class="text-body-2 text-medium-emphasis">
          © {{ year }} E‑Learning
        </v-col>
        <v-col cols="12" md="6" class="d-flex justify-start justify-md-end ga-4">
          <NuxtLink to="/about-us" class="site-footer__link">O nas</NuxtLink>
          <NuxtLink to="/contact-us" class="site-footer__link">Kontakt</NuxtLink>
          <NuxtLink to="/warunki-zakupu" class="site-footer__link">Warunki zakupu</NuxtLink>
          <NuxtLink to="/dane-osobowe" class="site-footer__link">Dane osobowe</NuxtLink>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<style scoped>
.site-footer {
  border-top: 1px solid rgba(17, 24, 39, 0.06);
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.site-footer__link {
  color: rgb(var(--v-theme-on-background));
  text-decoration: none;
  opacity: 0.85;
}

.site-footer__link:hover {
  opacity: 1;
  text-decoration: underline;
}
</style>
