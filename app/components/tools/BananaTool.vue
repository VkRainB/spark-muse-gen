<script setup lang="ts">
import { usePromptsStore } from '../../../stores/prompts'

const { prompts, isLoading, categories, loadPrompts, filterByCategory, refresh } = useBananaTool()
const promptsStore = usePromptsStore()
const toast = useAppToast()
const { openLightbox } = useLightbox()

const emit = defineEmits<{
  apply: [prompt: string]
}>()

const searchQuery = ref('')
const selectedCategory = ref('all')
/**
 * 预览图加载失败兜底：用 preview URL 作为索引（不依赖 item.id），
 * 单张图失败仅影响该 URL 对应的卡片，不会扩散到其他卡片
 */
const erroredPreviews = ref<Set<string>>(new Set())

const filteredPrompts = computed(() => {
  let result = filterByCategory(selectedCategory.value)
  if (searchQuery.value) {
    result = result.filter(p =>
      p.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  return result
})

const categoryOptions = computed(() => {
  return categories.value.map(c => ({
    label: c === 'all' ? '全部' : c,
    value: c
  }))
})

const hasPreview = (item: { preview?: string }) =>
  !!item.preview && !erroredPreviews.value.has(item.preview)

const onPreviewError = (url: string) => {
  if (url) erroredPreviews.value.add(url)
}

/** 当前过滤结果中所有有可用预览图的项，作为灯箱图集（支持左右切换） */
const previewableItems = computed(() =>
  filteredPrompts.value.filter((p) => hasPreview(p))
)

const handlePreview = (item: { id: string; preview?: string }) => {
  if (!item.preview) return
  const list = previewableItems.value
    .filter((p) => p.preview)
    .map((p) => ({ data: p.preview as string }))
  const idx = previewableItems.value.findIndex((p) => p.id === item.id)
  if (list.length === 0) return
  openLightbox(list[idx >= 0 ? idx : 0]!, list, idx >= 0 ? idx : 0)
}

const copyPrompt = (prompt: string) => {
  navigator.clipboard.writeText(prompt)
  toast.success('已复制', '提示词已复制到剪贴板')
}

const applyPrompt = (prompt: string) => {
  emit('apply', prompt)
}

const saveToCustom = (item: { title: string; prompt: string; category: string }) => {
  promptsStore.addPrompt({
    title: item.title,
    prompt: item.prompt,
    category: item.category
  })
  toast.success('已保存', '提示词已添加到自定义列表')
}

onMounted(() => {
  loadPrompts()
})
</script>

<template>
  <div class="banana-tool">
    <!-- 顶部工具栏：搜索 + 筛选 + 刷新 -->
    <div class="banana-toolbar">
      <UInput
        v-model="searchQuery"
        placeholder="搜索提示词..."
        icon="i-heroicons-magnifying-glass"
        class="banana-search"
      />
      <USelectMenu
        v-model="selectedCategory"
        :items="categoryOptions"
        value-key="value"
        class="banana-filter"
      />
      <UButton
        icon="i-heroicons-arrow-path"
        size="sm"
        color="neutral"
        variant="ghost"
        :loading="isLoading"
        title="刷新提示词库"
        @click="refresh"
      />
    </div>

    <!-- 列表区 -->
    <div class="banana-list">
      <article
        v-for="item in filteredPrompts"
        :key="item.id"
        class="prompt-card"
        :class="{ 'has-preview': hasPreview(item) }"
      >
        <div class="prompt-card-text">
          <div class="prompt-head">
            <h4 class="prompt-card-title" :title="item.title">{{ item.title }}</h4>
            <span class="prompt-card-tag">{{ item.category }}</span>
          </div>
          <p class="prompt-card-desc">{{ item.prompt }}</p>
          <div class="prompt-card-actions">
            <UButton
              icon="i-heroicons-clipboard"
              size="xs"
              color="neutral"
              variant="ghost"
              title="复制"
              @click="copyPrompt(item.prompt)"
            />
            <UButton
              icon="i-heroicons-arrow-right-circle"
              size="xs"
              color="primary"
              variant="ghost"
              title="应用到输入框"
              @click="applyPrompt(item.prompt)"
            />
            <UButton
              icon="i-heroicons-bookmark"
              size="xs"
              color="neutral"
              variant="ghost"
              title="保存到我的提示词"
              @click="saveToCustom(item)"
            />
          </div>
        </div>

        <div
          v-if="hasPreview(item)"
          class="prompt-card-preview"
          title="单击放大预览"
          @click.stop="handlePreview(item)"
        >
          <img
            :src="item.preview"
            :alt="item.title"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            @error="onPreviewError(item.preview!)"
          />
          <div class="preview-hint">
            <UIcon name="i-heroicons-magnifying-glass-plus" class="w-4 h-4" />
          </div>
        </div>
      </article>

      <p v-if="filteredPrompts.length === 0 && !isLoading" class="banana-empty">
        没有找到匹配的提示词
      </p>
      <p v-if="filteredPrompts.length === 0 && isLoading" class="banana-empty">
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
        <span class="loading-text">正在加载提示词库...</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.banana-tool {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.banana-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  flex: 0 0 auto;
}

.banana-search {
  flex: 1;
  min-width: 180px;
}

.banana-filter {
  width: 128px;
  flex-shrink: 0;
}

.banana-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  align-content: start;
  padding-right: 4px;
}

.prompt-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  transition: border-color 0.15s ease;
  /* 防止被 grid 自动压扁，每张卡至少能容纳标题+3行描述+按钮 */
  min-height: 138px;
}

