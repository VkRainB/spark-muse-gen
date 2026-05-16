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
  // 触发响应式更新
  expandedPrompts.value = new Set(expandedPrompts.value)
}

const isPromptExpanded = (id: string) => expandedPrompts.value.has(id)

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

// 进入页面时同步 input 与 currentTopic（来自历史加载）
onMounted(() => {
  if (currentTopic.value && !topicInput.value) {
    topicInput.value = currentTopic.value
  }
})
</script>

<template>
  <div class="xhs-page">
    <!-- 移动/平板顶栏：触发历史抽屉 -->
    <header v-if="!showHistoryColumn" class="xhs-mobile-bar">
      <button class="mobile-history-btn" type="button" @click="historyDrawerOpen = true">
        <UIcon name="i-heroicons-clock" class="w-4 h-4" />
        <span>历史 ({{ sortedHistory.length }})</span>
      </button>
      <h1 class="mobile-title">小红书灵感实验室</h1>
    </header>

    <div class="xhs-grid" :class="{ 'is-narrow': !showHistoryColumn }">
      <!-- 历史栏 -->
      <aside v-if="showHistoryColumn" class="col col-history">
        <section class="panel history-panel">
          <header class="panel-head">
            <div>
              <h3 class="panel-title">历史</h3>
              <span class="panel-sub">{{ sortedHistory.length }} 条</span>
            </div>
            <button
              v-if="sortedHistory.length > 0"
              type="button"
              class="clear-btn"
              title="清空全部历史"
              @click="requestClearAll"
            >
              <UIcon name="i-heroicons-trash" class="w-3 h-3" />
              清空
            </button>
          </header>

          <div v-if="sortedHistory.length === 0" class="history-empty">
            <UIcon name="i-heroicons-clock" class="w-8 h-8 opacity-30" />
            <p>暂无历史记录</p>
            <p class="empty-tip">生成内容后点保存按钮可保存到这里。</p>
          </div>

          <ul v-else class="history-list">
            <li
              v-for="item in sortedHistory"
              :key="item.id"
              class="history-item"
              :class="{ active: item.topic === currentTopic && item.content === currentContent }"
              @click="handleLoadHistory(item.id)"
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
                @click.stop="requestDeleteHistory(item.id)"
              >
                <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
              </button>
            </li>
          </ul>
        </section>
      </aside>

      <!-- 中栏：主题 + 文案 -->
      <section class="col col-config">
        <!-- 主题输入卡 -->
        <section class="panel">
          <h3 class="panel-title">创作主题</h3>
          <div class="topic-row">
            <UInput
              v-model="topicInput"
              placeholder="输入你想创作的主题，按 Enter 生成..."
              class="topic-input"
              :disabled="isGenerating"
              @keydown.enter="handleGenerate"
            />
            <UButton
              :loading="isGenerating"
              :disabled="!topicInput.trim()"
              icon="i-heroicons-sparkles"
              color="primary"
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
            <h2 v-if="currentTitle" class="note-title">{{ currentTitle }}</h2>

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
          <UIcon name="i-heroicons-document-text" class="w-10 h-10 opacity-30" />
          <p>输入主题，让 AI 帮你创作小红书笔记</p>
          <p class="empty-tip">将自动生成标题、正文、标签、4-6 张分镜规划</p>
        </section>
      </section>

      <!-- 右栏：分镜 -->
      <section class="col col-storyboard">
        <section class="panel storyboard-panel">
          <header class="panel-head">
            <div>
              <h3 class="panel-title">分镜规划</h3>
              <span class="panel-sub">
                {{ currentStoryboard.length }} 个 · 已完成 {{ completedImages }}
              </span>
            </div>
            <div class="storyboard-actions">
              <UButton
                v-if="hasStoryboard"
                :disabled="isGenerating || completedImages === currentStoryboard.length"
                size="xs"
                color="primary"
                icon="i-heroicons-photo"
                @click="generateAllStoryboardImages"
              >
                批量生成
              </UButton>
              <UButton
                v-if="completedImages > 0"
                :loading="isZipping"
                size="xs"
                color="success"
                variant="outline"
                icon="i-heroicons-arrow-down-tray"
                @click="handleDownloadAllZip"
              >
                ZIP
              </UButton>
            </div>
          </header>

          <div v-if="!hasStoryboard" class="storyboard-empty">
            <UIcon name="i-heroicons-squares-2x2" class="w-10 h-10 opacity-30" />
            <p>生成内容后将显示分镜规划</p>
          </div>

          <ul v-else class="storyboard-list">
            <li
              v-for="(item, idx) in currentStoryboard"
              :key="item.id"
              class="storyboard-card"
            >
              <div class="storyboard-image" :class="{ 'has-image': !!item.image }">
                <template v-if="item.image">
                  <img
                    :src="getImageSrc(item.image)"
                    class="storyboard-img"
                    alt="Storyboard"
                    @click="handlePreview(item)"
                  />
                  <div class="storyboard-overlay">
                    <button
                      type="button"
                      class="overlay-btn"
                      title="重新生成"
                      :disabled="isGenerating"
                      @click.stop="handleGenerateOne(item)"
                    >
                      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      class="overlay-btn"
                      title="下载"
                      @click.stop="handleDownloadOne(item, idx)"
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
                    @click="handleGenerateOne(item)"
                  >
                    生成
                  </UButton>
                </div>
              </div>

              <div class="storyboard-meta">
                <div class="storyboard-index">第 {{ idx + 1 }} 张</div>
                <p class="storyboard-desc">{{ item.description }}</p>
                <button
                  v-if="item.imagePrompt"
                  type="button"
                  class="prompt-toggle"
                  @click="togglePromptExpand(item.id)"
                >
                  <UIcon
                    :name="
                      isPromptExpanded(item.id)
                        ? 'i-heroicons-chevron-up'
                        : 'i-heroicons-chevron-down'
                    "
                    class="w-3 h-3"
                  />
                  {{ isPromptExpanded(item.id) ? '收起' : '查看' }}提示词
                </button>
                <p v-if="isPromptExpanded(item.id)" class="storyboard-prompt">
                  {{ item.imagePrompt }}
                </p>
              </div>
            </li>
          </ul>
        </section>
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
        <section class="panel history-panel inside-drawer">
          <header class="panel-head">
            <span class="panel-sub">{{ sortedHistory.length }} 条</span>
            <button
              v-if="sortedHistory.length > 0"
              type="button"
              class="clear-btn"
              @click="requestClearAll"
            >
              <UIcon name="i-heroicons-trash" class="w-3 h-3" />
              清空
            </button>
          </header>

          <div v-if="sortedHistory.length === 0" class="history-empty">
            <UIcon name="i-heroicons-clock" class="w-8 h-8 opacity-30" />
            <p>暂无历史记录</p>
          </div>

          <ul v-else class="history-list">
            <li
              v-for="item in sortedHistory"
              :key="item.id"
              class="history-item"
              :class="{ active: item.topic === currentTopic && item.content === currentContent }"
              @click="handleLoadHistory(item.id)"
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
                @click.stop="requestDeleteHistory(item.id)"
              >
                <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
              </button>
            </li>
          </ul>
        </section>
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

