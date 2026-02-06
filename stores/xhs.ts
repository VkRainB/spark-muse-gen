import { defineStore } from 'pinia'
import type { XHSHistory, StoryboardItem } from '../types/xhs'

interface XHSState {
  history: XHSHistory[]
  currentTopic: string
  currentContent: string
  currentStoryboard: StoryboardItem[]
  isGenerating: boolean
}

export const useXHSStore = defineStore('xhs', {
  state: (): XHSState => ({
    history: [],
    currentTopic: '',
    currentContent: '',
    currentStoryboard: [],
    isGenerating: false
  }),

  getters: {
    hasContent: (state): boolean => state.currentContent.length > 0,
    hasStoryboard: (state): boolean => state.currentStoryboard.length > 0,
    completedImages: (state): number =>
      state.currentStoryboard.filter((s: StoryboardItem) => s.image).length
  },

  actions: {
    setTopic(topic: string) {
      this.currentTopic = topic
    },

    setContent(content: string) {
      this.currentContent = content
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
      if (item) {
        this.currentTopic = item.topic
        this.currentContent = item.content
        this.currentStoryboard = [...item.storyboard]
      }
    },

    deleteHistory(id: string) {
      const index = this.history.findIndex((h: XHSHistory) => h.id === id)
      if (index !== -1) {
        this.history.splice(index, 1)
      }
    },

    clearCurrent() {
      this.currentTopic = ''
      this.currentContent = ''
      this.currentStoryboard = []
    }
  },

  persist: {
    key: 'xhs_data'
  }
})
