/**
 * Sticker 工作台数据结构
 *
 * 持久化策略：
 * - 通过 pinia-plugin-persistedstate 写入 localStorage
 * - 容量保护：单 store 最多保留 MAX_BATCHES 个批次，单批次最多 MAX_IMAGES_PER_BATCH 张图
 *
 * 兼容性：
 * - StickerBatch.character 保留 string 形式以兼容历史数据；新批次统一写入 StickerCharacter 对象
 * - 读取请通过 app/utils/stickerHelpers.ts 中的助手函数，避免在组件内做 typeof 判断
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

/** 角色参考图（文字描述的可选补充） */
export interface StickerCharacterReference {
  /** dataURL 形式（含 data: 前缀），用于直接渲染与 OpenAI image_url 透传 */
  data: string
  mimeType: string
}

/** 角色定义：文字描述与参考图共存可选，至少其一 */
export interface StickerCharacter {
  description: string
  referenceImage?: StickerCharacterReference
}

/** 表情/动作变体定义（同一份结构供预设与用户自定义共用） */
export interface StickerVariant {
  id: string
  label: string
  /** 选填：emoji 图标 */
  emoji?: string
  /** 选填：英文 prompt 片段，覆盖默认基于 label 的提示词 */
  prompt?: string
  /** 是否用户自定义（运行时区分预设） */
  custom?: boolean
}

/** 兼容字段：旧版 character 是 string，新版是 StickerCharacter 对象 */
export type StickerCharacterValue = string | StickerCharacter

export interface StickerBatch {
  id: string
  character: StickerCharacterValue
  background: 'white' | 'transparent'
  /** 该批次发起时选中的 emotion ids */
  emotions: string[]
  /** 该批次发起时选中的 action ids */
  actions: string[]
  images: StickerImage[]
  createdAt: number
}
