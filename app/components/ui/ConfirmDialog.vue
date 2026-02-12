<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  confirmColor?: 'error' | 'primary' | 'warning'
}>(), {
  title: '确认操作',
  description: '此操作不可撤销，确定继续吗？',
  confirmText: '确认',
  cancelText: '取消',
  confirmColor: 'error'
})

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [] }>()

const handleConfirm = () => {
  emit('confirm')
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :close="false"
    :transition="false"
    :ui="{
      content: 'sm:max-w-[340px]',
      footer: 'justify-end',
      body: 'p-0'
    }"
  >
    <template #footer="{ close }">
      <UButton
        :label="cancelText"
        color="neutral"
        variant="outline"
        @click="close"
      />
      <UButton
        :label="confirmText"
        :color="confirmColor"
        @click="handleConfirm"
      />
    </template>
  </UModal>
</template>
