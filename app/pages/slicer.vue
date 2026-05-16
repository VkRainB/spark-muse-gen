<script setup lang="ts">
/**
 * 图片切片工作台 / slicer
 *
 * 布局：
 *  - 顶部紧凑工具栏：上传 + 模式 + 预设 + 选项
 *  - 主区域：左大画布（编辑） + 右纵向切片结果
 *  - 底部主操作：开始切片 / 下载全部 ZIP / 清除
 *
 * 响应式：
 *  - 桌面 ≥1024：左右分栏
 *  - 平板/移动 <1024：上下堆叠（画布在上、结果在下）
 */

definePageMeta({
  layout: 'default',
})

const {
  sourceImage,
  horizontalLines,
  verticalLines,
  forceSquare,
  fillColor,
  highRes,
  slices,
  isProcessing,
  cellCount,
  loadImage,
  addLine,
  removeLine,
  moveLine,
  clearLines,
  presetNineGrid,
  presetHorizontal,
  presetVertical,
  slice,
  downloadSlice,
  downloadAll,
  clear,
} = useSlicer()
const toast = useAppToast()
const { openLightbox } = useLightbox()

const lineMode = ref<'horizontal' | 'vertical'>('horizontal')
const overlayRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const isDragOver = ref(false)

interface DragContext {
  type: 'h' | 'v'
  index: number
  pointerId: number
}
let dragCtx: DragContext | null = null
let dragMoved = false

// -- 文件上传 --
const fileInputRef = ref<HTMLInputElement | null>(null)

const triggerUpload = () => {
  fileInputRef.value?.click()
}

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await processFile(file)
  input.value = ''
}

const processFile = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    toast.error('格式不支持', '请选择图片文件')
    return
  }
  try {
    await loadImage(file)
    toast.success('图片已加载')
  } catch {
    toast.error('加载失败', '无法读取该图片')
  }
}

// -- 拖拽上传 --
const onDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}
const onDragLeave = () => {
  isDragOver.value = false
}
const onDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) await processFile(file)
}

// -- 画布交互 --
const onOverlayClick = (event: MouseEvent) => {
  if (isDragging.value || dragMoved) return
  const overlay = overlayRef.value
  if (!overlay) return
  if (event.target !== overlay) return

  const rect = overlay.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  if (lineMode.value === 'horizontal') {
    addLine('h', (y / rect.height) * 100)
  } else {
    addLine('v', (x / rect.width) * 100)
  }
}

const startDrag = (event: PointerEvent, type: 'h' | 'v', index: number) => {
  event.stopPropagation()
  event.preventDefault()
  if (!overlayRef.value) return

  dragCtx = { type, index, pointerId: event.pointerId }
  dragMoved = false
  isDragging.value = true

  const target = event.currentTarget as HTMLElement
  if (target.setPointerCapture) {
    try {
      target.setPointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }
}

const onPointerMove = (event: PointerEvent) => {
  if (!dragCtx || !overlayRef.value) return
  if (event.pointerId !== dragCtx.pointerId) return

  event.preventDefault()
  dragMoved = true

  const rect = overlayRef.value.getBoundingClientRect()
  if (dragCtx.type === 'h') {
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top))
    moveLine('h', dragCtx.index, (y / rect.height) * 100)
  } else {
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
    moveLine('v', dragCtx.index, (x / rect.width) * 100)
  }
}

