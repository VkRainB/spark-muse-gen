<script setup lang="ts">
/**
 * 当前批次结果网格
 * 从 useStickerStore 读 currentBatch.images
 * 功能：单图下载、批量 ZIP 下载、点击灯箱预览
 */

import JSZip from 'jszip'
import { useStickerStore } from '../../../stores/sticker'
import type { StickerImage } from '../../../types/sticker'
import { downloadImageFromBase64, downloadImageFromBlob } from '../../utils/downloadImage'

const stickerStore = useStickerStore()
const { openLightbox } = useLightbox()
const toast = useAppToast()

const currentBatch = computed(() => stickerStore.currentBatch)

const images = computed<StickerImage[]>(() => currentBatch.value?.images ?? [])

const characterLabel = computed(() =>
  currentBatch.value?.character?.trim() || '未命名角色'
)

const imageSrc = (img: StickerImage) => {
  if (!img.data) return ''
  if (img.data.startsWith('data:')) return img.data
  return `data:${img.mimeType || 'image/png'};base64,${img.data}`
}

/** 把 dataURL 中的纯 base64 部分剥出来 */
const stripDataUrlPrefix = (data: string) => {
  if (data.startsWith('data:')) {
    const idx = data.indexOf('base64,')
    return idx === -1 ? data : data.slice(idx + 7)
  }
  return data
}

const handleDownloadOne = (img: StickerImage, index: number) => {
  try {
    const filename = `sticker-${characterLabel.value}-${index + 1}.png`
    const base64 = stripDataUrlPrefix(img.data)
    downloadImageFromBase64(base64, filename, img.mimeType || 'image/png')
  } catch (err) {
    console.error(err)
    toast.error('下载失败')
  }
}

const isZipping = ref(false)

const handleDownloadAll = async () => {
  if (images.value.length === 0) return
  if (isZipping.value) return

  isZipping.value = true
  try {
    const zip = new JSZip()
    const folder = zip.folder(`sticker-${characterLabel.value}`)
    if (!folder) throw new Error('无法创建 zip 目录')

    images.value.forEach((img, idx) => {
      const base64 = stripDataUrlPrefix(img.data)
      folder.file(`sticker-${idx + 1}.png`, base64, { base64: true })
    })

    const blob = await zip.generateAsync({ type: 'blob' })
    downloadImageFromBlob(blob, `sticker-${characterLabel.value}.zip`)
    toast.success('已打包', `共 ${images.value.length} 张`)
  } catch (err) {
    console.error(err)
    toast.error('打包失败')
  } finally {
    isZipping.value = false
  }
}

const handlePreview = (index: number) => {
  const lightboxImages = images.value.map((img) => ({
    data: imageSrc(img),
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
          {{ currentBatch ? characterLabel : '当前无批次' }} · {{ images.length }} 张
        </span>
      </div>
      <UButton
        v-if="images.length > 0"
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

    <div v-else-if="images.length === 0" class="result-empty">
      <UIcon name="i-heroicons-photo" class="w-10 h-10 opacity-30" />
      <p>该批次暂未生成图片</p>
    </div>

    <div v-else class="result-grid">
      <div
        v-for="(img, idx) in images"
        :key="img.id"
        class="result-cell"
        @click="handlePreview(idx)"
      >
        <img :src="imageSrc(img)" alt="Sticker" class="result-img" />
        <button
          type="button"
          class="result-download"
          title="下载"
          @click.stop="handleDownloadOne(img, idx)"
        >
          <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
        </button>
      </div>
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

.result-cell {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-tertiary);
  cursor: zoom-in;
  aspect-ratio: 1 / 1;
}

.result-cell:hover .result-download {
  opacity: 1;
}

.result-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-download {
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

.result-download:hover {
  background: rgba(0, 0, 0, 0.8);
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

  .result-download {
    opacity: 1;
  }
}
</style>
