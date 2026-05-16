<script setup lang="ts">
/**
 * 小红书灵感实验室 / xhs
 *
 * 三栏布局：左 历史 | 中 主题 + 文案 | 右 分镜
 *
 * 响应式：
 *  - ≥1280：三栏并列
 *  - 768-1279：双栏（中 + 右），历史改顶部按钮触发抽屉
 *  - <768：单栏堆叠，历史抽屉
 */

import JSZip from 'jszip'
import type { StoryboardItem } from '../../types/xhs'
import { downloadImageFromBase64, downloadImageFromBlob } from '../utils/downloadImage'
import { toDataUrl, stripDataUrlPrefix } from '../utils/base64Utils'

definePageMeta({
  layout: 'default',
})

const {
  sortedHistory,
  currentTopic,
  currentTitle,
  currentBody,
  currentTags,
  currentContent,
  currentStoryboard,
  isGenerating,
  progress,
  hasContent,
  hasStoryboard,
  completedImages,
  generateContent,
  generateStoryboardImage,
  generateAllStoryboardImages,
  saveToHistory,
  loadFromHistory,
  deleteHistory,
  clearAllHistory,
  clearCurrent,
} = useXHS()

const toast = useAppToast()
const { openLightbox } = useLightbox()
const { isMobile, isTablet } = useDevice()

const topicInput = ref('')
const historyDrawerOpen = ref(false)
const expandedPrompts = ref<Set<string>>(new Set())
const showClearAllConfirm = ref(false)
const pendingDeleteId = ref<string | null>(null)
const pendingClearCurrent = ref(false)
const isZipping = ref(false)

const showHistoryColumn = computed(() => !isMobile.value && !isTablet.value)

const showDeleteOne = computed({
  get: () => pendingDeleteId.value !== null,
  set: (v: boolean) => {
    if (!v) pendingDeleteId.value = null
  },
})

const handleGenerate = async () => {
  const topic = topicInput.value.trim()
  if (!topic) {
    toast.warning('请输入主题')
    return
  }
  await generateContent(topic)
}

const handleLoadHistory = (id: string) => {
  loadFromHistory(id)
  topicInput.value = currentTopic.value
  historyDrawerOpen.value = false
}

const requestDeleteHistory = (id: string) => {
  pendingDeleteId.value = id
}

const confirmDeleteHistory = () => {
  if (pendingDeleteId.value) {
    deleteHistory(pendingDeleteId.value)
  }
  pendingDeleteId.value = null
}

const requestClearAll = () => {
  showClearAllConfirm.value = true
}

const confirmClearAll = () => {
  clearAllHistory()
  showClearAllConfirm.value = false
}

const requestClearCurrent = () => {
  pendingClearCurrent.value = true
}

const confirmClearCurrent = () => {
  clearCurrent()
  topicInput.value = ''
  pendingClearCurrent.value = false
  toast.info('已清空当前内容')
}

const copyContent = () => {
  if (!currentContent.value) return
  navigator.clipboard.writeText(currentContent.value)
  toast.success('已复制到剪贴板')
}

const copyTags = () => {
  if (currentTags.value.length === 0) return
  const text = currentTags.value.map((t) => `#${t}`).join(' ')
  navigator.clipboard.writeText(text)
  toast.success('标签已复制')
}

const handleSave = () => {
  if (!hasContent.value) {
    toast.warning('暂无可保存的内容')
    return
  }
  saveToHistory()
  toast.success('已保存到历史记录')
}

const handleGenerateOne = async (item: StoryboardItem) => {
  await generateStoryboardImage(item)
}

const togglePromptExpand = (id: string) => {
  if (expandedPrompts.value.has(id)) {
    expandedPrompts.value.delete(id)
  } else {
    expandedPrompts.value.add(id)
  }
  expandedPrompts.value = new Set(expandedPrompts.value)
}

const getImageSrc = (image?: { data: string; mimeType: string }) => {
  if (!image) return ''
  return toDataUrl(image.data, image.mimeType)
}

const previewableItems = computed(() =>
  currentStoryboard.value.filter((item) => !!item.image)
)

const handlePreview = (item: StoryboardItem) => {
  if (!item.image) return
  const list = previewableItems.value.map((s) => ({
    data: getImageSrc(s.image),
    mimeType: s.image?.mimeType,
  }))
  const idx = previewableItems.value.findIndex((s) => s.id === item.id)
  if (list.length === 0) return
  openLightbox(list[idx >= 0 ? idx : 0]!, list, idx >= 0 ? idx : 0)
}

const handleDownloadOne = (item: StoryboardItem, index: number) => {
  if (!item.image) return
  try {
    const filename = `xhs-${currentTopic.value || 'untitled'}-${index + 1}.png`
    const base64 = stripDataUrlPrefix(item.image.data)
    downloadImageFromBase64(base64, filename, item.image.mimeType || 'image/png')
  } catch (err) {
    console.error(err)
    toast.error('下载失败')
  }
}

