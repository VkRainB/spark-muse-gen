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
  <section class="sticker-character-panel">
    <header class="panel-head">
      <h3 class="panel-title">角色配置</h3>
      <p class="panel-tip">
        文字与参考图至少填一项；同时填写时，参考图定义外观，文字补充细节。
      </p>
    </header>

    <UFormField label="角色描述">
      <UTextarea
        v-model="description"
        :rows="3"
        autoresize
        placeholder="例如：一只橙色的小猫，戴着红色围巾，圆圆胖胖"
      />
    </UFormField>

    <UFormField label="参考图（可选）">
      <div v-if="character.referenceImage" class="ref-card">
        <img
          :src="character.referenceImage.data"
          alt="角色参考"
          class="ref-thumb"
        />
        <div class="ref-meta">
          <span class="ref-hint">已上传，将作为外观锚点</span>
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
        <UIcon
          :name="isProcessing ? 'i-heroicons-arrow-path' : 'i-heroicons-photo'"
          class="w-5 h-5"
          :class="{ 'animate-spin': isProcessing }"
        />
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
        <label class="bg-option">
          <input v-model="background" type="radio" value="white" />
          <span>白色背景</span>
        </label>
        <label class="bg-option">
          <input v-model="background" type="radio" value="transparent" />
          <span>透明背景</span>
        </label>
      </div>
    </UFormField>
  </section>
</template>

<style scoped>
.sticker-character-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
}

.panel-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.bg-options {
  display: flex;
  gap: 16px;
}

.bg-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-main);
}

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
  border-radius: 8px;
  background: var(--bg-tertiary);
  flex-shrink: 0;
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
  font-size: 12px;
  color: var(--text-sub);
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
  padding: 4px 10px;
  border-radius: 6px;
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

.ref-upload {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px;
  border: 1px dashed var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
  text-align: left;
}

.ref-upload:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.ref-upload:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
