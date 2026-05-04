<script setup lang="ts">
import { usePromptsStore } from '../../../stores/prompts'

const { prompts, isLoading, categories, loadPrompts, filterByCategory, refresh } = useBananaTool()
const promptsStore = usePromptsStore()
const toast = useAppToast()

const emit = defineEmits<{
  apply: [prompt: string]
}>()

const searchQuery = ref('')
const selectedCategory = ref('all')

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
    <div v-if="isLoading" class="banana-loading">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <div v-else class="banana-list">
      <div
        v-for="item in filteredPrompts"
        :key="item.id"
        class="prompt-card"
      >
        <div class="prompt-card-row">
          <div class="prompt-card-main">
            <h4 class="prompt-card-title">{{ item.title }}</h4>
            <p class="prompt-card-desc">{{ item.prompt }}</p>
            <span class="prompt-card-tag">{{ item.category }}</span>
          </div>
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
      </div>

      <p v-if="filteredPrompts.length === 0" class="banana-empty">
        没有找到匹配的提示词
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

.banana-loading {
  display: flex;
  justify-content: center;
  padding: 32px 0;
  flex: 1;
  align-items: center;
}

.banana-list {
  display: grid;
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
  align-content: start;
}

.prompt-card {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px;
  background: var(--card-bg);
  transition: border-color 0.15s ease;
}

.prompt-card:hover {
  border-color: var(--accent-blue);
}

.prompt-card:hover .prompt-card-actions {
  opacity: 1;
}

.prompt-card-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.prompt-card-main {
  flex: 1;
  min-width: 0;
}

.prompt-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prompt-card-desc {
  font-size: 12px;
  color: var(--text-sub);
  margin: 4px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.prompt-card-tag {
  display: inline-block;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-sub);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 999px;
}

.prompt-card-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.banana-empty {
  text-align: center;
  color: var(--text-sub);
  padding: 32px 0;
  margin: 0;
}

@media (max-width: 768px) {
  .prompt-card-actions {
    opacity: 1;
  }

  .banana-filter {
    width: 100%;
  }
}
</style>
