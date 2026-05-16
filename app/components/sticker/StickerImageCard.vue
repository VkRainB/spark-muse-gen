<script setup lang="ts">
/**
 * 贴纸单图卡片：纯展示 + 悬停下载按钮。
 * 点击卡片触发 preview，点击下载按钮触发 download（stopPropagation）。
 */
import type { StickerImage } from '../../../types/sticker'
import { toDataUrl } from '../../utils/base64Utils'

const props = defineProps<{
  image: StickerImage
  filename: string
}>()

const emit = defineEmits<{
  preview: []
  download: []
}>()

const src = computed(() => toDataUrl(props.image.data, props.image.mimeType))
</script>

<template>
  <div class="sticker-card" :title="filename" @click="emit('preview')">
    <img :src="src" alt="Sticker" class="sticker-card-img" />
    <div class="sticker-card-overlay">
      <button
        type="button"
        class="sticker-card-download"
        title="下载"
        @click.stop="emit('download')"
      >
        <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.sticker-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-tertiary);
  cursor: zoom-in;
  aspect-ratio: 1 / 1;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.sticker-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.dark .sticker-card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.sticker-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: stickerFadeIn 0.3s ease;
}

@keyframes stickerFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.sticker-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.2s ease;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 6px;
}

.sticker-card:hover .sticker-card-overlay {
  opacity: 1;
}

.sticker-card-download {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(4px);
}

.sticker-card-download:hover {
  background: #fff;
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .sticker-card-overlay {
    opacity: 1;
  }
}
</style>
