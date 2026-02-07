<script setup lang="ts">
import type { Provider, ProviderFormData } from '../../../types/provider'

const toast = useAppToast()
const {
  providers,
  addProvider,
  updateProvider,
  removeProvider,
  toggleProvider,
  testProvider,
  fetchOpenAIModels
} = useProvider()

const showModal = ref(false)
const editingProviderId = ref<string | null>(null)
const testingId = ref<string | null>(null)
const loadingModels = ref(false)
const modelOptions = ref<string[]>([])
const modelFetchError = ref<string | null>(null)

const isEditing = computed(() => editingProviderId.value !== null)

const typeOptions = [
  { label: 'Gemini', value: 'gemini' },
  { label: 'OpenAI Compatible', value: 'openai' }
]

const getTypeDefaults = (type: ProviderFormData['type']) => {
  if (type === 'gemini') {
    return {
      baseUrl: 'https://generativelanguage.googleapis.com',
      model: 'gemini-3-pro-image-preview'
    }
  }

  return {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gemini-3-pro-image-preview'
  }
}

const formData = ref<ProviderFormData>({
  name: '',
  type: 'gemini',
  baseUrl: getTypeDefaults('gemini').baseUrl,
  apiKey: '',
  model: getTypeDefaults('gemini').model
})

const resetForm = (type: ProviderFormData['type'] = 'gemini') => {
  const defaults = getTypeDefaults(type)
  formData.value = {
    name: '',
    type,
    baseUrl: defaults.baseUrl,
    apiKey: '',
    model: defaults.model
  }
}

const closeModal = () => {
  showModal.value = false
}

const openAddModal = () => {
  editingProviderId.value = null
  modelOptions.value = []
  modelFetchError.value = null
  resetForm('gemini')
  showModal.value = true
}

const openEditModal = (provider: Provider) => {
  editingProviderId.value = provider.id
  modelOptions.value = []
  modelFetchError.value = null
  formData.value = {
    name: provider.name,
    type: provider.type,
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    model: provider.model
  }
  showModal.value = true

  if (provider.type === 'openai' && provider.baseUrl && provider.apiKey) {
    void loadModels(true)
  }
}

const handleSubmit = () => {
  if (!formData.value.name || !formData.value.apiKey || !formData.value.model) return

  if (isEditing.value && editingProviderId.value) {
    updateProvider(editingProviderId.value, formData.value)
    toast.success('渠道已更新', formData.value.name)
  } else {
    addProvider(formData.value)
  }

  closeModal()
}

const handleTest = async (id: string) => {
  testingId.value = id
  await testProvider(id)
  testingId.value = null
}

const handleTypeChange = (value: string | number | Record<string, unknown> | unknown[] | undefined) => {
  if (value !== 'gemini' && value !== 'openai') return

  const defaults = getTypeDefaults(value)
  formData.value.type = value
  formData.value.baseUrl = defaults.baseUrl
  formData.value.model = defaults.model
  modelOptions.value = []
  modelFetchError.value = null
}

const handleModelChange = (value: string | number | Record<string, unknown> | unknown[] | undefined) => {
  if (typeof value === 'string') {
    formData.value.model = value
  }
}

const loadModels = async (silent = false) => {
  if (formData.value.type !== 'openai') return
  if (!formData.value.baseUrl.trim() || !formData.value.apiKey.trim()) {
    if (!silent) {
      toast.info('请先填写 Base URL 和 API Key')
    }
    return
  }

  loadingModels.value = true
  modelFetchError.value = null

  try {
    const models = await fetchOpenAIModels(formData.value.baseUrl, formData.value.apiKey)
    modelOptions.value = models

    if (models.length === 0) {
      modelFetchError.value = '模型列表为空'
      if (!silent) {
        toast.warning('未获取到模型', '请检查渠道是否返回 /v1/models')
      }
      return
    }

    if (!models.includes(formData.value.model)) {
      formData.value.model = models[0] || ''
    }

    if (!silent) {
      toast.success('模型拉取成功', `共 ${models.length} 个`)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '拉取模型失败'
    modelFetchError.value = message
    if (!silent) {
      toast.error('拉取模型失败', message)
    }
  } finally {
    loadingModels.value = false
  }
}

watch(showModal, (open) => {
  if (open) return
  editingProviderId.value = null
  loadingModels.value = false
  modelOptions.value = []
  modelFetchError.value = null
  resetForm('gemini')
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-semibold">API 渠道</h3>
      <UButton icon="i-heroicons-plus" size="sm" @click="openAddModal">
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
            icon="i-heroicons-pencil-square"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="openEditModal(provider)"
          />
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

    <!-- 新增/编辑渠道弹窗 -->
    <UModal v-model:open="showModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ isEditing ? '编辑 API 渠道' : '添加 API 渠道' }}</h3>

          <UFormField label="渠道名称" required>
            <UInput v-model="formData.name" placeholder="我的 Gemini" />
          </UFormField>

          <UFormField label="类型" required>
            <USelectMenu
              :model-value="formData.type"
              :items="typeOptions"
              value-key="value"
              @update:model-value="handleTypeChange"
            />
          </UFormField>

          <UFormField label="Base URL" required>
            <UInput v-model="formData.baseUrl" placeholder="https://api.openai.com/v1 或 https://host/v1/chat/completions" />
          </UFormField>

          <UFormField label="API Key" required>
            <UInput v-model="formData.apiKey" type="password" placeholder="sk-..." />
          </UFormField>

          <UFormField label="模型" required>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <div class="flex-1">
                  <USelectMenu
                    v-if="formData.type === 'openai' && modelOptions.length > 0"
                    :model-value="formData.model"
                    :items="modelOptions"
                    searchable
                    @update:model-value="handleModelChange"
                  />
                  <UInput v-else v-model="formData.model" placeholder="gemini-3-pro-image-preview" />
                </div>
                <UButton
                  v-if="formData.type === 'openai'"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  :loading="loadingModels"
                  @click="loadModels()"
                >
                  拉取模型
                </UButton>
              </div>
              <p v-if="formData.type === 'openai' && modelFetchError" class="text-xs text-red-500">
                {{ modelFetchError }}
              </p>
              <p v-else-if="formData.type === 'openai' && modelOptions.length > 0" class="text-xs text-gray-500">
                已获取 {{ modelOptions.length }} 个模型，可下拉选择
              </p>
            </div>
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton color="neutral" variant="ghost" @click="closeModal">取消</UButton>
            <UButton @click="handleSubmit" :disabled="!formData.name || !formData.apiKey || !formData.model">
              {{ isEditing ? '保存' : '添加' }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
