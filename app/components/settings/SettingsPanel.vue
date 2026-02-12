<script setup lang="ts">
import { useSettingsStore } from '../../../stores/settings'

const settingsStore = useSettingsStore()
const { selectDirectory, isSupported, isEnabled, directoryName, disable } = useFileSystem()

const handleAutoSaveToggle = async () => {
  if (!isEnabled.value) {
    await selectDirectory()
  } else {
    disable()
  }
}

const handleContextChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  settingsStore.setContextCount(Number(target.value))
}

const handleSelectDirectoryClick = async () => {
  await selectDirectory()
}

const providerManagerRef = ref<{ openAddModal: () => void } | null>(null)

const handleAddChannelClick = () => {
  providerManagerRef.value?.openAddModal()
}
</script>

<template>
  <div class="settings-panel">
    <section class="config-card">
      <header class="card-header">
        <span class="card-icon">
          <UIcon name="i-heroicons-paint-brush" class="w-4 h-4" />
        </span>
        <h3 class="config-label-lg">外观与主题</h3>
      </header>

      <div class="field-row">
        <SettingsThemeSwitch />
      </div>
    </section>

    <section class="config-card">
      <header class="card-header">
        <span class="card-icon">
          <UIcon name="i-heroicons-chat-bubble-left-right" class="w-4 h-4" />
        </span>
        <h3 class="config-label-lg">对话与生成</h3>
      </header>

      <div class="inline-field-row">
        <span class="inline-label">流式传输</span>
        <USwitch :model-value="settingsStore.streamEnabled" @update:model-value="settingsStore.toggleStream()" />
      </div>

      <div class="inline-field-row">
        <span class="inline-label">上下文消息数</span>
        <div class="slider-row">
          <input
            type="range"
            :value="settingsStore.contextCount"
            @input="handleContextChange"
            min="1"
            max="50"
            class="slider-range"
          />
          <span class="slider-value">{{ settingsStore.contextCount }}</span>
        </div>
      </div>
    </section>

    <section class="config-card">
      <header class="card-header card-header-between">
        <div class="card-title-group">
          <span class="card-icon">
            <UIcon name="i-heroicons-folder-open" class="w-4 h-4" />
          </span>
          <h3 class="config-label-lg">本地存储</h3>
        </div>
        <USwitch v-if="isSupported" :model-value="isEnabled" @update:model-value="handleAutoSaveToggle" />
      </header>

      <div v-if="!isSupported" class="notice-warning">
        当前浏览器不支持本地自动保存（需 Chrome/Edge 86+）。
      </div>

      <div v-else-if="isEnabled" class="inline-field-row">
        <span class="inline-label field-value">{{ directoryName }}</span>
        <UButton
          icon="i-heroicons-folder-open"
          variant="outline"
          size="xs"
          class="dir-btn"
          @click="handleSelectDirectoryClick"
        >
          更换目录
        </UButton>
      </div>
    </section>

    <section class="config-card">
      <header class="card-header card-header-between">
        <div class="card-title-group">
          <span class="card-icon">
            <UIcon name="i-heroicons-server-stack" class="w-4 h-4" />
          </span>
          <h3 class="config-label-lg">渠道管理</h3>
        </div>
        <UButton
          icon="i-heroicons-plus"
          size="xs"
          color="neutral"
          variant="outline"
          @click="handleAddChannelClick"
        >
          添加渠道
        </UButton>
      </header>

      <div class="provider-wrapper">
        <SettingsProviderManager ref="providerManagerRef" :show-title="false" :show-add-button="false" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config-card {
  border: 1px solid color-mix(in srgb, var(--border-color) 80%, transparent);
  background: color-mix(in srgb, var(--bg-secondary) 92%, transparent);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}

.config-label-lg {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header-between {
  justify-content: space-between;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.card-icon {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 16%, transparent);
  flex-shrink: 0;
}

.inline-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.inline-label {
  font-size: 12px;
  color: var(--text-sub);
  flex-shrink: 0;
}

.field-row {
  margin-top: 10px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.field-value {
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.2;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auto-save-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dir-btn {
  flex-shrink: 0;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 99px;
  background: var(--bg-tertiary);
  outline: none;
}

.slider-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: var(--text-sub);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.28);
  cursor: pointer;
}

.slider-range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: var(--text-sub);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.28);
  cursor: pointer;
}

.slider-value {
  width: 34px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-sub);
}

.notice-warning {
  margin-top: 10px;
  border-radius: 10px;
  border: 1px solid #fde68a;
  background: #fef9c3;
  color: #92400e;
  font-size: 11px;
  line-height: 1.5;
  padding: 8px 10px;
}

:deep(.dark) .notice-warning {
  border-color: #854d0e;
  background: rgba(133, 77, 14, 0.2);
  color: #fef08a;
}

.provider-wrapper {
  margin-top: 10px;
}

:deep(.ui-form-field-label) {
  font-size: 12px;
  color: var(--text-sub);
}
</style>
