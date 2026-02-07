<script setup lang="ts">
import type { StoryboardItem } from '../../types/xhs'

const {
  history,
  currentTopic,
  currentContent,
  currentStoryboard,
  isGenerating,
  progress,
  hasContent,
  hasStoryboard,
  generateContent,
  generateStoryboardImage,
  generateAllStoryboardImages,
  saveToHistory,
  loadFromHistory,
  deleteHistory,
  clearCurrent
} = useXHS()

const topicInput = ref('')
const toast = useAppToast()

const goChatHome = async () => {
  await navigateTo('/')
}

const handleGenerate = async () => {
  await generateContent(topicInput.value)
}

const copyContent = () => {
  navigator.clipboard.writeText(currentContent.value)
  toast.success('已复制到剪贴板')
}

const getImageSrc = (image?: { data: string; mimeType: string }) => {
  if (!image) return ''
  if (image.data.startsWith('data:')) return image.data
  return `data:${image.mimeType};base64,${image.data}`
}

const handleLoadHistory = (id: string) => {
  loadFromHistory(id)
  topicInput.value = currentTopic.value
}

const handleGenerateStoryboard = async (item: StoryboardItem) => {
  await generateStoryboardImage(item)
}
</script>

<template>
  <div class="min-h-screen p-6">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">小红书灵感实验室</h1>
      <UButton
        icon="i-heroicons-arrow-left"
        color="neutral"
        variant="outline"
        @click="goChatHome"
      >
        返回聊天
      </UButton>
    </div>

    <div class="grid grid-cols-12 gap-6">
      <!-- 左侧: 设置和历史 -->
      <div class="col-span-3 space-y-4">
        <div class="p-4 border rounded-lg dark:border-gray-700">
          <h3 class="font-semibold mb-4">历史记录</h3>

          <div v-if="history.length > 0" class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="item in history"
              :key="item.id"
              class="p-3 bg-gray-50 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition group"
              @click="handleLoadHistory(item.id)"
            >
              <p class="font-medium truncate">{{ item.topic }}</p>
              <p class="text-xs text-gray-500 mt-1">
                {{ new Date(item.createdAt).toLocaleDateString() }}
              </p>
              <UButton
                icon="i-heroicons-trash"
                size="xs"
                color="error"
                variant="ghost"
                class="opacity-0 group-hover:opacity-100 mt-1"
                @click.stop="deleteHistory(item.id)"
              />
            </div>
          </div>

          <p v-else class="text-gray-400 text-sm">暂无历史记录</p>
        </div>
      </div>

      <!-- 中间: 主题输入和内容 -->
      <div class="col-span-5 space-y-4">
        <!-- 主题输入 -->
        <div class="p-4 border rounded-lg dark:border-gray-700">
          <h3 class="font-semibold mb-4">创作主题</h3>
          <div class="flex gap-2">
            <UInput
              v-model="topicInput"
              placeholder="输入你想创作的主题..."
              class="flex-1"
              :disabled="isGenerating"
            />
            <UButton
              :loading="isGenerating"
              icon="i-heroicons-sparkles"
              @click="handleGenerate"
            >
              生成
            </UButton>
          </div>
        </div>

        <!-- 进度 -->
        <div v-if="isGenerating" class="p-4 border rounded-lg dark:border-gray-700">
          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
            <span class="text-sm text-gray-600 dark:text-gray-400">正在生成内容...</span>
          </div>
          <UProgress :value="progress" />
        </div>

        <!-- 内容展示 -->
        <div v-if="hasContent" class="p-4 border rounded-lg dark:border-gray-700">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-semibold">生成内容</h3>
            <div class="flex gap-2">
              <UButton icon="i-heroicons-clipboard" size="xs" variant="ghost" @click="copyContent" />
              <UButton icon="i-heroicons-bookmark" size="xs" variant="ghost" @click="saveToHistory" />
              <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost" @click="clearCurrent" />
            </div>
          </div>
          <div class="prose dark:prose-invert max-w-none whitespace-pre-wrap">
            {{ currentContent }}
          </div>
        </div>
      </div>

      <!-- 右侧: 分镜墙 -->
      <div class="col-span-4 space-y-4">
        <div class="p-4 border rounded-lg dark:border-gray-700">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-semibold">分镜规划</h3>
            <UButton
              v-if="hasStoryboard"
              :disabled="isGenerating"
              size="sm"
              icon="i-heroicons-photo"
              @click="generateAllStoryboardImages"
            >
              批量生成图片
            </UButton>
          </div>

          <div v-if="hasStoryboard" class="grid grid-cols-2 gap-3">
            <div
              v-for="item in currentStoryboard"
              :key="item.id"
              class="border rounded-lg overflow-hidden dark:border-gray-700"
            >
              <!-- 图片 -->
              <div class="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                <img
                  v-if="item.image"
                  :src="getImageSrc(item.image)"
                  class="w-full h-full object-cover"
                  alt="Storyboard"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <UButton
                    icon="i-heroicons-sparkles"
                    size="sm"
                    variant="ghost"
                    :loading="isGenerating"
                    @click="handleGenerateStoryboard(item)"
                  >
                    生成
                  </UButton>
                </div>
              </div>

              <!-- 描述 -->
              <div class="p-2">
                <p class="text-sm font-medium truncate">{{ item.description }}</p>
                <p class="text-xs text-gray-500 truncate mt-1">{{ item.imagePrompt }}</p>
              </div>
            </div>
          </div>

          <p v-else class="text-gray-400 text-sm text-center py-8">
            生成内容后将显示分镜规划
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
