import { defineStore } from 'pinia'
import type { Session, Message, ChatState } from '../types/chat'

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    sessions: [],
    currentSessionId: null,
    messages: [],
    contextCount: 10
  }),

  getters: {
    currentSession: (state): Session | null =>
      state.sessions.find((s: Session) => s.id === state.currentSessionId) || null,

    currentMessages: (state): Message[] =>
      state.messages.filter((m: Message) => m.sessionId === state.currentSessionId),

    contextMessages(): Message[] {
      const messages = this.currentMessages
      return messages.slice(-this.contextCount)
    }
  },

  actions: {
    createSession(title?: string) {
      const session: Session = {
        id: crypto.randomUUID(),
        title: title || `会话 ${this.sessions.length + 1}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      this.sessions.unshift(session)
      this.currentSessionId = session.id
      return session
    },

    updateSession(id: string, data: Partial<Session>) {
      const session = this.sessions.find((s: Session) => s.id === id)
      if (session) {
        Object.assign(session, data, { updatedAt: Date.now() })
      }
    },

    deleteSession(id: string) {
      const index = this.sessions.findIndex((s: Session) => s.id === id)
      if (index !== -1) {
        this.sessions.splice(index, 1)
        this.messages = this.messages.filter((m: Message) => m.sessionId !== id)

        if (this.currentSessionId === id) {
          this.currentSessionId = this.sessions[0]?.id || null
        }
      }
    },

    switchSession(id: string) {
      if (this.sessions.find((s: Session) => s.id === id)) {
        this.currentSessionId = id
      }
    },

    addMessage(message: Omit<Message, 'id' | 'timestamp'>) {
      const newMessage: Message = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: Date.now()
      }
      this.messages.push(newMessage)

      // 更新会话时间
      const session = this.sessions.find((s: Session) => s.id === message.sessionId)
      if (session) {
        session.updatedAt = Date.now()
      }

      return newMessage
    },

    deleteMessage(id: string) {
      const index = this.messages.findIndex((m: Message) => m.id === id)
      if (index !== -1) {
        this.messages.splice(index, 1)
      }
    },

    clearCurrentMessages() {
      if (this.currentSessionId) {
        this.messages = this.messages.filter(
          (m: Message) => m.sessionId !== this.currentSessionId
        )
      }
    },

    setContextCount(count: number) {
      this.contextCount = Math.max(1, Math.min(50, count))
    },

    clearAllSessions() {
      this.sessions = []
      this.messages = []
      this.currentSessionId = null
    }
  },

  persist: {
    key: 'gemini_chat'
  }
})
