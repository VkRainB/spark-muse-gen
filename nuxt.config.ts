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
    '@pinia/nuxt',
    '@nuxt/icon',
    'nuxt-svgo-loader'
  ],

  css: ['~/assets/css/main.css'],

  // ── 图标系统：本地品牌图标集（与 Nuxt UI 的 UIcon 并存，分工不同） ──
  icon: {
    provider: 'server',
    clientBundle: {
      icons: [
        // 导航 / 通用 UI
        'heroicons:bars-3',
        'heroicons:chevron-down',
        'heroicons:cog-6-tooth',
        'heroicons:cog-6-tooth-solid',
        'heroicons:plus',
        'heroicons:x-mark',
        // 输入栏
        'heroicons:paper-airplane',
        'heroicons:arrow-up-tray',
        'heroicons:adjustments-horizontal',
        'heroicons:stop',
        // 通用动作
        'heroicons:arrow-down-tray',
        'heroicons:trash',
        'heroicons:arrow-path',
        'heroicons:photo',
        'heroicons:sparkles',
        // 品牌
        'mdi:github'
      ],
      includeCustomCollections: true
    },
    customCollections: [
      { prefix: 'brand', dir: './app/assets/icons/brand' }
    ]
  },

  // ── SVG 插图加载器（编译时内联，预留命名空间） ──
  svgoLoader: {
    namespaces: [
      { prefix: 'illus', dir: './app/assets/illustrations' }
    ]
  },

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: ''
  },

  pinia: {
    storesDirs: ['./stores/**']
  },

  alias: {
    '@': './app',
    '~/stores': './stores',
    '~/types': './types'
  },

  app: {
    head: {
      title: '灵创设计',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  }
})
