<script setup lang="ts">
const { isDark, toggleTheme } = useTheme();
const chat = useChat();
const route = useRoute();

const bananaToolOpen = ref(false);
const customPromptToolOpen = ref(false);
const stickerToolOpen = ref(false);
const slicerToolOpen = ref(false);
const chatInputBridge = useState<{
  prompt: string;
  send: boolean;
  nonce: number;
}>("chat-input-bridge", () => ({
  prompt: "",
  send: false,
  nonce: 0,
}));

// 侧边栏状态
const leftSidebarOpen = ref(false);
const rightSidebarOpen = ref(false);
const leftSidebarCollapsed = useState("left-sidebar-collapsed", () => false);

onMounted(() => {
  const savedState = localStorage.getItem("left-sidebar-collapsed");
  if (savedState !== null) {
    leftSidebarCollapsed.value = savedState === "true";
  }
});

watch(leftSidebarCollapsed, (value) => {
  localStorage.setItem("left-sidebar-collapsed", String(value));
});

// 切换左侧边栏
const toggleLeftSidebar = () => {
  leftSidebarOpen.value = !leftSidebarOpen.value;
  if (leftSidebarOpen.value) {
    rightSidebarOpen.value = false;
  }
};

// 桌面端折叠左侧边栏
const toggleLeftSidebarCollapse = () => {
  leftSidebarCollapsed.value = !leftSidebarCollapsed.value;
  leftSidebarOpen.value = false;
};

// 切换右侧边栏（设置）
const toggleSettings = () => {
  rightSidebarOpen.value = !rightSidebarOpen.value;
  if (rightSidebarOpen.value) {
    leftSidebarOpen.value = false;
  }
};

// 关闭所有侧边栏
const closeAllSidebars = () => {
  leftSidebarOpen.value = false;
  rightSidebarOpen.value = false;
};

// 创建新会话
const createNewSession = async () => {
  chat.createSession();

  if (route.path !== "/") {
    await navigateTo("/");
  }
};

const closeToolModals = () => {
  bananaToolOpen.value = false;
  customPromptToolOpen.value = false;
  stickerToolOpen.value = false;
  slicerToolOpen.value = false;
};

const openToolModal = (tool: "banana" | "custom" | "sticker" | "slicer") => {
  closeToolModals();
  closeAllSidebars();

  if (tool === "banana") bananaToolOpen.value = true;
  if (tool === "custom") customPromptToolOpen.value = true;
  if (tool === "sticker") stickerToolOpen.value = true;
  if (tool === "slicer") slicerToolOpen.value = true;
};

const openXHS = async () => {
  closeToolModals();
  closeAllSidebars();

  if (route.path !== "/xhs") {
    await navigateTo("/xhs");
  }
};

const openBananaTool = () => {
  openToolModal("banana");
};

const openCustomPromptTool = () => {
  openToolModal("custom");
};

const openStickerTool = () => {
  openToolModal("sticker");
};

const openSlicerTool = () => {
  openToolModal("slicer");
};

const applyPromptToInput = async (prompt: string, sendDirect = false) => {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) return;

  closeToolModals();
  closeAllSidebars();

  if (route.path !== "/") {
    await navigateTo("/");
  }

  chatInputBridge.value = {
    prompt: normalizedPrompt,
    send: sendDirect,
    nonce: Date.now(),
  };
};

const handleBananaApply = (prompt: string) => {
  void applyPromptToInput(prompt, false);
};

const handleCustomPromptApply = (prompt: string) => {
  void applyPromptToInput(prompt, false);
};

const handleCustomPromptSend = (prompt: string) => {
  void applyPromptToInput(prompt, true);
};

// 提供给子组件的控制方法
provide("toggleLeftSidebar", toggleLeftSidebar);
provide("toggleSettings", toggleSettings);
provide("closeAllSidebars", closeAllSidebars);
provide("leftSidebarOpen", leftSidebarOpen);
provide("rightSidebarOpen", rightSidebarOpen);
</script>

