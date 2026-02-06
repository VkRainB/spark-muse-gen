<script setup lang="ts">
const { isDark, toggleTheme } = useTheme()
const route = useRoute()

const navItems = [
  { label: '生成', to: '/', icon: 'i-heroicons-sparkles' },
  { label: '小红书', to: '/xhs', icon: 'i-heroicons-book-open' },
  { label: '设置', to: '/settings', icon: 'i-heroicons-cog-6-tooth' }
]
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <NuxtLink to="/" class="flex items-center gap-2">
            <UIcon name="i-heroicons-cube-transparent" class="w-8 h-8 text-primary" />
            <span class="font-bold text-lg hidden sm:block">Gemini 3 Pro</span>
          </NuxtLink>

          <!-- 导航 -->
          <nav class="flex items-center gap-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              :class="[
                'flex items-center gap-2 px-4 py-2 rounded-lg transition',
                route.path === item.to
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              ]"
            >
              <UIcon :name="item.icon" class="w-5 h-5" />
              <span class="hidden sm:inline">{{ item.label }}</span>
            </NuxtLink>
          </nav>

          <!-- 主题切换 -->
          <button
            @click="toggleTheme"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="container mx-auto px-4 py-6">
      <slot />
    </main>
  </div>
</template>
