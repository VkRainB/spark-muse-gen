<script setup lang="ts">
import type { ProviderFormData } from '../../../types/provider'

const { providers, addProvider, removeProvider, toggleProvider, testProvider } = useProvider()

const showAddModal = ref(false)
const testingId = ref<string | null>(null)

const formData = ref<ProviderFormData>({
  name: '',
  type: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com',
  apiKey: '',
  model: 'gemini-2.0-flash-exp-image-generation'
})

const typeOptions = [
  { label: 'Gemini', value: 'gemini' },
  { label: 'OpenAI Compatible', value: 'openai' }
]

const resetForm = () => {
  formData.value = {
    name: '',
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKey: '',
    model: 'gemini-2.0-flash-exp-image-generation'
  }
}

const handleAdd = () => {
  if (!formData.value.name || !formData.value.apiKey) return
  addProvider(formData.value)
  showAddModal.value = false
  resetForm()
}

const handleTest = async (id: string) => {
  testingId.value = id
  await testProvider(id)
  testingId.value = null
}

watch(() => formData.value.type, (type) => {
  if (type === 'gemini') {
    formData.value.baseUrl = 'https://generativelanguage.googleapis.com'
    formData.value.model = 'gemini-2.0-flash-exp-image-generation'
  } else {
    formData.value.baseUrl = ''
    formData.value.model = 'dall-e-3'
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-semibold">API 渠道</h3>
      <UButton icon="i-heroicons-plus" size="sm" @click="showAddModal = true">
        添加渠道
      </UButton>
    </div>

    <!-- 渠道列表 -->
    <div v-if="providers.length > 0" class="space-y-2">
      <div
        v-for="provider in providers"
        :key="provider.id"
        class="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700"
      >
        <div class="flex items-center gap-4">
          <USwitch :model-value="provider.enabled" @update:model-value="toggleProvider(provider.id)" />
          <div>
            <p class="font-medium">{{ provider.name }}</p>
            <p class="text-sm text-gray-500">{{ provider.type }} · {{ provider.model }}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <UButton
            icon="i-heroicons-signal"
            size="xs"
            color="neutral"
            variant="ghost"
            :loading="testingId === provider.id"
            @click="handleTest(provider.id)"
          />
          <UButton
            icon="i-heroicons-trash"
            size="xs"
            color="error"
            variant="ghost"
            @click="removeProvider(provider.id)"
          />
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500">
      <UIcon name="i-heroicons-server-stack" class="w-12 h-12 mx-auto mb-2 opacity-50" />
      <p>暂无渠道配置</p>
    </div>

    <!-- 添加渠道弹窗 -->
    <UModal v-model:open="showAddModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">添加 API 渠道</h3>

          <UFormField label="渠道名称" required>
            <UInput v-model="formData.name" placeholder="我的 Gemini" />
          </UFormField>

          <UFormField label="类型" required>
            <USelectMenu v-model="formData.type" :items="typeOptions" value-key="value" />
          </UFormField>

          <UFormField label="Base URL" required>
            <UInput v-model="formData.baseUrl" placeholder="https://..." />
          </UFormField>

          <UFormField label="API Key" required>
            <UInput v-model="formData.apiKey" type="password" placeholder="sk-..." />
          </UFormField>

          <UFormField label="模型" required>
            <UInput v-model="formData.model" placeholder="gemini-2.0-flash-exp" />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton color="neutral" variant="ghost" @click="showAddModal = false">取消</UButton>
            <UButton @click="handleAdd" :disabled="!formData.name || !formData.apiKey">添加</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
