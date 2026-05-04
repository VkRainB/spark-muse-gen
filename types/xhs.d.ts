// 小红书历史记录
export interface XHSHistory {
  id: string                  // 唯一标识
  topic: string               // 主题
  /** 标题（可选，旧数据可能缺失） */
  title?: string
  content: string             // 文案内容（拼接全文，向后兼容）
  /** 正文（可选，新版结构化字段） */
  body?: string
  /** 标签列表（可选，新版结构化字段） */
  tags?: string[]
  storyboard: StoryboardItem[]  // 分镜列表
  images: Array<{ data: string; mimeType: string }>  // 图像列表（向后兼容）
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