const endDrag = (event: PointerEvent) => {
  if (!dragCtx) return
  if (event.pointerId !== dragCtx.pointerId) return

  const target = event.currentTarget as HTMLElement
  if (target.releasePointerCapture) {
    try {
      target.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  dragCtx = null
  setTimeout(() => {
    isDragging.value = false
    dragMoved = false
  }, 80)
}

// -- 操作 --
const handlePreview = (idx: number) => {
  const item = slices.value[idx]
  if (!item) return
  // 提取 base64 部分
  const base64 = item.dataUrl.split(',')[1] || ''
  openLightbox({ data: base64, mimeType: 'image/png' })
}

const handleSlice = async () => {
  if (!sourceImage.value) return
  await slice()
  if (slices.value.length > 0) {
    toast.success('切片完成', `共 ${slices.value.length} 张`)
  } else {
    toast.warning('切片为空', '请先添加切线或选择预设')
  }
}

const handleDownloadAll = async () => {
  if (slices.value.length === 0) return
  try {
    await downloadAll('slices')
    toast.success('已下载 ZIP')
  } catch (err) {
    console.error(err)
    toast.error('打包失败')
  }
}
</script>

<template>
  <div class="slicer-page">
    <!-- 顶部工具栏 -->
    <header class="slicer-toolbar">
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileUpload"
      />
      <UButton
        :icon="sourceImage ? 'i-heroicons-arrow-up-tray' : 'i-heroicons-photo'"
        :label="sourceImage ? '更换图片' : '选择图片'"
        color="primary"
        size="sm"
        class="shrink-0"
        @click="triggerUpload"
      />

      <template v-if="sourceImage">
        <USeparator orientation="vertical" class="h-5" />

        <div class="toolbar-group">
          <span class="toolbar-label">模式</span>
          <UButton
            size="xs"
            :color="lineMode === 'horizontal' ? 'primary' : 'neutral'"
            :variant="lineMode === 'horizontal' ? 'solid' : 'outline'"
            @click="lineMode = 'horizontal'"
          >
            <span class="seg-icon h" />
            横线
          </UButton>
          <UButton
            size="xs"
            :color="lineMode === 'vertical' ? 'primary' : 'neutral'"
            :variant="lineMode === 'vertical' ? 'solid' : 'outline'"
            @click="lineMode = 'vertical'"
          >
            <span class="seg-icon v" />
            竖线
          </UButton>
        </div>

        <USeparator orientation="vertical" class="h-5" />

        <div class="toolbar-group">
          <span class="toolbar-label">预设</span>
          <UButton size="xs" color="neutral" variant="soft" @click="presetNineGrid">九宫格</UButton>
          <UButton size="xs" color="neutral" variant="soft" class="hidden lg:inline-flex" @click="presetHorizontal(3)">横 3</UButton>
          <UButton size="xs" color="neutral" variant="soft" class="hidden lg:inline-flex" @click="presetVertical(3)">竖 3</UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="clearLines"
          />
        </div>

        <USeparator orientation="vertical" class="h-5" />

        <div class="toolbar-group">
          <UTooltip text="将每张切片补全为正方形">
            <UButton
              size="xs"
              :color="forceSquare ? 'primary' : 'neutral'"
              :variant="forceSquare ? 'solid' : 'outline'"
              @click="forceSquare = !forceSquare"
            >
              1:1
            </UButton>
          </UTooltip>
          <input
            v-show="forceSquare"
            v-model="fillColor"
            type="color"
            class="color-picker"
            title="补全背景色"
          />
          <UTooltip text="导出 2 倍分辨率">
            <UButton
              size="xs"
              :color="highRes ? 'primary' : 'neutral'"
              :variant="highRes ? 'solid' : 'outline'"
              @click="highRes = !highRes"
            >
              2x
            </UButton>
          </UTooltip>
        </div>
      </template>
    </header>

    <!-- 主区域 -->
    <div class="slicer-main">
      <!-- 编辑画布 -->
      <section
        class="canvas-col"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <!-- 空状态 -->
        <div v-if="!sourceImage" class="canvas-empty" :class="{ 'drag-over': isDragOver }">
          <div class="empty-dropzone">
            <div class="dropzone-icon-wrap">
              <UIcon name="i-heroicons-cloud-arrow-up" class="dropzone-icon" />
            </div>
            <p class="dropzone-title">拖放图片到这里</p>
            <p class="dropzone-sub">或者点击下方按钮选择文件</p>
            <UButton
              icon="i-heroicons-photo"
              label="选择图片"
              color="primary"
              variant="soft"
              size="sm"
              class="mt-2"
              @click.stop="triggerUpload"
            />
          </div>
        </div>

        <!-- 画布编辑 -->
        <div v-else class="canvas-stage">
          <div class="editor">
            <img :src="sourceImage.src" class="editor-img" alt="Source" draggable="false" />
            <div
              ref="overlayRef"
              class="editor-overlay"
              :class="`mode-${lineMode}`"
              @click="onOverlayClick"
            >
              <!-- 横切线 -->
              <div
                v-for="(percent, index) in horizontalLines"
                :key="`h-${index}`"
                class="split-line h"
                :style="{ top: percent + '%' }"
                @pointerdown="startDrag($event, 'h', index)"
                @pointermove="onPointerMove"
                @pointerup="endDrag"
                @pointercancel="endDrag"
              >
                <div class="line-hit-area" />
                <button
                  type="button"
                  class="line-del-btn"
                  title="删除该切线"
                  @click.stop="removeLine('h', index)"
                  @pointerdown.stop
                >
                  <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
                </button>
              </div>
              <!-- 竖切线 -->
              <div
                v-for="(percent, index) in verticalLines"
                :key="`v-${index}`"
                class="split-line v"
                :style="{ left: percent + '%' }"
                @pointerdown="startDrag($event, 'v', index)"
                @pointermove="onPointerMove"
                @pointerup="endDrag"
                @pointercancel="endDrag"
              >
                <div class="line-hit-area" />
                <button
                  type="button"
                  class="line-del-btn"
                  title="删除该切线"
                  @click.stop="removeLine('v', index)"
                  @pointerdown.stop
                >
                  <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <div class="canvas-hint">
            <span>点击添加 {{ lineMode === 'horizontal' ? '横' : '竖' }}切线</span>
            <span class="dot">&middot;</span>
            <span>拖拽调整位置</span>
            <span class="dot">&middot;</span>
            <span>共 <strong>{{ cellCount }}</strong> 个切片</span>
          </div>
        </div>
      </section>

      <!-- 切片结果 -->
      <section class="results-col">
        <header class="results-head">
          <h3 class="results-title">切片结果</h3>
          <UBadge
            v-if="slices.length > 0"
            :label="`${slices.length} 张`"
            color="primary"
            variant="soft"
            size="sm"
          />
        </header>

        <!-- 结果空状态 -->
        <div v-if="!sourceImage" class="results-empty">
          <div class="results-empty-icon">
            <UIcon name="i-heroicons-scissors" class="w-8 h-8 opacity-30" />
          </div>
          <p class="results-empty-text">上传图片后开始切片</p>
        </div>

        <div v-else-if="slices.length === 0" class="results-empty">
          <div class="results-empty-icon">
            <UIcon name="i-heroicons-square-3-stack-3d" class="w-8 h-8 opacity-30" />
          </div>
          <p v-if="cellCount > 1" class="results-empty-text">
            当前可切 {{ cellCount }} 张
          </p>
          <p v-else class="results-empty-text">添加切线或选择预设</p>
        </div>

        <!-- 结果网格 -->
        <div v-else class="results-grid">
          <div
            v-for="(item, idx) in slices"
            :key="`${item.row}-${item.col}`"
            class="result-cell"
            :style="{ animationDelay: `${idx * 40}ms` }"
          >
            <img :src="item.dataUrl" class="result-img" alt="Slice" />
            <div class="result-overlay" @click.stop="handlePreview(idx)">
              <button type="button" class="result-action-btn" title="预览" @click.stop="handlePreview(idx)">
                <UIcon name="i-heroicons-magnifying-glass-plus" class="w-6 h-6" />
              </button>
              <button type="button" class="result-action-btn" title="下载" @click.stop="downloadSlice(idx)">
                <UIcon name="i-heroicons-arrow-down-tray" class="w-6 h-6" />
              </button>
            </div>
            <div class="result-info">
              <span class="result-dim">{{ item.width }}x{{ item.height }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 底部主操作 -->
    <footer v-if="sourceImage" class="slicer-actions">
      <UButton
        :loading="isProcessing"
        icon="i-heroicons-scissors"
        color="primary"
        size="md"
        @click="handleSlice"
      >
        开始切片（{{ cellCount }} 张）
      </UButton>
      <UButton
        v-if="slices.length > 0"
        icon="i-heroicons-archive-box-arrow-down"
        color="primary"
        variant="soft"
        size="md"
        @click="handleDownloadAll"
      >
        下载 ZIP
      </UButton>
      <div class="actions-spacer" />
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-trash"
        size="md"
        @click="clear"
      >
        清除
      </UButton>
    </footer>
  </div>
</template>

<style scoped>
.slicer-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  background: var(--bg-color);
  padding: 12px 14px;
  gap: 10px;
  overflow: hidden;
}

/* ── 顶部工具栏 ── */
.slicer-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  flex: 0 0 auto;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.toolbar-label {
  font-size: 11px;
  color: var(--text-sub);
  margin-right: 2px;
  user-select: none;
}

.seg-icon {
  display: inline-block;
  background: currentColor;
  border-radius: 1px;
}

.seg-icon.h {
  width: 12px;
  height: 2px;
}

.seg-icon.v {
  width: 2px;
  height: 12px;
}

.color-picker {
  width: 26px;
  height: 24px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0;
  cursor: pointer;
  background: transparent;
}

.hidden {
  display: none;
}

/* ── 主区域 ── */
.slicer-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: 10px;
  flex: 1 1 auto;
  min-height: 0;
}

/* ── 画布列 ── */
.canvas-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  overflow: auto;
  transition: border-color 0.2s ease;
}

