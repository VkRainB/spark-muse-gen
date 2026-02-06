import type { ImageGenerationOptions, GenerationResult, GeneratedImage } from '../../types/image'
import { useProviderStore } from '../../stores/provider'

interface ResolutionConfig {
  size: number
  estimatedTime: number // 秒
}

const RESOLUTION_MAP: Record<string, ResolutionConfig> = {
  '1K': { size: 1024, estimatedTime: 15 },
  '2K': { size: 2048, estimatedTime: 30 },
  '4K': { size: 4096, estimatedTime: 60 }
}

export function useImageGeneration() {
  const providerStore = useProviderStore()
  const toast = useAppToast()

  const isGenerating = ref(false)
  const progress = ref(0)
  const currentTask = ref<string | null>(null)
  const error = ref<string | null>(null)
  const abortController = ref<AbortController | null>(null)

  // 模拟进度 - 使用缓动函数
  const simulateProgress = (estimatedTime: number) => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      if (!isGenerating.value) {
        clearInterval(interval)
        return
      }

      const elapsed = (Date.now() - startTime) / 1000
      const ratio = Math.min(elapsed / estimatedTime, 0.95)
      // 缓动函数: easeOutQuart
      progress.value = Math.round((1 - Math.pow(1 - ratio, 4)) * 100)
    }, 100)

    return () => clearInterval(interval)
  }

  // 构建 Gemini 请求体
  const buildGeminiRequest = (options: ImageGenerationOptions, referenceBase64?: string) => {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: options.prompt }]

    if (referenceBase64) {
      parts.unshift({
        inlineData: {
          mimeType: 'image/png',
          data: referenceBase64.replace(/^data:image\/\w+;base64,/, '')
        }
      })
    }

    return {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        responseMimeType: 'text/plain'
      }
    }
  }

  // 构建 OpenAI 请求体
  const buildOpenAIRequest = (options: ImageGenerationOptions) => {
    const size = RESOLUTION_MAP[options.resolution]?.size || 1024
    return {
      model: 'dall-e-3',
      prompt: options.prompt,
      n: options.batchSize || 1,
      size: `${size}x${size}`,
      response_format: 'b64_json'
    }
  }

  // 解析 Gemini 响应
  const parseGeminiResponse = (data: {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: {
            data: string
            mimeType?: string
          }
        }>
      }
    }>
  }): GeneratedImage[] => {
    const images: GeneratedImage[] = []
    const candidates = data.candidates || []

    for (const candidate of candidates) {
      const parts = candidate.content?.parts || []
      for (const part of parts) {
        if (part.inlineData) {
          images.push({
            id: crypto.randomUUID(),
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
            createdAt: Date.now()
          })
        }
      }
    }

    return images
  }

  // 解析 OpenAI 响应
  const parseOpenAIResponse = (data: {
    data?: Array<{
      b64_json?: string
    }>
  }): GeneratedImage[] => {
    const images: GeneratedImage[] = []
    const items = data.data || []

    for (const item of items) {
      if (item.b64_json) {
        images.push({
          id: crypto.randomUUID(),
          data: item.b64_json,
          mimeType: 'image/png',
          createdAt: Date.now()
        })
      }
    }

    return images
  }

  // 生成图像
  const generateImage = async (options: ImageGenerationOptions): Promise<GenerationResult> => {
    const provider = providerStore.getRandomProvider()
    if (!provider) {
      toast.error('没有可用的渠道', '请先添加 API 渠道')
      return { success: false, images: [] }
    }

    isGenerating.value = true
    progress.value = 0
    currentTask.value = '正在生成图像...'
    error.value = null
    abortController.value = new AbortController()

    const config = RESOLUTION_MAP[options.resolution] ?? RESOLUTION_MAP['1K']!
    const stopProgress = simulateProgress(config.estimatedTime)

    try {
      let url: string
      let body: ReturnType<typeof buildGeminiRequest> | ReturnType<typeof buildOpenAIRequest>
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (provider.type === 'gemini') {
        url = `${provider.baseUrl}/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`
        body = buildGeminiRequest(options, options.referenceImage)
      } else {
        url = `${provider.baseUrl}/images/generations`
        headers['Authorization'] = `Bearer ${provider.apiKey}`
        body = buildOpenAIRequest(options)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: abortController.value.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(errorData.error?.message || `请求失败: ${response.status}`)
      }

      const data = await response.json()
      const images = provider.type === 'gemini'
        ? parseGeminiResponse(data)
        : parseOpenAIResponse(data)

      if (images.length === 0) {
        throw new Error('未能生成图像')
      }

      progress.value = 100
      toast.success('生成完成', `成功生成 ${images.length} 张图像`)

      return {
        success: true,
        images
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        toast.info('已取消生成')
        return { success: false, images: [] }
      }

      const errorMessage = err instanceof Error ? err.message : '未知错误'
      error.value = errorMessage
      toast.error('生成失败', errorMessage)
      return { success: false, images: [] }
    } finally {
      stopProgress()
      isGenerating.value = false
      currentTask.value = null
      abortController.value = null
    }
  }

  // 取消生成
  const cancelGeneration = () => {
    if (abortController.value) {
      abortController.value.abort()
    }
  }

  return {
    isGenerating: readonly(isGenerating),
    progress: readonly(progress),
    currentTask: readonly(currentTask),
    error: readonly(error),
    generateImage,
    cancelGeneration
  }
}
