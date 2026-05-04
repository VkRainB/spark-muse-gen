/**
 * Sticker 工作台数据结构
 *
 * 持久化策略：
 * - 通过 pinia-plugin-persistedstate 写入 localStorage
 * - 容量保护：单 store 最多保留 MAX_BATCHES 个批次，单批次最多 MAX_IMAGES_PER_BATCH 张图
 */

export interface StickerImage {
  id: string
  /** base64 字符串（不含 data URL 前缀），mimeType 单独存 */
  data: string
  mimeType: string
  createdAt: number
  /** 该图所属的表情 / 动作维度，便于在结果网格上分类 */
  emotionId?: string
  actionId?: string
}

export interface StickerBatch {
  id: string
  character: string
  background: 'white' | 'transparent'
  /** 该批次发起时选中的 emotion ids */
  emotions: string[]
  /** 该批次发起时选中的 action ids */
  actions: string[]
  images: StickerImage[]
  createdAt: number
}