/* ── 空状态 & 拖放区 ── */
.canvas-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 320px;
}

.empty-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 40px;
  border: 2px dashed var(--border-color);
  border-radius: 16px;
  text-align: center;
  transition: all 0.25s ease;
  cursor: default;
}

.drag-over .empty-dropzone,
.canvas-empty.drag-over .empty-dropzone {
  border-color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 6%, transparent);
}

.dropzone-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropzone-icon {
  width: 28px;
  height: 28px;
  color: var(--primary-color);
}

.dropzone-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
}

.dropzone-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub);
}

/* ── 画布编辑 ── */
.canvas-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.editor {
  position: relative;
  display: inline-flex;
  flex: 1 1 auto;
  min-height: 0;
  max-width: 100%;
  user-select: none;
  border-radius: 8px;
  overflow: hidden;
  line-height: 0;
  /* 透明棋盘格背景 */
  background-image:
    linear-gradient(45deg, var(--bg-tertiary) 25%, transparent 25%),
    linear-gradient(-45deg, var(--bg-tertiary) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--bg-tertiary) 75%),
    linear-gradient(-45deg, transparent 75%, var(--bg-tertiary) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  box-shadow:
    inset 0 0 0 1px var(--border-color),
    0 4px 16px rgba(0, 0, 0, 0.10),
    0 1px 4px rgba(0, 0, 0, 0.06);
}