.xhs-mobile-bar {
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

/* 历史栏 */
.history-panel {
  height: 100%;
}

.history-panel.inside-drawer {
  border: none;
  background: transparent;
  border-radius: 0;
  height: 100%;
  padding: 12px;
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
  background: color-mix(in srgb, #fca5a5 28%, transparent);
  color: #d93025;
}

@media (max-width: 768px) {
  .history-delete-btn {
    opacity: 1;
  }
}

/* 主题输入 */
.topic-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.topic-input {
  flex: 1;
}

/* 内容卡 */
.content-panel {
  /* 让内容随长度伸展，不限定 max-height */
}

.content-actions {
  display: flex;
  gap: 0;
}

.content-empty {
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-sub);
  min-height: 220px;
}

.content-empty p {
  margin: 0;
  font-size: 13px;
}

.content-progress {
  margin-top: 4px;
}

.note {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  border: 1px solid color-mix(in srgb, var(--accent-blue) 30%, transparent);
  background: color-mix(in srgb, var(--accent-blue) 8%, transparent);
  color: var(--accent-blue);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.tag-pill:hover {
  background: color-mix(in srgb, var(--accent-blue) 18%, transparent);
}

/* 分镜栏 */
.storyboard-panel {
  height: 100%;
  flex: 1 1 auto;
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

.storyboard-empty p {
  margin: 0;
  font-size: 13px;
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

.storyboard-card {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  transition: border-color 0.15s ease;
}

.storyboard-card:hover {
  border-color: var(--accent-blue);
}

.storyboard-image {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 8px;
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
  gap: 6px;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.storyboard-image.has-image:hover .storyboard-overlay {
  opacity: 1;
  pointer-events: auto;
}

.overlay-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-main);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.overlay-btn:hover {
  background: #fff;
}

.overlay-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
  color: var(--text-sub);
  font-weight: 500;
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
  color: var(--accent-blue);
}

.storyboard-prompt {
  font-size: 11px;
  color: var(--text-sub);
  margin: 0;
  padding: 6px 8px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  line-height: 1.5;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
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
