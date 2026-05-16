<script setup lang="ts">
/**
 * Sticker 工作台页面 / sticker
 * 三栏布局：左 历史 | 中 角色配置 + 表情/动作选择 + 主 CTA | 右 结果网格
 *
 * 响应式：
 *  - ≥1280：三栏并列
 *  - 768-1279：两栏（中 + 右），历史改顶部按钮触发抽屉
 *  - <768：单栏堆叠，历史抽屉
 */

import type { StickerCharacter, StickerImage, StickerImageRef } from '../../types/sticker'
import { useStickerStore } from '../../stores/sticker'

definePageMeta({
  layout: 'default',
})

const { emotions, actions, generateStickerPack, generateSticker } = useStickerMode()
const { isGenerating, progress } = useImageGeneration()
const stickerStore = useStickerStore()
const imageDB = useStickerImageDB()
const toast = useAppToast()
const { isMobile, isTablet } = useDevice()

const character = ref<StickerCharacter>({
  description: '',
  referenceImage: undefined,
})
const background = ref<'white' | 'transparent'>('white')
const selectedEmotions = ref<string[]>([])
const selectedActions = ref<string[]>([])

const historyDrawerOpen = ref(false)

const showHistoryColumn = computed(() => !isMobile.value && !isTablet.value)

const totalSelected = computed(
  () => selectedEmotions.value.length + selectedActions.value.length,
)

const hasCharacter = computed(() => {
  const text = (character.value.description || '').trim()
  const hasImage = !!character.value.referenceImage?.data
  return text.length > 0 || hasImage
})

const canGenerateSingle = computed(
  () => hasCharacter.value && !isGenerating.value,
)
const canGenerateBatch = computed(
  () => hasCharacter.value && totalSelected.value > 0 && !isGenerating.value,
)

const handleGenerateBatch = async () => {
  if (!canGenerateBatch.value) return
  await generateStickerPack(
    { ...character.value },
    selectedEmotions.value,
    selectedActions.value,
    background.value,
  )
}

/** 单次生成：手动写入当前批次（如果没有则创建） */
const handleGenerateSingle = async () => {
  if (!canGenerateSingle.value) return

  const emotion = selectedEmotions.value[0]
  const action = selectedActions.value[0]

  // 确保有当前批次接收单次结果
  let batchId = stickerStore.currentBatchId
  if (!batchId) {
    const created = stickerStore.createBatch({
      character: { ...character.value },
      background: background.value,
      emotions: emotion ? [emotion] : [],
      actions: action ? [action] : [],
    })
    batchId = created.batchId
    if (created.droppedImageIds.length > 0) {
      void imageDB.removeMany(created.droppedImageIds)
    }
  }

  const result = await generateSticker({
    character: { ...character.value },
    emotion,
    action,
    background: background.value,
  })

  if (result.success && result.images.length > 0) {
    const stickerImages: StickerImage[] = result.images.map((img) => ({
      id: img.id,
      data: img.data,
      mimeType: img.mimeType,
      createdAt: img.createdAt,
      emotionId: emotion,
      actionId: action,
    }))

    try {
      await imageDB.putMany(stickerImages)
    } catch (err) {
      console.error('IndexedDB 写入失败：', err)
      toast.error('图片保存失败', '可能是浏览器存储已满')
      return
    }

    const refs: StickerImageRef[] = stickerImages.map((img) => ({
      id: img.id,
      mimeType: img.mimeType,
      createdAt: img.createdAt,
      emotionId: img.emotionId,
      actionId: img.actionId,
    }))
    stickerStore.addImagesToBatch(batchId, refs)
    toast.success('已生成', `+1 张到当前批次`)
  }
}

/** 移动/平板：选择历史批次后自动关闭抽屉 */
const handleHistorySelect = () => {
  historyDrawerOpen.value = false
}

const openHistory = () => {
  historyDrawerOpen.value = true
}
</script>

<template>
  <div class="sticker-page">
    <!-- 顶部工具栏（窄屏才显示，提供"打开历史"按钮） -->
    <header v-if="!showHistoryColumn" class="sticker-mobile-bar">
      <button class="mobile-history-btn" type="button" @click="openHistory">
        <UIcon name="i-heroicons-clock" class="w-4 h-4" />
        <span>历史 ({{ stickerStore.sortedBatches.length }})</span>
      </button>
      <h1 class="mobile-title">表情包工坊</h1>
    </header>

    <!-- 三栏 grid -->
    <div class="sticker-grid" :class="{ 'is-narrow': !showHistoryColumn }">
      <aside v-if="showHistoryColumn" class="col col-history">
        <StickerHistoryPanel @select="handleHistorySelect" />
      </aside>

      <section class="col col-config">
        <StickerCharacterPanel
          v-model:character="character"
          v-model:background="background"
        />

        <StickerVariantPicker
          :emotions="emotions"
          :actions="actions"
          v-model:selected-emotions="selectedEmotions"
          v-model:selected-actions="selectedActions"
        />

        <div class="cta-bar">
          <UiSmartProgressBar
            v-if="isGenerating"
            :progress="progress"
            task="生成表情包中..."
            class="cta-progress"
          />
          <div class="cta-buttons">
            <UButton
              :disabled="!canGenerateSingle"
              icon="i-heroicons-sparkles"
              variant="outline"
              @click="handleGenerateSingle"
            >
              生成单张
            </UButton>
            <UButton
              :disabled="!canGenerateBatch"
              icon="i-heroicons-squares-2x2"
              color="primary"
              @click="handleGenerateBatch"
            >
              批量生成（{{ totalSelected }}）
            </UButton>
          </div>
        </div>
      </section>

      <section class="col col-result">
        <StickerResultGrid />
      </section>
    </div>

    <!-- 移动 / 平板：历史抽屉 -->
    <USlideover
      v-if="!showHistoryColumn"
      v-model:open="historyDrawerOpen"
      side="left"
      title="历史批次"
      :ui="{ content: 'max-w-xs w-[18rem]' }"
    >
      <template #body>
        <StickerHistoryPanel @select="handleHistorySelect" />
      </template>
    </USlideover>
  </div>
</template>

<style scoped>
.sticker-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  background: var(--bg-color);
  padding: 16px;
  gap: 12px;
  overflow: hidden;
}

.sticker-mobile-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.mobile-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.mobile-history-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-main);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.mobile-history-btn:hover {
  border-color: var(--accent-blue);
}

.sticker-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) minmax(360px, 480px);
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
}

.sticker-grid.is-narrow {
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
}

.col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.col-history {
  /* 历史栏整列高度交给子组件控制 */
  overflow: hidden;
}

.col-config {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}

.col-result {
  overflow: hidden;
}

.cta-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  position: sticky;
  bottom: 0;
}

.cta-progress {
  width: 100%;
}

.cta-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 767px) {
  .sticker-page {
    padding: 12px;
  }

  .sticker-grid,
  .sticker-grid.is-narrow {
    grid-template-columns: 1fr;
    grid-auto-rows: minmax(0, auto);
  }

  .col-result {
    min-height: 320px;
  }
}
</style>
