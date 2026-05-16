<script setup lang="ts">
import type { StoryboardItem } from '../../../types/xhs'
import { toDataUrl } from '../../utils/base64Utils'

const props = defineProps<{
  item: StoryboardItem
  index: number
  isExpanded: boolean
  isGenerating: boolean
}>()

const emit = defineEmits<{
  generate: []
  preview: []
  download: []
  togglePrompt: []
}>()

const getImageSrc = (image?: { data: string; mimeType: string }) => {
  if (!image) return ''
  return toDataUrl(image.data, image.mimeType)
}
</script>

<template>
  <li class="storyboard-card">
    <div class="storyboard-image" :class="{ 'has-image': !!item.image }">
      <template v-if="item.image">
        <img
          :src="getImageSrc(item.image)"
          class="storyboard-img"
          alt="分镜图片"
          @click="emit('preview')"
        />
        <div class="storyboard-overlay">
          <button
            type="button"
            class="overlay-btn"
            title="重新生成"
            :disabled="isGenerating"
            @click.stop="emit('generate')"
          >
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="overlay-btn"
            title="下载"
            @click.stop="emit('download')"
          >
            <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
          </button>
        </div>
      </template>
      <div v-else class="storyboard-placeholder">
        <UButton
          icon="i-heroicons-sparkles"
          size="xs"
          color="primary"
          variant="outline"
          :loading="isGenerating"
          @click="emit('generate')"
        >
          生成
        </UButton>
      </div>
    </div>

    <div class="storyboard-meta">
      <div class="storyboard-index">第 {{ index + 1 }} 张</div>
      <p class="storyboard-desc">{{ item.description }}</p>
      <button
        v-if="item.imagePrompt"
        type="button"
        class="prompt-toggle"
        @click="emit('togglePrompt')"
      >
        <UIcon
          :name="isExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="w-3 h-3"
        />
        {{ isExpanded ? '收起' : '查看' }}提示词
      </button>
      <p v-if="isExpanded" class="storyboard-prompt">
        {{ item.imagePrompt }}
      </p>
    </div>
  </li>
</template>

<style scoped>
.storyboard-card {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  cursor: default;
}

.storyboard-card:hover {
  border-color: var(--xhs-color);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--xhs-color) 10%, transparent);
}

.storyboard-image {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.storyboard-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: zoom-in;
  display: block;
}

.storyboard-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.storyboard-image.has-image:hover .storyboard-overlay {
  opacity: 1;
  pointer-events: auto;
}

.overlay-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-main);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, transform 0.15s ease;
}

.overlay-btn:hover {
  background: #fff;
  transform: scale(1.05);
}

.overlay-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.storyboard-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.storyboard-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.storyboard-index {
  font-size: 11px;
  color: var(--xhs-color);
  font-weight: 600;
}

.storyboard-desc {
  font-size: 13px;
  color: var(--text-main);
  margin: 0;
  line-height: 1.5;
  word-break: break-word;
}

.prompt-toggle {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  align-self: flex-start;
  background: none;
  border: none;
  padding: 2px 0;
  color: var(--text-sub);
  font-size: 11px;
  cursor: pointer;
  transition: color 0.15s ease;
}

.prompt-toggle:hover {
  color: var(--xhs-color);
}

.storyboard-prompt {
  font-size: 11px;
  color: var(--text-sub);
  margin: 0;
  padding: 8px 10px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  line-height: 1.5;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
