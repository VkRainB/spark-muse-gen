// 小红书历史记录
export interface XHSHistory {
  id: string                  // 唯一标识
  topic: string               // 主题
  content: string             // 文案内容
  storyboard: StoryboardItem[]  // 分镜列表
  images: Array<{ data: string; mimeType: string }>  // 图像列表
  createdAt: number           // 创建时间戳
}

// 分镜项
export interface StoryboardItem {
  id: string                  // 唯一标识
  description: string         // 分镜描述
  imagePrompt: string         // 图像提示词
  image?: { data: string; mimeType: string }  // 生成的图像（可选）
}

// 小红书生成选项
export interface XHSGenerateOptions {
  topic: string               // 主题
  style?: string              // 风格（可选）
  imageCount?: number         // 图片数量（可选）
}
