<script setup lang="ts">
/**
 * 表情 / 动作多选面板
 * v-model:selectedEmotions / v-model:selectedActions 双向绑定 ID 数组
 */

interface Variant {
  id: string
  label: string
  emoji: string
}

interface Props {
  emotions: ReadonlyArray<Variant>
  actions: ReadonlyArray<Variant>
}

defineProps<Props>()

const selectedEmotions = defineModel<string[]>('selectedEmotions', {
  default: () => [] as string[],
})
const selectedActions = defineModel<string[]>('selectedActions', {
  default: () => [] as string[],
})

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
        <button
          v-for="emotion in emotions"
          :key="emotion.id"
          type="button"
          class="variant-pill"
          :class="{ 'is-active': selectedEmotions.includes(emotion.id) }"
          @click="toggleEmotion(emotion.id)"
        >
          <span class="variant-pill-icon">{{ emotion.emoji }}</span>
          <span>{{ emotion.label }}</span>
        </button>
      </div>
    </div>

    <div class="variant-group">
      <div class="variant-label">动作</div>
      <div class="variant-pills">
        <button
          v-for="action in actions"
          :key="action.id"
          type="button"
          class="variant-pill"
          :class="{ 'is-active': selectedActions.includes(action.id) }"
          @click="toggleAction(action.id)"
        >
          <span class="variant-pill-icon">{{ action.emoji }}</span>
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>
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
</style>
