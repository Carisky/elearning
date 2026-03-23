// import this after install `@mdi/font` package
import '@mdi/font/css/materialdesignicons.css'

import themeColorsCss from '~/theme-colors.css?raw'
import { loadThemeColorsFromCss } from '~/utils/theme-colors'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

const customTheme = {
  dark: false,
  colors: loadThemeColorsFromCss(themeColorsCss),
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
