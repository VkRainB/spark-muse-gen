import { useProviderStore } from '../../stores/provider'
import type { Provider, ProviderFormData } from '../../types/provider'

export function useProvider() {
  const store = useProviderStore()
  const toast = useAppToast()

  const addProvider = (data: ProviderFormData) => {
    store.addProvider(data)
    toast.success('渠道已添加', data.name)
  }

  const removeProvider = (id: string) => {
    const provider = store.providers.find((p: Provider) => p.id === id)
    store.removeProvider(id)
    if (provider) {
      toast.info('渠道已删除', provider.name)
    }
  }

  const testProvider = async (id: string) => {
    const provider = store.providers.find((p: Provider) => p.id === id)
    if (!provider) return false

    toast.info('测试中...', provider.name)
    const success = await store.testProvider(id)

    if (success) {
      toast.success('连接成功', provider.name)
    } else {
      toast.error('连接失败', provider.name)
    }

    return success
  }

  return {
    providers: computed(() => store.providers),
    enabledProviders: computed(() => store.enabledProviders),
    hasProviders: computed(() => store.hasProviders),
    addProvider,
    updateProvider: store.updateProvider,
    removeProvider,
    toggleProvider: store.toggleProvider,
    getRandomProvider: store.getRandomProvider,
    testProvider
  }
}
