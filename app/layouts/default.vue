<script setup lang="ts">
import { useProviderStore } from '../../stores/provider'
import { useChatInputStore } from '../../stores/chatInput'

const { isDark, toggleTheme } = useTheme();
const chat = useChat();
const route = useRoute();
const providerStore = useProviderStore();
const chatInputStore = useChatInputStore();
const { isMobile } = useDevice();

const providerSelectorOpen = ref(false);

const toggleProviderSelector = () => {
  providerSelectorOpen.value = !providerSelectorOpen.value;
};

const closeProviderSelector = () => {
  providerSelectorOpen.value = false;
};

const selectProvider = (id: string) => {
  providerStore.setActiveProvider(id);
  closeProviderSelector();
};

// 点击外部关闭下拉菜单
const onClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.model-selector-wrapper')) {
    closeProviderSelector();
  }
};

onMounted(() => {
  document.addEventListener('click', onClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside);
});

const bananaToolOpen = ref(false);
const customPromptToolOpen = ref(false);

// 侧边栏状态
const leftSidebarOpen = ref(false);
const rightSidebarOpen = ref(false);
const promptDrawerOpen = ref(false);
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

// 关闭所有工具弹层 / 抽屉
const closeToolModals = () => {
  bananaToolOpen.value = false;
  customPromptToolOpen.value = false;
};

// 切换右侧边栏（设置）
const toggleSettings = () => {
  rightSidebarOpen.value = !rightSidebarOpen.value;
  if (rightSidebarOpen.value) {
    leftSidebarOpen.value = false;
    promptDrawerOpen.value = false;
    closeToolModals();
  }
};

// 切换提示词抽屉
const togglePromptDrawer = () => {
  promptDrawerOpen.value = !promptDrawerOpen.value;
  if (promptDrawerOpen.value) {
    rightSidebarOpen.value = false;
    closeToolModals();
  }
};

// 关闭所有侧边栏
const closeAllSidebars = () => {
  leftSidebarOpen.value = false;
  rightSidebarOpen.value = false;
};

// Custom 抽屉 side：移动端底部 / 桌面右侧
const customSlideoverSide = computed<'right' | 'bottom'>(() =>
  isMobile.value ? 'bottom' : 'right'
);
// Banana 始终顶部抽屉（更宽展示空间，且不遮挡底部输入框）
const bananaSlideoverUi = computed(() =>
  isMobile.value
    ? { content: 'h-[80vh]' }
    : { content: 'h-[min(620px,72vh)] max-w-none w-full' }
);
const customSlideoverUi = computed(() =>
  isMobile.value
    ? { content: 'h-[90vh]' }
    : { content: 'max-w-lg w-[32rem]' }
);

// 创建新会话
const createNewSession = async () => {
  chat.createSession();

  if (route.path !== "/") {
    await navigateTo("/");
  }
};

const openToolModal = (tool: "banana" | "custom") => {
  closeToolModals();
  closeAllSidebars();
  promptDrawerOpen.value = false;

  if (tool === "banana") bananaToolOpen.value = true;
  if (tool === "custom") customPromptToolOpen.value = true;
};

const openXHS = async () => {
  closeToolModals();
  closeAllSidebars();

  if (route.path !== "/xhs") {
    await navigateTo("/xhs");
  }
};

const openSticker = async () => {
  closeToolModals();
  closeAllSidebars();
  promptDrawerOpen.value = false;

  if (route.path !== "/sticker") {
    await navigateTo("/sticker");
  }
};

const openSlicer = async () => {
  closeToolModals();
  closeAllSidebars();
  promptDrawerOpen.value = false;

  if (route.path !== "/slicer") {
    await navigateTo("/slicer");
  }
};

const openBananaTool = () => {
  openToolModal("banana");
};

const openCustomPromptTool = () => {
  openToolModal("custom");
};

