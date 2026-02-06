<script setup lang="ts">
const { theme, setTheme } = useTheme()

const themeOptions = [
  { label: '浅色', value: 'light', icon: 'i-heroicons-sun' },
  { label: '深色', value: 'dark', icon: 'i-heroicons-moon' },
  { label: '跟随系统', value: 'system', icon: 'i-heroicons-computer-desktop' }
]
</script>

<template>
  <div class="flex items-center gap-2">
    <UButtonGroup>
      <UButton
        v-for="option in themeOptions"
        :key="option.value"
        :icon="option.icon"
        :color="theme === option.value ? 'primary' : 'gray'"
        :variant="theme === option.value ? 'solid' : 'ghost'"
        size="sm"
        @click="setTheme(option.value as 'light' | 'dark' | 'system')"
      >
        {{ option.label }}
      </UButton>
    </UButtonGroup>
  </div>
</template>
