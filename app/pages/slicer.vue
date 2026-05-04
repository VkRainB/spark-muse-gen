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

const lineMode = ref<'horizontal' | 'vertical'>('horizontal')
const overlayRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

interface DragContext {
  type: 'h' | 'v'
  index: number
  pointerId: number
}
let dragCtx: DragContext | null = null
let dragMoved = false

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    await loadImage(file)
    toast.success('图片已加载')
  } catch {
    toast.error('加载失败', '无法读取该图片')
  } finally {
    input.value = ''
  }
}

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
        id="slicer-upload"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileUpload"
      />
      <label for="slicer-upload" class="upload-btn" :class="{ 'is-empty': !sourceImage }">
        <UIcon name="i-heroicons-arrow-up-tray" class="w-4 h-4" />
        {{ sourceImage ? '更换图片' : '选择图片' }}
      </label>

      <template v-if="sourceImage">
        <span class="toolbar-divider" aria-hidden="true" />

        <div class="toolbar-group">
          <span class="toolbar-label">模式</span>
          <button
            type="button"
            class="seg-btn"
            :class="{ active: lineMode === 'horizontal' }"
            @click="lineMode = 'horizontal'"
          >
            <span class="seg-icon h" />
            横线
          </button>
          <button
            type="button"
            class="seg-btn"
            :class="{ active: lineMode === 'vertical' }"
            @click="lineMode = 'vertical'"
          >
            <span class="seg-icon v" />
            竖线
          </button>
        </div>

        <span class="toolbar-divider" aria-hidden="true" />

        <div class="toolbar-group">
          <span class="toolbar-label">预设</span>
          <UButton size="xs" color="neutral" variant="outline" @click="presetNineGrid">九宫格</UButton>
          <UButton size="xs" color="neutral" variant="outline" @click="presetHorizontal(3)">横3</UButton>
          <UButton size="xs" color="neutral" variant="outline" @click="presetVertical(3)">竖3</UButton>
          <UButton size="xs" color="neutral" variant="ghost" @click="clearLines">清空切线</UButton>
        </div>

        <span class="toolbar-divider" aria-hidden="true" />

        <div class="toolbar-group">
          <label class="check-label">
            <input v-model="forceSquare" type="checkbox" />
            <span>1:1 补全</span>
          </label>
          <input
            v-show="forceSquare"
            v-model="fillColor"
            type="color"
            class="color-picker"
            title="补全背景色"
          />
          <label class="check-label">
            <input v-model="highRes" type="checkbox" />
            <span>2x 高清</span>
          </label>
        </div>
      </template>
    </header>

    <!-- 主区域 -->
    <div class="slicer-main">
      <!-- 编辑画布 -->
      <section class="canvas-col">
        <div v-if="!sourceImage" class="canvas-empty">
          <UIcon name="i-heroicons-photo" class="empty-icon" />
          <p class="empty-tip">还没有图片</p>
          <p class="empty-tip-sub">
            点击上方"选择图片"按钮上传一张图片，<br />
            然后在图片上画横 / 竖辅助线进行切片
          </p>
        </div>

        <div v-else class="canvas-stage">
          <div class="editor">
            <img :src="sourceImage.src" class="editor-img" alt="Source" draggable="false" />
            <div
              ref="overlayRef"
              class="editor-overlay"
              :class="`mode-${lineMode}`"
              @click="onOverlayClick"
            >
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
                <button
                  type="button"
                  class="line-del-btn"
                  title="删除该切线"
                  @click.stop="removeLine('h', index)"
                  @pointerdown.stop
                >×</button>
              </div>
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
                <button
                  type="button"
                  class="line-del-btn"
                  title="删除该切线"
                  @click.stop="removeLine('v', index)"
                  @pointerdown.stop
                >×</button>
              </div>
            </div>
          </div>
          <div class="canvas-hint">
            <span>点击图片添加 {{ lineMode === 'horizontal' ? '横' : '竖' }}切线</span>
            <span class="dot">·</span>
            <span>拖拽调整位置</span>
            <span class="dot">·</span>
            <span>共 {{ cellCount }} 个切片</span>
          </div>
        </div>
      </section>

      <!-- 切片结果 -->
      <section class="results-col">
        <header class="results-head">
          <h3 class="results-title">切片结果</h3>
          <span class="results-count">{{ slices.length }} 张</span>
        </header>

        <div v-if="!sourceImage" class="results-empty">
          <UIcon name="i-heroicons-puzzle-piece" class="empty-icon-sm" />
          <p>上传图片后开始切片</p>
        </div>

        <div v-else-if="slices.length === 0" class="results-empty">
          <UIcon name="i-heroicons-scissors" class="empty-icon-sm" />
          <p v-if="cellCount > 1">当前可切 {{ cellCount }} 张，点击下方"开始切片"</p>
          <p v-else>请添加切线或选择预设</p>
        </div>

        <div v-else class="results-grid">
          <div
            v-for="(item, idx) in slices"
            :key="`${item.row}-${item.col}`"
            class="result-cell"
            @click="downloadSlice(idx)"
          >
            <img :src="item.dataUrl" class="result-img" alt="Slice" />
            <div class="result-overlay">
              <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5" />
            </div>
            <div class="result-info">{{ item.width }}×{{ item.height }}</div>
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
        @click="handleSlice"
      >
        开始切片（{{ cellCount }} 张）
      </UButton>
      <UButton
        v-if="slices.length > 0"
        icon="i-heroicons-arrow-down-tray"
        color="success"
        @click="handleDownloadAll"
      >
        下载全部 ZIP
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-trash"
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
  padding: 14px 16px;
  gap: 12px;
  overflow: hidden;
}

