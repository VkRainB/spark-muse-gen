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
const showApiKey = ref(false)
const submitAttempted = ref(false)

const isEditing = computed(() => editingProviderId.value !== null)

const typeOptions = [
  { label: 'Gemini', value: 'gemini' },
  { label: 'OpenAI', value: 'openai' }
]

const geminiSuggestedModels = [
  'gemini-3-pro-image-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash'
]

const openAISuggestedModels = [
  'gpt-4.1',
  'gpt-4o',
  'o4-mini',
  'gpt-4.1-mini'
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
  type: 'openai',
  baseUrl: getTypeDefaults('openai').baseUrl,
  apiKey: '',
  model: getTypeDefaults('openai').model
})

const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, '')

const resolveOpenAIChatPreviewUrl = (baseUrl: string) => {
  const normalized = normalizeBaseUrl(baseUrl)
  if (!normalized) return '/v1/chat/completions'
  if (/\/chat\/completions$/i.test(normalized)) return normalized
  if (/\/v\d+$/i.test(normalized)) return `${normalized}/chat/completions`
  return `${normalized}/v1/chat/completions`
}

const normalizeFormData = (data: ProviderFormData): ProviderFormData => ({
  name: data.name.trim(),
  type: data.type,
  baseUrl: data.baseUrl.trim(),
  apiKey: data.apiKey.trim(),
  model: data.model.trim()
})

const isValidHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const normalizedFormData = computed(() => normalizeFormData(formData.value))

const fieldErrors = computed(() => {
  const data = normalizedFormData.value

  return {
    name: data.name ? '' : '请输入渠道名称',
    baseUrl: !data.baseUrl
      ? '请输入 Base URL'
      : (isValidHttpUrl(data.baseUrl) ? '' : 'Base URL 格式不正确，请以 http(s):// 开头'),
    apiKey: data.apiKey ? '' : '请输入 API Key',
    model: data.model ? '' : '请输入或选择模型'
  }
})

const canSubmit = computed(() => Object.values(fieldErrors.value).every((message) => !message))

const modalDescription = computed(() => {
  return isEditing.value
    ? '更新渠道配置后会立即生效'
    : '创建一个新的 API 渠道用于图像生成'
})

const namePlaceholder = computed(() => {
  return formData.value.type === 'gemini' ? '例如：Gemini 主通道' : '例如：OpenAI 代理通道'
})

const previewRequestUrl = computed(() => {
  const data = normalizedFormData.value
  if (!data.baseUrl) return ''

  if (data.type === 'gemini') {
    const model = data.model || '{model}'
    return `${normalizeBaseUrl(data.baseUrl)}/v1beta/models/${model}:generateContent`
  }

  return resolveOpenAIChatPreviewUrl(data.baseUrl)
})

const clickableModelOptions = computed(() => {
  if (formData.value.type === 'openai' && modelOptions.value.length > 0) {
    return modelOptions.value
  }

  return formData.value.type === 'gemini' ? geminiSuggestedModels : openAISuggestedModels
})

const modelAutocompleteValue = computed({
  get: () => formData.value.model,
  set: (value: string | number | boolean | null | undefined) => {
    formData.value.model = value == null ? '' : String(value)
  }
})

const resetForm = (type: ProviderFormData['type'] = 'openai') => {
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
  showApiKey.value = false
  submitAttempted.value = false
  resetForm('openai')
  showModal.value = true
}

