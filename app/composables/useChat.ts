import { useChatStore } from '../../stores/chat'
import type { Message } from '../../types/chat'

export function useChat() {
  const store = useChatStore()
  const toast = useAppToast()

  // 确保有默认会话
  const ensureSession = () => {
    if (!store.currentSessionId && store.sessions.length === 0) {
      store.createSession('新会话')
    }
  }

  const sendUserMessage = (
    content: string,
    images?: Array<{ data: string; mimeType: string }>,
    sessionId?: string,
  ) => {
    ensureSession()

    const targetId = sessionId ?? store.currentSessionId
    if (!targetId) return null
    // 防御：会话已被删除则丢弃
    if (!store.sessions.find(s => s.id === targetId)) return null

    return store.addMessage({
      sessionId: targetId,
      role: 'user',
      content,
      images
    })
  }

  const addAssistantMessage = (
    content: string,
    images?: Array<{ data: string; mimeType: string }>,
    sessionId?: string,
  ) => {
    const targetId = sessionId ?? store.currentSessionId
    if (!targetId) return null
    // 防御：会话已被删除则丢弃
    if (!store.sessions.find(s => s.id === targetId)) return null

    return store.addMessage({
      sessionId: targetId,
      role: 'assistant',
      content,
      images
    })
  }

  // 按显式 sessionId 取上下文消息（避免发送时通过 currentSessionId 读到错误会话）
  const getContextMessagesFor = (sessionId: string): Message[] => {
    if (!sessionId) return []
    const all = store.messages.filter((m: Message) => m.sessionId === sessionId)
    return all.slice(-store.contextCount)
  }

  const deleteSession = (id: string) => {
    store.deleteSession(id)
    toast.info('会话已删除')
  }

  const clearMessages = () => {
    store.clearCurrentMessages()
    toast.info('消息已清空')
  }

  const clearAllSessions = () => {
    store.clearAllSessions()
    toast.info('所有会话已清空')
  }

  return {
    sessions: computed(() => store.sessions),
    currentSession: computed(() => store.currentSession),
    currentMessages: computed(() => store.currentMessages),
    contextMessages: computed(() => store.contextMessages),
    contextCount: computed(() => store.contextCount),

    createSession: store.createSession,
    updateSession: store.updateSession,
    deleteSession,
    switchSession: store.switchSession,

    sendUserMessage,
    addAssistantMessage,
    getContextMessagesFor,
    removeLastAssistantReply: store.removeLastAssistantReply,
    clearMessages,

    setContextCount: store.setContextCount,
    ensureSession,
    clearAllSessions
  }
}
