import { defineStore } from 'pinia'
import type { StickerBatch, StickerImage } from '../types/sticker'

/**
 * 批次保留上限：localStorage 容量保护。
 * 计算依据：30 批次 × 24 图 × 200KB = 144MB 远超 localStorage 5MB。
 * 简化策略：上限设为 12 批次 × 12 图 ≈ 28MB，仍超 localStorage 但配合 SSR=false + 用户主动清理可接受。
 * 真正的图片落盘建议未来用 IndexedDB（参考已有 GeminiProDB / XHSHistoryDB）。
 */
export const MAX_BATCHES = 12
export const MAX_IMAGES_PER_BATCH = 12

interface StickerState {
  batches: StickerBatch[]
  currentBatchId: string | null
}

export const useStickerStore = defineStore('sticker', {
  state: (): StickerState => ({
    batches: [],
    currentBatchId: null,
  }),

  getters: {
    /** 当前选中的批次（不存在时返回 null） */
    currentBatch(state): StickerBatch | null {
      return state.batches.find((b) => b.id === state.currentBatchId) ?? null
    },
    /** 历史按 createdAt 倒序 */
    sortedBatches(state): StickerBatch[] {
      return [...state.batches].sort((a, b) => b.createdAt - a.createdAt)
    },
    totalImages(state): number {
      return state.batches.reduce((acc, b) => acc + b.images.length, 0)
    },
  },

  actions: {
    /** 创建一个新批次并切换为当前批次，返回 batchId */
    createBatch(payload: {
      character: string
      background: 'white' | 'transparent'
      emotions: string[]
      actions: string[]
    }): string {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const batch: StickerBatch = {
        id,
        character: payload.character,
        background: payload.background,
        emotions: [...payload.emotions],
        actions: [...payload.actions],
        images: [],
        createdAt: Date.now(),
      }
      this.batches.unshift(batch)

      // 容量保护：超出后淘汰最旧的批次
      if (this.batches.length > MAX_BATCHES) {
        this.batches.length = MAX_BATCHES
      }

      this.currentBatchId = id
      return id
    },

    /** 把若干图片追加到指定批次（按上限截断） */
    addImagesToBatch(batchId: string, images: StickerImage[]): void {
      const batch = this.batches.find((b) => b.id === batchId)
      if (!batch) return
      const remaining = MAX_IMAGES_PER_BATCH - batch.images.length
      if (remaining <= 0) return
      batch.images.push(...images.slice(0, remaining))
    },

    /** 删除单个批次；如果删的是当前批次则切换到最新一个或 null */
    deleteBatch(batchId: string): void {
      const idx = this.batches.findIndex((b) => b.id === batchId)
      if (idx === -1) return
      this.batches.splice(idx, 1)
      if (this.currentBatchId === batchId) {
        this.currentBatchId = this.batches[0]?.id ?? null
      }
    },

    /** 切换当前批次（传 null 清空选中） */
    switchBatch(batchId: string | null): void {
      if (batchId === null) {
        this.currentBatchId = null
        return
      }
      const exists = this.batches.find((b) => b.id === batchId)
      if (exists) this.currentBatchId = batchId
    },

    /** 清空全部批次（带确认应在 UI 层做） */
    clearAll(): void {
      this.batches = []
      this.currentBatchId = null
    },
  },

  persist: true,
})
