<script setup lang="ts">
const chat = useChat();
const { isGenerating, streamingText } = useImageGeneration();
const { isMobile } = useDevice();

const messageListRef = ref<{ scrollToBottom: () => void }>();
const chatInputBridge = useState<{
  prompt: string;
  send: boolean;
  resend?: boolean;
  nonce: number;
}>("chat-input-bridge", () => ({ prompt: "", send: false, nonce: 0 }));

const promptDrawerOpen = inject<Ref<boolean>>("promptDrawerOpen")!;

const chatStatus = computed(() => {
  if (!isGenerating.value) return 'ready' as const
  if (streamingText.value) return 'streaming' as const
  return 'submitted' as const
});

// 监听消息变化，自动滚动
watch(
  () => chat.currentMessages.value.length,
  () => {
    nextTick(() => {
      messageListRef.value?.scrollToBottom();
    });
  },
);

const handlePromptApply = (prompt: string) => {
  chatInputBridge.value = {
    prompt,
    send: false,
    nonce: Date.now(),
  };
  promptDrawerOpen.value = false;
};

const handlePromptSend = (prompt: string) => {
  chatInputBridge.value = {
    prompt,
    send: true,
    resend: false,
    nonce: Date.now(),
  };
  promptDrawerOpen.value = false;
};

const handleResend = (message: any) => {
  // 移除最后一条助手回复
  chat.removeLastAssistantReply()
  // 通过 inputBridge 重新发送用户消息（resend 模式不会重复添加用户消息）
  chatInputBridge.value = {
    prompt: message.content || '',
    send: true,
    resend: true,
    nonce: Date.now(),
  }
};
</script>

<template>
  <div class="chat-page">
    <div class="chat-main">
      <div class="chat-container" id="chat-history">
        <!-- 空状态 -->
        <div
          v-if="chat.currentMessages.value.length === 0"
          class="empty-state"
          id="empty-state"
        >
          <svg
            class="google-logo-svg"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          <h1>gemini-3-pro-image-preview</h1>
          <p>并发生成 · 4K 渲染 · 本地存储</p>
        </div>

        <!-- 消息列表 -->
        <ChatMessageList
          v-else
          ref="messageListRef"
          :messages="chat.currentMessages.value"
          :status="chatStatus"
          :streaming-text="streamingText"
          class="messages-area"
          @resend="handleResend"
        />
      </div>

      <!-- 输入区域 -->
      <ChatInputBar />
    </div>

    <!-- 快捷提示词抽屉 -->
    <USlideover
      v-model:open="promptDrawerOpen"
      side="right"
      title="快捷提示词"
      :ui="{ content: 'max-w-xs' }"
    >
      <template #body>
        <ChatQuickPromptPanel
          @apply="handlePromptApply"
          @send="handlePromptSend"
        />
      </template>
    </USlideover>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  background: var(--bg-color);
  overflow: hidden;
  min-height: 0;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
  padding-right: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-sub);
  text-align: center;
  padding: 40px 20px;
}

.empty-state h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 16px 0 8px;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-sub);
  margin: 0;
}

.google-logo-svg {
  width: 64px;
  height: 64px;
}

.messages-area {
  flex: 1;
  width: 100%;
  min-height: 0;
  padding: 20px;
}

@media (max-width: 768px) {
  .chat-container {
    padding: 16px;
    padding-right: 8px;
  }
}
</style>
