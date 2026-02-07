<script setup lang="ts">
const chat = useChat()
const { isGenerating } = useImageGeneration()

const messageListRef = ref<{ scrollToBottom: () => void }>()

// 监听消息变化，自动滚动
watch(() => chat.currentMessages.value.length, () => {
  messageListRef.value?.scrollToBottom()
})
</script>

<template>
  <div class="flex h-[calc(100vh-8rem)] gap-4">
    <!-- 左侧边栏: 会话列表 -->
    <div class="w-64 flex-shrink-0 hidden lg:block">
      <div class="h-full border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
        <div class="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h3 class="font-semibold">会话</h3>
          <UButton icon="i-heroicons-plus" size="xs" variant="ghost" @click="chat.createSession()" />
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <div
            v-for="session in chat.sessions.value"
            :key="session.id"
            @click="chat.switchSession(session.id)"
            :class="[
              'p-3 rounded-lg cursor-pointer transition group',
              session.id === chat.currentSession.value?.id
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
          >
            <div class="flex justify-between items-start">
              <p class="font-medium truncate flex-1">{{ session.title }}</p>
              <UButton
                icon="i-heroicons-trash"
                size="xs"
                color="error"
                variant="ghost"
                class="opacity-0 group-hover:opacity-100"
                @click.stop="chat.deleteSession(session.id)"
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">
              {{ new Date(session.updatedAt).toLocaleDateString() }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 中间: 聊天和生成区域 -->
    <div class="flex-1 flex flex-col border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <!-- 消息列表 -->
      <ChatMessageList
        ref="messageListRef"
        :messages="chat.currentMessages.value"
        class="flex-1"
        @copy="() => {}"
        @delete="chat.deleteMessage"
        @regenerate="() => {}"
      />

      <!-- 生成区域 -->
      <div class="border-t dark:border-gray-700">
        <ImageGenerator class="p-4" />
      </div>
    </div>

    <!-- 右侧边栏: 工具面板 -->
    <div class="w-80 flex-shrink-0 hidden xl:block">
      <div class="h-full border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
        <div class="p-4 border-b dark:border-gray-700">
          <h3 class="font-semibold">工具</h3>
        </div>

        <div class="p-4 space-y-6">
          <!-- Banana 提示词 -->
          <ToolsBananaTool @apply="() => {}" />

          <!-- 切片工具 -->
          <ToolsSlicerTool />

          <!-- 表情包 -->
          <ToolsStickerMode />
        </div>
      </div>
    </div>
  </div>
</template>
