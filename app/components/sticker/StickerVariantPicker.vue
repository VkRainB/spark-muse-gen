<script setup lang="ts">
/**
 * 表情 / 动作多选面板
 *
 * 升级点：
 *  - 接收的 emotions / actions 已是「预设 + 用户自定义」合并后的数组（来自 useStickerMode）
 *  - 末尾「+ 自定义」按钮：弹 UModal，输入名称（必填）、emoji（选填）、prompt 片段（选填）
 *  - 自定义项右上角 × 删除（hover 显示）
 *  - 删除自定义项时同步清理 selected*
 *
 * v-model:selectedEmotions / v-model:selectedActions 双向绑定 ID 数组
 */

import type { StickerVariant } from '../../../types/sticker'
import { useStickerStore } from '../../../stores/sticker'

interface Props {
  emotions: ReadonlyArray<StickerVariant>
  actions: ReadonlyArray<StickerVariant>
}

defineProps<Props>()

const selectedEmotions = defineModel<string[]>('selectedEmotions', {
  default: () => [] as string[],
})
const selectedActions = defineModel<string[]>('selectedActions', {
  default: () => [] as string[],
})

const stickerStore = useStickerStore()
const toast = useAppToast()

const toggle = (list: string[], id: string): string[] => {
  const idx = list.indexOf(id)
  if (idx === -1) return [...list, id]
  return list.filter((x) => x !== id)
}

const toggleEmotion = (id: string) => {
  selectedEmotions.value = toggle(selectedEmotions.value, id)
}

const toggleAction = (id: string) => {
  selectedActions.value = toggle(selectedActions.value, id)
}

const totalSelected = computed(
  () => selectedEmotions.value.length + selectedActions.value.length,
)

// ===== 自定义新增弹窗 =====
const addOpen = ref(false)
const addingKind = ref<'emotion' | 'action'>('emotion')
const addLabel = ref('')
const addEmoji = ref('')
const addPrompt = ref('')
const showAdvanced = ref(false)

const addingTitle = computed(() =>
  addingKind.value === 'emotion' ? '新增自定义表情' : '新增自定义动作',
)

const openAdd = (kind: 'emotion' | 'action') => {
  addingKind.value = kind
  addLabel.value = ''
  addEmoji.value = ''
  addPrompt.value = ''
  showAdvanced.value = false
  addOpen.value = true
}

const submitAdd = () => {
  const label = addLabel.value.trim()
  if (!label) {
    toast.warning('请输入名称')
    return
  }

  const payload = {
    label,
    emoji: addEmoji.value.trim() || undefined,
    prompt: addPrompt.value.trim() || undefined,
  }

  const variant = addingKind.value === 'emotion'
    ? stickerStore.addCustomEmotion(payload)
    : stickerStore.addCustomAction(payload)

  if (!variant) {
    toast.error('添加失败', '可能已达数量上限')
    return
  }

  // 新加的项目自动选中
  if (addingKind.value === 'emotion') {
    selectedEmotions.value = [...selectedEmotions.value, variant.id]
  } else {
    selectedActions.value = [...selectedActions.value, variant.id]
  }

  addOpen.value = false
  toast.success('已添加', label)
}

const removeCustom = (kind: 'emotion' | 'action', id: string) => {
  if (kind === 'emotion') {
    stickerStore.removeCustomEmotion(id)
    selectedEmotions.value = selectedEmotions.value.filter((x) => x !== id)
  } else {
    stickerStore.removeCustomAction(id)
    selectedActions.value = selectedActions.value.filter((x) => x !== id)
  }
}
</script>

