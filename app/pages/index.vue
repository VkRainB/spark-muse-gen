<script setup lang="ts">
import { useChatInputStore } from "../../stores/chatInput";

const chat = useChat();
const chatInputStore = useChatInputStore();
const {
  isSessionGenerating,
  streamingSessionId,
  getStreamingText,
} = useImageGeneration();

const messageListRef = ref<{ scrollToBottom: () => void }>();

// 当前会话的流式文本：仅在当前会话与正在产出的会话一致时返回非空
const currentStreamingText = computed(() => {
  const sid = chat.currentSession.value?.id;
  if (!sid) return "";
  return streamingSessionId.value === sid ? getStreamingText(sid) : "";
});

const currentSessionGenerating = computed(() =>
  isSessionGenerating(chat.currentSession.value?.id),
);

const chatStatus = computed(() => {
  if (!currentSessionGenerating.value) return "ready" as const;
  if (currentStreamingText.value) return "streaming" as const;
  return "submitted" as const;
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

const handleResend = (message: any) => {
  // 锁定当前会话，移除该会话最后一条助手回复
  const sid = chat.currentSession.value?.id;
  if (!sid) return;
  chat.removeLastAssistantReply(sid);
  // 通过 store 重新发送用户消息（resend 模式不会重复添加用户消息）
  chatInputStore.resubmit(message.content || "");
};

const handleClearMessages = () => {
  chat.clearMessages();
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
          <img src="~/assets/image/logo.png" alt="logo" class="google-logo-svg" />
          <h1>灵创绘图</h1>
          <p>并发生成 · 4K 渲染 · 本地存储</p>
        </div>

        <!-- 消息列表 -->
        <ChatMessageList
          v-else
          ref="messageListRef"
          :messages="chat.currentMessages.value"
          :status="chatStatus"
          :streaming-text="currentStreamingText"
          class="messages-area"
          @resend="handleResend"
        />
      </div>

      <!-- 工具栏 -->
      <div v-if="chat.currentMessages.value.length > 0" class="chat-toolbar">
        <button
          class="toolbar-btn"
          title="清空当前会话消息"
          :disabled="currentSessionGenerating"
          @click="handleClearMessages"
        >
          <UIcon name="i-heroicons-trash" class="w-4 h-4" />
          <span>清除上下文</span>
        </button>
      </div>

      <!-- 输入区域 -->
      <ChatInputBar />
    </div>
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
  width: 100px;
  height: 100px;
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

.chat-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 20px;
  max-width: var(--content-max-width, 860px);
  margin: 0 auto;
  width: 100%;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-sub);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
  color: var(--text-main);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
