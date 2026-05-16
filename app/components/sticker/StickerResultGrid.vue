<script setup lang="ts">
/**
 * 当前批次结果网格 —— 仅负责头部 + 网格布局
 * 单图卡片、下载与打包逻辑分别由 StickerImageCard / useStickerDownload 承担。
 * 图片二进制从 IndexedDB 异步加载。
 */

import { useStickerStore } from '../../../stores/sticker'
import type { StickerImage } from '../../../types/sticker'
import { getCharacterLabel } from '../../utils/stickerHelpers'
import { toDataUrl } from '../../utils/base64Utils'

const stickerStore = useStickerStore()
const { openLightbox } = useLightbox()
const { isZipping, downloadOne, downloadBatchAsZip } = useStickerDownload()
const imageDB = useStickerImageDB()

const currentBatch = computed(() => stickerStore.currentBatch)

/** 当前批次完整图片（含 data），从 IDB 异步加载 */
const loadedImages = ref<StickerImage[]>([])

const reloadImages = async () => {
  const refs = currentBatch.value?.images ?? []
  if (refs.length === 0) {
    loadedImages.value = []
    return
  }
  try {
    loadedImages.value = await imageDB.getMany(refs)
  } catch (err) {
    console.error('加载图片失败：', err)
    loadedImages.value = []
  }
}

watch(
  () => [currentBatch.value?.id, currentBatch.value?.images.length] as const,
  () => { void reloadImages() },
  { immediate: true },
)

const characterLabel = computed(() =>
  getCharacterLabel(currentBatch.value?.character) || '未命名角色'
)

const handleDownloadOne = (img: StickerImage, index: number) => {
  downloadOne(img, `sticker-${characterLabel.value}-${index + 1}.png`)
}

const handleDownloadAll = () =>
  downloadBatchAsZip(loadedImages.value, `sticker-${characterLabel.value}`, 'sticker')

const handlePreview = (index: number) => {
  const lightboxImages = loadedImages.value.map((img) => ({
    data: toDataUrl(img.data, img.mimeType),
    mimeType: img.mimeType,
  }))
  openLightbox(lightboxImages[index] ?? '', lightboxImages, index)
}
</script>

<template>
  <section class="sticker-result-grid">
    <header class="result-head">
      <div>
        <h3 class="panel-title">结果</h3>
        <span class="panel-sub">
          {{ currentBatch ? characterLabel : '当前无批次' }} · {{ loadedImages.length }} 张
        </span>
      </div>
      <UButton
        v-if="loadedImages.length > 0"
        color="success"
        size="sm"
        icon="i-heroicons-arrow-down-tray"
        :loading="isZipping"
        @click="handleDownloadAll"
      >
        ZIP 下载
      </UButton>
    </header>

    <div v-if="!currentBatch" class="result-empty">
      <UIcon name="i-heroicons-sparkles" class="w-10 h-10 opacity-30" />
      <p>选择左侧历史批次查看，或在中栏配置后点击批量生成</p>
    </div>

    <div v-else-if="loadedImages.length === 0" class="result-empty">
      <UIcon name="i-heroicons-photo" class="w-10 h-10 opacity-30" />
      <p>该批次暂未生成图片</p>
    </div>

    <div v-else class="result-grid">
      <StickerImageCard
        v-for="(img, idx) in loadedImages"
        :key="img.id"
        :image="img"
        :filename="`sticker-${characterLabel}-${idx + 1}.png`"
        @preview="handlePreview(idx)"
        @download="handleDownloadOne(img, idx)"
      />
    </div>
  </section>
</template>

<style scoped>
.sticker-result-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  height: 100%;
  min-height: 0;
}

.result-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-shrink: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: var(--text-main);
}

.panel-sub {
  font-size: 12px;
  color: var(--text-sub);
}

.result-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-sub);
  gap: 8px;
  padding: 32px 16px;
}

.result-empty p {
  margin: 0;
  font-size: 13px;
  max-width: 280px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  align-content: start;
  padding-right: 4px;
}

@media (max-width: 1279px) {
  .result-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .result-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
