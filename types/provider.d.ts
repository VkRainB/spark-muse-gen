// API 渠道
export interface Provider {
  id: string                  // 唯一标识
  name: string                // 渠道名称
  type: 'gemini' | 'openai'   // 渠道类型
  baseUrl: string             // 基础 URL
  apiKey: string              // API 密钥
  model: string               // 模型名称
  enabled: boolean            // 是否启用
  createdAt: number           // 创建时间戳
  weight: number              // 权重，数字越小优先级越高
}

// 渠道表单数据
export interface ProviderFormData {
  name: string
  type: 'gemini' | 'openai'
  baseUrl: string
  apiKey: string
  model: string
  weight: number
}
