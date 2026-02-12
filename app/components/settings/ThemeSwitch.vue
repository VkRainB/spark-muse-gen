<script setup lang="ts">
const { theme, setTheme } = useTheme()

const themeOptions = [
  { label: '浅色', value: 'light', icon: 'i-heroicons-sun' },
  { label: '深色', value: 'dark', icon: 'i-heroicons-moon' },
  { label: '跟随系统', value: 'system', icon: 'i-heroicons-computer-desktop' }
]
</script>

<template>
  <div class="theme-switcher-container">
    <button
      v-for="option in themeOptions"
      :key="option.value"
      class="theme-btn"
      :class="{ active: theme === option.value }"
      @click="setTheme(option.value as 'light' | 'dark' | 'system')"
    >
      <UIcon :name="option.icon" class="w-3 h-3" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.theme-switcher-container {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 3px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3px;
}

.theme-btn {
  border: none;
  background: transparent;
  color: var(--text-sub);
  border-radius: 6px;
  min-height: 28px;
  padding: 4px 6px;
  font-size: 11px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-btn:hover {
  color: var(--text-main);
}

.theme-btn.active {
  background: var(--card-bg);
  color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}
</style>
