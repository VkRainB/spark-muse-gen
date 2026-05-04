import type { StickerImage } from '../../types/sticker'
import { useStickerStore } from '../../stores/sticker'

const EMOTIONS = [
  { id: 'happy', label: '开心', emoji: '😊' },
  { id: 'sad', label: '伤心', emoji: '😢' },
  { id: 'angry', label: '生气', emoji: '😠' },
  { id: 'surprised', label: '惊讶', emoji: '😲' },
  { id: 'love', label: '爱心', emoji: '😍' },
  { id: 'cool', label: '酷', emoji: '😎' },
  { id: 'sleepy', label: '困', emoji: '😴' },
  { id: 'thinking', label: '思考', emoji: '🤔' }
] as const

const ACTIONS = [
  { id: 'wave', label: '挥手', emoji: '👋' },
  { id: 'thumbsup', label: '点赞', emoji: '👍' },
  { id: 'clap', label: '鼓掌', emoji: '👏' },
  { id: 'dance', label: '跳舞', emoji: '💃' },
  { id: 'run', label: '奔跑', emoji: '🏃' },
  { id: 'eat', label: '吃东西', emoji: '🍽️' },
  { id: 'work', label: '工作', emoji: '💻' },
  { id: 'sleep', label: '睡觉', emoji: '🛌' }
] as const

interface StickerOptions {
  character: string
  emotion?: string
  action?: string
  background: 'white' | 'transparent'
}

export function useStickerMode() {
  const { generateImage } = useImageGeneration()
  const toast = useAppToast()

  const emotions = EMOTIONS
  const actions = ACTIONS

  // 构建 LINE 风格提示词
  const buildStickerPrompt = (options: StickerOptions): string => {
    const parts = [
      'LINE sticker style',
      'cute chibi character',
      options.character,
    ]

    if (options.emotion) {
      const emotion = EMOTIONS.find(e => e.id === options.emotion)
      if (emotion) {
        parts.push(`${emotion.label} expression`)
      }
    }

    if (options.action) {
      const action = ACTIONS.find(a => a.id === options.action)
      if (action) {
        parts.push(`${action.label} pose`)
      }
    }

    parts.push(
      'simple design',
      'bold outlines',
      'flat colors',
      options.background === 'white' ? 'white background' : 'transparent background',
      'high quality',
      'centered composition'
    )

    return parts.join(', ')
  }

  // 生成单个表情包
  const generateSticker = async (options: StickerOptions) => {
    const prompt = buildStickerPrompt(options)

    const result = await generateImage({
      prompt,
      resolution: '1K',
      aspectRatio: '1:1'
    })

    return result
  }

  /**
   * 批量生成表情包
   * 内部接入 useStickerStore：每次调用会创建一个新批次，并在生成中边产边写入。
   * 返回值保留旧契约（results 数组）+ 增加 batchId 字段，调用方按需使用。
   */
  const generateStickerPack = async (
    character: string,
    selectedEmotions: string[],
    selectedActions: string[],
    background: 'white' | 'transparent' = 'white'
  ) => {
    const stickerStore = useStickerStore()

    const items = [
      ...selectedEmotions.map(e => ({ type: 'emotion' as const, id: e })),
      ...selectedActions.map(a => ({ type: 'action' as const, id: a }))
    ]

    if (items.length === 0) {
      toast.warning('请先选择至少一个表情或动作')
      return { batchId: null as string | null, results: [] }
    }

    // 创建批次（自动设为 currentBatch），返回 batchId 供调用方追踪
    const batchId = stickerStore.createBatch({
      character,
      background,
      emotions: [...selectedEmotions],
      actions: [...selectedActions],
    })

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
        ...(item.type === 'emotion' ? { emotion: item.id } : { action: item.id })
      }

      const result = await generateSticker(options)
      if (result.success && result.images.length > 0) {
        // 边生成边写入 store（界面可实时刷新）
        const stickerImages: StickerImage[] = result.images.map((img) => ({
          id: img.id,
          data: img.data,
          mimeType: img.mimeType,
          createdAt: img.createdAt,
          emotionId: item.type === 'emotion' ? item.id : undefined,
          actionId: item.type === 'action' ? item.id : undefined,
        }))
        stickerStore.addImagesToBatch(batchId, stickerImages)

        results.push({
          ...item,
          images: result.images
        })
      }
    }

    toast.success('批量生成完成', `成功 ${results.length}/${items.length}`)
    return { batchId, results }
  }

  return {
    emotions,
    actions,
    buildStickerPrompt,
    generateSticker,
    generateStickerPack
  }
}
