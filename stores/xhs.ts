import { defineStore } from 'pinia'
import type { XHSHistory, StoryboardItem } from '../types/xhs'

interface XHSState {
  history: XHSHistory[]
  currentTopic: string
  currentTitle: string
  currentBody: string
  currentTags: string[]
  /** 兼容字段：title + body + tags 拼接的完整文案，用于直接复制 / 旧调用方读取 */
  currentContent: string
  currentStoryboard: StoryboardItem[]
  isGenerating: boolean
}

const composeContent = (title: string, body: string, tags: string[]): string => {
  const segments: string[] = []
  if (title.trim()) segments.push(title.trim())
  if (body.trim()) segments.push(body.trim())
  if (tags.length > 0) {
    segments.push(tags.map((t) => `#${t}`).join(' '))
  }
  return segments.join('\n\n')
}

export const useXHSStore = defineStore('xhs', {
  state: (): XHSState => ({
    history: [],
    currentTopic: '',
    currentTitle: '',
    currentBody: '',
    currentTags: [],
    currentContent: '',
    currentStoryboard: [],
    isGenerating: false
  }),

  getters: {
    hasContent: (state): boolean => state.currentContent.length > 0,
    hasStoryboard: (state): boolean => state.currentStoryboard.length > 0,
    completedImages: (state): number =>
      state.currentStoryboard.filter((s: StoryboardItem) => s.image).length,
    sortedHistory: (state): XHSHistory[] =>
      [...state.history].sort((a, b) => b.createdAt - a.createdAt)
  },

  actions: {
    setTopic(topic: string) {
      this.currentTopic = topic
    },

    /** 旧接口：写入纯文本，title/body/tags 留空，仅用于无法解析 JSON 的兜底 */
    setContent(content: string) {
      this.currentContent = content
      this.currentTitle = ''
      this.currentBody = content
      this.currentTags = []
    },

    /** 新接口：结构化写入，自动同步 currentContent 拼接版本 */
    setStructured(payload: { title?: string; body?: string; tags?: string[] }) {
      const title = payload.title ?? ''
      const body = payload.body ?? ''
      const tags = Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : []
      this.currentTitle = title
      this.currentBody = body
      this.currentTags = tags
      this.currentContent = composeContent(title, body, tags)
    },

    setStoryboard(storyboard: StoryboardItem[]) {
      this.currentStoryboard = storyboard
    },

    updateStoryboardImage(id: string, image: { data: string; mimeType: string }) {
      const item = this.currentStoryboard.find((s: StoryboardItem) => s.id === id)
      if (item) {
        item.image = image
      }
    },

    saveToHistory() {
      if (!this.currentTopic || !this.currentContent) return

      const historyItem: XHSHistory = {
        id: crypto.randomUUID(),
        topic: this.currentTopic,
        title: this.currentTitle || undefined,
        body: this.currentBody || undefined,
        tags: this.currentTags.length > 0 ? [...this.currentTags] : undefined,
        content: this.currentContent,
        storyboard: [...this.currentStoryboard],
        images: this.currentStoryboard
          .filter((s: StoryboardItem) => s.image)
          .map((s: StoryboardItem) => s.image!),
        createdAt: Date.now()
      }

      this.history.unshift(historyItem)
    },

    loadFromHistory(id: string) {
      const item = this.history.find((h: XHSHistory) => h.id === id)
      if (!item) return

      this.currentTopic = item.topic
      this.currentTitle = item.title ?? ''
      this.currentTags = item.tags ?? []

      // 优先用结构化字段，兜底用 content（旧持久化数据）
      if (item.body !== undefined) {
        this.currentBody = item.body
      } else {
        this.currentBody = item.content
      }

      this.currentContent = composeContent(
        this.currentTitle,
        this.currentBody,
        this.currentTags
      ) || item.content

      this.currentStoryboard = [...item.storyboard]
    },

    deleteHistory(id: string) {
      const index = this.history.findIndex((h: XHSHistory) => h.id === id)
      if (index !== -1) {
        this.history.splice(index, 1)
      }
    },

    clearAllHistory() {
      this.history = []
    },

    clearCurrent() {
      this.currentTopic = ''
      this.currentTitle = ''
      this.currentBody = ''
      this.currentTags = []
      this.currentContent = ''
      this.currentStoryboard = []
    }
  },

  persist: {
    key: 'xhs_data'
  }
})
