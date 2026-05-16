<script setup lang="ts">
/**
 * 角色配置面板：文字描述 + 参考图（共存可选）
 *
 * 通过 v-model:character / v-model:background 双向绑定。
 * character 由旧版 string 升级为 StickerCharacter 对象。
 */

import type { StickerCharacter } from '../../../types/sticker'
import { compressBase64Image, fileToBase64 } from '../../utils/base64Utils'

const character = defineModel<StickerCharacter>('character', {
  default: () => ({ description: '', referenceImage: undefined }),
})
const background = defineModel<'white' | 'transparent'>('background', {
  default: 'white',
})

const toast = useAppToast()

const fileInputRef = ref<HTMLInputElement>()
const isProcessing = ref(false)

// 同步 textarea，避免 defineModel 对象字段直接 v-model 时的引用陷阱
const description = computed<string>({
  get: () => character.value.description || '',
  set: (val: string) => {
    character.value = { ...character.value, description: val }
  },
})

const triggerUpload = () => {
  fileInputRef.value?.click()
}

const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8MB 上限，避免极端图片卡浏览器

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // 立即清空 input.value，便于同名文件再次选择
  input.value = ''

  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.error('请选择图片文件')
    return
  }
  if (file.size > MAX_FILE_BYTES) {
    toast.error('图片过大', '请控制在 8MB 以内')
    return
  }

  isProcessing.value = true
  try {
    const dataUrl = await fileToBase64(file)
    // 压缩到 1024 宽以内 + JPEG 0.85，约束 localStorage 占用
    const compressed = await compressBase64Image(dataUrl, 1024, 0.85)
    character.value = {
      ...character.value,
      referenceImage: {
        data: compressed,
        mimeType: 'image/jpeg',
      },
    }
    toast.success('参考图已上传')
  } catch (err) {
    console.error(err)
    toast.error('图片处理失败')
  } finally {
    isProcessing.value = false
  }
}

const removeReference = () => {
  character.value = { ...character.value, referenceImage: undefined }
}
</script>

<template>
  <section class="sticker-character-panel w-full">
    <header class="panel-head">
      <div class="panel-head-row">
        <UIcon name="i-heroicons-user-circle" class="panel-head-icon" />
        <h3 class="panel-title">角色配置</h3>
      </div>
      <p class="panel-tip">
        文字与参考图至少填一项；同时填写时，参考图定义外观，文字补充细节。
      </p>
    </header>

    <UFormField label="角色描述" class="w-full">
      <UTextarea
        v-model="description"
        :rows="3"
        autoresize
        class="w-full"
        placeholder="例如：一只橙色的小猫，戴着红色围巾，圆圆胖胖"
      />
    </UFormField>

    <UFormField label="参考图（可选）" class="w-full">
      <div v-if="character.referenceImage" class="ref-card">
        <img
          :src="character.referenceImage.data"
          alt="角色参考"
          class="ref-thumb"
        />
        <div class="ref-meta">
          <span class="ref-hint">
            <UIcon name="i-heroicons-check-badge" class="w-3.5 h-3.5" />
            已上传，将作为外观锚点
          </span>
          <div class="ref-actions">
            <button
              type="button"
              class="ref-btn ref-btn-secondary"
              :disabled="isProcessing"
              @click="triggerUpload"
            >
              <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
              换一张
            </button>
            <button
              type="button"
              class="ref-btn ref-btn-danger"
              @click="removeReference"
            >
              <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
              移除
            </button>
          </div>
        </div>
      </div>

      <button
        v-else
        type="button"
        class="ref-upload"
        :disabled="isProcessing"
        @click="triggerUpload"
      >
        <div class="ref-upload-icon-wrap">
          <UIcon
            :name="isProcessing ? 'i-heroicons-arrow-path' : 'i-heroicons-photo'"
            class="w-5 h-5"
            :class="{ 'animate-spin': isProcessing }"
          />
        </div>
        <div class="ref-upload-text">
          <span class="ref-upload-title">
            {{ isProcessing ? '处理中…' : '上传参考图' }}
          </span>
          <span class="ref-upload-sub">支持 PNG / JPG，自动压缩</span>
        </div>
      </button>

      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="hidden-file"
        @change="handleFileChange"
      />
    </UFormField>

    <UFormField label="背景">
      <div class="bg-options">
        <label
          class="bg-card"
          :class="{ active: background === 'white' }"
        >
          <input v-model="background" type="radio" value="white" class="sr-only" />
          <div class="bg-preview bg-preview-white"></div>
          <span class="bg-card-label">白色</span>
        </label>
        <label
          class="bg-card"
          :class="{ active: background === 'transparent' }"
        >
          <input v-model="background" type="radio" value="transparent" class="sr-only" />
          <div class="bg-preview bg-preview-transparent"></div>
          <span class="bg-card-label">透明</span>
        </label>
      </div>
    </UFormField>
  </section>
</template>

<style scoped>
.sticker-character-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
}

/* 确保表单控件撑满卡片宽度 */
.sticker-character-panel :deep(.u-form-field),
.sticker-character-panel :deep(textarea),
.sticker-character-panel :deep(.u-textarea) {
  width: 100%;
}

.panel-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-head-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-head-icon {
  width: 18px;
  height: 18px;
  color: var(--accent-blue);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.panel-tip {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.5;
}

/* 背景选择器 - 卡片式 */
.bg-options {
  display: flex;
  gap: 10px;
}

.bg-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.bg-card:hover {
  border-color: color-mix(in srgb, var(--accent-blue) 50%, var(--border-color));
}

.bg-card.active {
  border-color: var(--accent-blue);
  background: color-mix(in srgb, var(--accent-blue) 6%, var(--bg-secondary));
}

.bg-preview {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.bg-preview-white {
  background: #ffffff;
}

.bg-preview-transparent {
  background-image:
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
}

.dark .bg-preview-transparent {
  background-image:
    linear-gradient(45deg, #334155 25%, transparent 25%),
    linear-gradient(-45deg, #334155 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #334155 75%),
    linear-gradient(-45deg, transparent 75%, #334155 75%);
}

.bg-card-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-main);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

/* 参考图卡片 */
.ref-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
}

.ref-thumb {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 10px;
  background: var(--bg-tertiary);
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.dark .ref-thumb {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.ref-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
}

.ref-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--primary-color);
}

.ref-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ref-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ref-btn:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.ref-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ref-btn-danger {
  color: #d93025;
  border-color: color-mix(in srgb, #d93025 30%, var(--border-color));
}

.ref-btn-danger:hover {
  background: color-mix(in srgb, #fca5a5 25%, transparent);
  border-color: #d93025;
  color: #d93025;
}

/* 上传按钮 */
.ref-upload {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1.5px dashed var(--border-color);
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-blue) 3%, var(--bg-secondary));
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
}

.ref-upload:hover:not(:disabled) {
  border-color: var(--accent-blue);
  background: color-mix(in srgb, var(--accent-blue) 6%, var(--bg-secondary));
  transform: translateY(-1px);
}

.ref-upload:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ref-upload-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-blue) 10%, transparent);
  color: var(--accent-blue);
  flex-shrink: 0;
}

.ref-upload-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ref-upload-title {
  font-size: 13px;
  font-weight: 500;
}

.ref-upload-sub {
  font-size: 11px;
  color: var(--text-sub);
}

.hidden-file {
  display: none;
}
</style>
