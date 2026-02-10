<script setup lang="ts">
import { useSettingsStore } from '../../../stores/settings'

const settingsStore = useSettingsStore()
const { selectDirectory, isSupported, isEnabled, directoryName, disable } = useFileSystem()

const handleAutoSaveToggle = async () => {
  if (!settingsStore.autoSaveEnabled) {
    await selectDirectory()
  } else {
    disable()
  }
}

const handleContextChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  settingsStore.setContextCount(Number(target.value))
}
</script>

<template>
  <div class="settings-panel">
    <section class="config-group">
      <h3 class="config-label-lg">生成设置</h3>
      <p class="config-tip">分辨率和长宽比已移至聊天输入框上方，可在输入区直接快速调整。</p>

      <UFormField label="流式传输" class="field-row">
        <div class="switch-row">
          <USwitch :model-value="settingsStore.streamEnabled" @update:model-value="settingsStore.toggleStream()" />
          <span class="field-value">{{ settingsStore.streamEnabled ? '已启用' : '已禁用' }}</span>
        </div>
      </UFormField>
    </section>

    <section class="config-group">
      <h3 class="config-label-lg">对话设置</h3>

      <UFormField label="上下文消息数" class="field-row">
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
      </UFormField>
    </section>

    <section class="config-group">
      <h3 class="config-label-lg">自动保存</h3>

      <div v-if="!isSupported" class="notice-warning">
        您的浏览器不支持 File System Access API。请使用 Chrome 86+ 或 Edge 86+ 以启用自动保存功能。
      </div>

      <template v-else>
        <UFormField label="自动保存到本地" class="field-row">
          <div class="switch-row">
            <USwitch :model-value="isEnabled" @update:model-value="handleAutoSaveToggle" />
            <span class="field-value">
              {{ isEnabled ? `已启用 - ${directoryName}` : '已禁用' }}
            </span>
          </div>
        </UFormField>

        <UButton
          v-if="!isEnabled"
          icon="i-heroicons-folder-open"
          variant="outline"
          class="outline-btn"
          @click="() => { void selectDirectory() }"
        >
          选择保存目录
        </UButton>
      </template>
    </section>

    <section class="config-group">
      <h3 class="config-label-lg">外观</h3>
      <UFormField label="主题" class="field-row">
        <SettingsThemeSwitch />
      </UFormField>
    </section>

    <SettingsProviderManager />
  </div>
</template>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.config-group {
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 75%, transparent);
  padding-bottom: 16px;
}

.config-label-lg {
  margin: 0;
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.config-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.5;
}

.field-row {
  margin-top: 12px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.field-value {
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.4;
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
  margin-top: 12px;
  border-radius: 10px;
  border: 1px solid #fde68a;
  background: #fef9c3;
  color: #92400e;
  font-size: 12px;
  line-height: 1.6;
  padding: 10px 12px;
}

:deep(.dark) .notice-warning {
  border-color: #854d0e;
  background: rgba(133, 77, 14, 0.2);
  color: #fef08a;
}

.outline-btn {
  margin-top: 10px;
  width: 100%;
  justify-content: center;
}

:deep(.ui-form-field-label) {
  font-size: 12px;
  color: var(--text-sub);
}
</style>