const openEditModal = (provider: Provider) => {
  editingProviderId.value = provider.id
  modelOptions.value = []
  modelFetchError.value = null
  showApiKey.value = false
  submitAttempted.value = false
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
  submitAttempted.value = true

  if (!canSubmit.value) {
    const firstError = Object.values(fieldErrors.value).find(Boolean)
    toast.warning('请先完善表单', firstError)
    return
  }

  const payload = normalizedFormData.value

  if (isEditing.value && editingProviderId.value) {
    updateProvider(editingProviderId.value, payload)
    toast.success('渠道已更新', payload.name)
  } else {
    addProvider(payload)
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

const toggleApiKeyVisible = () => {
  showApiKey.value = !showApiKey.value
}

const resetBaseUrlByType = () => {
  formData.value.baseUrl = getTypeDefaults(formData.value.type).baseUrl
  modelFetchError.value = null
}

const handleModelCreate = (model: string) => {
  formData.value.model = model.trim()
}

const loadModels = async (silent = false) => {
  if (formData.value.type !== 'openai') return

  const baseUrl = normalizedFormData.value.baseUrl
  const apiKey = normalizedFormData.value.apiKey

  if (!baseUrl || !apiKey) {
    if (!silent) {
      toast.info('请先填写 Base URL 和 API Key')
    }
    return
  }

  loadingModels.value = true
  modelFetchError.value = null

  try {
    const models = await fetchOpenAIModels(baseUrl, apiKey)
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
  showApiKey.value = false
  submitAttempted.value = false
  resetForm('openai')
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
        <div class="p-6 space-y-5 w-full max-w-2xl">
          <div>
            <h3 class="text-lg font-semibold">{{ isEditing ? '编辑 API 渠道' : '创建 API 渠道' }}</h3>
            <p class="text-sm text-gray-500 mt-1">
              {{ modalDescription }}
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
              <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">基础信息</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UFormField label="渠道名称" required>
                  <div class="space-y-1.5">
                    <UInput v-model="formData.name" :placeholder="namePlaceholder" />
                    <p v-if="submitAttempted && fieldErrors.name" class="text-xs text-red-500">{{ fieldErrors.name }}</p>
                  </div>
                </UFormField>

                <UFormField label="类型" required>
                  <div class="space-y-1.5">
                    <USelectMenu
                      :model-value="formData.type"
                      :items="typeOptions"
                      value-key="value"
                      @update:model-value="handleTypeChange"
                    />
                    <p class="text-xs text-gray-500">
                      {{ formData.type === 'gemini' ? '使用 Gemini 官方协议' : '使用 OpenAI 协议' }}
                    </p>
                  </div>
                </UFormField>
              </div>
            </div>

            <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
              <div class="flex items-center justify-between gap-2">
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">连接配置</h4>
                <UButton
                  type="button"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-arrow-path"
                  @click="resetBaseUrlByType"
                >
                  恢复默认地址
                </UButton>
              </div>

              <UFormField label="Base URL" required>
                <div class="space-y-1.5">
                  <UInput v-model="formData.baseUrl" placeholder="https://api.openai.com/v1 或 https://host/v1/chat/completions" class="w-full" />
                  <p v-if="submitAttempted && fieldErrors.baseUrl" class="text-xs text-red-500">{{ fieldErrors.baseUrl }}</p>
                </div>
              </UFormField>

              <UFormField label="API Key" required>
                <div class="space-y-1.5">
                  <div class="relative">
                    <UInput
                      v-model="formData.apiKey"
                      :type="showApiKey ? 'text' : 'password'"
                      placeholder="sk-..."
                      class="w-full pr-20"
                    />
                    <UButton
                      type="button"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :icon="showApiKey ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                      class="absolute right-1 top-1/2 -translate-y-1/2 min-w-12 justify-center"
                      @click="toggleApiKeyVisible"
                    >
                      {{ showApiKey ? '隐藏' : '显示' }}
                    </UButton>
                  </div>
                  <p v-if="submitAttempted && fieldErrors.apiKey" class="text-xs text-red-500">{{ fieldErrors.apiKey }}</p>
                </div>
              </UFormField>

              <p v-if="previewRequestUrl" class="text-xs text-gray-500 break-all">
                请求地址预览：{{ previewRequestUrl }}
              </p>
            </div>

            <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
              <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">模型配置</h4>
              <UFormField label="模型" required>
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <UInputMenu
                      v-model="modelAutocompleteValue"
                      :items="clickableModelOptions"
                      create-item="always"
                      placeholder="输入模型名称，支持自动补全"
                      class="flex-1"
                      @create="handleModelCreate"
                    />
                    <UButton
                      v-if="formData.type === 'openai'"
                      type="button"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      :loading="loadingModels"
                      @click="loadModels()"
                    >
                      拉取模型
                    </UButton>
                  </div>
                  <p v-if="submitAttempted && fieldErrors.model" class="text-xs text-red-500">{{ fieldErrors.model }}</p>
                  <p v-if="formData.type === 'openai' && modelFetchError" class="text-xs text-red-500">
                    {{ modelFetchError }}
                  </p>
                  <p v-else-if="formData.type === 'openai' && modelOptions.length > 0" class="text-xs text-gray-500">
                    已获取 {{ modelOptions.length }} 个模型，可输入关键字自动补全
                  </p>
                  <p v-else class="text-xs text-gray-500">
                    支持自由输入；输入时会基于内置模型列表自动补全
                  </p>
                </div>
              </UFormField>
            </div>

            <div class="flex justify-end gap-2 pt-1">
              <UButton type="button" color="neutral" variant="ghost" @click="closeModal">取消</UButton>
              <UButton type="submit">
                {{ isEditing ? '保存修改' : '创建渠道' }}
              </UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>
