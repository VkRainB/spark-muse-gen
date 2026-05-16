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
      <div class="picker-head-left">
        <h3 class="panel-title">表情 / 动作</h3>
        <span v-if="totalSelected > 0" class="picker-badge">{{ totalSelected }}</span>
      </div>
      <span class="picker-count">点击选择，可多选</span>
    </div>

    <!-- 表情组 -->
    <div class="variant-group">
      <div class="variant-group-head">
        <span class="variant-group-icon">&#x1F3A8;</span>
        <span class="variant-label">表情</span>
        <span class="variant-label-sub">{{ selectedEmotions.length }}/{{ emotions.length }}</span>
      </div>
      <div class="variant-grid">
        <div
          v-for="emotion in emotions"
          :key="emotion.id"
          class="variant-card-wrap"
        >
          <button
            type="button"
            class="variant-card"
            :class="{ 'is-active': selectedEmotions.includes(emotion.id), 'is-custom': emotion.custom }"
            @click="toggleEmotion(emotion.id)"
          >
            <span v-if="emotion.emoji" class="variant-card-emoji">{{ emotion.emoji }}</span>
            <span class="variant-card-label">{{ emotion.label }}</span>
          </button>
          <button
            v-if="emotion.custom"
            type="button"
            class="variant-card-remove"
            title="删除该自定义"
            @click.stop="removeCustom('emotion', emotion.id)"
          >
            <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          class="variant-card variant-card-add"
          @click="openAdd('emotion')"
        >
          <UIcon name="i-heroicons-plus" class="variant-card-add-icon" />
          <span class="variant-card-label">自定义</span>
        </button>
      </div>
    </div>

    <!-- 动作组 -->
    <div class="variant-group">
      <div class="variant-group-head">
        <span class="variant-group-icon">&#x1F3AC;</span>
        <span class="variant-label">动作</span>
        <span class="variant-label-sub">{{ selectedActions.length }}/{{ actions.length }}</span>
      </div>
      <div class="variant-grid">
        <div
          v-for="action in actions"
          :key="action.id"
          class="variant-card-wrap"
        >
          <button
            type="button"
            class="variant-card"
            :class="{ 'is-active': selectedActions.includes(action.id), 'is-custom': action.custom }"
            @click="toggleAction(action.id)"
          >
            <span v-if="action.emoji" class="variant-card-emoji">{{ action.emoji }}</span>
            <span class="variant-card-label">{{ action.label }}</span>
          </button>
          <button
            v-if="action.custom"
            type="button"
            class="variant-card-remove"
            title="删除该自定义"
            @click.stop="removeCustom('action', action.id)"
          >
            <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          class="variant-card variant-card-add"
          @click="openAdd('action')"
        >
          <UIcon name="i-heroicons-plus" class="variant-card-add-icon" />
          <span class="variant-card-label">自定义</span>
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
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
}

.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.picker-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.picker-count {
  font-size: 12px;
  color: var(--text-tertiary, var(--text-sub));
}

/* 分组 */
.variant-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.variant-group-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.variant-group-icon {
  font-size: 14px;
  line-height: 1;
}

.variant-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.variant-label-sub {
  font-size: 11px;
  color: var(--text-tertiary, var(--text-sub));
  margin-left: auto;
}

/* 卡片网格 */
.variant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
}

.variant-card-wrap {
  position: relative;
}

.variant-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: 8px 4px;
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-secondary);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.variant-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: transparent;
  transition: background 0.2s ease;
}

.variant-card:hover {
  border-color: color-mix(in srgb, var(--accent-blue) 50%, var(--border-color));
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.dark .variant-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.variant-card.is-active {
  background: color-mix(in srgb, var(--accent-blue) 15%, var(--bg-secondary));
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-blue) 15%, transparent);
}

.variant-card.is-active::after {
  background: var(--accent-blue);
}

.variant-card.is-custom {
  border-style: dashed;
}

.variant-card-emoji {
  font-size: 24px;
  line-height: 1;
  transition: transform 0.2s ease;
}

.variant-card:hover .variant-card-emoji {
  transform: scale(1.1);
}

.variant-card.is-active .variant-card-emoji {
  transform: scale(1.1);
}

.variant-card-label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
}

/* 删除按钮 */
.variant-card-remove {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s ease;
  z-index: 2;
}

.variant-card-wrap:hover .variant-card-remove {
  opacity: 1;
}

.variant-card-remove:hover {
  background: color-mix(in srgb, #fca5a5 35%, transparent);
  color: #d93025;
  border-color: #d93025;
}

/* 添加自定义卡片 */
.variant-card-add {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--accent-blue) 30%, var(--border-color));
  background: color-mix(in srgb, var(--accent-blue) 4%, transparent);
  color: var(--text-sub);
}

.variant-card-add:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  background: color-mix(in srgb, var(--accent-blue) 8%, transparent);
  transform: translateY(-2px);
}

.variant-card-add-icon {
  width: 20px;
  height: 20px;
  opacity: 0.6;
}

.variant-card-add:hover .variant-card-add-icon {
  opacity: 1;
}

/* 自定义表单 */
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
  .variant-card-remove {
    opacity: 1;
  }

  .variant-grid {
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 6px;
  }
}
</style>
