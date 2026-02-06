<script setup lang="ts">
import type { Message } from '../../../types'

defineProps<{
  messages: Message[]
}>()

const emit = defineEmits<{
  copy: [message: Message]
  delete: [id: string]
  regenerate: [message: Message]
}>()

const listRef = ref<HTMLElement>()

const scrollToBottom = () => {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  })
}

defineExpose({ scrollToBottom })
</script>

<template>
  <div ref="listRef" class="flex-1 overflow-y-auto">
    <div v-if="messages.length === 0" class="h-full flex items-center justify-center text-gray-400">
      <p>开始新的对话...</p>
    </div>
    <template v-else>
      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
        @copy="emit('copy', $event)"
        @delete="emit('delete', $event)"
        @regenerate="emit('regenerate', $event)"
      />
    </template>
  </div>
</template>
