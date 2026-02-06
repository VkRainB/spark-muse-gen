import { useChatStore } from '../../stores/chat'

export function useChat() {
  const store = useChatStore()
  const toast = useAppToast()

  // 确保有默认会话
  const ensureSession = () => {
    if (!store.currentSessionId && store.sessions.length === 0) {
      store.createSession('新会话')
    }
  }

  const sendUserMessage = (content: string, images?: Array<{ data: string; mimeType: string }>) => {
    ensureSession()

    if (!store.currentSessionId) return null

    return store.addMessage({
      sessionId: store.currentSessionId,
      role: 'user',
      content,
      images
    })
  }

  const addAssistantMessage = (content: string, images?: Array<{ data: string; mimeType: string }>) => {
    if (!store.currentSessionId) return null

    return store.addMessage({
      sessionId: store.currentSessionId,
      role: 'assistant',
      content,
      images
    })
  }

  const deleteSession = (id: string) => {
    store.deleteSession(id)
    toast.info('会话已删除')
  }

  const clearMessages = () => {
    store.clearCurrentMessages()
    toast.info('消息已清空')
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
    deleteMessage: store.deleteMessage,
    clearMessages,

    setContextCount: store.setContextCount,
    ensureSession
  }
}
