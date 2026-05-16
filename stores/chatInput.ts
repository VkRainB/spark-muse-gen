/**
 * Chat 输入桥接 store
 *
 * 用途：让布局层（工具弹层、提示词面板）能注入文案到主聊天输入框，
 * 并可选择立即发送 / 重新发送。InputBar 通过 watch token 消费请求。
 *
 * 不持久化（瞬时状态）。
 */
import { defineStore } from 'pinia'

export type ChatInputMode = 'apply' | 'send' | 'resend'

export interface ChatInputRequest {
  prompt: string
  mode: ChatInputMode
  token: number
}

export const useChatInputStore = defineStore('chatInput', {
  state: () => ({
    /** 最近一次注入请求；InputBar 通过 watch token 消费 */
    request: null as ChatInputRequest | null,
  }),

  actions: {
    /** 仅注入到输入框，不发送 */
    apply(prompt: string) {
      this.request = { prompt, mode: 'apply', token: Date.now() }
    },
    /** 注入并立即发送 */
    submit(prompt: string) {
      this.request = { prompt, mode: 'send', token: Date.now() }
    },
    /** 重新发送：会删除最后一条助手回复后重发 */
    resubmit(prompt: string) {
      this.request = { prompt, mode: 'resend', token: Date.now() }
    },
  },

  persist: false,
})
