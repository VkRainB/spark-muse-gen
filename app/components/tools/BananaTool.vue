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
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">提示词库</h3>
      <UButton
        icon="i-heroicons-arrow-path"
        size="xs"
        variant="ghost"
        :loading="isLoading"
        @click="refresh"
      />
    </div>

    <!-- Search and Filter -->
    <div class="flex gap-2">
      <UInput
        v-model="searchQuery"
        placeholder="搜索提示词..."
        icon="i-heroicons-magnifying-glass"
        class="flex-1"
      />
      <USelectMenu
        v-model="selectedCategory"
        :items="categoryOptions"
        value-key="value"
        class="w-32"
      />
    </div>

    <!-- Prompts List -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <div v-else class="grid gap-3 max-h-96 overflow-y-auto">
      <div
        v-for="item in filteredPrompts"
        :key="item.id"
        class="p-3 border rounded-lg dark:border-gray-700 hover:border-primary transition group"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <h4 class="font-medium truncate">{{ item.title }}</h4>
            <p class="text-sm text-gray-500 line-clamp-2 mt-1">{{ item.prompt }}</p>
            <span class="inline-block text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded mt-2">
              {{ item.category }}
            </span>
          </div>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <UButton
              icon="i-heroicons-clipboard"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="copyPrompt(item.prompt)"
            />
            <UButton
              icon="i-heroicons-arrow-right-circle"
              size="xs"
              color="primary"
              variant="ghost"
              @click="applyPrompt(item.prompt)"
            />
            <UButton
              icon="i-heroicons-bookmark"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="saveToCustom(item)"
            />
          </div>
        </div>
      </div>

      <p v-if="filteredPrompts.length === 0" class="text-center text-gray-400 py-8">
        没有找到匹配的提示词
      </p>
    </div>
  </div>
</template>
