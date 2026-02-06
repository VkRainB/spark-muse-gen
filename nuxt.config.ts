// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: true },
  ssr: false, // SPA 模式

  future: {
    compatibilityVersion: 4
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt'
  ],

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
