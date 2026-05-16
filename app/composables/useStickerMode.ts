import type { StickerCharacter, StickerImage, StickerImageRef, StickerVariant } from '../../types/sticker'
import { useStickerStore } from '../../stores/sticker'
import { toDataUrl } from '../utils/base64Utils'

/** 内置预设表情 / 动作 */
const PRESET_EMOTIONS: ReadonlyArray<StickerVariant> = [
  { id: 'happy', label: '开心', emoji: '😊' },
  { id: 'sad', label: '伤心', emoji: '😢' },
  { id: 'angry', label: '生气', emoji: '😠' },
  { id: 'surprised', label: '惊讶', emoji: '😲' },
  { id: 'love', label: '爱心', emoji: '😍' },
  { id: 'cool', label: '酷', emoji: '😎' },
  { id: 'sleepy', label: '困', emoji: '😴' },
  { id: 'thinking', label: '思考', emoji: '🤔' },
] as const

const PRESET_ACTIONS: ReadonlyArray<StickerVariant> = [
  { id: 'wave', label: '挥手', emoji: '👋' },
  { id: 'thumbsup', label: '点赞', emoji: '👍' },
  { id: 'clap', label: '鼓掌', emoji: '👏' },
  { id: 'dance', label: '跳舞', emoji: '💃' },
  { id: 'run', label: '奔跑', emoji: '🏃' },
  { id: 'eat', label: '吃东西', emoji: '🍽️' },
  { id: 'work', label: '工作', emoji: '💻' },
  { id: 'sleep', label: '睡觉', emoji: '🛌' },
] as const

interface StickerOptions {
  character: StickerCharacter
  emotion?: string
  action?: string
  background: 'white' | 'transparent'
}

/** 把 StickerCharacter 中的参考图转成 generateImage 期望的 dataURL 形式 */
const referenceFromCharacter = (character: StickerCharacter): string | undefined => {
  const img = character.referenceImage
  if (!img?.data) return undefined
  return toDataUrl(img.data, img.mimeType)
}

/** 取变体的 prompt 片段：自定义 prompt 优先，否则基于 label 生成 */
const variantPromptFragment = (v: StickerVariant, kind: 'emotion' | 'action'): string => {
  const custom = (v.prompt || '').trim()
  if (custom) return custom
  return kind === 'emotion' ? `${v.label} expression` : `${v.label} pose`
}

