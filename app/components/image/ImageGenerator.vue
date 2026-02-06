<script setup lang="ts">
import { useSettingsStore } from '../../../stores/settings'

const settingsStore = useSettingsStore()
const { generateImage, isGenerating, progress, currentTask, cancelGeneration } = useImageGeneration()
const { saveToFileSystem, isEnabled: autoSaveEnabled } = useFileSystem()
const chat = useChat()

const prompt = ref('')
const referenceImage = ref<string | null>(null)
const generatedImages = ref<Array<{ data: string; mimeType: string }>>([])

const resolutionOptions = [
  { label: '1K (1024x1024)', value: '1K' as const },
  { label: '2K (2048x2048)', value: '2K' as const },
  { label: '4K (4096x4096)', value: '4K' as const }
]

const aspectRatioOptions = [
  { label: '1:1', value: '1:1' as const },
  { label: '16:9', value: '16:9' as const },
  { label: '9:16', value: '9:16' as const },
  { label: '4:3', value: '4:3' as const },
  { label: '3:4', value: '3:4' as const }
]

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    referenceImage.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const clearReference = () => {
  referenceImage.value = null
}

const handleGenerate = async () => {
  if (!prompt.value.trim()) return

  const result = await generateImage({
    prompt: prompt.value,
    resolution: settingsStore.resolution,
    aspectRatio: settingsStore.aspectRatio,
    referenceImage: referenceImage.value || undefined,
    stream: settingsStore.streamEnabled
  })

  if (result.success && result.images.length > 0) {
    generatedImages.value = result.images.map(img => ({
      data: img.data,
      mimeType: img.mimeType
    }))

    // 添加到聊天记录
    chat.sendUserMessage(prompt.value, referenceImage.value ? [{ data: referenceImage.value, mimeType: 'image/png' }] : undefined)
    chat.addAssistantMessage('图像生成完成', generatedImages.value)

    // 自动保存
    if (autoSaveEnabled.value) {
      await saveToFileSystem(generatedImages.value, 'generated')
    }
  }
}

const getImageSrc = (image: { data: string; mimeType: string }) => {
  if (image.data.startsWith('data:') || image.data.startsWith('http')) {
    return image.data
  }
  return `data:${image.mimeType};base64,${image.data}`
}
</script>

<template>
  <div class="space-y-4">
    <!-- 提示词输入 -->
    <UTextarea
      v-model="prompt"
      placeholder="描述你想要生成的图像..."
      :rows="3"
      autoresize
      :disabled="isGenerating"
    />

    <!-- 设置区域 -->
    <div class="flex flex-wrap gap-4">
      <UFormField label="分辨率">
        <USelectMenu
          v-model="settingsStore.resolution"
          :items="resolutionOptions"
          value-key="value"
          :disabled="isGenerating"
        />
      </UFormField>

      <UFormField label="长宽比">
        <USelectMenu
          v-model="settingsStore.aspectRatio"
          :items="aspectRatioOptions"
          value-key="value"
          :disabled="isGenerating"
        />
      </UFormField>
    </div>

    <!-- 参考图 -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">参考图（可选）</label>
      <div class="flex items-center gap-4">
        <input
          type="file"
          accept="image/*"
          @change="handleFileUpload"
          class="hidden"
          id="reference-upload"
          :disabled="isGenerating"
        />
        <label
          for="reference-upload"
          class="px-4 py-2 text-sm border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          选择图片
        </label>

        <div v-if="referenceImage" class="flex items-center gap-2">
          <img :src="referenceImage" class="w-12 h-12 object-cover rounded" alt="Reference" />
          <UButton icon="i-heroicons-x-mark" color="gray" variant="ghost" size="xs" @click="clearReference" />
        </div>
      </div>
    </div>

    <!-- 进度条 -->
    <SmartProgressBar
      v-if="isGenerating"
      :progress="progress"
      :task="currentTask"
    />

    <!-- 操作按钮 -->
    <div class="flex gap-2">
      <UButton
        v-if="!isGenerating"
        @click="handleGenerate"
        :disabled="!prompt.trim()"
        icon="i-heroicons-sparkles"
        color="primary"
      >
        生成图像
      </UButton>
      <UButton
        v-else
        @click="cancelGeneration"
        icon="i-heroicons-stop"
        color="red"
      >
        取消
      </UButton>
    </div>

    <!-- 生成结果 -->
    <div v-if="generatedImages.length > 0" class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div
        v-for="(image, index) in generatedImages"
        :key="index"
        class="relative group cursor-pointer"
      >
        <img
          :src="getImageSrc(image)"
          class="w-full aspect-square object-cover rounded-lg"
          alt="Generated"
        />
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 rounded-lg">
          <UButton icon="i-heroicons-arrow-down-tray" size="sm" color="white" variant="ghost" />
          <UButton icon="i-heroicons-magnifying-glass-plus" size="sm" color="white" variant="ghost" />
        </div>
      </div>
    </div>
  </div>
</template>
