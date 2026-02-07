<script setup lang="ts">
const chat = useChat();
const props = withDefaults(
  defineProps<{
    collapsed?: boolean;
  }>(),
  {
    collapsed: false,
  },
);

const containerRef = ref<HTMLElement>();
const sessionDrawerOpen = ref(false);
const sessionDrawerPinned = ref(false);
const closeTimer = ref<number | null>(null);
const showClearConfirm = ref(false);

const emit = defineEmits<{
  "open-xhs": [];
  "open-banana": [];
  "open-custom-prompt": [];
  "open-sticker": [];
  "open-slicer": [];
}>();

// 创建新会话
const createNewSession = () => {
  chat.createSession();
};

// 打开清空确认框
const requestClearAllSessions = () => {
  showClearConfirm.value = true;
};

// 确认清空所有会话
const confirmClearAllSessions = () => {
  chat.clearAllSessions();
  showClearConfirm.value = false;
  closeSessionDrawer();
};

// 取消清空
const cancelClearAllSessions = () => {
  showClearConfirm.value = false;
};

// 工具卡片数据
const toolCards = [
  {
    id: "xhs",
    title: "XHS 灵感实验室",
    desc: "小红书风格内容创作",
    icon: "i-heroicons-book-open",
    colorClass: "xhs-nav-card",
    iconClass: "xhs-icon",
    event: "open-xhs" as const,
  },
  {
    id: "banana",
    title: "提示词快查",
    desc: "快速查找优质提示词",
    icon: "i-heroicons-currency-dollar",
    colorClass: "banana-nav-card",
    iconClass: "banana-icon",
    event: "open-banana" as const,
  },
  {
    id: "custom",
    title: "我的提示词",
    desc: "管理个人提示词库",
    icon: "i-heroicons-document-text",
    colorClass: "custom-nav-card",
    iconClass: "custom-icon",
    event: "open-custom-prompt" as const,
  },
  {
    id: "sticker",
    title: "制作表情包",
    desc: "快速生成表情包",
    icon: "i-heroicons-face-smile",
    colorClass: "feature-nav-card",
    iconClass: "feature-icon",
    event: "open-sticker" as const,
  },
  {
    id: "slicer",
    title: "图片切片",
    desc: "九宫格切图工具",
    icon: "i-heroicons-scissors",
    colorClass: "tool-nav-card",
    iconClass: "tool-icon",
    event: "open-slicer" as const,
  },
];

const handleToolClick = (
  eventName:
    | "open-xhs"
    | "open-banana"
    | "open-custom-prompt"
    | "open-sticker"
    | "open-slicer",
) => {
  emit(eventName);
};

const openSessionDrawerByHover = () => {
  if (!props.collapsed) return;
  if (closeTimer.value !== null) {
    window.clearTimeout(closeTimer.value);
    closeTimer.value = null;
  }

  if (sessionDrawerPinned.value) return;
  sessionDrawerOpen.value = true;
};

const closeSessionDrawerByHover = () => {
  if (!props.collapsed || sessionDrawerPinned.value) return;
  if (closeTimer.value !== null) {
    window.clearTimeout(closeTimer.value);
  }

  closeTimer.value = window.setTimeout(() => {
    sessionDrawerOpen.value = false;
    closeTimer.value = null;
  }, 150);
};

const toggleSessionDrawerByClick = () => {
  if (!props.collapsed) return;

  if (sessionDrawerOpen.value && sessionDrawerPinned.value) {
    sessionDrawerOpen.value = false;
    sessionDrawerPinned.value = false;
    return;
  }

  sessionDrawerOpen.value = true;
  sessionDrawerPinned.value = true;
};

const closeSessionDrawer = () => {
  if (closeTimer.value !== null) {
    window.clearTimeout(closeTimer.value);
    closeTimer.value = null;
  }

  sessionDrawerOpen.value = false;
  sessionDrawerPinned.value = false;
};

const switchSessionFromDrawer = (id: string) => {
  chat.switchSession(id);
  closeSessionDrawer();
};

const deleteSessionFromDrawer = (id: string) => {
  chat.deleteSession(id);
};

const handleGlobalClick = (event: MouseEvent) => {
  if (!props.collapsed || !sessionDrawerOpen.value) return;
  if (!containerRef.value) return;

  const target = event.target as Node | null;
  if (target && containerRef.value.contains(target)) return;

  closeSessionDrawer();
};

watch(
  () => props.collapsed,
  (collapsed) => {
    if (!collapsed) {
      closeSessionDrawer();
    }
  },
);

onMounted(() => {
  window.addEventListener("click", handleGlobalClick);
});

onUnmounted(() => {
  window.removeEventListener("click", handleGlobalClick);
  if (closeTimer.value !== null) {
    window.clearTimeout(closeTimer.value);
    closeTimer.value = null;
  }
});
</script>