:deep(.dark) .editor {
  box-shadow:
    inset 0 0 0 1px var(--border-color),
    0 4px 16px rgba(0, 0, 0, 0.30),
    0 1px 4px rgba(0, 0, 0, 0.20);
}

.editor-img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  pointer-events: none;
  -webkit-user-drag: none;
}

.editor-overlay {
  position: absolute;
  inset: 0;
  touch-action: none;
}

.editor-overlay.mode-horizontal {
  cursor: ns-resize;
}

.editor-overlay.mode-vertical {
  cursor: ew-resize;
}

/* ── 切线 ── */
.split-line {
  position: absolute;
  pointer-events: auto;
  touch-action: none;
  z-index: 5;
}

.split-line::before {
  content: '';
  position: absolute;
  background: var(--primary-color);
  box-shadow: 0 0 6px color-mix(in srgb, var(--primary-color) 50%, transparent);
  transition: box-shadow 0.2s ease;
}

.split-line:hover::before {
  box-shadow: 0 0 10px color-mix(in srgb, var(--primary-color) 70%, transparent);
}

.split-line.h {
  left: 0;
  right: 0;
  height: 12px;
  margin-top: -6px;
  cursor: ns-resize;
}

.split-line.h::before {
  left: 0;
  right: 0;
  top: 5px;
  height: 2px;
  border-radius: 1px;
}

