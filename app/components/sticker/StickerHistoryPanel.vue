<script setup lang="ts">
/**
 * 历史批次列表
 * 从 useStickerStore 直接读，组件不接收 props（自治）
 * 缩略图从 IndexedDB 异步加载
 * emit:
 *  - select(batchId)：可选透传，外部如需在切换时做额外动作（如关闭抽屉）使用
 */

import { useStickerStore } from '../../../stores/sticker'
import {
  getCharacterLabel,
  getCharacterReferenceSrc,
} from '../../utils/stickerHelpers'
import { toDataUrl } from '../../utils/base64Utils'
import type { StickerBatch } from '../../../types/sticker'

const stickerStore = useStickerStore()
const imageDB = useStickerImageDB()

const emit = defineEmits<{
  select: [batchId: string]
}>()

const showClearConfirm = ref(false)
const pendingDeleteId = ref<string | null>(null)
const showDeleteConfirm = computed({
  get: () => pendingDeleteId.value !== null,
  set: (value: boolean) => {
    if (!value) pendingDeleteId.value = null
  },
})

/** batchId -> 第一张图的 dataURL（缩略图缓存） */
const thumbCache = ref<Record<string, string>>({})

const ensureThumb = async (batch: StickerBatch) => {
  if (thumbCache.value[batch.id] !== undefined) return
  const firstRef = batch.images[0]
  if (!firstRef) {
    thumbCache.value[batch.id] = ''
    return
  }
  try {
    const img = await imageDB.get(firstRef.id)
    thumbCache.value[batch.id] = img ? toDataUrl(img.data, img.mimeType) : ''
  } catch {
    thumbCache.value[batch.id] = ''
  }
}

watch(
  () => stickerStore.sortedBatches.map((b) => `${b.id}:${b.images[0]?.id ?? ''}`).join('|'),
  () => {
    for (const batch of stickerStore.sortedBatches) {
      // 若第一张图变了（id 与缓存对应不上），重置后重新加载
      const firstId = batch.images[0]?.id ?? ''
      const cached = thumbCache.value[batch.id]
      if (cached === undefined || (firstId && cached === '')) {
        delete thumbCache.value[batch.id]
        void ensureThumb(batch)
      }
    }
  },
  { immediate: true },
)

const handleSelect = (batchId: string) => {
  stickerStore.switchBatch(batchId)
  emit('select', batchId)
}

const requestDelete = (batchId: string) => {
  pendingDeleteId.value = batchId
}

const confirmDelete = async () => {
  if (pendingDeleteId.value) {
    const droppedIds = stickerStore.deleteBatch(pendingDeleteId.value)
    delete thumbCache.value[pendingDeleteId.value]
    if (droppedIds.length > 0) {
      await imageDB.removeMany(droppedIds).catch((err) => console.error(err))
    }
  }
  pendingDeleteId.value = null
}

const requestClearAll = () => {
  showClearConfirm.value = true
}

const confirmClearAll = async () => {
  stickerStore.clearAll()
  thumbCache.value = {}
  await imageDB.clearAll().catch((err) => console.error(err))
  showClearConfirm.value = false
}

const formatTime = (ts: number) => {
  const date = new Date(ts)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

const previewSrc = (batch: StickerBatch): string => {
  const cached = thumbCache.value[batch.id]
  if (cached) return cached
  // 该批次还没生成图：fallback 到角色参考图作为缩略
  if (batch.images.length === 0) return getCharacterReferenceSrc(batch.character)
  return ''
}

const variantSummary = (batch: { emotions: string[]; actions: string[] }) => {
  const total = batch.emotions.length + batch.actions.length
  return `${total} 个变体`
}
</script>

<template>
  <section class="sticker-history-panel">
    <header class="history-head">
      <div>
        <h3 class="panel-title">历史</h3>
        <span class="panel-sub">{{ stickerStore.sortedBatches.length }} 批</span>
      </div>
      <button
        v-if="stickerStore.sortedBatches.length > 0"
        type="button"
        class="clear-btn"
        title="清空全部历史"
        @click="requestClearAll"
      >
        <UIcon name="i-heroicons-trash" class="w-3 h-3" />
        清空
      </button>
    </header>

    <div v-if="stickerStore.sortedBatches.length === 0" class="history-empty">
      <UIcon name="i-heroicons-clock" class="w-8 h-8 opacity-30" />
      <p>暂无历史批次</p>
      <p class="empty-tip">完成一次批量生成后，结果会自动保存在这里。</p>
    </div>

    <ul v-else class="history-list">
      <li
        v-for="batch in stickerStore.sortedBatches"
        :key="batch.id"
        class="history-item"
        :class="{ active: batch.id === stickerStore.currentBatchId }"
        @click="handleSelect(batch.id)"
      >
        <div class="history-thumb">
          <img v-if="previewSrc(batch)" :src="previewSrc(batch)" alt="预览" />
          <div v-else class="history-thumb-empty">
            <UIcon name="i-heroicons-photo" class="w-5 h-5 opacity-40" />
          </div>
        </div>
        <div class="history-meta">
          <div class="history-title">{{ getCharacterLabel(batch.character) }}</div>
          <div class="history-sub">
            <span>{{ variantSummary(batch) }}</span>
            <span class="dot">·</span>
            <span>{{ batch.images.length }} 张</span>
          </div>
          <div class="history-time">{{ formatTime(batch.createdAt) }}</div>
        </div>
        <button
          type="button"
          class="history-delete-btn"
          title="删除该批次"
          @click.stop="requestDelete(batch.id)"
        >
          <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
        </button>
      </li>
    </ul>

    <UiConfirmDialog
      v-model:open="showClearConfirm"
      title="清空全部历史？"
      description="操作不可撤销，所有批次与图片将被永久删除。"
      confirm-text="确认清空"
      @confirm="confirmClearAll"
    />

    <UiConfirmDialog
      v-model:open="showDeleteConfirm"
      title="删除此批次？"
      description="操作不可撤销。"
      confirm-text="确认删除"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.sticker-history-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  height: 100%;
  min-height: 0;
}

.history-head {
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
  font-size: 11px;
  color: var(--text-sub);
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #d93025;
  cursor: pointer;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: color-mix(in srgb, #fca5a5 35%, transparent);
}

.history-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-sub);
  gap: 6px;
  padding: 32px 8px;
}

.history-empty p {
  margin: 0;
  font-size: 13px;
}

.empty-tip {
  font-size: 11px !important;
  color: var(--text-tertiary, var(--text-sub));
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding-right: 4px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.history-item:hover {
  border-color: var(--accent-blue);
}

.history-item:hover .history-delete-btn {
  opacity: 1;
}

.history-item.active {
  border-color: var(--accent-blue);
  background: color-mix(in srgb, var(--accent-blue) 8%, var(--bg-secondary));
}

.history-thumb {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary);
}

.history-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.history-thumb-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-sub {
  font-size: 11px;
  color: var(--text-sub);
  display: flex;
  align-items: center;
  gap: 4px;
}

.dot {
  opacity: 0.5;
}

.history-time {
  font-size: 11px;
  color: var(--text-sub);
}

.history-delete-btn {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s ease;
}

.history-delete-btn:hover {
  background: color-mix(in srgb, #fca5a5 28%, transparent);
  color: #d93025;
}

@media (max-width: 768px) {
  .history-delete-btn {
    opacity: 1;
  }
}
</style>
