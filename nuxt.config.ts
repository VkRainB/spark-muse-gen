// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: false },
  ssr: false, // SPA 模式

  future: {
    compatibilityVersion: 4
  },

  modules: [
    '@nuxtjs/color-mode',
    '@nuxt/ui',
    '@pinia/nuxt'
  ],

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: ''
  },

  pinia: {
    storesDirs: ['./stores/**']
  },

  alias: {
    '~/stores': './stores',
    '~/types': './types'
  },

  app: {
    head: {
      title: 'Gemini 3 Pro Image Preview',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  }
})
