import { defineStore } from 'pinia'
import type { Provider, ProviderFormData } from '../types/provider'

const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, '')

const resolveOpenAIModelsUrl = (baseUrl: string) => {
  const normalized = normalizeBaseUrl(baseUrl)
  if (!normalized) return '/v1/models'
  if (/\/chat\/completions$/i.test(normalized)) {
    return normalized.replace(/\/chat\/completions$/i, '/models')
  }
  if (/\/models$/i.test(normalized)) return normalized
  if (/\/v\d+$/i.test(normalized)) return `${normalized}/models`
  return `${normalized}/v1/models`
}

const resolveOpenAIChatCompletionsUrl = (baseUrl: string) => {
  const normalized = normalizeBaseUrl(baseUrl)
  if (!normalized) return '/v1/chat/completions'
  if (/\/chat\/completions$/i.test(normalized)) return normalized
  if (/\/v\d+$/i.test(normalized)) return `${normalized}/chat/completions`
  return `${normalized}/v1/chat/completions`
}

interface OpenAIModelsResponse {
  data?: Array<{
    id?: string
  }>
  error?: {
    message?: string
  }
  message?: string
}

export const useProviderStore = defineStore('provider', {
  state: () => ({
    providers: [] as Provider[],
    activeProviderId: 'random' as string
  }),

  getters: {
    enabledProviders: (state): Provider[] => state.providers.filter((p: Provider) => p.enabled),
    hasProviders: (state): boolean => state.providers.length > 0,
    activeProvider: (state): Provider | null => {
      if (state.activeProviderId === 'random') return null
      return state.providers.find((p: Provider) => p.id === state.activeProviderId && p.enabled) ?? null
    },
    activeDisplayName: (state): string => {
      if (state.activeProviderId === 'random') return '随机优选'
      const provider = state.providers.find((p: Provider) => p.id === state.activeProviderId && p.enabled)
      return provider ? provider.name : '随机优选'
    }
  },

  actions: {
    addProvider(data: ProviderFormData) {
      const provider: Provider = {
        id: crypto.randomUUID(),
        ...data,
        weight: data.weight ?? 0,
        enabled: true,
        createdAt: Date.now()
      }
      this.providers.push(provider)
    },

    updateProvider(id: string, data: Partial<ProviderFormData>) {
      const index = this.providers.findIndex((p: Provider) => p.id === id)
      if (index !== -1) {
        const existing = this.providers[index]
        if (existing) {
          this.providers[index] = {
            id: existing.id,
            name: data.name ?? existing.name,
            type: data.type ?? existing.type,
            baseUrl: data.baseUrl ?? existing.baseUrl,
            apiKey: data.apiKey ?? existing.apiKey,
            model: data.model ?? existing.model,
            weight: data.weight ?? existing.weight ?? 0,
            enabled: existing.enabled,
            createdAt: existing.createdAt
          }
        }
      }
    },

    removeProvider(id: string) {
      const index = this.providers.findIndex((p: Provider) => p.id === id)
      if (index !== -1) {
        this.providers.splice(index, 1)
        if (this.activeProviderId === id) {
          this.activeProviderId = 'random'
        }
      }
    },

    toggleProvider(id: string) {
      const provider = this.providers.find((p: Provider) => p.id === id)
      if (provider) {
        provider.enabled = !provider.enabled
        if (!provider.enabled && this.activeProviderId === id) {
          this.activeProviderId = 'random'
        }
      }
    },

    getRandomProvider(): Provider | null {
      // If a specific provider is selected and enabled, use it
      if (this.activeProviderId !== 'random') {
        const active = this.providers.find((p: Provider) => p.id === this.activeProviderId && p.enabled)
        if (active) return active
      }
      // Otherwise, use weight-based random selection
      const enabled = this.enabledProviders
      if (enabled.length === 0) return null
      const minWeight = Math.min(...enabled.map((p: Provider) => p.weight ?? 0))
      const topPriority = enabled.filter((p: Provider) => (p.weight ?? 0) === minWeight)
      return topPriority[Math.floor(Math.random() * topPriority.length)] ?? null
    },

    setActiveProvider(id: string) {
      this.activeProviderId = id
    },

    async testProvider(id: string): Promise<boolean> {
      const provider = this.providers.find((p: Provider) => p.id === id)
      if (!provider) return false

      try {
        const headers: Record<string, string> = {}
        if (provider.type === 'openai') {
          headers['Authorization'] = `Bearer ${provider.apiKey}`
        }

        if (provider.type === 'gemini') {
          const url = `${provider.baseUrl}/v1beta/models?key=${provider.apiKey}`
          const response = await fetch(url, { headers })
          return response.ok
        }

        const modelsResponse = await fetch(resolveOpenAIModelsUrl(provider.baseUrl), { headers })
        if (modelsResponse.ok) {
          return true
        }

        // 部分 OpenAI 兼容服务不提供 /models，回退到 chat/completions 连通性测试
        const completionResponse = await fetch(resolveOpenAIChatCompletionsUrl(provider.baseUrl), {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [{ role: 'user', content: '连接测试' }],
            max_tokens: 1,
            stream: false
          })
        })

        return completionResponse.ok
      } catch {
        return false
      }
    },

    async fetchOpenAIModels(baseUrl: string, apiKey: string): Promise<string[]> {
      const headers: Record<string, string> = {}
      if (apiKey.trim()) {
        headers.Authorization = `Bearer ${apiKey.trim()}`
      }

      const response = await fetch(resolveOpenAIModelsUrl(baseUrl), { headers })
      const text = await response.text().catch(() => '')

      let payload: OpenAIModelsResponse = {}
      try {
        payload = JSON.parse(text) as OpenAIModelsResponse
      } catch {
        payload = {}
      }

      if (!response.ok) {
        throw new Error(payload.error?.message || payload.message || text || `请求失败: ${response.status}`)
      }

      const modelIds = (payload.data || [])
        .map((item) => item.id?.trim() || '')
        .filter((id): id is string => Boolean(id))

      return [...new Set(modelIds)]
    }
  },

  persist: {
    key: 'api_providers'
  }
})