.split-line.v {
  top: 0;
  bottom: 0;
  width: 12px;
  margin-left: -6px;
  cursor: ew-resize;
}

.split-line.v::before {
  top: 0;
  bottom: 0;
  left: 5px;
  width: 2px;
  border-radius: 1px;
}

/* 命中区域 */
.line-hit-area {
  position: absolute;
  inset: 0;
}

.line-del-btn {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  border: 2px solid var(--card-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  z-index: 10;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.15s ease;
}

.split-line:hover .line-del-btn {
  opacity: 1;
  transform: scale(1);
}

.line-del-btn:hover {
  background: #dc2626;
  transform: scale(1.1) !important;
}

.split-line.h .line-del-btn {
  right: 8px;
  top: 50%;
  transform: translateY(-50%) scale(0.8);
}

.split-line.h:hover .line-del-btn {
  transform: translateY(-50%) scale(1);
}

.split-line.h .line-del-btn:hover {
  transform: translateY(-50%) scale(1.1) !important;
}

.split-line.v .line-del-btn {
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%) scale(0.8);
}

.split-line.v:hover .line-del-btn {
  transform: translateX(-50%) scale(1);
}

.split-line.v .line-del-btn:hover {
  transform: translateX(-50%) scale(1.1) !important;
}

.canvas-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-sub);
  flex: 0 0 auto;
  user-select: none;
}

.canvas-hint .dot {
  opacity: 0.4;
}

.canvas-hint strong {
  color: var(--primary-color);
  font-weight: 600;
}

/* ── 结果列 ── */
.results-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  min-height: 0;
  overflow: hidden;
}

.results-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
}

.results-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  color: var(--text-main);
}

.results-empty {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-sub);
  text-align: center;
  padding: 32px 16px;
}

.results-empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.results-empty-text {
  margin: 0;
  font-size: 12px;
  max-width: 200px;
  line-height: 1.5;
}

/* ── 结果网格 ── */
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
  overflow-y: auto;
  align-content: start;
  flex: 1 1 auto;
  min-height: 0;
  padding-right: 2px;
}

.result-cell {
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  animation: cell-enter 0.3s cubic-bezier(0.4, 0, 0.2, 1) backwards;
}

@keyframes cell-enter {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.result-cell:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary-color) 15%, transparent);
  transform: translateY(-2px);
}

.result-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  display: block;
  background-image:
    linear-gradient(45deg, var(--bg-tertiary) 25%, transparent 25%),
    linear-gradient(-45deg, var(--bg-tertiary) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--bg-tertiary) 75%),
    linear-gradient(-45deg, transparent 75%, var(--bg-tertiary) 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
  background-color: var(--card-bg);
}

.result-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 5;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 7px;
}

.result-cell:hover .result-overlay {
  opacity: 1;
}

.result-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.result-action-btn:hover {
  transform: scale(1.15);
  opacity: 0.8;
}

.result-info {
  font-size: 10px;
  color: var(--text-sub);
  text-align: center;
  padding: 4px 0;
  border-top: 1px solid var(--border-color);
  background: var(--card-bg);
}

.result-dim {
  font-variant-numeric: tabular-nums;
}

/* ── 底部操作 ── */
.slicer-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  flex: 0 0 auto;
}

.actions-spacer {
  flex: 1;
}

/* ── 响应式 ── */
@media (max-width: 1023px) {
  .slicer-main {
    grid-template-columns: minmax(0, 1fr);
    grid-auto-rows: minmax(0, auto);
  }

  .canvas-col {
    min-height: 340px;
  }

  .results-col {
    min-height: 220px;
  }

  .editor-img {
    max-height: 50vh;
  }
}

@media (max-width: 768px) {
  .slicer-page {
    padding: 8px;
    gap: 8px;
  }

  .slicer-toolbar {
    gap: 6px;
    padding: 6px 10px;
  }

  .results-grid {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  }

  .empty-dropzone {
    padding: 32px 24px;
  }
}
</style>
