<script setup lang="ts">
defineProps<{
  show: boolean
  text?: string
}>()
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="flex flex-col items-center gap-4 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
        <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary animate-spin" />
        <p v-if="text" class="text-gray-600 dark:text-gray-300">{{ text }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
