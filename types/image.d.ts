import type { Message } from './chat'

// 图像生成选项
export interface ImageGenerationOptions {
  prompt: string              // 提示词
  resolution: '1K' | '2K' | '4K'  // 分辨率
  aspectRatio: string         // 长宽比
  referenceImage?: string     // 参考图（可选）
  contextMessages?: Message[] // 上下文消息（可选）
  batchSize?: number          // 批量数量（可选）
  stream?: boolean            // 是否流式传输（可选）
}

// 生成的图像
export interface GeneratedImage {
  id: string                  // 唯一标识
  data: string                // Base64 数据
  mimeType: string            // MIME 类型
  createdAt: number           // 创建时间戳
}

// 生成结果
export interface GenerationResult {
  success: boolean            // 是否成功
  images: GeneratedImage[]    // 图像列表
  text?: string               // 文本响应（可选）
  usage?: {                   // Token 使用量（可选）
    promptTokens: number
    completionTokens: number
  }
}

// 生成状态
export interface GenerationState {
  isGenerating: boolean       // 是否正在生成
  progress: number            // 进度百分比
  currentTask: string | null  // 当前任务描述
  error: string | null        // 错误信息
}