const applyPromptToInput = async (prompt: string, sendDirect = false) => {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) return;

  closeToolModals();
  closeAllSidebars();

  if (route.path !== "/") {
    await navigateTo("/");
  }

  if (sendDirect) {
    chatInputStore.submit(normalizedPrompt);
  } else {
    chatInputStore.apply(normalizedPrompt);
  }
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
provide("promptDrawerOpen", promptDrawerOpen);
provide("togglePromptDrawer", togglePromptDrawer);
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
        <div class="model-selector-wrapper">
          <button class="model-selector" title="切换渠道" @click="toggleProviderSelector">
            <span>{{ providerStore.activeDisplayName }}</span>
            <UIcon name="i-heroicons-chevron-down" class="w-4 h-4 opacity-60" :class="{ 'rotate-180': providerSelectorOpen }" />
          </button>
          <div v-if="providerSelectorOpen" class="provider-dropdown">
            <button
              class="provider-dropdown-item"
              :class="{ active: providerStore.activeProviderId === 'random' }"
              @click="selectProvider('random')"
            >
              <span class="provider-dropdown-name">🎲 随机优选</span>
              <span class="provider-dropdown-desc">按权重自动选择</span>
            </button>
            <button
              v-for="p in providerStore.enabledProviders"
              :key="p.id"
              class="provider-dropdown-item"
              :class="{ active: providerStore.activeProviderId === p.id }"
              @click="selectProvider(p.id)"
            >
              <span class="provider-dropdown-name">{{ p.name }}</span>
              <span class="provider-dropdown-desc">{{ p.type }} · {{ p.model }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <button
          class="header-icon-btn"
          :class="{ 'is-active': promptDrawerOpen }"
          @click="togglePromptDrawer"
          title="快捷提示词"
          aria-label="快捷提示词"
        >
          <UIcon
            :name="promptDrawerOpen ? 'i-heroicons-bolt-solid' : 'i-heroicons-bolt'"
            class="w-5 h-5"
          />
        </button>
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
        @open-sticker="openSticker"
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
          <div class="model-selector-wrapper">
            <button class="model-selector" title="切换渠道" @click="toggleProviderSelector">
              <span>{{ providerStore.activeDisplayName }}</span>
              <UIcon name="i-heroicons-chevron-down" class="w-4 h-4 opacity-60" :class="{ 'rotate-180': providerSelectorOpen }" />
            </button>
            <div v-if="providerSelectorOpen" class="provider-dropdown">
              <button
                class="provider-dropdown-item"
                :class="{ active: providerStore.activeProviderId === 'random' }"
                @click="selectProvider('random')"
              >
                <span class="provider-dropdown-name">🎲 随机优选</span>
                <span class="provider-dropdown-desc">按权重自动选择</span>
              </button>
              <button
                v-for="p in providerStore.enabledProviders"
                :key="p.id"
                class="provider-dropdown-item"
                :class="{ active: providerStore.activeProviderId === p.id }"
                @click="selectProvider(p.id)"
              >
                <span class="provider-dropdown-name">{{ p.name }}</span>
                <span class="provider-dropdown-desc">{{ p.type }} · {{ p.model }}</span>
              </button>
            </div>
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
            :class="{ 'is-active': promptDrawerOpen }"
            title="快捷提示词"
            @click="togglePromptDrawer"
          >
            <UIcon
              :name="promptDrawerOpen ? 'i-heroicons-bolt-solid' : 'i-heroicons-bolt'"
              class="w-5 h-5"
            />
          </button>
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

    <USlideover
      v-model:open="bananaToolOpen"
      side="top"
      title="提示词快查"
      :overlay="false"
      :modal="false"
      :dismissible="false"
      :ui="bananaSlideoverUi"
    >
      <template #body>
        <ToolsBananaTool @apply="handleBananaApply" />
      </template>
    </USlideover>

    <USlideover
      v-model:open="customPromptToolOpen"
      :side="customSlideoverSide"
      title="我的提示词"
      :overlay="false"
      :modal="false"
      :dismissible="false"
      :ui="customSlideoverUi"
    >
      <template #body>
        <ToolsCustomPromptTool
          @apply="handleCustomPromptApply"
          @send="handleCustomPromptSend"
        />
      </template>
    </USlideover>

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

.model-selector-wrapper {
  position: relative;
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
  border: none;
  cursor: pointer;
  transition: background 0.2s ease;
}


.model-selector .rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.2s ease;
}

.provider-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 240px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  z-index: 200;
  padding: 4px;
}

.provider-dropdown-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.provider-dropdown-item:hover {
  background: var(--bg-tertiary);
}

.provider-dropdown-item.active {
  background: var(--accent-blue-bg);
}

.provider-dropdown-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.provider-dropdown-item.active .provider-dropdown-name {
  color: var(--accent-blue);
}

.provider-dropdown-desc {
  font-size: 11px;
  color: var(--text-sub);
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
</style>
