<script setup lang="ts">
const { config, sourceImage, slices, isProcessing, loadImage, setNineGrid, slice, downloadSlice, downloadAll, clear } = useSlicer()
const toast = useAppToast()

defineEmits<{ close: [] }>()

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    await loadImage(file)
    toast.success('图片已加载')
  } catch {
    toast.error('加载失败', '无法加载图片')
  }
}

const handleSlice = async () => {
  await slice()
  toast.success('切片完成', `生成 ${slices.value.length} 个切片`)
}
</script>

<template>
  <UiToolPanelShell title="图片切片工具" @close="$emit('close')">
    <div class="slicer-tool">
      <!-- 上传区域 -->
      <div v-if="!sourceImage" class="slicer-upload">
        <input
          id="slicer-upload"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleFileUpload"
        />
        <label for="slicer-upload" class="slicer-upload-label">
          <UIcon name="i-heroicons-photo" class="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p class="slicer-upload-tip">点击选择图片</p>
        </label>
      </div>

      <!-- 预览和设置 -->
      <template v-else>
        <div class="slicer-config-row">
          <!-- 原图预览 -->
          <div class="slicer-preview">
            <img :src="sourceImage.src" class="slicer-preview-img" alt="Source" />
          </div>

          <!-- 设置 -->
          <div class="slicer-settings">
            <UFormField label="行数">
              <UInput v-model.number="config.rows" type="number" min="1" max="10" />
            </UFormField>

            <UFormField label="列数">
              <UInput v-model.number="config.cols" type="number" min="1" max="10" />
            </UFormField>

            <UFormField label="填充色">
              <input
                v-model="config.fillColor"
                type="color"
                class="slicer-color"
              />
            </UFormField>

            <div class="slicer-switch">
              <USwitch v-model="config.highRes" />
              <span class="slicer-switch-label">2x 高清</span>
            </div>

            <UButton
              icon="i-heroicons-squares-2x2"
              variant="outline"
              size="sm"
              block
              @click="setNineGrid"
            >
              九宫格
            </UButton>
          </div>
        </div>

        <!-- 切片结果 -->
        <div v-if="slices.length > 0" class="slicer-results">
          <div class="slicer-results-title">切片结果（{{ slices.length }}）</div>
          <div class="slicer-grid">
            <div
              v-for="(s, index) in slices"
              :key="index"
              class="slicer-cell"
              @click="downloadSlice(index)"
            >
              <img
                :src="s.dataUrl"
                class="slicer-cell-img"
                :alt="`Slice ${s.row + 1}-${s.col + 1}`"
              />
              <div class="slicer-cell-overlay">
                <UIcon name="i-heroicons-arrow-down-tray" class="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <template v-if="sourceImage" #footer>
      <div class="slicer-footer">
        <UButton :loading="isProcessing" icon="i-heroicons-scissors" @click="handleSlice">
          开始切片
        </UButton>
        <UButton
          v-if="slices.length > 0"
          icon="i-heroicons-arrow-down-tray"
          color="success"
          @click="downloadAll()"
        >
          下载全部 (ZIP)
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-trash"
          @click="clear"
        >
          清除
        </UButton>
      </div>
    </template>
  </UiToolPanelShell>
</template>

<style scoped>
.slicer-tool {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.slicer-upload {
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slicer-upload-label {
  cursor: pointer;
  display: block;
}

.slicer-upload-tip {
  color: var(--text-sub);
  margin: 0;
  font-size: 14px;
}

.hidden {
  display: none;
}

.slicer-config-row {
  display: flex;
  gap: 16px;
  flex: 0 0 auto;
}

.slicer-preview {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.slicer-preview-img {
  max-width: 100%;
  max-height: 256px;
  object-fit: contain;
  border-radius: 8px;
}

.slicer-settings {
  width: 192px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slicer-color {
  width: 100%;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
}

.slicer-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slicer-switch-label {
  font-size: 13px;
  color: var(--text-main);
}

.slicer-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
}

.slicer-results-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.slicer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.slicer-cell {
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary);
}

.slicer-cell-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.slicer-cell-overlay {
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

.slicer-cell:hover .slicer-cell-overlay {
  opacity: 1;
}

.slicer-footer {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
}

@media (max-width: 768px) {
  .slicer-config-row {
    flex-direction: column;
  }

  .slicer-settings {
    width: 100%;
  }

  .slicer-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
