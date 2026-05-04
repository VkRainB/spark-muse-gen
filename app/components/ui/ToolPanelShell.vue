<script setup lang="ts">
/**
 * ToolPanelShell - 工具面板的统一骨架
 *
 * 设计契约：
 * - 单点决定 Header / Body / Footer 三段布局
 * - Body 是唯一的滚动容器（overflow:auto），子组件内部不得再设置 max-height
 * - 子组件用 `flex: 1; min-height: 0` 让出高度
 * - Header 始终可见、Footer 粘底（如果有）
 *
 * 容器尺寸由调用方决定（UModal / USlideover / 整页），Shell 仅负责内容骨架。
 */

interface Props {
  /** 顶部标题，可被 #header slot 覆盖 */
  title?: string
  /** 顶部 loading 提示（保留扩展位） */
  loading?: boolean
  /** 是否显示关闭按钮（默认 true） */
  closable?: boolean
  /** Body 内边距，默认 14px 16px */
  bodyPadding?: string
  /** Footer 内边距，默认 12px 16px */
  footerPadding?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  loading: false,
  closable: true,
  bodyPadding: '14px 16px',
  footerPadding: '12px 16px',
})

const emit = defineEmits<{
  close: []
}>()

const slots = useSlots()
const hasFooter = computed(() => !!slots.footer)

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div class="tps-root">
    <header class="tps-header">
      <slot name="header">
        <div class="tps-header-title">
          <slot name="title">{{ props.title }}</slot>
        </div>
      </slot>
      <div class="tps-header-side">
        <slot name="header-actions" />
        <button
          v-if="props.closable"
          class="tps-close-btn"
          type="button"
          aria-label="关闭"
          @click="handleClose"
        >
          <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
        </button>
      </div>
    </header>

    <div
      class="tps-body"
      :style="{ padding: props.bodyPadding }"
    >
      <slot />
    </div>

    <footer
      v-if="hasFooter"
      class="tps-footer"
      :style="{ padding: props.footerPadding }"
    >
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.tps-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--bg-sidebar);
  color: var(--text-main);
}

.tps-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-sidebar) 70%, var(--bg-body));
}

.tps-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  min-width: 0;
  flex: 1;
}

.tps-header-side {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.tps-close-btn {
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

.tps-close-btn:hover {
  background: var(--hover-color);
  color: var(--text-main);
}

.tps-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.tps-footer {
  flex: 0 0 auto;
  border-top: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-sidebar) 92%, transparent);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 让被 ToolPanelShell 包裹的直接子组件自然撑满 Body 高度 */
.tps-body > :deep(*:only-child) {
  flex: 1 1 auto;
  min-height: 0;
}

@media (max-width: 768px) {
  .tps-header {
    padding: 12px 14px;
  }
}
</style>