const handleDownloadAllZip = async () => {
  if (previewableItems.value.length === 0) {
    toast.info('暂无可下载的图片')
    return
  }
  if (isZipping.value) return

  isZipping.value = true
  try {
    const zip = new JSZip()
    const folder = zip.folder(`xhs-${currentTopic.value || 'untitled'}`)
    if (!folder) throw new Error('无法创建 zip 目录')

    previewableItems.value.forEach((item, idx) => {
      if (!item.image) return
      const base64 = stripDataUrlPrefix(item.image.data)
      folder.file(`xhs-${idx + 1}.png`, base64, { base64: true })
    })

    const blob = await zip.generateAsync({ type: 'blob' })
    downloadImageFromBlob(blob, `xhs-${currentTopic.value || 'untitled'}.zip`)
    toast.success('已打包', `共 ${previewableItems.value.length} 张`)
  } catch (err) {
    console.error(err)
    toast.error('打包失败')
  } finally {
    isZipping.value = false
  }
}

onMounted(() => {
  if (currentTopic.value && !topicInput.value) {
    topicInput.value = currentTopic.value
  }
})
</script>

<template>
  <div class="xhs-page">
    <!-- 移动/平板顶栏 -->
    <header v-if="!showHistoryColumn" class="xhs-mobile-bar">
      <button class="mobile-history-btn" type="button" @click="historyDrawerOpen = true">
        <UIcon name="i-heroicons-clock" class="w-4 h-4" />
        <span>历史 ({{ sortedHistory.length }})</span>
      </button>
      <h1 class="mobile-title">
        <span class="title-dot"></span>
        灵感实验室
      </h1>
    </header>

    <!-- 桌面端标题栏 -->
    <header v-if="showHistoryColumn" class="xhs-desktop-bar">
      <h1 class="desktop-title">
        <span class="title-dot"></span>
        灵感实验室
      </h1>
      <span class="desktop-subtitle">小红书内容创作工作台</span>
    </header>

    <div class="xhs-grid" :class="{ 'is-narrow': !showHistoryColumn }">
      <!-- 历史栏 -->
      <aside v-if="showHistoryColumn" class="col col-history">
        <XhsHistoryPanel
          :items="sortedHistory"
          :current-topic="currentTopic"
          :current-content="currentContent"
          @load="handleLoadHistory"
          @delete="requestDeleteHistory"
          @clear-all="requestClearAll"
        />
      </aside>

      <!-- 中栏：主题 + 文案 -->
      <section class="col col-config">
        <!-- 主题输入卡 -->
        <section class="panel topic-panel">
          <h3 class="panel-title">创作主题</h3>
          <div class="topic-row">
            <UInput
              v-model="topicInput"
              placeholder="输入你想创作的主题，按 Enter 生成..."
              class="topic-input"
              size="lg"
              :disabled="isGenerating"
              @keydown.enter="handleGenerate"
            />
            <UButton
              :loading="isGenerating"
              :disabled="!topicInput.trim()"
              icon="i-heroicons-sparkles"
              color="primary"
              size="lg"
              @click="handleGenerate"
            >
              生成
            </UButton>
          </div>
        </section>

        <!-- 内容卡：生成中 / 内容展示 / 空状态 -->
        <section v-if="isGenerating && !hasContent" class="panel content-panel">
          <UiSmartProgressBar :progress="progress" task="正在生成笔记内容..." />
        </section>

        <section v-else-if="hasContent" class="panel content-panel">
          <header class="panel-head">
            <div>
              <h3 class="panel-title">笔记内容</h3>
              <span class="panel-sub">主题：{{ currentTopic }}</span>
            </div>
            <div class="content-actions">
              <UButton
                icon="i-heroicons-clipboard"
                size="xs"
                color="neutral"
                variant="ghost"
                title="复制全文"
                @click="copyContent"
              />
              <UButton
                icon="i-heroicons-bookmark"
                size="xs"
                color="primary"
                variant="ghost"
                title="保存到历史"
                @click="handleSave"
              />
              <UButton
                icon="i-heroicons-trash"
                size="xs"
                color="error"
                variant="ghost"
                title="清空当前"
                @click="requestClearCurrent"
              />
            </div>
          </header>

          <article class="note">
            <div v-if="currentTitle" class="note-title-wrap">
              <div class="note-accent-bar"></div>
              <h2 class="note-title">{{ currentTitle }}</h2>
            </div>

            <div v-if="currentBody" class="note-body">{{ currentBody }}</div>

            <div v-if="currentTags.length > 0" class="note-tags">
              <button
                v-for="tag in currentTags"
                :key="tag"
                type="button"
                class="tag-pill"
                title="点击复制全部标签"
                @click="copyTags"
              >
                #{{ tag }}
              </button>
            </div>
          </article>

          <UiSmartProgressBar
            v-if="isGenerating"
            :progress="progress"
            task="正在生成分镜图片..."
            class="content-progress"
          />
        </section>

        <section v-else class="panel content-panel content-empty">
          <div class="empty-hero">
            <div class="empty-icon-wrap">
              <UIcon name="i-heroicons-light-bulb" class="w-10 h-10" />
            </div>
            <p class="empty-title">输入主题，开始创作</p>
            <p class="empty-desc">AI 将自动生成标题、正文、标签和 4-6 张分镜规划</p>
          </div>
          <div class="empty-examples">
            <span class="example-label">试试这些主题：</span>
            <button
              v-for="example in ['周末brunch食谱', '通勤穿搭分享', '居家健身计划']"
              :key="example"
              type="button"
              class="example-chip"
              @click="topicInput = example"
            >
              {{ example }}
            </button>
          </div>
        </section>
      </section>

      <!-- 右栏：分镜 -->
      <section class="col col-storyboard">
        <XhsStoryboardPanel
          :items="currentStoryboard"
          :completed-count="completedImages"
          :is-generating="isGenerating"
          :is-zipping="isZipping"
          :has-storyboard="hasStoryboard"
          :expanded-prompts="expandedPrompts"
          @generate-all="generateAllStoryboardImages"
          @download-zip="handleDownloadAllZip"
          @generate-one="handleGenerateOne"
          @preview="handlePreview"
          @download-one="handleDownloadOne"
          @toggle-prompt="togglePromptExpand"
        />
      </section>
    </div>

    <!-- 历史抽屉（窄屏） -->
    <USlideover
      v-if="!showHistoryColumn"
      v-model:open="historyDrawerOpen"
      side="left"
      title="历史记录"
      :ui="{ content: 'max-w-xs w-[18rem]' }"
    >
      <template #body>
        <div class="drawer-history-wrap">
          <XhsHistoryPanel
            :items="sortedHistory"
            :current-topic="currentTopic"
            :current-content="currentContent"
            @load="handleLoadHistory"
            @delete="requestDeleteHistory"
            @clear-all="requestClearAll"
          />
        </div>
      </template>
    </USlideover>

    <!-- 确认对话框 -->
    <UiConfirmDialog
      v-model:open="showClearAllConfirm"
      title="清空全部历史？"
      description="操作不可撤销，所有历史记录将被永久删除。"
      confirm-text="确认清空"
      @confirm="confirmClearAll"
    />
    <UiConfirmDialog
      v-model:open="showDeleteOne"
      title="删除该条历史？"
      description="操作不可撤销。"
      confirm-text="确认删除"
      @confirm="confirmDeleteHistory"
    />
    <UiConfirmDialog
      v-model:open="pendingClearCurrent"
      title="清空当前内容？"
      description="主题、笔记、分镜将被清空（不影响历史记录）。"
      confirm-text="确认清空"
      @confirm="confirmClearCurrent"
    />
  </div>
