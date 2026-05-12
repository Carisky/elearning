<script setup lang="ts">
const year = new Date().getFullYear()

const companyRows = [
  { icon: 'mdi-office-building-outline', label: 'Firma', text: 'TSL Silesia Group Sp. z o.o.' },
  { icon: 'mdi-map-marker-outline', label: 'Adres', text: 'ul. Rycerska 9, 41-902 Bytom, Śląskie, Polska' },
  { icon: 'mdi-phone-outline', label: 'Telefon', text: '+48 32 282 90 62, +48 32 281 34 02' },
  { icon: 'mdi-email-outline', label: 'Email', text: 'office@tsl-group.pl' },
  { icon: 'mdi-scale-balance', label: 'KRS', text: '0000397243 - VIII Wydz. Gosp. w Katowicach' },
  { icon: 'mdi-cash', label: 'Kapitał zakładowy', text: '6 000 PLN' },
  { icon: 'mdi-percent-outline', label: 'NIP', text: 'PL6263004731' },
  { icon: 'mdi-percent-outline', label: 'REGON', text: '242741335' },
]
</script>

<template>
  <v-footer class="site-footer" color="transparent">
    <div class="site-footer__inner">
      <div class="site-footer__top">
        <div>
          <div class="site-footer__brand">Akademia TSL</div>
          <div class="site-footer__description">
            TSL Silesia Group - Centrum Kompetencji, Edukacji i Rozwoju Kadr TSL.
          </div>
          <div class="site-footer__copyright">
            © {{ year }} Akademia TSL / TSL Silesia Group
          </div>
        </div>

        <nav class="site-footer__links" aria-label="Stopka">
          <NuxtLink to="/about-us" class="site-footer__link">O nas</NuxtLink>
          <NuxtLink to="/contact-us" class="site-footer__link">Kontakt</NuxtLink>
          <NuxtLink to="/warunki-zakupu" class="site-footer__link">Warunki zakupu</NuxtLink>
          <NuxtLink to="/dane-osobowe" class="site-footer__link">Dane osobowe</NuxtLink>
        </nav>
      </div>

      <div class="site-footer__company-grid">
        <div v-for="row in companyRows" :key="row.text" class="site-footer__company-row">
          <v-icon :icon="row.icon" color="primary" size="22" class="site-footer__company-icon" />
          <span>
            <span class="site-footer__company-label">{{ row.label }}</span>
            <span class="site-footer__company-value">{{ row.text }}</span>
          </span>
        </div>
      </div>
    </div>
  </v-footer>
</template>
