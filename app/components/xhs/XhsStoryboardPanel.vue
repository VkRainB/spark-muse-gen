<script setup lang="ts">
import type { StoryboardItem } from '../../../types/xhs'

defineProps<{
  items: StoryboardItem[]
  completedCount: number
  isGenerating: boolean
  isZipping: boolean
  hasStoryboard: boolean
  expandedPrompts: Set<string>
}>()

const emit = defineEmits<{
  generateAll: []
  downloadZip: []
  generateOne: [item: StoryboardItem]
  preview: [item: StoryboardItem]
  downloadOne: [item: StoryboardItem, index: number]
  togglePrompt: [id: string]
}>()
</script>

<template>
  <section class="panel storyboard-panel">
    <header class="panel-head">
      <div>
        <h3 class="panel-title">分镜规划</h3>
        <span class="panel-sub">
          {{ items.length }} 个 · 已完成 {{ completedCount }}
        </span>
      </div>
      <div class="storyboard-actions">
        <UButton
          v-if="hasStoryboard"
          :disabled="isGenerating || completedCount === items.length"
          size="xs"
          color="primary"
          icon="i-heroicons-photo"
          @click="emit('generateAll')"
        >
          批量生成
        </UButton>
        <UButton
          v-if="completedCount > 0"
          :loading="isZipping"
          size="xs"
          color="success"
          variant="outline"
          icon="i-heroicons-arrow-down-tray"
          @click="emit('downloadZip')"
        >
          ZIP
        </UButton>
      </div>
    </header>

    <div v-if="!hasStoryboard" class="storyboard-empty">
      <div class="empty-icon-wrap">
        <UIcon name="i-heroicons-squares-2x2" class="w-10 h-10" />
      </div>
      <p class="empty-title">分镜规划</p>
      <p class="empty-desc">生成内容后将显示分镜规划</p>
    </div>

    <ul v-else class="storyboard-list">
      <XhsStoryboardCard
        v-for="(item, idx) in items"
        :key="item.id"
        :item="item"
        :index="idx"
        :is-expanded="expandedPrompts.has(item.id)"
        :is-generating="isGenerating"
        @generate="emit('generateOne', item)"
        @preview="emit('preview', item)"
        @download="emit('downloadOne', item, idx)"
        @toggle-prompt="emit('togglePrompt', item.id)"
      />
    </ul>
  </section>
</template>

<style scoped>
.storyboard-panel {
  height: 100%;
  flex: 1 1 auto;
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

.storyboard-actions {
  display: flex;
  gap: 6px;
}

.storyboard-empty {
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

.empty-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--xhs-color) 8%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--xhs-color);
}

.empty-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.empty-desc {
  margin: 0;
  font-size: 12px;
}

.storyboard-list {
  list-style: none;
  margin: 0;
  padding: 0 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
</style>
