// import this after install `@mdi/font` package
import '@mdi/font/css/materialdesignicons.css'

import 'vuetify/styles'
import { createVuetify } from 'vuetify'

const customTheme = {
  dark: false,
  colors: {
    background: '#F6F7FB',
    surface: '#FFFFFF',
    primary: '#FF6A3D',
    secondary: '#111827',
    info: '#2563EB',
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#DC2626',
    'on-background': '#111827',
    'on-surface': '#111827',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
  },
}

export default defineNuxtPlugin((app) => {
  const vuetify = createVuetify({
    theme: {
      defaultTheme: 'custom',
      themes: {
        custom: customTheme,
      },
    },
  })
  app.vueApp.use(vuetify)
})
