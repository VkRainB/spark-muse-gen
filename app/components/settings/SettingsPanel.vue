<script setup lang="ts">
import type { Resolution, AspectRatio } from '../../../stores/settings'
import { useSettingsStore } from '../../../stores/settings'

const settingsStore = useSettingsStore()
const { selectDirectory, isSupported, isEnabled, directoryName, disable } = useFileSystem()

const resolutionOptions = [
  { label: '1K (1024x1024)', value: '1K' as Resolution },
  { label: '2K (2048x2048)', value: '2K' as Resolution },
  { label: '4K (4096x4096)', value: '4K' as Resolution }
]

const aspectRatioOptions = [
  { label: '1:1 方形', value: '1:1' as AspectRatio },
  { label: '16:9 横屏', value: '16:9' as AspectRatio },
  { label: '9:16 竖屏', value: '9:16' as AspectRatio },
  { label: '4:3 传统', value: '4:3' as AspectRatio },
  { label: '3:4 肖像', value: '3:4' as AspectRatio }
]

const handleAutoSaveToggle = async () => {
  if (!settingsStore.autoSaveEnabled) {
    await selectDirectory()
  } else {
    disable()
  }
}

const handleResolutionChange = (value: string | number | Record<string, unknown> | unknown[] | undefined) => {
  if (typeof value === 'string') {
    settingsStore.setResolution(value as Resolution)
  }
}

const handleAspectRatioChange = (value: string | number | Record<string, unknown> | unknown[] | undefined) => {
  if (typeof value === 'string') {
    settingsStore.setAspectRatio(value as AspectRatio)
  }
}

const handleContextChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  settingsStore.setContextCount(Number(target.value))
}
</script>

<template>
  <div class="space-y-6">
    <!-- 生成设置 -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2 dark:border-gray-700">生成设置</h3>

      <UFormField label="默认分辨率">
        <USelectMenu
          :model-value="settingsStore.resolution"
          @update:model-value="handleResolutionChange"
          :items="resolutionOptions"
          value-key="value"
        />
      </UFormField>

      <UFormField label="默认长宽比">
        <USelectMenu
          :model-value="settingsStore.aspectRatio"
          @update:model-value="handleAspectRatioChange"
          :items="aspectRatioOptions"
          value-key="value"
        />
      </UFormField>

      <UFormField label="流式传输">
        <div class="flex items-center gap-2">
          <USwitch :model-value="settingsStore.streamEnabled" @update:model-value="settingsStore.toggleStream()" />
          <span class="text-sm text-gray-500">{{ settingsStore.streamEnabled ? '已启用' : '已禁用' }}</span>
        </div>
      </UFormField>
    </div>

    <!-- 上下文设置 -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2 dark:border-gray-700">对话设置</h3>

      <UFormField label="上下文消息数">
        <div class="flex items-center gap-4">
          <input
            type="range"
            :value="settingsStore.contextCount"
            @input="handleContextChange"
            min="1"
            max="50"
            class="flex-1"
          />
          <span class="w-8 text-center font-mono">{{ settingsStore.contextCount }}</span>
        </div>
      </UFormField>
    </div>

    <!-- 自动保存 -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2 dark:border-gray-700">自动保存</h3>

      <div v-if="!isSupported" class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p class="text-sm text-yellow-700 dark:text-yellow-300">
          您的浏览器不支持 File System Access API。请使用 Chrome 86+ 或 Edge 86+ 以启用自动保存功能。
        </p>
      </div>

      <template v-else>
        <UFormField label="自动保存到本地">
          <div class="flex items-center gap-2">
            <USwitch :model-value="isEnabled" @update:model-value="handleAutoSaveToggle" />
            <span class="text-sm text-gray-500">
              {{ isEnabled ? `已启用 - ${directoryName}` : '已禁用' }}
            </span>
          </div>
        </UFormField>

        <UButton
          v-if="!isEnabled"
          icon="i-heroicons-folder-open"
          variant="outline"
          @click="() => { void selectDirectory() }"
        >
          选择保存目录
        </UButton>
      </template>
    </div>

    <!-- 主题 -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2 dark:border-gray-700">外观</h3>
      <UFormField label="主题">
        <SettingsThemeSwitch />
      </UFormField>
    </div>

    <!-- 渠道管理 -->
    <SettingsProviderManager />
  </div>
</template>