<template>
  <div class="app-container" :class="{ dark: isDark }">
    <!-- 移动端顶部导航 -->
    <header class="mobile-header">
      <button
        class="header-icon-btn"
        @click="toggleLeftSidebar"
        aria-label="菜单"
      >
        <UIcon name="i-heroicons-bars-3" class="w-6 h-6" />
      </button>

      <div class="brand-area">
        <svg
          class="brand-logo-small"
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
        <span class="brand-text">Gemini 3 Pro</span>
      </div>

      <div class="header-actions">
        <button
          class="header-icon-btn"
          @click="createNewSession"
          title="新建对话"
          aria-label="新建对话"
        >
          <UIcon name="i-heroicons-plus" class="w-5 h-5" />
        </button>
        <button
          class="header-icon-btn"
          :class="{ 'is-active': rightSidebarOpen }"
          @click="toggleSettings"
          title="设置"
          aria-label="设置"
        >
          <UIcon
            :name="rightSidebarOpen ? 'i-heroicons-cog-6-tooth-solid' : 'i-heroicons-cog-6-tooth'"
            class="w-5 h-5"
          />
        </button>
      </div>
    </header>

    <!-- 遮罩层 -->
    <div
      class="overlay"
      :class="{ active: leftSidebarOpen || rightSidebarOpen }"
      @click="closeAllSidebars"
    />

    <!-- 左侧导航边栏 -->
    <nav
      class="sidebar-nav"
      :class="{ open: leftSidebarOpen, collapsed: leftSidebarCollapsed }"
    >
      <UiSidebarNav
        :collapsed="leftSidebarCollapsed"
        @open-xhs="openXHS"
        @open-banana="openBananaTool"
        @open-custom-prompt="openCustomPromptTool"
        @open-sticker="openStickerTool"
        @open-slicer="openSlicerTool"
      />
    </nav>

    <!-- 主内容区域 -->
    <main
      class="main-area"
      :class="{ 'sidebar-collapsed': leftSidebarCollapsed, 'settings-open': rightSidebarOpen }"
    >
      <!-- 桌面端顶部 -->
      <header class="desktop-header">
        <div class="brand-area">
          <button
            class="header-icon-btn"
            :title="leftSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
            :aria-label="leftSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
            @click="toggleLeftSidebarCollapse"
          >
            <UIcon
              :name="leftSidebarCollapsed ? 'i-heroicons-chevron-double-right' : 'i-heroicons-chevron-double-left'"
              class="w-5 h-5"
            />
          </button>
          <div class="model-selector" title="当前模型">
            <span>Gemini 3 Pro Preview</span>
            <UIcon name="i-heroicons-chevron-down" class="w-4 h-4 opacity-60" />
          </div>
        </div>

        <div class="header-actions">
          <a
            href="https://github.com/Tansuo2021/gemini-3-pro-image-preview"
            target="_blank"
            class="header-icon-btn"
            title="GitHub 开源"
          >
            <UIcon name="i-mdi-github" class="w-5 h-5" />
          </a>
          <button
            class="header-icon-btn"
            title="新建对话"
            @click="createNewSession"
          >
            <UIcon name="i-heroicons-plus" class="w-5 h-5" />
          </button>
          <button class="header-icon-btn" title="主题" @click="toggleTheme">
            <UIcon
              :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
              class="w-5 h-5"
            />
          </button>
          <button
            class="header-icon-btn"
            :class="{ 'is-active': rightSidebarOpen }"
            title="设置"
            @click="toggleSettings"
          >
            <UIcon
              :name="rightSidebarOpen ? 'i-heroicons-cog-6-tooth-solid' : 'i-heroicons-cog-6-tooth'"
              class="w-5 h-5"
            />
          </button>
        </div>
      </header>

      <!-- 页面内容 -->
      <div class="page-content">
        <slot />
      </div>
    </main>

    <!-- 右侧设置边栏 -->
    <aside class="settings-sidebar" :class="{ open: rightSidebarOpen }">
      <div class="settings-inner">
        <div class="settings-header">
          <h2>设置</h2>
          <button class="close-btn" @click="closeAllSidebars">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>
        <SettingsPanel />
      </div>
    </aside>

    <UModal v-model:open="bananaToolOpen">
      <template #content>
        <div class="tool-modal">
          <div class="tool-modal-header">
            <h3>提示词快查</h3>
            <button class="tool-close-btn" @click="bananaToolOpen = false">
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>
          <div class="tool-modal-body">
            <ToolsBananaTool @apply="handleBananaApply" />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="customPromptToolOpen">
      <template #content>
        <div class="tool-modal">
          <div class="tool-modal-header">
            <h3>我的提示词</h3>
            <button class="tool-close-btn" @click="customPromptToolOpen = false">
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>
          <div class="tool-modal-body">
            <ToolsCustomPromptTool
              @apply="handleCustomPromptApply"
              @send="handleCustomPromptSend"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="stickerToolOpen">
      <template #content>
        <div class="tool-modal tool-modal-medium">
          <div class="tool-modal-header">
            <h3>制作表情包</h3>
            <button class="tool-close-btn" @click="stickerToolOpen = false">
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>
          <div class="tool-modal-body">
            <ToolsStickerMode />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="slicerToolOpen">
      <template #content>
        <div class="tool-modal tool-modal-medium">
          <div class="tool-modal-header">
            <h3>图片切片</h3>
            <button class="tool-close-btn" @click="slicerToolOpen = false">
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>
          <div class="tool-modal-body">
            <ToolsSlicerTool />
          </div>
        </div>
      </template>
    </UModal>

    <!-- UI 组件 -->
    <UNotifications />
    <UiLightbox />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  min-height: 100vh;
  background: var(--bg-body);
  color: var(--text-main);
  position: relative;
  overflow: hidden;
}

