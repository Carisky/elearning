import themeColorsCss from '~/theme-colors.css?raw'
import { loadThemeColorsFromCss } from '~/utils/theme-colors'
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
