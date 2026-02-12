import type { ImageGenerationOptions, GenerationResult, GeneratedImage } from '../../types/image'
import type { Message } from '../../types/chat'
import { streamFetch, jsonFetch } from '../api/fetchClient'
import type { SSEMessageItem } from '../api/fetchClient'
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

interface OpenAIChatMessagePartText {
  type: 'text' | 'output_text'
  text: string
}

interface OpenAIChatMessagePartImage {
  type: 'image_url'
  image_url: {
    url: string
  }
}

type OpenAIChatMessagePart = OpenAIChatMessagePartText | OpenAIChatMessagePartImage
type OpenAIChatMessageContent = string | OpenAIChatMessagePart[]

interface OpenAIChatMessage {
  role: 'user' | 'assistant'
  content: OpenAIChatMessageContent
}

interface OpenAIChatRequest {
  model: string
  messages: OpenAIChatMessage[]
  temperature: number
  stream: boolean
  stream_options?: {
    include_usage: boolean
  }
  size?: string
  aspect_ratio?: string
}

interface OpenAIUsage {
  prompt_tokens?: number
  completion_tokens?: number
}

interface OpenAIChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: OpenAIChatMessageContent
      images?: OpenAIChatMessagePartImage[]
    }
  }>
  usage?: OpenAIUsage
}

interface ParsedOpenAIResult {
  images: GeneratedImage[]
  text?: string
  usage?: GenerationResult['usage']
}

const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, '')

const resolveOpenAIChatCompletionsUrl = (baseUrl: string) => {
  const normalized = normalizeBaseUrl(baseUrl)
  if (!normalized) return '/v1/chat/completions'
  if (/\/chat\/completions$/i.test(normalized)) return normalized
  if (/\/v\d+$/i.test(normalized)) return `${normalized}/chat/completions`
  return `${normalized}/v1/chat/completions`
}

const imageToDataUrl = (image: { data: string; mimeType: string }) => {
  if (image.data.startsWith('data:') || image.data.startsWith('http')) {
    return image.data
  }
  return `data:${image.mimeType || 'image/png'};base64,${image.data}`
}

const buildOpenAIContextMessages = (options: ImageGenerationOptions): OpenAIChatMessage[] => {
  const contextMessages = options.contextMessages || []

  const mapped = contextMessages
    .map((message: Message): OpenAIChatMessage | null => {
      const text = message.content?.trim() || ''
      const images = message.images || []
      const hasImages = images.length > 0

      if (hasImages && message.role === 'user') {
        const parts: OpenAIChatMessagePart[] = []
        if (text) {
          parts.push({ type: 'text', text })
        }

        for (const image of images) {
          parts.push({
            type: 'image_url',
            image_url: {
              url: imageToDataUrl(image)
            }
          })
        }

        if (parts.length === 0) return null

        return {
          role: 'user',
          content: parts.length === 1 && parts[0]?.type === 'text' ? parts[0].text : parts
        }
      }

      if (hasImages) {
        return {
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: text ? `${text}\n[Image]` : '[Image]'
        }
      }

      if (!text) return null

      return {
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: text
      }
    })
    .filter((message): message is OpenAIChatMessage => message !== null)

  if (mapped.length > 0) {
    return mapped
  }

  if (options.referenceImage) {
    return [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: options.prompt || 'Generate image'
          },
          {
            type: 'image_url',
            image_url: {
              url: options.referenceImage
            }
          }
        ]
      }
    ]
  }

  return [
    {
      role: 'user',
      content: options.prompt || 'Generate image'
    }
  ]
}

