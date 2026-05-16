/**
 * Sticker 工作台数据结构
 *
 * 持久化策略：
 * - store（Pinia + localStorage）仅存元数据（StickerImageRef），约束在 KB 级
 * - 图片二进制（base64 data）写入 IndexedDB `StickerImageDB`，由 useStickerImageDB 管理
 * - 删除批次时由调用方协调清理 IndexedDB 中对应记录
 *
 * 兼容性：
 * - StickerBatch.character 保留 string 形式以兼容历史数据；新批次统一写入 StickerCharacter 对象
 * - 读取请通过 app/utils/stickerHelpers.ts 中的助手函数，避免在组件内做 typeof 判断
 */

/** 图片元数据 —— 持久化到 store / localStorage 的部分（无 data 字段） */
export interface StickerImageRef {
  id: string
  mimeType: string
  createdAt: number
  /** 该图所属的表情 / 动作维度，便于在结果网格上分类 */
  emotionId?: string
  actionId?: string
}

/** 完整图片 —— 持久化到 IndexedDB；data 为 base64 字符串（不含 dataURL 前缀） */
export interface StickerImage extends StickerImageRef {
  data: string
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
  /** 仅存元数据；完整 data 通过 useStickerImageDB 按 id 加载 */
  images: StickerImageRef[]
  createdAt: number
}
