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
    <button
      type="button"
      class="sticker-card-download"
      title="下载"
      @click.stop="emit('download')"
    >
      <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
    </button>
  </div>
</template>

<style scoped>
.sticker-card {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-tertiary);
  cursor: zoom-in;
  aspect-ratio: 1 / 1;
}

.sticker-card:hover .sticker-card-download {
  opacity: 1;
}

.sticker-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sticker-card-download {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.sticker-card-download:hover {
  background: rgba(0, 0, 0, 0.8);
}

@media (max-width: 768px) {
  .sticker-card-download {
    opacity: 1;
  }
}
</style>