export function useImageGeneration() {
  const providerStore = useProviderStore()
  const toast = useAppToast()

  // 使用 useState 确保所有组件共享同一份状态（单例）
  const isGenerating = useState('img-gen-generating', () => false)
  const progress = useState('img-gen-progress', () => 0)
  const currentTask = useState<string | null>('img-gen-task', () => null)
  const error = useState<string | null>('img-gen-error', () => null)
  const abortController = useState<AbortController | null>('img-gen-abort', () => null)
  const streamingText = useState('img-gen-streaming', () => '')

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
  const buildOpenAIRequest = (model: string, options: ImageGenerationOptions): OpenAIChatRequest => {
    const size = RESOLUTION_MAP[options.resolution]?.size || 1024
    const request: OpenAIChatRequest = {
      model,
      messages: buildOpenAIContextMessages(options),
      temperature: 1,
      stream: Boolean(options.stream)
    }

    if (request.stream) {
      request.stream_options = {
        include_usage: true
      }
    }

    request.size = `${size}x${size}`

    if (options.aspectRatio && options.aspectRatio !== '1:1') {
      request.aspect_ratio = options.aspectRatio
    }

    return request
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

  const extractImagesFromMarkdown = (content: string) => {
    const imageUrls: string[] = []
    const regex = /!\[[^\]]*]\((data:image\/[^)]+|https?:\/\/[^)]+)\)/g
    const text = content.replace(regex, (_match, imageUrl: string) => {
      imageUrls.push(imageUrl)
      return ''
    })

    return {
      text: text.trim(),
      imageUrls
    }
  }

  const mapUsage = (usage?: OpenAIUsage): GenerationResult['usage'] | undefined => {
    if (!usage) return undefined

    return {
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0
    }
  }

  // 解析 OpenAI 响应
  const parseOpenAIResponse = (data: OpenAIChatCompletionResponse): ParsedOpenAIResult => {
    const images: GeneratedImage[] = []
    const imageSources = new Set<string>()
    const textParts: string[] = []
    const message = data.choices?.[0]?.message
    const content = message?.content
    const messageImages = message?.images || []

    if (typeof content === 'string') {
      const extracted = extractImagesFromMarkdown(content)
      if (extracted.text) {
        textParts.push(extracted.text)
      }
      extracted.imageUrls.forEach((url) => imageSources.add(url))
    } else if (Array.isArray(content)) {
      for (const part of content) {
        if (!part || typeof part !== 'object') continue

        if ((part.type === 'text' || part.type === 'output_text') && typeof part.text === 'string') {
          textParts.push(part.text)
          continue
        }

        if (part.type === 'image_url' && typeof part.image_url?.url === 'string') {
          imageSources.add(part.image_url.url)
        }
      }

      // 兜底：有些服务会把 markdown 图片放在 text 里
      if (textParts.length > 0 && imageSources.size === 0) {
        const mergedText = textParts.join('\n')
        const extracted = extractImagesFromMarkdown(mergedText)
        textParts.length = 0
        if (extracted.text) {
          textParts.push(extracted.text)
        }
        extracted.imageUrls.forEach((url) => imageSources.add(url))
      }
    }

    for (const imagePart of messageImages) {
      if (!imagePart || typeof imagePart !== 'object') continue
      if (imagePart.type === 'image_url' && typeof imagePart.image_url?.url === 'string') {
        imageSources.add(imagePart.image_url.url)
      }
    }

    for (const source of imageSources) {
      const raw = source.trim()
      if (!raw) continue

      const normalized = raw.startsWith('data:image/')
        ? raw.replace(/\s+/g, '')
        : raw

      let mimeType = 'image/png'
      const dataUrlMime = normalized.match(/^data:([^;]+);base64,/i)
      if (dataUrlMime?.[1]) {
        mimeType = dataUrlMime[1]
      }

      images.push({
        id: crypto.randomUUID(),
        data: normalized,
        mimeType,
        createdAt: Date.now()
      })
    }

    const mergedText = textParts.join('\n').trim()

    return {
      images,
      text: mergedText || undefined,
      usage: mapUsage(data.usage)
    }
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
    streamingText.value = ''

    const config = RESOLUTION_MAP[options.resolution] ?? RESOLUTION_MAP['1K']!
    const stopProgress = simulateProgress(config.estimatedTime)

    try {
      let images: GeneratedImage[] = []
      let text: string | undefined
      let usage: GenerationResult['usage'] | undefined

      if (provider.type === 'gemini') {
        // Gemini 原生接口 - 使用 jsonFetch
        const url = `${provider.baseUrl}/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`
        const body = buildGeminiRequest(options, options.referenceImage)

        const data = await jsonFetch<{
          candidates?: Array<{
            content?: {
              parts?: Array<{
                inlineData?: { data: string; mimeType?: string }
                text?: string
              }>
            }
          }>
        }>({
          url,
          data: body as Record<string, any>,
          abortCtrl: abortController.value,
          timeout: config.estimatedTime * 2 * 1000
        })

        images = parseGeminiResponse(data)
      } else if (options.stream) {
        // OpenAI 兼容接口 - 流式，使用 streamFetch
        const url = resolveOpenAIChatCompletionsUrl(provider.baseUrl)
        const openAIBody = buildOpenAIRequest(provider.model, options)

        const streamResult = await streamFetch({
          url,
          data: openAIBody as Record<string, any>,
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`
          },
          abortCtrl: abortController.value,
          timeout: config.estimatedTime * 2 * 1000,
          onMessage: (item: SSEMessageItem) => {
            // 实时更新流式文本（打字机效果）
            if (item.text) {
              streamingText.value += item.text
            }
          }
        })

        // streamFetch 返回完整的 responseText，包装成 OpenAI 响应格式解析
        const parsed = parseOpenAIResponse({
          choices: [{
            message: {
              content: streamResult.responseText
            }
          }]
        })
        images = parsed.images
        text = parsed.text
        usage = parsed.usage
      } else {
        // OpenAI 兼容接口 - 非流式，使用 jsonFetch
        const url = resolveOpenAIChatCompletionsUrl(provider.baseUrl)
        const openAIBody = buildOpenAIRequest(provider.model, options)

        const openAIData = await jsonFetch<OpenAIChatCompletionResponse>({
          url,
          data: openAIBody as Record<string, any>,
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`
          },
          abortCtrl: abortController.value,
          timeout: config.estimatedTime * 2 * 1000
        })

        const parsed = parseOpenAIResponse(openAIData)
        images = parsed.images
        text = parsed.text
        usage = parsed.usage
      }

      // 如果有图片，返回成功
      if (images.length > 0) {
        progress.value = 100
        toast.success('生成完成', `成功生成 ${images.length} 张图像`)

        return {
          success: true,
          images,
          text,
          usage
        }
      }

      // 没有图片但有文本，也算成功（文本回复展示到聊天中）
      if (text) {
        progress.value = 100
        return {
          success: true,
          images: [],
          text,
          usage
        }
      }

      // 既没图片也没文本
      throw new Error('未能生成图像')
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
      streamingText.value = ''
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
    streamingText: readonly(streamingText),
    generateImage,
    cancelGeneration
  }
}
