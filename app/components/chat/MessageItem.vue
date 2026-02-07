<script setup lang="ts">
import type { Message } from '../../../types'

const props = defineProps<{
  message: Message
}>()

const emit = defineEmits<{
  copy: [message: Message]
  delete: [id: string]
  regenerate: [message: Message]
}>()

const getImageSrc = (image: { data: string; mimeType: string }) => {
  if (image.data.startsWith('data:') || image.data.startsWith('http')) {
    return image.data
  }
  return `data:${image.mimeType};base64,${image.data}`
}

const isUser = computed(() => props.message.role === 'user')

const copyContent = () => {
  navigator.clipboard.writeText(props.message.content)
  emit('copy', props.message)
}
</script>

<template>
  <div :class="['flex gap-3 p-4', isUser ? 'flex-row-reverse' : '']">
    <!-- 头像 -->
    <div :class="[
      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
      isUser ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'
    ]">
      <UIcon :name="isUser ? 'i-heroicons-user' : 'i-heroicons-cpu-chip'" class="w-5 h-5" />
    </div>

    <!-- 内容 -->
    <div :class="['max-w-[80%] space-y-2', isUser ? 'text-right' : '']">
      <div :class="[
        'inline-block px-4 py-2 rounded-2xl',
        isUser
          ? 'bg-primary text-white rounded-tr-sm'
          : 'bg-gray-100 dark:bg-gray-800 rounded-tl-sm'
      ]">
        <p class="whitespace-pre-wrap">{{ message.content }}</p>
      </div>

      <!-- 图片 -->
      <div v-if="message.images?.length" class="flex flex-wrap gap-2" :class="isUser ? 'justify-end' : ''">
        <img
          v-for="(image, index) in message.images"
          :key="index"
          :src="getImageSrc(image)"
          class="w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
          alt="Attached image"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-1" :class="isUser ? 'justify-end' : ''">
        <UButton icon="i-heroicons-clipboard" size="xs" color="neutral" variant="ghost" @click="copyContent" />
        <UButton
          v-if="!isUser"
          icon="i-heroicons-arrow-path"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="$emit('regenerate', message)"
        />
        <UButton
          icon="i-heroicons-trash"
          size="xs"
          color="error"
          variant="ghost"
          @click="$emit('delete', message.id)"
        />
      </div>
    </div>
  </div>
</template>
