import type { StoryboardItem } from '../../types/xhs'
import { useXHSStore } from '../../stores/xhs'
import { useProviderStore } from '../../stores/provider'
import { jsonFetch } from '../api/fetchClient'
import { resolveOpenAIChatCompletionsUrl, resolveGeminiGenerateUrl } from '../utils/urlHelpers'

interface GeminiTextResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string }
  }>
}

interface XHSStructured {
  title?: string
  content?: string
  tags?: string[]
  storyboard?: Array<{ description?: string; imagePrompt?: string; prompt?: string }>
}

export function useXHS() {
  const store = useXHSStore()
  const { generateImage, isGenerating, progress } = useImageGeneration()
  const toast = useAppToast()
  const providerStore = useProviderStore()

  // 生成文案和分镜
  const generateContent = async (topic: string) => {
    if (!topic.trim()) {
      toast.warning('请输入主题')
      return false
    }

    const provider = providerStore.getRandomProvider()
    if (!provider) {
      toast.error('没有可用的渠道')
      return false
    }

    store.isGenerating = true
    store.setTopic(topic)

    try {
      const prompt = `你是一个小红书内容创作专家。请为以下主题创作一篇小红书笔记：

主题：${topic}

请输出：
1. 吸引人的标题（带表情符号）
2. 正文内容（300-500字，分段，带表情符号）
3. 标签（5-8个相关话题标签）
4. 分镜规划（4-6张配图的描述，每张图片用于AI绘画的英文提示词）

请按以下JSON格式输出：
{
  "title": "标题",
  "content": "正文内容",
  "tags": ["标签1", "标签2"],
  "storyboard": [
    {"description": "第1张图描述", "imagePrompt": "English prompt for AI image generation"},
    {"description": "第2张图描述", "imagePrompt": "English prompt for AI image generation"}
  ]
}`

      let text = ''

      if (provider.type === 'gemini') {
        const url = resolveGeminiGenerateUrl(provider.baseUrl, provider.model, provider.apiKey)
        const data = await jsonFetch<GeminiTextResponse>({
          url,
          data: { contents: [{ parts: [{ text: prompt }] }] }
        })
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      } else {
        const url = resolveOpenAIChatCompletionsUrl(provider.baseUrl)
        const data = await jsonFetch<OpenAIChatResponse>({
          url,
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          data: { model: provider.model, messages: [{ role: 'user', content: prompt }] }
        })
        text = data.choices?.[0]?.message?.content || ''
      }

      // 尝试解析 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as XHSStructured

        store.setStructured({
          title: parsed.title || '',
          body: parsed.content || '',
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        })

        const storyboard: StoryboardItem[] = (parsed.storyboard || []).map((item, index: number) => ({
          id: crypto.randomUUID(),
          description: item.description || `第${index + 1}张图`,
          imagePrompt: item.imagePrompt || item.prompt || ''
        }))
        store.setStoryboard(storyboard)

        toast.success('内容生成完成')
        return true
      }

      // 如果无法解析 JSON，直接使用文本
      store.setContent(text)
      toast.warning('内容已生成', '无法解析分镜，请手动添加')
      return true
    } catch (err: unknown) {
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : (err as { message?: string })?.message || '未知错误'
      toast.error('生成失败', message)
      return false
    } finally {
      store.isGenerating = false
    }
  }

  // 生成单张分镜图片
  const generateStoryboardImage = async (item: StoryboardItem) => {
    if (!item.imagePrompt) {
      toast.warning('没有图片提示词')
      return false
    }

    const result = await generateImage({
      prompt: item.imagePrompt,
      resolution: '1K',
      aspectRatio: '1:1'
    })

    if (result.success && result.images.length > 0) {
      const firstImage = result.images[0]
      if (firstImage) {
        store.updateStoryboardImage(item.id, {
          data: firstImage.data,
          mimeType: firstImage.mimeType
        })
        return true
      }
    }

    return false
  }

  // 批量生成所有分镜图片
  const generateAllStoryboardImages = async () => {
    const items = store.currentStoryboard.filter((s: StoryboardItem) => !s.image && s.imagePrompt)

    if (items.length === 0) {
      toast.info('没有需要生成的图片')
      return
    }

    toast.info('开始批量生成', `共 ${items.length} 张图片`)

    let successCount = 0
    for (const item of items) {
      if (await generateStoryboardImage(item)) {
        successCount++
      }
    }

    toast.success('批量生成完成', `成功 ${successCount}/${items.length}`)
  }

  // 保存
  const saveToHistory = () => {
    store.saveToHistory()
    toast.success('已保存到历史记录')
  }

  // 删除历史
  const deleteHistory = (id: string) => {
    store.deleteHistory(id)
    toast.info('历史记录已删除')
  }

  // 清空全部历史
  const clearAllHistory = () => {
    store.clearAllHistory()
    toast.info('所有历史记录已清空')
  }

  return {
    // State
    history: computed(() => store.history),
    sortedHistory: computed(() => store.sortedHistory),
    currentTopic: computed(() => store.currentTopic),
    currentTitle: computed(() => store.currentTitle),
    currentBody: computed(() => store.currentBody),
    currentTags: computed(() => store.currentTags),
    currentContent: computed(() => store.currentContent),
    currentStoryboard: computed(() => store.currentStoryboard),
    isGenerating: computed(() => store.isGenerating || isGenerating.value),
    progress,
    hasContent: computed(() => store.hasContent),
    hasStoryboard: computed(() => store.hasStoryboard),
    completedImages: computed(() => store.completedImages),

    // Actions
    setTopic: store.setTopic.bind(store),
    generateContent,
    generateStoryboardImage,
    generateAllStoryboardImages,
    saveToHistory,
    loadFromHistory: store.loadFromHistory.bind(store),
    deleteHistory,
    clearAllHistory,
    clearCurrent: store.clearCurrent.bind(store)
  }
}