<template>
  <div
    ref="containerRef"
    class="sidebar-nav-content"
    :class="{ collapsed: props.collapsed }"
  >
    <!-- 新建对话按钮 -->
    <button
      class="new-chat-btn"
      :title="props.collapsed ? '新建对话' : undefined"
      aria-label="新建对话"
      @click="createNewSession"
    >
      <UIcon name="i-heroicons-plus" class="w-5 h-5" />
      <span v-if="!props.collapsed">新建对话</span>
    </button>

    <!-- 创作工具分组 -->
    <div v-if="!props.collapsed" class="nav-section-title">创作工具</div>

    <!-- 工具卡片 -->
    <div
      v-for="tool in toolCards"
      :key="tool.id"
      class="nav-card"
      :class="tool.colorClass"
      :title="tool.title"
      @click="handleToolClick(tool.event)"
    >
      <div class="nav-card-icon" :class="tool.iconClass">
        <UIcon :name="tool.icon" class="w-5 h-5" />
      </div>
      <div v-if="!props.collapsed" class="nav-card-content">
        <div class="nav-card-title">{{ tool.title }}</div>
        <div class="nav-card-desc">{{ tool.desc }}</div>
      </div>
    </div>

    <!-- 最近对话分组 -->
    <div v-if="!props.collapsed" class="session-section-header">
      <span class="nav-section-title" style="margin-top: 0; margin-bottom: 0"
        >最近对话</span
      >
      <button class="clear-btn" @click="requestClearAllSessions" title="清除全部对话">
        <UIcon name="i-heroicons-trash" class="w-3 h-3" />
        <span>清空</span>
      </button>
    </div>

    <!-- 会话列表 -->
    <div v-if="!props.collapsed" class="session-list">
      <div
        v-for="session in chat.sessions.value"
        :key="session.id"
        class="session-item"
        :class="{ active: session.id === chat.currentSession.value?.id }"
        @click="chat.switchSession(session.id)"
      >
        <span class="session-title">{{ session.title }}</span>
        <button
          class="session-delete"
          @click.stop="chat.deleteSession(session.id)"
          title="删除"
        >
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>

      <!-- 空状态 -->
      <div v-if="chat.sessions.value.length === 0" class="empty-sessions">
        暂无对话记录
      </div>
    </div>

    <div
      v-else
      class="collapsed-session-anchor"
      @mouseenter="openSessionDrawerByHover"
      @mouseleave="closeSessionDrawerByHover"
    >
      <button
        class="collapsed-session-btn"
        title="最近会话"
        aria-label="最近会话"
        :aria-expanded="sessionDrawerOpen"
        @click.stop="toggleSessionDrawerByClick"
      >
        <UIcon name="i-heroicons-clock" class="w-5 h-5" />
      </button>

      <div
        v-if="sessionDrawerOpen"
        class="session-drawer"
        @mouseenter="openSessionDrawerByHover"
        @mouseleave="closeSessionDrawerByHover"
      >
        <div class="session-drawer-header">
          <span>最近会话</span>
          <button class="clear-btn" @click.stop="requestClearAllSessions" title="清空全部对话">
            <UIcon name="i-heroicons-trash" class="w-3 h-3" />
            <span>清空</span>
          </button>
        </div>

        <div v-if="chat.sessions.value.length > 0" class="session-drawer-list">
          <div
            v-for="session in chat.sessions.value"
            :key="session.id"
            class="session-item"
            :class="{ active: session.id === chat.currentSession.value?.id }"
            @click="switchSessionFromDrawer(session.id)"
          >
            <span class="session-title">{{ session.title }}</span>
            <button
              class="session-delete"
              @click.stop="deleteSessionFromDrawer(session.id)"
              title="删除"
            >
              <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-else class="empty-sessions">
          暂无对话记录
        </div>
      </div>
    </div>

    <UModal v-model:open="showClearConfirm">
      <template #content>
        <div class="clear-confirm-modal">
          <div class="clear-confirm-title">清空所有对话？</div>
          <div class="clear-confirm-desc">
            此操作不可撤销，所有会话记录将被永久删除。
          </div>
          <div class="clear-confirm-actions">
            <UButton color="neutral" variant="ghost" @click="cancelClearAllSessions">
              取消
            </UButton>
            <UButton color="error" @click="confirmClearAllSessions">
              确认清空
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.sidebar-nav-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-nav-content.collapsed {
  align-items: center;
  padding: 10px 0;
  gap: 8px;
  overflow: visible;
}

.sidebar-nav-content.collapsed .new-chat-btn {
  width: 48px;
  min-width: 48px;
  height: 48px;
  margin: 0;
  padding: 0;
  border-style: solid;
  border-width: 1px;
  border-radius: 12px;
}

.sidebar-nav-content.collapsed :deep(.nav-card) {
  width: 48px;
  min-width: 48px;
  height: 48px;
  min-height: 48px;
  margin: 0;
  padding: 0;
  gap: 0;
  justify-content: center;
}

.sidebar-nav-content.collapsed :deep(.nav-card:hover) {
  transform: none;
}

.sidebar-nav-content.collapsed :deep(.nav-card-icon) {
  width: 32px;
  height: 32px;
}

.collapsed-session-anchor {
  position: relative;
  margin-top: auto;
  margin-bottom: 8px;
}

.collapsed-session-btn {
  width: 48px;
  min-width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.collapsed-session-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--hover-color);
}

.session-drawer {
  position: absolute;
  left: calc(100% + 6px);
  bottom: 0;
  width: 300px;
  max-height: min(68vh, 520px);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 300;
}

.session-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 10px;
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.session-drawer-list {
  overflow-y: auto;
  padding: 8px 6px 10px;
}

.session-drawer .session-item {
  margin: 2px;
}

.session-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  margin-top: 16px;
  margin-bottom: 8px;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #d93025;
  cursor: pointer;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: #fce8e6;
}

:deep(.dark) .clear-btn:hover {
  background: rgba(217, 48, 37, 0.2);
}

.empty-sessions {
  text-align: center;
  padding: 20px;
  color: var(--text-sub);
  font-size: 13px;
}

.clear-confirm-modal {
  padding: 20px;
}

.clear-confirm-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}

.clear-confirm-desc {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-sub);
}

.clear-confirm-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
