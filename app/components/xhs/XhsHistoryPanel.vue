<script setup lang="ts">
import type { StoryboardItem } from '../../../types/xhs'
import { toDataUrl } from '../../utils/base64Utils'

const props = defineProps<{
  items: Array<{
    id: string
    topic: string
    content: string
    storyboard: StoryboardItem[]
    images: Array<{ data: string; mimeType: string }>
    createdAt: number
  }>
  currentTopic: string
  currentContent: string
}>()

const emit = defineEmits<{
  load: [id: string]
  delete: [id: string]
  clearAll: []
}>()

const getImageSrc = (image?: { data: string; mimeType: string }) => {
  if (!image) return ''
  return toDataUrl(image.data, image.mimeType)
}

const historyThumb = (item: { storyboard: StoryboardItem[]; images: Array<{ data: string; mimeType: string }> }) => {
  const fromBoard = item.storyboard.find((s) => s.image)?.image
  if (fromBoard) return getImageSrc(fromBoard)
  const fromImages = item.images?.[0]
  return fromImages ? getImageSrc(fromImages) : ''
}

const formatTime = (ts: number) => {
  const date = new Date(ts)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

const isActive = (item: { topic: string; content: string }) =>
  item.topic === props.currentTopic && item.content === props.currentContent
</script>

<template>
  <section class="panel history-panel">
    <header class="panel-head">
      <div>
        <h3 class="panel-title">历史</h3>
        <span class="panel-sub">{{ items.length }} 条</span>
      </div>
      <button
        v-if="items.length > 0"
        type="button"
        class="clear-btn"
        title="清空全部历史"
        @click="emit('clearAll')"
      >
        <UIcon name="i-heroicons-trash" class="w-3 h-3" />
        清空
      </button>
    </header>

    <div v-if="items.length === 0" class="history-empty">
      <div class="empty-icon-wrap">
        <UIcon name="i-heroicons-clock" class="w-8 h-8" />
      </div>
      <p>暂无历史记录</p>
      <p class="empty-tip">生成内容后点保存按钮可保存到这里</p>
    </div>

    <ul v-else class="history-list">
      <li
        v-for="item in items"
        :key="item.id"
        class="history-item"
        :class="{ active: isActive(item) }"
        @click="emit('load', item.id)"
      >
        <div class="history-thumb">
          <img v-if="historyThumb(item)" :src="historyThumb(item)" alt="预览" />
          <div v-else class="history-thumb-empty">
            <UIcon name="i-heroicons-document-text" class="w-5 h-5 opacity-40" />
          </div>
        </div>
        <div class="history-meta">
          <div class="history-topic">{{ item.topic }}</div>
          <div class="history-sub">
            <span>{{ item.storyboard.length }} 个分镜</span>
            <span class="dot">·</span>
            <span>{{ formatTime(item.createdAt) }}</span>
          </div>
        </div>
        <button
          type="button"
          class="history-delete-btn"
          title="删除该条"
          @click.stop="emit('delete', item.id)"
        >
          <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.history-panel {
  height: 100%;
}

.panel {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 8px;
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

.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--xhs-color);
  cursor: pointer;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: color-mix(in srgb, var(--xhs-color) 12%, transparent);
}

.history-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-sub);
  gap: 8px;
  padding: 32px 8px;
}

.empty-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--xhs-color) 8%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--xhs-color);
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
  padding: 0 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
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
  border-color: var(--xhs-color);
}

.history-item:hover .history-delete-btn {
  opacity: 1;
}

.history-item.active {
  border-color: var(--xhs-color);
  background: color-mix(in srgb, var(--xhs-color) 6%, var(--bg-secondary));
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

.history-topic {
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
  background: color-mix(in srgb, var(--xhs-color) 15%, transparent);
  color: var(--xhs-color);
}

@media (max-width: 768px) {
  .history-delete-btn {
    opacity: 1;
  }
}
</style>