</template>

<style scoped>
.xhs-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  background: var(--bg-color);
  padding: 14px 16px;
  gap: 12px;
  overflow: hidden;
}

/* 标题栏 */
.xhs-mobile-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.xhs-desktop-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.title-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--xhs-color);
  margin-right: 4px;
  vertical-align: middle;
}

.mobile-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.desktop-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.desktop-subtitle {
  font-size: 12px;
  color: var(--text-sub);
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
  border-color: var(--xhs-color);
}

/* 三栏 Grid */
.xhs-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) minmax(360px, 480px);
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
}

.xhs-grid.is-narrow {
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
}

.col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.col-config {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}

.col-history,
.col-storyboard {
  overflow: hidden;
}

/* 通用面板 */
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

/* 主题输入 */
.topic-panel {
  border-color: color-mix(in srgb, var(--xhs-color) 20%, var(--border-color));
}

.topic-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.topic-input {
  flex: 1;
}

/* 内容卡 */
.content-actions {
  display: flex;
  gap: 0;
}

.content-empty {
  align-items: stretch;
  justify-content: center;
  min-height: 280px;
}

.empty-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 24px 0 16px;
}

.empty-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--xhs-color) 10%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--xhs-color);
}

.empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
}

.empty-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub);
}

.empty-examples {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.example-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.example-chip {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-sub);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.example-chip:hover {
  border-color: var(--xhs-color);
  color: var(--xhs-color);
  background: color-mix(in srgb, var(--xhs-color) 6%, transparent);
}

.content-progress {
  margin-top: 4px;
}

/* 笔记内容 */
.note {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.note-accent-bar {
  flex-shrink: 0;
  width: 3px;
  height: 24px;
  border-radius: 2px;
  background: var(--xhs-color);
  margin-top: 2px;
}

.note-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  line-height: 1.4;
}

.note-body {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-word;
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--xhs-color) 25%, transparent);
  background: color-mix(in srgb, var(--xhs-color) 8%, transparent);
  color: var(--xhs-color);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tag-pill:hover {
  background: color-mix(in srgb, var(--xhs-color) 16%, transparent);
}

/* 抽屉内历史面板 */
.drawer-history-wrap {
  height: 100%;
  padding: 0;
}

.drawer-history-wrap :deep(.history-panel) {
  border: none;
  background: transparent;
  border-radius: 0;
  padding: 12px;
}

@media (max-width: 767px) {
  .xhs-page {
    padding: 12px;
  }

  .xhs-grid,
  .xhs-grid.is-narrow {
    grid-template-columns: 1fr;
    grid-auto-rows: minmax(0, auto);
  }

  .col-storyboard {
    min-height: 320px;
  }

  .topic-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