.mobile-header {
  display: flex;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--mobile-header-height, 56px);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
  z-index: 100;
  padding: 0 10px;
  align-items: center;
  gap: 8px;
}

:deep(.dark) .mobile-header {
  background: rgba(15, 23, 42, 0.88);
}

@media (min-width: 769px) {
  .mobile-header {
    display: none;
  }
}

.brand-area {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.brand-logo-small {
  width: 24px;
  height: 24px;
}

.brand-text {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-main);
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-sub);
  background: transparent;
  border: none;
  transition:
    background-color 0.2s,
    color 0.2s,
    transform 0.2s;
  text-decoration: none;
}

.header-icon-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-main);
  transform: translateY(-1px);
}

.header-icon-btn.is-active {
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.48);
  z-index: 90;
  display: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.overlay.active {
  display: block;
  opacity: 1;
}

@media (min-width: 769px) {
  .overlay {
    display: none !important;
  }
}

.sidebar-nav {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width, 270px);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  z-index: 96;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  transition:
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.3s ease;
}

@media (min-width: 769px) {
  .sidebar-nav.collapsed {
    width: var(--sidebar-collapsed-width, 68px);
    overflow: visible;
    z-index: 120;
  }
}

@media (max-width: 768px) {
  .sidebar-nav {
    transform: translateX(-100%);
    z-index: 101;
  }

  .sidebar-nav.open {
    transform: translateX(0);
  }
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: var(--sidebar-width, 270px);
  margin-right: 0;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-color);
  transition:
    margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    margin-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (min-width: 769px) {
  .main-area.sidebar-collapsed {
    margin-left: var(--sidebar-collapsed-width, 68px);
  }

  .main-area.settings-open {
    margin-right: var(--settings-width, 320px);
  }
}

@media (max-width: 768px) {
  .main-area {
    margin-left: 0;
    margin-right: 0;
  }
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-color);
  height: calc(100vh - var(--header-height, 60px));
}

@media (max-width: 768px) {
  .page-content {
    height: calc(100vh - var(--mobile-header-height, 56px));
    padding-top: var(--mobile-header-height, 56px);
  }
}

.desktop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height, 60px);
  padding: 0 24px;
  background: transparent;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
  position: sticky;
  top: 0;
  z-index: 50;
}

@media (max-width: 768px) {
  .desktop-header {
    display: none;
  }
}

.model-selector {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 9px;
  background: var(--bg-input-area);
  color: var(--text-main);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  user-select: none;
}

.model-selector:hover {
  background: color-mix(in srgb, var(--bg-input-area) 75%, var(--border-color));
}

.settings-sidebar {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: var(--settings-width, 320px);
  background: var(--bg-sidebar);
  border-left: 1px solid var(--border-color);
  z-index: 97;
  overflow-y: auto;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: -12px 0 24px rgba(15, 23, 42, 0.08);
}

.settings-sidebar.open {
  transform: translateX(0);
}

@media (max-width: 768px) {
  .settings-sidebar {
    z-index: 101;
    width: min(88vw, 320px);
    max-width: 320px;
  }
}

.settings-inner {
  padding: 16px 20px 20px;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.settings-header h2 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-sub);
  background: transparent;
  border: none;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-main);
}

.tool-modal {
  width: min(1120px, calc(100vw - 28px));
  max-height: min(90vh, 920px);
  display: flex;
  flex-direction: column;
  background: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-popup);
}

.tool-modal-medium {
  width: min(980px, calc(100vw - 28px));
}

.tool-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-sidebar) 70%, var(--bg-body));
}

.tool-modal-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
}

.tool-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-close-btn:hover {
  background: var(--hover-color);
  color: var(--text-main);
}

.tool-modal-body {
  padding: 14px 16px;
  overflow: auto;
}

/* 滚动条样式 */
.sidebar-nav::-webkit-scrollbar,
.settings-sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar-nav::-webkit-scrollbar-track,
.settings-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb,
.settings-sidebar::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.sidebar-nav::-webkit-scrollbar-thumb:hover,
.settings-sidebar::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

@media (max-width: 768px) {
  .tool-modal,
  .tool-modal-medium {
    width: min(100vw - 16px, 100%);
    max-height: min(92vh, 100%);
    border-radius: 12px;
  }

  .tool-modal-body {
    padding: 10px;
  }
}
</style>
