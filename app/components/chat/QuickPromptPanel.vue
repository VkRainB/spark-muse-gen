<script setup lang="ts">
import { usePromptsStore } from '../../../stores/prompts'

const promptsStore = usePromptsStore()

const emit = defineEmits<{
  apply: [prompt: string]
  send: [prompt: string]
}>()

const searchQuery = ref('')

const filteredPrompts = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  const prompts = [...promptsStore.allPrompts].sort((a, b) => b.createdAt - a.createdAt)

  if (!keyword) return prompts

  return prompts.filter(
    (item) =>
      item.title.toLowerCase().includes(keyword) ||
      item.prompt.toLowerCase().includes(keyword) ||
      item.category.toLowerCase().includes(keyword)
  )
})

const groupedPrompts = computed(() => {
  const groups: Record<string, typeof filteredPrompts.value> = {}
  for (const p of filteredPrompts.value) {
    const cat = p.category || '未分类'
    if (!groups[cat]) groups[cat] = []
    groups[cat]!.push(p)
  }
  return groups
})

const builtinPrompts = [
  { label: '高质量照片', prompt: '一张高质量的摄影照片，' },
  { label: '动漫风格', prompt: '动漫风格的插画，' },
  { label: '油画风格', prompt: '一幅精美的油画，' },
  { label: '水彩画', prompt: '水彩风格的画作，' },
  { label: '像素艺术', prompt: '像素风格的游戏场景，' },
  { label: '3D渲染', prompt: '3D渲染效果，高精度建模，' },
  { label: '扁平插画', prompt: '现代扁平设计风格的插画，' },
  { label: '中国水墨', prompt: '中国传统水墨画风格，' },
]
</script>

<template>
  <div class="quick-panel">
    <!-- 快捷风格标签 -->
    <div class="panel-section">
      <span class="section-label">风格快填</span>
      <div class="quick-tags">
        <button
          v-for="item in builtinPrompts"
          :key="item.label"
          class="quick-tag"
          @click="emit('apply', item.prompt)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <!-- 自定义提示词 -->
    <div v-if="promptsStore.allPrompts.length > 0" class="panel-section">
      <span class="section-label">我的提示词</span>
      <div class="search-box">
        <UIcon name="i-heroicons-magnifying-glass" class="w-3.5 h-3.5 search-icon" />
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="搜索提示词..."
        />
      </div>
      <div class="prompt-list">
        <template v-for="(prompts, category) in groupedPrompts" :key="category">
          <div class="category-label">{{ category }}</div>
          <div
            v-for="p in prompts"
            :key="p.id"
            class="prompt-card"
            @click="emit('apply', p.prompt)"
          >
            <span class="prompt-title">{{ p.title }}</span>
            <span class="prompt-preview">{{ p.prompt }}</span>
            <button
              class="prompt-send-btn"
              title="直接发送"
              @click.stop="emit('send', p.prompt)"
            >
              <UIcon name="i-heroicons-paper-airplane" class="w-3.5 h-3.5" />
            </button>
          </div>
        </template>
      </div>
    </div>

    <div v-else class="empty-prompts">
      <UIcon name="i-heroicons-light-bulb" class="w-8 h-8 opacity-40" />
      <p>暂无自定义提示词</p>
      <p class="empty-hint">可在左侧菜单「我的提示词」中添加</p>
    </div>
  </div>
</template>

<style scoped>
.quick-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 16px;
}

.section-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-tag {
  padding: 5px 10px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--card-bg);
  color: var(--text-sub);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.quick-tag:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  background: var(--accent-blue-bg);
}

.search-box {
  position: relative;
  margin-bottom: 8px;
}

.search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-sub);
}

.search-input {
  width: 100%;
  padding: 6px 8px 6px 26px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-input-area);
  color: var(--text-main);
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--accent-blue);
}

.search-input::placeholder {
  color: var(--text-sub);
}

.prompt-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.category-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-tertiary);
  padding: 6px 0 2px;
}

.prompt-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 32px 8px 10px;
  border: 1px solid color-mix(in srgb, var(--border-color) 60%, transparent);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.prompt-card:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
}

.prompt-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prompt-preview {
  font-size: 11px;
  color: var(--text-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prompt-send-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
}

.prompt-card:hover .prompt-send-btn {
  opacity: 1;
}

.prompt-send-btn:hover {
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
}

.empty-prompts {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  color: var(--text-sub);
  text-align: center;
  gap: 6px;
}

.empty-prompts p {
  margin: 0;
  font-size: 13px;
}

.empty-hint {
  font-size: 11px !important;
  color: var(--text-tertiary);
}
</style>
