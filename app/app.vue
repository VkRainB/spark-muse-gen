<script setup lang="ts">
import { onMounted } from 'vue'
import { useChat } from './composables/useChat'
// 初始化应用
const chat = useChat()

onMounted(() => {
  chat.ensureSession()
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <!-- Toast 通知 -->
  <UNotifications />
</template>

<style>
/* 全局样式 */
html {
  scroll-behavior: smooth;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>


