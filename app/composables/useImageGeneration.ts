import type { ImageGenerationOptions, GenerationResult, GeneratedImage } from '../../types/image'
import type { Message } from '../../types/chat'
import { fetchEventSource } from '@fortaine/fetch-event-source'
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

interface OpenAIChatCompletionChunk {
  choices?: Array<{
    delta?: {
      role?: string
      content?: OpenAIChatMessageContent
      images?: OpenAIChatMessagePartImage[]
    }
    message?: {
      content?: OpenAIChatMessageContent
      images?: OpenAIChatMessagePartImage[]
    }
    finish_reason?: string | null
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

  const resolveErrorMessage = (status: number, errorText: string) => {
    const trimmed = errorText.trim()
    if (!trimmed) return `请求失败: ${status}`

    try {
      const parsed = JSON.parse(trimmed) as {
        error?: { message?: string }
        message?: string
      }
      return parsed.error?.message || parsed.message || `请求失败: ${status}`
    } catch {
      return trimmed.slice(0, 240) || `请求失败: ${status}`
    }
  }

  // 解析 OpenAI 流式响应（SSE）
  const parseOpenAIStreamResponse = async ({
    url,
    headers,
    body,
    signal
  }: {
    url: string
    headers: Record<string, string>
    body: OpenAIChatRequest
    signal: AbortSignal
  }): Promise<OpenAIChatCompletionResponse> => {
    let fullText = ''
    let parsedChunkCount = 0
    const contentParts: OpenAIChatMessagePart[] = []
    let usage: OpenAIUsage | undefined
    let pendingJsonBuffer = ''
    let rawPayloadBuffer = ''

    const appendImagePart = (rawUrl: string) => {
      const trimmed = rawUrl.trim()
      if (!trimmed) return

      const normalized = trimmed.startsWith('data:image/')
        ? trimmed.replace(/\s+/g, '')
        : trimmed

      contentParts.push({
        type: 'image_url',
        image_url: {
          url: normalized
        }
      })
    }

    const appendContent = (content: OpenAIChatMessageContent, mode: 'append' | 'replace') => {
      if (typeof content === 'string') {
        if (mode === 'append') {
          fullText += content
        } else {
          fullText = content
        }
        return
      }

      for (const part of content) {
        if (!part || typeof part !== 'object') continue

        if ((part.type === 'text' || part.type === 'output_text') && typeof part.text === 'string') {
          contentParts.push({ type: 'text', text: part.text })
          if (mode === 'append') {
            fullText += part.text
          }
          continue
        }

        if (part.type === 'image_url' && typeof part.image_url?.url === 'string') {
          appendImagePart(part.image_url.url)
        }
      }
    }

    const applyChunk = (chunk: OpenAIChatCompletionChunk) => {
      parsedChunkCount += 1

      if (chunk.usage) {
        usage = chunk.usage
      }

      const choice = chunk.choices?.[0]
      if (!choice) return

      const deltaContent = choice.delta?.content
      if (deltaContent !== undefined) {
        appendContent(deltaContent, 'append')
      }

      const deltaImages = choice.delta?.images
      if (Array.isArray(deltaImages)) {
        for (const imagePart of deltaImages) {
          if (imagePart.type === 'image_url' && typeof imagePart.image_url?.url === 'string') {
            appendImagePart(imagePart.image_url.url)
          }
        }
      }

      const messageContent = choice.message?.content
      if (messageContent !== undefined) {
        appendContent(messageContent, 'replace')
      }
    }

    const parseAndApplyChunk = (payload: string) => {
      const normalized = payload.trim()
      if (!normalized || normalized === '[DONE]') return false

      const candidates = [normalized]
      if (normalized.includes('\n') || normalized.includes('\r')) {
        candidates.push(normalized.replace(/\r?\n/g, ''))
      }

      for (const candidate of candidates) {
        try {
          applyChunk(JSON.parse(candidate) as OpenAIChatCompletionChunk)
          return true
        } catch {
          // try next candidate
        }
      }

      return false
    }

    // 容错提取：处理上游把多个/不完整 JSON 片段塞在同一 data 里的情况
    const extractJsonObjects = (source: string) => {
      const objects: string[] = []
      let depth = 0
      let inString = false
      let isEscaped = false
      let objectStart = -1
      let lastConsumed = 0

      for (let i = 0; i < source.length; i += 1) {
        const char = source[i]
        if (!char) continue

        if (inString) {
          if (isEscaped) {
            isEscaped = false
          } else if (char === '\\') {
            isEscaped = true
          } else if (char === '"') {
            inString = false
          }
          continue
        }

        if (char === '"') {
          inString = true
          continue
        }

        if (char === '{') {
          if (depth === 0) {
            objectStart = i
          }
          depth += 1
          continue
        }

        if (char === '}') {
          if (depth <= 0) continue

          depth -= 1
          if (depth === 0 && objectStart >= 0) {
            objects.push(source.slice(objectStart, i + 1))
            lastConsumed = i + 1
            objectStart = -1
          }
        }
      }

      let rest = ''
      if (depth > 0 && objectStart >= 0) {
        rest = source.slice(objectStart)
      } else if (lastConsumed < source.length) {
        const tail = source.slice(lastConsumed)
        const nextStart = tail.indexOf('{')
        if (nextStart >= 0) {
          rest = tail.slice(nextStart)
        }
      }

      return { objects, rest }
    }

    const flushPendingJsonBuffer = () => {
      const trimmed = pendingJsonBuffer.trim()
      if (!trimmed) {
        pendingJsonBuffer = ''
        return
      }

      if (parseAndApplyChunk(trimmed)) {
        pendingJsonBuffer = ''
        return
      }

      const extracted = extractJsonObjects(pendingJsonBuffer)
      if (extracted.objects.length === 0) {
        if (pendingJsonBuffer.length > 200_000) {
          pendingJsonBuffer = pendingJsonBuffer.slice(-50_000)
        }
        return
      }

      for (const objectText of extracted.objects) {
        parseAndApplyChunk(objectText)
      }
      pendingJsonBuffer = extracted.rest
    }

    const ingestPayload = (payload: string) => {
      const normalized = payload.replace(/\u0000/g, '').trim()
      if (!normalized) return
      if (normalized === '[DONE]') return

      rawPayloadBuffer += `${normalized}\n`

      if (!normalized.includes('data:')) {
        pendingJsonBuffer += normalized
        flushPendingJsonBuffer()
        return
      }

      // 非标准 SSE（例如 ... "delta" data: {"id"...）按 data: 重新切分再重组
      const normalizedSegments = normalized.replace(/(?:^|[\r\n\s])data:\s*(?=\{|\[DONE\])/gi, '\n')
      const segments = normalizedSegments
        .split(/\r?\n+/)
        .map((segment) => segment.trim())
        .filter(Boolean)

      if (segments.length === 0) {
        pendingJsonBuffer += normalized
        flushPendingJsonBuffer()
        return
      }

      for (const segment of segments) {
        if (segment === '[DONE]') continue
        pendingJsonBuffer += segment
        flushPendingJsonBuffer()
      }
    }

    // 某些 OpenAI 兼容网关会输出不规范 SSE：data: 后续行未加前缀，这里做流内修复
    const normalizeMalformedSSE = (response: Response) => {
      if (!response.body) return response

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      const encoder = new TextEncoder()
      let pendingLine = ''
      let isDataContinuation = false

      const normalizeLineBatch = (rawLines: string[]) => {
        const normalizedLines: string[] = []

        for (const rawLine of rawLines) {
          const trimmed = rawLine.trim()

          if (!trimmed) {
            isDataContinuation = false
            normalizedLines.push('')
            continue
          }

          if (trimmed.startsWith(':')) {
            normalizedLines.push(trimmed)
            continue
          }

          if (/^(data|event|id|retry)\s*:/i.test(trimmed)) {
            if (/^data\s*:/i.test(trimmed)) {
              const payload = trimmed.replace(/^data\s*:/i, '').trim()
              isDataContinuation = payload !== '[DONE]'
            }
            normalizedLines.push(trimmed)
            continue
          }

          const looksLikeJsonFragment = /^[\[{",}\]]/.test(trimmed) || /^[A-Za-z0-9+/=]+$/.test(trimmed)
          if (isDataContinuation || looksLikeJsonFragment) {
            normalizedLines.push(`data: ${trimmed}`)
            continue
          }

          normalizedLines.push(trimmed)
        }

        return normalizedLines
      }

      const normalizedBody = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              pendingLine += decoder.decode(value, { stream: true })
              const lines = pendingLine.split(/\r?\n/)
              pendingLine = lines.pop() || ''

              const normalized = normalizeLineBatch(lines)
              if (normalized.length > 0) {
                controller.enqueue(encoder.encode(`${normalized.join('\n')}\n`))
              }
            }

            const tail = `${pendingLine}${decoder.decode()}`
            if (tail) {
              const normalizedTail = normalizeLineBatch([tail])
              if (normalizedTail.length > 0) {
                controller.enqueue(encoder.encode(normalizedTail.join('\n')))
              }
            }

            controller.close()
          } catch (streamError) {
            controller.error(streamError)
          }
        },
        cancel() {
          void reader.cancel()
        }
      })

      return new Response(normalizedBody, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
    }

    await fetchEventSource(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
      openWhenHidden: true,
      fetch: async (input, init) => {
        const response = await fetch(input, init)
        return normalizeMalformedSSE(response)
      },
      async onopen(response) {
        if (response.ok) return

        const errorText = await response.text().catch(() => '')
        throw new Error(resolveErrorMessage(response.status, errorText))
      },
      onmessage(message) {
        ingestPayload(message.data)
      },
      onclose() {
        flushPendingJsonBuffer()
      },
      onerror(err) {
        if (signal.aborted) {
          const abortError = new Error('请求已取消')
          abortError.name = 'AbortError'
          throw abortError
        }

        if (err instanceof Error) {
          throw err
        }

        throw new Error('流式响应异常中断')
      }
    })

    flushPendingJsonBuffer()

    if (parsedChunkCount === 0) {
      const raw = rawPayloadBuffer.trim()
      if (raw) {
        pendingJsonBuffer += raw
        flushPendingJsonBuffer()
      }
    }

    if (parsedChunkCount === 0) {
      throw new Error('流式响应解析失败：上游返回了非标准 SSE 数据')
    }

    return {
      choices: [
        {
          message: {
            content: contentParts.length > 0 ? contentParts : fullText
          }
        }
      ],
      usage
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

    const config = RESOLUTION_MAP[options.resolution] ?? RESOLUTION_MAP['1K']!
    const stopProgress = simulateProgress(config.estimatedTime)

    try {
      let url: string
      let body: ReturnType<typeof buildGeminiRequest> | OpenAIChatRequest
      let openAIBody: OpenAIChatRequest | null = null
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (provider.type === 'gemini') {
        url = `${provider.baseUrl}/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`
        body = buildGeminiRequest(options, options.referenceImage)
      } else {
        url = resolveOpenAIChatCompletionsUrl(provider.baseUrl)
        headers['Authorization'] = `Bearer ${provider.apiKey}`
        openAIBody = buildOpenAIRequest(provider.model, options)
        body = openAIBody
      }

      let images: GeneratedImage[] = []
      let text: string | undefined
      let usage: GenerationResult['usage'] | undefined

      if (provider.type === 'openai' && openAIBody?.stream) {
        const openAIData = await parseOpenAIStreamResponse({
          url,
          headers,
          body: openAIBody,
          signal: abortController.value.signal
        })
        const parsed = parseOpenAIResponse(openAIData)
        images = parsed.images
        text = parsed.text
        usage = parsed.usage
      } else {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: abortController.value.signal
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          throw new Error(resolveErrorMessage(response.status, errorText))
        }

        if (provider.type === 'gemini') {
          const data = await response.json()
          images = parseGeminiResponse(data)
        } else {
          const openAIData = await response.json() as OpenAIChatCompletionResponse
          const parsed = parseOpenAIResponse(openAIData)
          images = parsed.images
          text = parsed.text
          usage = parsed.usage
        }
      }

      if (images.length === 0) {
        throw new Error(text ? `未返回图像，模型响应：${text.slice(0, 120)}` : '未能生成图像')
      }

      progress.value = 100
      toast.success('生成完成', `成功生成 ${images.length} 张图像`)

      return {
        success: true,
        images,
        text,
        usage
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
