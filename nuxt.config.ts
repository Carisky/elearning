// https://nuxt.com/docs/api/configuration/nuxt-config
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

const resolvedPortCandidate = Number.parseInt(
  (process.env.PORT ?? process.env.NUXT_PORT ?? '3000').toString(),
  10
)
const resolvedPort = Number.isFinite(resolvedPortCandidate) ? resolvedPortCandidate : 3000
const resolvedHost = (process.env.HOST ?? process.env.NUXT_HOST ?? '0.0.0.0').toString()
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  devServer: {
    port: resolvedPort,
    host: resolvedHost,
  },

  build: {
    transpile: ['vuetify'],
  },
  vite: {
    plugins: [
      vuetify({ autoImport: true }),
    ],
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },
})