<template>
  <section class="sticker-variant-picker">
    <div class="picker-head">
      <h3 class="panel-title">表情 / 动作</h3>
      <span class="picker-count">已选 {{ totalSelected }}</span>
    </div>

    <div class="variant-group">
      <div class="variant-label">表情</div>
      <div class="variant-pills">
        <div
          v-for="emotion in emotions"
          :key="emotion.id"
          class="variant-pill-wrap"
        >
          <button
            type="button"
            class="variant-pill"
            :class="{ 'is-active': selectedEmotions.includes(emotion.id) }"
            @click="toggleEmotion(emotion.id)"
          >
            <span v-if="emotion.emoji" class="variant-pill-icon">{{ emotion.emoji }}</span>
            <span>{{ emotion.label }}</span>
          </button>
          <button
            v-if="emotion.custom"
            type="button"
            class="variant-pill-remove"
            title="删除该自定义"
            @click.stop="removeCustom('emotion', emotion.id)"
          >
            <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          class="variant-pill variant-pill-add"
          @click="openAdd('emotion')"
        >
          <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
          <span>自定义</span>
        </button>
      </div>
    </div>

    <div class="variant-group">
      <div class="variant-label">动作</div>
      <div class="variant-pills">
        <div
          v-for="action in actions"
          :key="action.id"
          class="variant-pill-wrap"
        >
          <button
            type="button"
            class="variant-pill"
            :class="{ 'is-active': selectedActions.includes(action.id) }"
            @click="toggleAction(action.id)"
          >
            <span v-if="action.emoji" class="variant-pill-icon">{{ action.emoji }}</span>
            <span>{{ action.label }}</span>
          </button>
          <button
            v-if="action.custom"
            type="button"
            class="variant-pill-remove"
            title="删除该自定义"
            @click.stop="removeCustom('action', action.id)"
          >
            <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          class="variant-pill variant-pill-add"
          @click="openAdd('action')"
        >
          <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
          <span>自定义</span>
        </button>
      </div>
    </div>

    <UModal
      v-model:open="addOpen"
      :title="addingTitle"
      description="为表情包模型提供更精确的语义片段。"
    >
      <template #body>
        <div class="add-form">
          <UFormField label="名称" required>
            <UInput
              v-model="addLabel"
              placeholder="例如：叉腰 / 摆烂 / 比心"
              :maxlength="16"
              autofocus
              @keyup.enter="submitAdd"
            />
          </UFormField>

          <UFormField label="Emoji 图标（选填）">
            <UInput
              v-model="addEmoji"
              placeholder="例如：💪、🤝、🥺"
              :maxlength="4"
            />
          </UFormField>

          <button
            type="button"
            class="advanced-toggle"
            @click="showAdvanced = !showAdvanced"
          >
            <UIcon
              :name="showAdvanced ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              class="w-3.5 h-3.5"
            />
            高级：自定义 prompt 片段
          </button>

          <UFormField
            v-if="showAdvanced"
            label="Prompt 片段（选填，建议英文）"
            help="如：hands on hips, confident pose；留空则用名称生成"
          >
            <UTextarea
              v-model="addPrompt"
              :rows="2"
              autoresize
              placeholder="hands on hips, confident pose"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="footer-row">
          <UButton color="neutral" variant="ghost" @click="addOpen = false">
            取消
          </UButton>
          <UButton color="primary" icon="i-heroicons-check" @click="submitAdd">
            添加
          </UButton>
        </div>
      </template>
    </UModal>
  </section>
</template>

<style scoped>
.sticker-variant-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
}

.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.picker-count {
  font-size: 12px;
  color: var(--text-sub);
}

.variant-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.variant-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-sub);
}

.variant-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.variant-pill-wrap {
  position: relative;
  display: inline-flex;
}

.variant-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s ease;
}

.variant-pill:hover {
  border-color: var(--accent-blue);
}

.variant-pill.is-active {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: #fff;
}

.variant-pill-icon {
  font-size: 14px;
  line-height: 1;
}

.variant-pill-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s ease;
}

.variant-pill-wrap:hover .variant-pill-remove {
  opacity: 1;
}

.variant-pill-remove:hover {
  background: color-mix(in srgb, #fca5a5 35%, transparent);
  color: #d93025;
  border-color: #d93025;
}

.variant-pill-add {
  border-style: dashed;
  background: transparent;
  color: var(--text-sub);
}

.variant-pill-add:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  background: color-mix(in srgb, var(--accent-blue) 6%, transparent);
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.advanced-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--text-sub);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  align-self: flex-start;
}

.advanced-toggle:hover {
  color: var(--accent-blue);
}

.footer-row {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  width: 100%;
}

@media (max-width: 768px) {
  .variant-pill-remove {
    opacity: 1;
  }
}
</style>
