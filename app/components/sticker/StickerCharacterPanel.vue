<script setup lang="ts">
/**
 * 角色描述输入 + 背景选择
 * 使用 v-model:character / v-model:background 双向绑定
 */

const character = defineModel<string>('character', { default: '' })
const background = defineModel<'white' | 'transparent'>('background', {
  default: 'white',
})
</script>

<template>
  <section class="sticker-character-panel">
    <h3 class="panel-title">角色配置</h3>

    <UFormField label="角色描述" required>
      <UTextarea
        v-model="character"
        :rows="3"
        autoresize
        placeholder="例如：一只橙色的小猫，戴着红色围巾，圆圆胖胖"
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

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
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
</style>
