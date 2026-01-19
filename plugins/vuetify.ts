// import this after install `@mdi/font` package
import '@mdi/font/css/materialdesignicons.css'

import 'vuetify/styles'
import { createVuetify } from 'vuetify'

const customTheme = {
  dark: false,
  colors: {
    background: '#F2E7CF',
    surface: '#D1E1CB',
    primary: '#1FAD83',
    secondary: '#78CE8B',
    'on-background': '#0F4557',
    'on-surface': '#0F4557',
    'on-primary': '#0F4557',
    'on-secondary': '#0F4557',
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