.prompt-card.has-preview {
  grid-template-columns: 1fr minmax(96px, 120px);
}

.prompt-card:hover {
  border-color: var(--accent-blue);
}

.prompt-card-text {
  display: grid;
  /* 三行：头部 / 描述（自动撑开）/ 操作按钮 */
  grid-template-rows: auto 1fr auto;
  row-gap: 6px;
  min-width: 0;
  min-height: 0;
}

.prompt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.prompt-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.prompt-card-tag {
  display: inline-block;
  font-size: 10px;
  color: var(--text-sub);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 999px;
  flex-shrink: 0;
  white-space: nowrap;
}

.prompt-card-desc {
  font-size: 12px;
  color: var(--text-sub);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
  /* 在 grid 1fr 单元里允许收缩 */
  min-height: 0;
}

.prompt-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0;
  margin-top: 2px;
}

.prompt-card-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary);
  align-self: stretch;
  cursor: zoom-in;
  user-select: none;
}

.prompt-card-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.2s ease;
}

.prompt-card-preview:hover img {
  transform: scale(1.04);
}

.preview-hint {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.prompt-card-preview:hover .preview-hint {
  opacity: 1;
}

.banana-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  color: var(--text-sub);
  padding: 32px 0;
  margin: 0;
  grid-column: 1 / -1;
}

.banana-empty .loading-text {
  font-size: 13px;
}

@media (max-width: 768px) {
  .banana-list {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  /* 移动端卡片：水平布局，左侧小图 + 右侧文字 */
  .prompt-card.has-preview {
    grid-template-columns: 1fr 72px;
    gap: 10px;
    padding: 10px 12px;
    min-height: auto;
  }

  /* 移动端预览图：固定小尺寸正方形 */
  .prompt-card-preview {
    aspect-ratio: 1 / 1;
    width: 72px;
    height: 72px;
    border-radius: 8px;
    align-self: center;
  }

  .prompt-card-preview img {
    object-fit: cover;
  }

  /* 移动端常态显示放大镜 */
  .preview-hint {
    opacity: 1;
    width: 20px;
    height: 20px;
    right: 4px;
    bottom: 4px;
  }

  .banana-filter {
    width: 100%;
  }

  .prompt-card-title {
    white-space: normal;
    font-size: 14px;
    line-height: 1.4;
  }

  .prompt-card-desc {
    -webkit-line-clamp: 2;
    font-size: 12px;
    line-height: 1.5;
  }

  .prompt-card-actions {
    margin-top: 4px;
  }

  .prompt-card-actions :deep(button) {
    min-width: 36px;
    min-height: 36px;
  }
}
</style>
