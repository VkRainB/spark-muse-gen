// 会话
export interface Session {
  id: string                  // 唯一标识
  title: string               // 会话标题
  createdAt: number           // 创建时间戳
  updatedAt: number           // 更新时间戳
}

// 消息
export interface Message {
  id: string                  // 唯一标识
  sessionId: string           // 所属会话 ID
  role: 'user' | 'assistant'  // 角色
  content: string             // 文本内容
  images?: Array<{            // 图像附件（可选）
    data: string
    mimeType: string
  }>
  timestamp: number           // 时间戳
}

// 聊天状态
export interface ChatState {
  sessions: Session[]         // 会话列表
  currentSessionId: string | null  // 当前会话 ID
  messages: Message[]         // 消息列表
  contextCount: number        // 上下文消息数量
}
