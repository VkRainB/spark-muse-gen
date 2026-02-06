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

  // 批量生成表情包
  const generateStickerPack = async (
    character: string,
    selectedEmotions: string[],
    selectedActions: string[],
    background: 'white' | 'transparent' = 'white'
  ) => {
    const results: Array<{
      type: string
      id: string
      images: Array<{ data: string; mimeType: string; id: string; createdAt: number }>
    }> = []
    const items = [
      ...selectedEmotions.map(e => ({ type: 'emotion', id: e })),
      ...selectedActions.map(a => ({ type: 'action', id: a }))
    ]

    toast.info('开始批量生成', `共 ${items.length} 个表情包`)

    for (const item of items) {
      const options: StickerOptions = {
        character,
        background,
        ...(item.type === 'emotion' ? { emotion: item.id } : { action: item.id })
      }

      const result = await generateSticker(options)
      if (result.success) {
        results.push({
          ...item,
          images: result.images
        })
      }
    }

    toast.success('批量生成完成', `成功 ${results.length}/${items.length}`)
    return results
  }

  return {
    emotions,
    actions,
    buildStickerPrompt,
    generateSticker,
    generateStickerPack
  }
}
