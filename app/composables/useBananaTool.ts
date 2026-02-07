interface BananaPrompt {
  id: string
  title: string
  prompt: string
  category: string
  preview?: string
}

const SOURCES = [
  'https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/prompts.json',
  'https://fastly.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/prompts.json',
  'https://raw.githubusercontent.com/glidea/banana-prompt-quicker/main/prompts.json'
]

const CACHE_KEY = 'banana_prompts_cache'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

export function useBananaTool() {
  const prompts = ref<BananaPrompt[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const toast = useAppToast()

  // Load from cache
  const loadFromCache = (): BananaPrompt[] | null => {
    if (!import.meta.client) return null

    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    try {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        return data
      }
    } catch {
      localStorage.removeItem(CACHE_KEY)
    }
    return null
  }

  // Save to cache
  const saveToCache = (data: BananaPrompt[]) => {
    if (!import.meta.client) return

    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  }

  // Default prompts
  const getDefaultPrompts = (): BananaPrompt[] => [
    { id: '1', title: '赛博朋克城市', prompt: 'A futuristic cyberpunk city at night with neon lights, flying cars, and towering skyscrapers', category: '风景' },
    { id: '2', title: '水彩花园', prompt: 'A beautiful watercolor painting of a flower garden with roses, tulips, and butterflies', category: '艺术' },
    { id: '3', title: '可爱猫咪', prompt: 'An adorable fluffy cat sitting on a windowsill, soft lighting, photorealistic', category: '动物' },
    { id: '4', title: '抽象几何', prompt: 'Abstract geometric shapes in vibrant colors, modern art style, minimalist', category: '抽象' },
    { id: '5', title: '日式庭院', prompt: 'A serene Japanese zen garden with cherry blossoms, koi pond, and stone lanterns', category: '风景' },
  ]

  // Multi-source loading
  const loadPrompts = async () => {
    // Try cache first
    const cached = loadFromCache()
    if (cached) {
      prompts.value = cached
      return
    }

    isLoading.value = true
    error.value = null

    for (const source of SOURCES) {
      try {
        const response = await fetch(source)
        if (response.ok) {
          const data = await response.json()
          prompts.value = Array.isArray(data) ? data : data.prompts || []
          saveToCache(prompts.value)
          isLoading.value = false
          return
        }
      } catch (err) {
        console.warn(`Failed to load from ${source}:`, err)
      }
    }

    // If all sources fail, use default prompts
    prompts.value = getDefaultPrompts()
    error.value = '无法加载提示词库，使用默认列表'
    toast.warning('提示词加载失败', '使用默认提示词列表')

    isLoading.value = false
  }

  // Search
  const searchPrompts = (query: string): BananaPrompt[] => {
    if (!query.trim()) return prompts.value

    const lowerQuery = query.toLowerCase()
    return prompts.value.filter(p =>
      p.title.toLowerCase().includes(lowerQuery) ||
      p.prompt.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery)
    )
  }

  // Filter by category
  const filterByCategory = (category: string): BananaPrompt[] => {
    if (!category || category === 'all') return prompts.value
    return prompts.value.filter(p => p.category === category)
  }

  // Get all categories
  const categories = computed(() => {
    const cats = new Set(prompts.value.map(p => p.category))
    return ['all', ...Array.from(cats)]
  })

  // Refresh
  const refresh = async () => {
    if (import.meta.client) {
      localStorage.removeItem(CACHE_KEY)
    }
    await loadPrompts()
    toast.success('提示词库已刷新')
  }

  return {
    prompts: readonly(prompts),
    isLoading: readonly(isLoading),
    error: readonly(error),
    categories,
    loadPrompts,
    searchPrompts,
    filterByCategory,
    refresh
  }
}
