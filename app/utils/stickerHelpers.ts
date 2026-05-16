import type {
  StickerCharacter,
  StickerCharacterReference,
  StickerCharacterValue,
} from '../../types/sticker'
import { toDataUrl } from './base64Utils'

/**
 * 角色字段读取助手
 *
 * 同时支持：
 *  - 历史数据 character: string
 *  - 新版数据 character: StickerCharacter
 */

export function isCharacterObject(c: StickerCharacterValue | undefined): c is StickerCharacter {
  return !!c && typeof c === 'object'
}

export function getCharacterText(c: StickerCharacterValue | undefined): string {
  if (!c) return ''
  if (typeof c === 'string') return c.trim()
  return (c.description || '').trim()
}

export function getCharacterReference(
  c: StickerCharacterValue | undefined,
): StickerCharacterReference | undefined {
  if (!isCharacterObject(c)) return undefined
  return c.referenceImage
}

export function getCharacterReferenceSrc(c: StickerCharacterValue | undefined): string {
  const img = getCharacterReference(c)
  if (!img?.data) return ''
  return toDataUrl(img.data, img.mimeType)
}

export function hasCharacterContent(c: StickerCharacterValue | undefined): boolean {
  return !!getCharacterText(c) || !!getCharacterReference(c)
}

/** 用于历史/结果区列表的角色显示标签 */
export function getCharacterLabel(c: StickerCharacterValue | undefined): string {
  const text = getCharacterText(c)
  if (text) return text
  if (getCharacterReference(c)) return '参考图角色'
  return '未命名角色'
}
