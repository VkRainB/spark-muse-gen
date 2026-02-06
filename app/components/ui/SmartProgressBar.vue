<script setup lang="ts">
const props = defineProps<{
  progress: number
  task?: string | null
  estimatedTime?: number
}>()

const remainingTime = computed(() => {
  if (!props.estimatedTime || props.progress >= 100) return null
  const remaining = props.estimatedTime * (1 - props.progress / 100)
  return Math.ceil(remaining)
})
</script>

<template>
  <div class="w-full space-y-2">
    <div class="flex justify-between text-sm">
      <span class="text-gray-600 dark:text-gray-400">{{ task || '处理中...' }}</span>
      <span class="font-mono text-primary">{{ progress }}%</span>
    </div>
    <UProgress :value="progress" color="primary" size="md" />
    <p v-if="remainingTime" class="text-xs text-gray-500 text-right">
      预计剩余 {{ remainingTime }} 秒
    </p>
  </div>
</template>