export function useStickerMode() {
  const { generateImage } = useImageGeneration()
  const toast = useAppToast()
  const stickerStore = useStickerStore()
  const imageDB = useStickerImageDB()

  /** 预设 + 用户自定义合并；模板中作为 array prop 直接消费（自动 unwrap） */
  const emotions = computed<StickerVariant[]>(() => [
    ...PRESET_EMOTIONS,
    ...(stickerStore.customEmotions ?? []),
  ])
  const actions = computed<StickerVariant[]>(() => [
    ...PRESET_ACTIONS,
    ...(stickerStore.customActions ?? []),
  ])

  const findVariant = (
    list: ReadonlyArray<StickerVariant>,
    id: string | undefined,
  ): StickerVariant | undefined => {
    if (!id) return undefined
    return list.find((v) => v.id === id)
  }

  // 构建 LINE 风格提示词（兼容文字 / 参考图 / 自定义 prompt 片段）
  const buildStickerPrompt = (options: StickerOptions): string => {
    const parts: string[] = ['LINE sticker style', 'cute chibi character']

    const desc = (options.character.description || '').trim()
    const hasImage = !!options.character.referenceImage?.data

    if (desc) {
      parts.push(desc)
    } else if (hasImage) {
      parts.push('keep the character appearance consistent with the reference image')
    }

    const emotion = findVariant(emotions.value, options.emotion)
    if (emotion) {
      parts.push(variantPromptFragment(emotion, 'emotion'))
    }

    const action = findVariant(actions.value, options.action)
    if (action) {
      parts.push(variantPromptFragment(action, 'action'))
    }

    parts.push(
      'simple design',
      'bold outlines',
      'flat colors',
      options.background === 'white' ? 'white background' : 'transparent background',
      'high quality',
      'centered composition',
    )

    return parts.join(', ')
  }

  // 生成单个表情包
  const generateSticker = async (options: StickerOptions) => {
    const prompt = buildStickerPrompt(options)

    return generateImage({
      prompt,
      resolution: '1K',
      aspectRatio: '1:1',
      referenceImage: referenceFromCharacter(options.character),
    })
  }

  /**
   * 批量生成表情包
   * 内部接入 useStickerStore：每次调用会创建一个新批次，并在生成中边产边写入。
   * 返回值保留旧契约（results 数组）+ 增加 batchId 字段，调用方按需使用。
   */
  const generateStickerPack = async (
    character: StickerCharacter,
    selectedEmotions: string[],
    selectedActions: string[],
    background: 'white' | 'transparent' = 'white',
  ) => {
    const items = [
      ...selectedEmotions.map((e) => ({ type: 'emotion' as const, id: e })),
      ...selectedActions.map((a) => ({ type: 'action' as const, id: a })),
    ]

    if (items.length === 0) {
      toast.warning('请先选择至少一个表情或动作')
      return { batchId: null as string | null, results: [] }
    }

    // 创建批次（自动设为 currentBatch），返回 batchId 供调用方追踪。
    // 同时可能淘汰最旧批次的图片，需同步从 IDB 清理。
    const { batchId, droppedImageIds } = stickerStore.createBatch({
      character,
      background,
      emotions: [...selectedEmotions],
      actions: [...selectedActions],
    })
    if (droppedImageIds.length > 0) {
      void imageDB.removeMany(droppedImageIds)
    }

    const results: Array<{
      type: 'emotion' | 'action'
      id: string
      images: Array<{ data: string; mimeType: string; id: string; createdAt: number }>
    }> = []

    toast.info('开始批量生成', `共 ${items.length} 个表情包`)

    for (const item of items) {
      const options: StickerOptions = {
        character,
        background,
        ...(item.type === 'emotion' ? { emotion: item.id } : { action: item.id }),
      }

      const result = await generateSticker(options)
      if (result.success && result.images.length > 0) {
        const stickerImages: StickerImage[] = result.images.map((img) => ({
          id: img.id,
          data: img.data,
          mimeType: img.mimeType,
          createdAt: img.createdAt,
          emotionId: item.type === 'emotion' ? item.id : undefined,
          actionId: item.type === 'action' ? item.id : undefined,
        }))

        // 先写 IndexedDB（完整数据），写入失败则跳过本批，不污染 store
        try {
          await imageDB.putMany(stickerImages)
        } catch (err) {
          console.error('IndexedDB 写入失败：', err)
          toast.error('图片保存失败', '可能是浏览器存储已满')
          continue
        }

        // store 仅保留元数据引用
        const refs: StickerImageRef[] = stickerImages.map((img) => ({
          id: img.id,
          mimeType: img.mimeType,
          createdAt: img.createdAt,
          emotionId: img.emotionId,
          actionId: img.actionId,
        }))
        stickerStore.addImagesToBatch(batchId, refs)

        results.push({
          ...item,
          images: result.images,
        })
      }
    }

    toast.success('批量生成完成', `成功 ${results.length}/${items.length}`)
    return { batchId, results }
  }

  return {
    /** 表情：预设 + 自定义合并（computed） */
    emotions,
    /** 动作：预设 + 自定义合并（computed） */
    actions,
    /** 仅预设（如需在 UI 中区分展示） */
    presetEmotions: PRESET_EMOTIONS,
    presetActions: PRESET_ACTIONS,
    buildStickerPrompt,
    generateSticker,
    generateStickerPack,
  }
}
