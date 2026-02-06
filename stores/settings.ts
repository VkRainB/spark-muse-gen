import { defineStore } from 'pinia'

export type Resolution = '1K' | '2K' | '4K'
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

interface SettingsState {
  resolution: Resolution
  aspectRatio: AspectRatio
  streamEnabled: boolean
  contextCount: number
  autoSaveEnabled: boolean
  autoSaveDirectory: string | null
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    resolution: '1K',
    aspectRatio: '1:1',
    streamEnabled: true,
    contextCount: 10,
    autoSaveEnabled: false,
    autoSaveDirectory: null
  }),

  getters: {
    resolutionLabel: (state): string => {
      const labels: Record<Resolution, string> = {
        '1K': '1024 x 1024',
        '2K': '2048 x 2048',
        '4K': '4096 x 4096'
      }
      return labels[state.resolution]
    },

    resolutionSize: (state): number => {
      const sizes: Record<Resolution, number> = {
        '1K': 1024,
        '2K': 2048,
        '4K': 4096
      }
      return sizes[state.resolution]
    }
  },

  actions: {
    setResolution(resolution: Resolution) {
      this.resolution = resolution
    },

    setAspectRatio(ratio: AspectRatio) {
      this.aspectRatio = ratio
    },

    toggleStream() {
      this.streamEnabled = !this.streamEnabled
    },

    setContextCount(count: number) {
      this.contextCount = Math.max(1, Math.min(50, count))
    },

    setAutoSave(enabled: boolean, directory?: string) {
      this.autoSaveEnabled = enabled
      if (directory) {
        this.autoSaveDirectory = directory
      }
    },

    disableAutoSave() {
      this.autoSaveEnabled = false
      this.autoSaveDirectory = null
    }
  },

  persist: {
    key: 'gemini_settings'
  }
})
