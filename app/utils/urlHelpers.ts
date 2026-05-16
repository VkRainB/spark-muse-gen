/**
 * Provider API URL 工具函数 —— 纯函数，无业务依赖。
 * 处理 OpenAI / Gemini 兼容接口的 baseUrl 归一化与端点解析。
 */

/** 去除尾部斜杠并 trim */
export const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '')

/**
 * 解析 OpenAI 兼容接口的 /models 端点。
 * - 已是 /chat/completions：替换为 /models
 * - 已是 /models：原样返回
 * - 已是 /v{N}：追加 /models
 * - 其他：追加 /v1/models
 */
export const resolveOpenAIModelsUrl = (baseUrl: string): string => {
  const normalized = normalizeBaseUrl(baseUrl)
  if (!normalized) return '/v1/models'
  if (/\/chat\/completions$/i.test(normalized)) {
    return normalized.replace(/\/chat\/completions$/i, '/models')
  }
  if (/\/models$/i.test(normalized)) return normalized
  if (/\/v\d+$/i.test(normalized)) return `${normalized}/models`
  return `${normalized}/v1/models`
}

/**
 * 解析 OpenAI 兼容接口的 /chat/completions 端点。
 * - 已是 /chat/completions：原样返回
 * - 已是 /v{N}：追加 /chat/completions
 * - 其他：追加 /v1/chat/completions
 */
export const resolveOpenAIChatCompletionsUrl = (baseUrl: string): string => {
  const normalized = normalizeBaseUrl(baseUrl)
  if (!normalized) return '/v1/chat/completions'
  if (/\/chat\/completions$/i.test(normalized)) return normalized
  if (/\/v\d+$/i.test(normalized)) return `${normalized}/chat/completions`
  return `${normalized}/v1/chat/completions`
}

/** Gemini 原生 generateContent 端点 */
export const resolveGeminiGenerateUrl = (baseUrl: string, model: string, apiKey: string): string => {
  const normalized = normalizeBaseUrl(baseUrl)
  return `${normalized}/v1beta/models/${model}:generateContent?key=${apiKey}`
}

/** Gemini 原生 /models 端点 */
export const resolveGeminiModelsUrl = (baseUrl: string, apiKey: string): string => {
  const normalized = normalizeBaseUrl(baseUrl)
  return `${normalized}/v1beta/models?key=${apiKey}`
}
