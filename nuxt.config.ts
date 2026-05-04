// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: false },
  ssr: false, // SPA 模式
  devServer: {
    port: 3001
  },

  future: {
    compatibilityVersion: 4
  },

  pages: {
    pattern: ['**/*.vue', '!**/_components/**'] // 排除 pages 内的任意 _components
  },

  // 路由规则：兜底已废弃路由（设置已收敛到右侧抽屉，/settings 不再使用）
  routeRules: {
    '/settings': { redirect: '/' }
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
