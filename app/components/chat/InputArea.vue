<script setup lang="ts">
const emit = defineEmits<{
  send: [content: string, images?: Array<{ data: string; mimeType: string }>]
}>()

const content = ref('')
const attachedImages = ref<Array<{ data: string; mimeType: string }>>([])

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files) return

  Array.from(files).forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      attachedImages.value.push({
        data: e.target?.result as string,
        mimeType: file.type
      })
    }
    reader.readAsDataURL(file)
  })

  input.value = ''
}

const removeImage = (index: number) => {
  attachedImages.value.splice(index, 1)
}

const handleSend = () => {
  if (!content.value.trim() && attachedImages.value.length === 0) return

  emit('send', content.value, attachedImages.value.length > 0 ? [...attachedImages.value] : undefined)
  content.value = ''
  attachedImages.value = []
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
    <!-- 附加图片预览 -->
    <div v-if="attachedImages.length > 0" class="flex flex-wrap gap-2">
      <div v-for="(image, index) in attachedImages" :key="index" class="relative">
        <img :src="image.data" class="w-16 h-16 object-cover rounded" alt="Attached" />
        <button
          @click="removeImage(index)"
          class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
        >
          x
        </button>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="flex items-end gap-2">
      <input
        type="file"
        accept="image/*"
        multiple
        @change="handleFileUpload"
        class="hidden"
        id="chat-image-upload"
      />
      <label for="chat-image-upload" class="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
        <UIcon name="i-heroicons-photo" class="w-6 h-6 text-gray-500" />
      </label>

      <UTextarea
        v-model="content"
        placeholder="输入消息..."
        :rows="1"
        autoresize
        class="flex-1"
        @keydown="handleKeydown"
      />

      <UButton
        icon="i-heroicons-paper-airplane"
        color="primary"
        :disabled="!content.trim() && attachedImages.length === 0"
        @click="handleSend"
      />
    </div>
  </div>
</template>
