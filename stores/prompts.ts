import { defineStore } from 'pinia'

interface CustomPrompt {
  id: string
  title: string
  prompt: string
  category: string
  createdAt: number
}

export const usePromptsStore = defineStore('prompts', {
  state: () => ({
    customPrompts: [] as CustomPrompt[]
  }),

  getters: {
    allPrompts: (state) => state.customPrompts,

    categories: (state) => {
      const cats = new Set(state.customPrompts.map(p => p.category))
      return Array.from(cats)
    }
  },

  actions: {
    addPrompt(data: Omit<CustomPrompt, 'id' | 'createdAt'>) {
      this.customPrompts.push({
        ...data,
        id: crypto.randomUUID(),
        createdAt: Date.now()
      })
    },

    updatePrompt(id: string, data: Partial<Omit<CustomPrompt, 'id' | 'createdAt'>>) {
      const index = this.customPrompts.findIndex(p => p.id === id)
      const existing = this.customPrompts[index]
      if (index !== -1 && existing) {
        this.customPrompts[index] = {
          id: existing.id,
          title: data.title ?? existing.title,
          prompt: data.prompt ?? existing.prompt,
          category: data.category ?? existing.category,
          createdAt: existing.createdAt
        }
      }
    },

    removePrompt(id: string) {
      const index = this.customPrompts.findIndex(p => p.id === id)
      if (index !== -1) {
        this.customPrompts.splice(index, 1)
      }
    },

    importPrompts(prompts: CustomPrompt[]) {
      this.customPrompts.push(...prompts)
    },

    exportPrompts() {
      return JSON.stringify(this.customPrompts, null, 2)
    }
  },

  persist: {
    key: 'custom_prompts'
  }
})