/* 顶部工具栏 */
.slicer-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  flex: 0 0 auto;
}

.toolbar-divider {
  width: 1px;
  height: 22px;
  background: var(--border-color);
  flex: 0 0 auto;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.toolbar-label {
  font-size: 11px;
  color: var(--text-sub);
  margin-right: 2px;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--accent-blue);
  border-radius: 8px;
  background: var(--accent-blue);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  flex: 0 0 auto;
}

.upload-btn:hover {
  background: color-mix(in srgb, var(--accent-blue) 88%, #000);
}

.upload-btn.is-empty {
  /* 空状态稍微高亮提示 */
  box-shadow: 0 1px 4px color-mix(in srgb, var(--accent-blue) 25%, transparent);
}

.hidden {
  display: none;
}

.seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-sub);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-btn:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.seg-btn.active {
  background: var(--accent-blue);
  color: #fff;
  border-color: var(--accent-blue);
}

.seg-icon {
  display: inline-block;
  background: currentColor;
}

.seg-icon.h {
  width: 12px;
  height: 2px;
}

.seg-icon.v {
  width: 2px;
  height: 12px;
}

.check-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-main);
  cursor: pointer;
  user-select: none;
}

.check-label input[type='checkbox'] {
  width: 14px;
  height: 14px;
  accent-color: var(--accent-blue);
  cursor: pointer;
}

.color-picker {
  width: 28px;
  height: 24px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0;
  cursor: pointer;
  background: transparent;
}

/* 主区域 */
.slicer-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
}

/* 编辑画布列 */
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
}

.canvas-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--text-sub);
  text-align: center;
  max-width: 360px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  opacity: 0.45;
  color: var(--text-sub);
}

.empty-tip {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
}

.empty-tip-sub {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
}

.canvas-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
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
  background: var(--bg-tertiary);
  border-radius: 10px;
  overflow: hidden;
  line-height: 0;
}

.editor-img {
  display: block;
  max-width: 100%;
  /* 高度跟随父容器，能填满整个 canvas-col 的剩余高度 */
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

.split-line {
  position: absolute;
  background: rgba(26, 115, 232, 0.7);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5);
  pointer-events: auto;
  touch-action: none;
}

.split-line.h {
  left: 0;
  right: 0;
  height: 2px;
  margin-top: -1px;
  cursor: ns-resize;
}

.split-line.v {
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  cursor: ew-resize;
}

.split-line:hover {
  background: rgba(26, 115, 232, 1);
}

.line-del-btn {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #d93025;
  color: #fff;
  border: 2px solid #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  z-index: 2;
}

.line-del-btn:hover {
  background: #b3261e;
}

.split-line.h .line-del-btn {
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
}

.split-line.v .line-del-btn {
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
}

.canvas-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-sub);
  flex: 0 0 auto;
}

.canvas-hint .dot {
  opacity: 0.4;
}

/* 切片结果列 */
.results-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 16px;
  min-height: 0;
  overflow: hidden;
}

.results-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex: 0 0 auto;
}

.results-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: var(--text-main);
}

.results-count {
  font-size: 12px;
  color: var(--text-sub);
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

.empty-icon-sm {
  width: 36px;
  height: 36px;
  opacity: 0.4;
}

.results-empty p {
  margin: 0;
  font-size: 12px;
  max-width: 220px;
  line-height: 1.5;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  overflow-y: auto;
  align-content: start;
  flex: 1 1 auto;
  min-height: 0;
  padding-right: 4px;
}

.result-cell {
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  transition: all 0.15s ease;
}

.result-cell:hover {
  border-color: var(--accent-blue);
  transform: translateY(-2px);
}

.result-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  background: #f8f9fa;
  display: block;
}

:deep(.dark) .result-img {
  background: #1f2937;
}

.result-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.result-cell:hover .result-overlay {
  opacity: 1;
}

.result-info {
  font-size: 10px;
  color: var(--text-sub);
  text-align: center;
  padding: 3px 0;
  border-top: 1px solid var(--border-color);
  background: var(--card-bg);
}

/* 底部主操作 */
.slicer-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  flex: 0 0 auto;
}

@media (max-width: 1023px) {
  .slicer-main {
    grid-template-columns: minmax(0, 1fr);
    grid-auto-rows: minmax(0, auto);
  }

  .canvas-col {
    min-height: 360px;
  }

  .results-col {
    min-height: 240px;
  }

  .editor-img {
    max-height: 50vh;
  }
}

@media (max-width: 768px) {
  .slicer-page {
    padding: 12px;
  }

  .slicer-toolbar {
    gap: 8px;
    padding: 8px 10px;
  }

  .toolbar-divider {
    display: none;
  }

  .results-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}
</style>
