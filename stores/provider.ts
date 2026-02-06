import { defineStore } from 'pinia'
import type { Provider, ProviderFormData } from '../types/provider'

export const useProviderStore = defineStore('provider', {
  state: () => ({
    providers: [] as Provider[]
  }),

  getters: {
    enabledProviders: (state): Provider[] => state.providers.filter((p: Provider) => p.enabled),
    hasProviders: (state): boolean => state.providers.length > 0
  },

  actions: {
    addProvider(data: ProviderFormData) {
      const provider: Provider = {
        id: crypto.randomUUID(),
        ...data,
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
      }
    },

    toggleProvider(id: string) {
      const provider = this.providers.find((p: Provider) => p.id === id)
      if (provider) {
        provider.enabled = !provider.enabled
      }
    },

    getRandomProvider(): Provider | null {
      const enabled = this.enabledProviders
      if (enabled.length === 0) return null
      return enabled[Math.floor(Math.random() * enabled.length)] ?? null
    },

    async testProvider(id: string): Promise<boolean> {
      const provider = this.providers.find((p: Provider) => p.id === id)
      if (!provider) return false

      try {
        const url = provider.type === 'gemini'
          ? `${provider.baseUrl}/v1beta/models?key=${provider.apiKey}`
          : `${provider.baseUrl}/models`

        const headers: Record<string, string> = {}
        if (provider.type === 'openai') {
          headers['Authorization'] = `Bearer ${provider.apiKey}`
        }

        const response = await fetch(url, { headers })
        return response.ok
      } catch {
        return false
      }
    }
  },

  persist: {
    key: 'api_providers'
  }
})
