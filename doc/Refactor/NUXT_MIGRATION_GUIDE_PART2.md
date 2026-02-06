# Nuxt 4 迁移指南 - 第二部分

**版本**: v2.0.0 (Nuxt 4 + Nuxt UI 4)
**日期**: 2026-02-06
**技术栈**: Nuxt 4 + Vue 3 + Nuxt UI 4 + Tailwind CSS + Vite 7.x

---

### 4.5 提示词工具模块

#### 4.5.1 BananaTool 迁移

**Composable (`app/composables/useBananaTool.ts`)**

```typescript
// app/composables/useBananaTool.ts
export interface BananaPrompt {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
}

export function useBananaTool() {
  const prompts = ref<BananaPrompt[]>([])
  const categories = ref<string[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 数据源 URL（多源容错）
  const dataSources = [
    'https://raw.githubusercontent.com/glidea/banana-prompt-quicker/main/data/prompts.json',
    '/api/prompts/banana' // 本地代理备用
  ]

  // 加载提示词数据
  async function loadPrompts() {
    isLoading.value = true
    error.value = null

    for (const source of dataSources) {
      try {
        const data = await $fetch<BananaPrompt[]>(source)
        prompts.value = data

        // 提取分类
        const cats = new Set<string>()
        data.forEach(p => cats.add(p.category))
        categories.value = Array.from(cats)

        // 缓存到 localStorage
        localStorage.setItem('banana_prompts_cache', JSON.stringify(data))
        localStorage.setItem('banana_prompts_timestamp', Date.now().toString())

        isLoading.value = false
        return
      } catch (e) {
        console.warn(`Failed to load from ${source}`, e)
      }
    }

    // 所有源失败，尝试使用缓存
    const cached = localStorage.getItem('banana_prompts_cache')
    if (cached) {
      prompts.value = JSON.parse(cached)
      categories.value = [...new Set(prompts.value.map(p => p.category))]
    } else {
      error.value = '加载提示词库失败'
    }

    isLoading.value = false
  }

  // 搜索提示词
  function searchPrompts(keyword: string, category?: string): BananaPrompt[] {
    let results = prompts.value

    if (category && category !== 'all') {
      results = results.filter(p => p.category === category)
    }

    if (keyword.trim()) {
      const kw = keyword.toLowerCase()
      results = results.filter(p =>
        p.title.toLowerCase().includes(kw) ||
        p.content.toLowerCase().includes(kw) ||
        p.tags.some(t => t.toLowerCase().includes(kw))
      )
    }

    return results
  }

  // 复制到剪贴板
  async function copyPrompt(prompt: BananaPrompt) {
    await navigator.clipboard.writeText(prompt.content)
    useToast().success('已复制到剪贴板')
  }

  // 初始化
  onMounted(() => {
    // 检查缓存是否过期（24小时）
    const timestamp = localStorage.getItem('banana_prompts_timestamp')
    const isExpired = !timestamp || Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000

    if (isExpired || prompts.value.length === 0) {
      loadPrompts()
    } else {
      const cached = localStorage.getItem('banana_prompts_cache')
      if (cached) {
        prompts.value = JSON.parse(cached)
        categories.value = [...new Set(prompts.value.map(p => p.category))]
      }
    }
  })

  return {
    prompts: readonly(prompts),
    categories: readonly(categories),
    isLoading: readonly(isLoading),
    error: readonly(error),
    loadPrompts,
    searchPrompts,
    copyPrompt
  }
}
```

#### 4.5.2 CustomPromptTool 迁移

**Pinia Store (`stores/prompts.ts`)**

```typescript
// stores/prompts.ts
import { defineStore } from 'pinia'

export interface CustomPrompt {
  id: string
  title: string
  content: string
  category: string
  createdAt: number
  updatedAt: number
}

export const usePromptsStore = defineStore('prompts', () => {
  const prompts = ref<CustomPrompt[]>([])

  // 添加提示词
  function addPrompt(data: Omit<CustomPrompt, 'id' | 'createdAt' | 'updatedAt'>): CustomPrompt {
    const prompt: CustomPrompt = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    prompts.value.push(prompt)
    return prompt
  }

  // 更新提示词
  function updatePrompt(id: string, data: Partial<Omit<CustomPrompt, 'id' | 'createdAt'>>) {
    const index = prompts.value.findIndex(p => p.id === id)
    if (index !== -1) {
      prompts.value[index] = {
        ...prompts.value[index],
        ...data,
        updatedAt: Date.now()
      }
    }
  }

  // 删除提示词
  function deletePrompt(id: string) {
    prompts.value = prompts.value.filter(p => p.id !== id)
  }

  // 搜索提示词
  function searchPrompts(keyword: string): CustomPrompt[] {
    if (!keyword.trim()) return prompts.value

    const kw = keyword.toLowerCase()
    return prompts.value.filter(p =>
      p.title.toLowerCase().includes(kw) ||
      p.content.toLowerCase().includes(kw)
    )
  }

  // 按分类获取
  function getByCategory(category: string): CustomPrompt[] {
    return prompts.value.filter(p => p.category === category)
  }

  // 获取所有分类
  const categories = computed(() => {
    return [...new Set(prompts.value.map(p => p.category))]
  })

  return {
    prompts,
    categories,
    addPrompt,
    updatePrompt,
    deletePrompt,
    searchPrompts,
    getByCategory
  }
}, {
  persist: {
    key: 'custom_prompts',
    storage: localStorage
  }
})
```

**组件 (`app/components/tools/BananaTool.vue`)**

```vue
<!-- app/components/tools/BananaTool.vue -->
<script setup lang="ts">
const { prompts, categories, isLoading, searchPrompts, copyPrompt } = useBananaTool()
const promptsStore = usePromptsStore()
const emit = defineEmits<{
  (e: 'select', content: string): void
}>()

// 搜索状态
const searchKeyword = ref('')
const selectedCategory = ref('all')

// 搜索结果
const searchResults = computed(() => {
  return searchPrompts(searchKeyword.value, selectedCategory.value)
})

// 应用提示词
function handleApply(content: string) {
  emit('select', content)
}

// 保存到我的提示词
function handleSave(prompt: BananaPrompt) {
  promptsStore.addPrompt({
    title: prompt.title,
    content: prompt.content,
    category: prompt.category
  })
  useToast().success('已保存到我的提示词')
}
</script>

<template>
  <div class="banana-tool">
    <div class="search-bar">
      <UInput
        v-model="searchKeyword"
        placeholder="搜索提示词..."
        icon="i-heroicons-magnifying-glass"
      />
      <USelectMenu
        v-model="selectedCategory"
        :items="['all', ...categories]"
        placeholder="分类"
      />
    </div>

    <div v-if="isLoading" class="loading">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
      加载中...
    </div>

    <div v-else class="prompt-list">
      <div
        v-for="prompt in searchResults"
        :key="prompt.id"
        class="prompt-card"
      >
        <div class="prompt-header">
          <span class="title">{{ prompt.title }}</span>
          <UBadge size="xs">{{ prompt.category }}</UBadge>
        </div>
        <p class="content">{{ prompt.content }}</p>
        <div class="actions">
          <UButton size="xs" variant="ghost" @click="copyPrompt(prompt)">
            复制
          </UButton>
          <UButton size="xs" variant="ghost" @click="handleApply(prompt.content)">
            应用
          </UButton>
          <UButton size="xs" variant="ghost" @click="handleSave(prompt)">
            收藏
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.banana-tool {
  @apply space-y-4;
}
.search-bar {
  @apply flex gap-2;
}
.prompt-list {
  @apply space-y-2 max-h-96 overflow-y-auto;
}
.prompt-card {
  @apply p-3 rounded-lg border bg-white dark:bg-gray-800;
}
.prompt-header {
  @apply flex justify-between items-center mb-2;
}
.title {
  @apply font-medium;
}
.content {
  @apply text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2;
}
.actions {
  @apply flex gap-1;
}
</style>
```

---

### 4.6 图片切片工具

**Composable (`app/composables/useSlicer.ts`)**

```typescript
// app/composables/useSlicer.ts
import JSZip from 'jszip'

export interface SliceConfig {
  rows: number
  cols: number
  gap: number
  fillColor: string
  autoFill: boolean
  highRes: boolean // 2x 输出
}

export interface SliceResult {
  row: number
  col: number
  dataUrl: string
  blob: Blob
}

export function useSlicer() {
  const config = reactive<SliceConfig>({
    rows: 3,
    cols: 3,
    gap: 0,
    fillColor: '#ffffff',
    autoFill: false,
    highRes: false
  })

  const sourceImage = ref<HTMLImageElement | null>(null)
  const slices = ref<SliceResult[]>([])
  const isProcessing = ref(false)

  // 加载图片
  async function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        sourceImage.value = img
        resolve(img)
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  // 加载 Base64 图片
  async function loadBase64Image(base64: string, mimeType = 'image/png'): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        sourceImage.value = img
        resolve(img)
      }
      img.onerror = reject
      img.src = `data:${mimeType};base64,${base64}`
    })
  }

  // 执行切片
  async function slice(): Promise<SliceResult[]> {
    if (!sourceImage.value) {
      throw new Error('请先加载图片')
    }

    isProcessing.value = true
    slices.value = []

    try {
      const img = sourceImage.value
      const { rows, cols, gap, fillColor, autoFill, highRes } = config

      // 计算每个切片的尺寸
      const sliceWidth = Math.floor((img.width - gap * (cols - 1)) / cols)
      const sliceHeight = Math.floor((img.height - gap * (rows - 1)) / rows)

      // 输出尺寸（支持 2x）
      const outputScale = highRes ? 2 : 1
      const outputWidth = sliceWidth * outputScale
      const outputHeight = sliceHeight * outputScale

      const results: SliceResult[] = []

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const canvas = document.createElement('canvas')
          canvas.width = outputWidth
          canvas.height = outputHeight
          const ctx = canvas.getContext('2d')!

          // 填充背景色
          if (autoFill || fillColor) {
            ctx.fillStyle = autoFill ? getEdgeColor(img, row, col, sliceWidth, sliceHeight) : fillColor
            ctx.fillRect(0, 0, outputWidth, outputHeight)
          }

          // 计算源图位置
          const sx = col * (sliceWidth + gap)
          const sy = row * (sliceHeight + gap)

          // 绘制切片
          ctx.drawImage(
            img,
            sx, sy, sliceWidth, sliceHeight,
            0, 0, outputWidth, outputHeight
          )

          // 转换为 Blob
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob(blob => resolve(blob!), 'image/png')
          })

          results.push({
            row,
            col,
            dataUrl: canvas.toDataURL('image/png'),
            blob
          })
        }
      }

      slices.value = results
      return results
    } finally {
      isProcessing.value = false
    }
  }

  // 获取边缘颜色（用于自动填充）
  function getEdgeColor(
    img: HTMLImageElement,
    row: number,
    col: number,
    sliceWidth: number,
    sliceHeight: number
  ): string {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')!

    // 取切片边缘中心点颜色
    const sx = col * sliceWidth + sliceWidth / 2
    const sy = row * sliceHeight

    ctx.drawImage(img, sx, sy, 1, 1, 0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data

    return `rgb(${r}, ${g}, ${b})`
  }

  // 九宫格快捷方法
  function setNineGrid() {
    config.rows = 3
    config.cols = 3
  }

  // 打包下载
  async function downloadAll(filename = 'slices'): Promise<void> {
    if (slices.value.length === 0) {
      throw new Error('没有可下载的切片')
    }

    const zip = new JSZip()

    slices.value.forEach((slice, index) => {
      const name = `${filename}_${slice.row + 1}_${slice.col + 1}.png`
      zip.file(name, slice.blob)
    })

    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)

    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.zip`
    a.click()

    URL.revokeObjectURL(url)
    useToast().success('下载完成')
  }

  // 下载单个切片
  function downloadSlice(slice: SliceResult, filename?: string) {
    const name = filename || `slice_${slice.row + 1}_${slice.col + 1}.png`
    const a = document.createElement('a')
    a.href = slice.dataUrl
    a.download = name
    a.click()
  }

  // 清空
  function clear() {
    sourceImage.value = null
    slices.value = []
  }

  return {
    config,
    sourceImage: readonly(sourceImage),
    slices: readonly(slices),
    isProcessing: readonly(isProcessing),
    loadImage,
    loadBase64Image,
    slice,
    setNineGrid,
    downloadAll,
    downloadSlice,
    clear
  }
}
```

---

### 4.7 文件系统管理器

> 参考: [VueUse useFileSystemAccess](https://vueuse.org/core/useFileSystemAccess)

**Composable (`app/composables/useFileSystem.ts`)**

```typescript
// app/composables/useFileSystem.ts
export function useFileSystem() {
  const directoryHandle = ref<FileSystemDirectoryHandle | null>(null)
  const isSupported = ref(false)
  const isEnabled = ref(false)

  // 检查浏览器支持
  onMounted(() => {
    isSupported.value = 'showDirectoryPicker' in window
  })

  // 选择保存目录
  async function selectDirectory(): Promise<boolean> {
    if (!isSupported.value) {
      useToast().error('当前浏览器不支持文件系统 API')
      return false
    }

    try {
      directoryHandle.value = await window.showDirectoryPicker({
        mode: 'readwrite'
      })
      isEnabled.value = true
      useToast().success('已设置自动保存目录')
      return true
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        useToast().error('选择目录失败')
      }
      return false
    }
  }

  // 保存单个图片
  async function saveImage(
    data: string,
    filename: string,
    mimeType = 'image/png'
  ): Promise<boolean> {
    if (!directoryHandle.value || !isEnabled.value) {
      return false
    }

    try {
      // 验证权限
      const permission = await directoryHandle.value.queryPermission({ mode: 'readwrite' })
      if (permission !== 'granted') {
        const request = await directoryHandle.value.requestPermission({ mode: 'readwrite' })
        if (request !== 'granted') {
          isEnabled.value = false
          return false
        }
      }

      // Base64 转 Blob
      const binary = atob(data)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: mimeType })

      // 创建文件并写入
      const fileHandle = await directoryHandle.value.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()

      return true
    } catch (error) {
      console.error('保存文件失败:', error)
      return false
    }
  }

  // 批量保存图片
  async function saveToFileSystem(
    images: Array<{ data: string; mimeType: string }>,
    prefix = 'gemini'
  ): Promise<number> {
    if (!isEnabled.value) return 0

    let saved = 0
    const timestamp = Date.now()

    for (let i = 0; i < images.length; i++) {
      const { data, mimeType } = images[i]
      const ext = mimeType.split('/')[1] || 'png'
      const filename = `${prefix}_${timestamp}_${i + 1}.${ext}`

      if (await saveImage(data, filename, mimeType)) {
        saved++
      }
    }

    if (saved > 0) {
      useToast().success(`已自动保存 ${saved} 张图片`)
    }

    return saved
  }

  // 禁用自动保存
  function disable() {
    directoryHandle.value = null
    isEnabled.value = false
  }

  return {
    isSupported: readonly(isSupported),
    isEnabled: readonly(isEnabled),
    hasDirectory: computed(() => !!directoryHandle.value),
    selectDirectory,
    saveImage,
    saveToFileSystem,
    disable
  }
}
```

---

### 4.8 主题切换模块

**Composable (`app/composables/useTheme.ts`)**

```typescript
// app/composables/useTheme.ts
export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const colorMode = useColorMode() // Nuxt Color Mode 模块

  const theme = computed({
    get: () => colorMode.preference as Theme,
    set: (value: Theme) => {
      colorMode.preference = value
    }
  })

  const isDark = computed(() => colorMode.value === 'dark')

  // 切换主题
  function toggleTheme() {
    theme.value = isDark.value ? 'light' : 'dark'
  }

  // 设置主题
  function setTheme(value: Theme) {
    theme.value = value
  }

  return {
    theme,
    isDark,
    toggleTheme,
    setTheme
  }
}
```

**配置 (`nuxt.config.ts`)**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxtjs/color-mode'
  ],

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: ''
  }
})
```

---

### 4.9 UI 反馈系统

#### 4.9.1 Toast Composable

```typescript
// app/composables/useToast.ts
export interface ToastOptions {
  title?: string
  description?: string
  duration?: number
  icon?: string
}

export function useToast() {
  const toast = useNuxtApp().$toast // 使用 Nuxt UI 的 toast

  function success(message: string, options?: ToastOptions) {
    toast.add({
      title: options?.title || '成功',
      description: message,
      icon: options?.icon || 'i-lucide-check-circle',
      color: 'success',  // Nuxt UI v4 semantic color
      timeout: options?.duration || 3000
    })
  }

  function error(message: string, options?: ToastOptions) {
    toast.add({
      title: options?.title || '错误',
      description: message,
      icon: options?.icon || 'i-lucide-x-circle',
      color: 'error',  // Nuxt UI v4 semantic color (was 'red')
      timeout: options?.duration || 5000
    })
  }

  function warning(message: string, options?: ToastOptions) {
    toast.add({
      title: options?.title || '警告',
      description: message,
      icon: options?.icon || 'i-lucide-alert-triangle',
      color: 'warning',  // Nuxt UI v4 semantic color (was 'yellow')
      timeout: options?.duration || 4000
    })
  }

  function info(message: string, options?: ToastOptions) {
    toast.add({
      title: options?.title || '提示',
      description: message,
      icon: options?.icon || 'i-lucide-info',
      color: 'info',  // Nuxt UI v4 semantic color (was 'blue')
      timeout: options?.duration || 3000
    })
  }

  return { success, error, warning, info }
}
```

#### 4.9.2 Loading 组件

```vue
<!-- app/components/ui/Loading.vue -->
<script setup lang="ts">
defineProps<{
  show: boolean
  text?: string
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="loading-overlay">
        <div class="loading-content">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl" />
          <p v-if="text" class="mt-4">{{ text }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.loading-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center bg-black/50;
}
.loading-content {
  @apply text-center text-white;
}
.fade-enter-active,
.fade-leave-active {
  @apply transition-opacity duration-200;
}
.fade-enter-from,
.fade-leave-to {
  @apply opacity-0;
}
</style>
```

#### 4.9.3 SmartProgressBar 组件

```vue
<!-- app/components/ui/SmartProgressBar.vue -->
<script setup lang="ts">
const props = defineProps<{
  progress: number
  task?: string | null
  estimatedTime?: number
}>()

const displayProgress = computed(() => Math.min(100, Math.max(0, props.progress)))

const timeRemaining = computed(() => {
  if (!props.estimatedTime || props.progress >= 100) return null
  const remaining = (props.estimatedTime * (100 - props.progress)) / 100
  return Math.ceil(remaining / 1000)
})
</script>

<template>
  <div class="smart-progress">
    <div class="progress-header">
      <span class="task">{{ task || '处理中...' }}</span>
      <span class="percentage">{{ Math.round(displayProgress) }}%</span>
    </div>

    <UProgress :value="displayProgress" />

    <div v-if="timeRemaining" class="time-remaining">
      预计剩余 {{ timeRemaining }} 秒
    </div>
  </div>
</template>

<style scoped>
.smart-progress {
  @apply space-y-2;
}
.progress-header {
  @apply flex justify-between text-sm;
}
.task {
  @apply text-gray-600 dark:text-gray-400;
}
.percentage {
  @apply font-medium;
}
.time-remaining {
  @apply text-xs text-gray-500 text-right;
}
</style>
```

#### 4.9.4 Lightbox 组件

```vue
<!-- app/components/ui/Lightbox.vue -->
<script setup lang="ts">
const props = defineProps<{
  images: Array<{ src: string; alt?: string }>
  initialIndex?: number
}>()

const isOpen = defineModel<boolean>('open', { default: false })
const currentIndex = ref(props.initialIndex || 0)

const currentImage = computed(() => props.images[currentIndex.value])

function next() {
  currentIndex.value = (currentIndex.value + 1) % props.images.length
}

function prev() {
  currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length
}

// 键盘导航
function handleKeydown(e: KeyboardEvent) {
  if (!isOpen.value) return
  if (e.key === 'Escape') isOpen.value = false
  if (e.key === 'ArrowRight') next()
  if (e.key === 'ArrowLeft') prev()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ width: 'max-w-5xl' }">
    <template #content>
    <div class="lightbox">
      <img :src="currentImage?.src" :alt="currentImage?.alt" class="main-image" />

      <div v-if="images.length > 1" class="navigation">
        <UButton
          variant="ghost"
          icon="i-heroicons-chevron-left"
          @click="prev"
          class="nav-btn"
        />
        <span class="counter">{{ currentIndex + 1 }} / {{ images.length }}</span>
        <UButton
          variant="ghost"
          icon="i-heroicons-chevron-right"
          @click="next"
          class="nav-btn"
        />
      </div>

      <UButton
        variant="ghost"
        icon="i-heroicons-x-mark"
        @click="isOpen = false"
        class="close-btn"
      />
    </div>
    </template>
  </UModal>
</template>

<style scoped>
.lightbox {
  @apply relative p-4;
}
.main-image {
  @apply max-h-[80vh] w-full object-contain;
}
.navigation {
  @apply flex items-center justify-center gap-4 mt-4;
}
.counter {
  @apply text-sm text-gray-500;
}
.close-btn {
  @apply absolute top-2 right-2;
}
</style>
```

---

### 4.10 表情包制作模式

#### 4.10.1 原代码分析

根据 PRD 3.7 节，表情包制作模式具有以下预设参数：
- 风格：LINE 风格（简洁可爱的贴纸风格）
- 长宽比：16:9
- 分辨率：4K
- 专用提示词模板

#### 4.10.2 完整代码示例

**Composable (`app/composables/useStickerMode.ts`)**

```typescript
// app/composables/useStickerMode.ts
export interface StickerPreset {
  style: string
  aspectRatio: string
  resolution: '1K' | '2K' | '4K'
  promptTemplate: string
}

export interface StickerConfig {
  character: string
  emotion: string
  action: string
  background: 'transparent' | 'white' | 'custom'
  customBackground?: string
}

export function useStickerMode() {
  const { generateImage } = useImageGeneration()
  const toast = useToast()

  // 表情包模式是否激活
  const isActive = ref(false)

  // 预设配置
  const preset: StickerPreset = {
    style: 'LINE',
    aspectRatio: '1:1',  // 表情包通常是正方形
    resolution: '4K',
    promptTemplate: `Create a cute LINE-style sticker illustration.
Style: Simple, flat design with bold outlines, minimal shading, kawaii aesthetic.
Background: {background}
Character: {character}
Emotion: {emotion}
Action: {action}
Requirements:
- Clean vector-like appearance
- Expressive and exaggerated features
- Suitable for messaging app sticker
- High contrast and visibility at small sizes`
  }

  // 可用的表情列表
  const emotions = [
    { label: '开心', value: 'happy, smiling, joyful' },
    { label: '难过', value: 'sad, crying, tearful' },
    { label: '生气', value: 'angry, furious, upset' },
    { label: '惊讶', value: 'surprised, shocked, amazed' },
    { label: '困惑', value: 'confused, puzzled, questioning' },
    { label: '害羞', value: 'shy, blushing, embarrassed' },
    { label: '得意', value: 'proud, smug, confident' },
    { label: '疲惫', value: 'tired, sleepy, exhausted' },
    { label: '爱心', value: 'loving, hearts in eyes, adoring' },
    { label: '无语', value: 'speechless, blank expression, done' }
  ]

  // 可用的动作列表
  const actions = [
    { label: '挥手', value: 'waving hand, greeting' },
    { label: '竖大拇指', value: 'thumbs up, approving' },
    { label: '鼓掌', value: 'clapping hands, applauding' },
    { label: '跳舞', value: 'dancing, celebrating' },
    { label: '吃东西', value: 'eating, munching' },
    { label: '睡觉', value: 'sleeping, snoring with zzz' },
    { label: '思考', value: 'thinking, hand on chin' },
    { label: '奔跑', value: 'running, rushing' },
    { label: '拥抱', value: 'hugging, arms open' },
    { label: '比心', value: 'making heart shape with hands' }
  ]

  // 激活表情包模式
  function activate() {
    isActive.value = true
    toast.info('已进入表情包制作模式')
  }

  // 退出表情包模式
  function deactivate() {
    isActive.value = false
    toast.info('已退出表情包制作模式')
  }

  // 构建提示词
  function buildPrompt(config: StickerConfig): string {
    let background = 'pure white background, #FFFFFF'
    if (config.background === 'transparent') {
      background = 'transparent background, PNG with alpha channel'
    } else if (config.background === 'custom' && config.customBackground) {
      background = config.customBackground
    }

    return preset.promptTemplate
      .replace('{background}', background)
      .replace('{character}', config.character)
      .replace('{emotion}', config.emotion)
      .replace('{action}', config.action)
  }

  // 生成单个表情包
  async function generateSticker(config: StickerConfig) {
    const prompt = buildPrompt(config)

    return generateImage({
      prompt,
      resolution: preset.resolution,
      aspectRatio: preset.aspectRatio
    })
  }

  // 批量生成表情包套装
  async function generateStickerPack(
    character: string,
    selectedEmotions: string[],
    background: StickerConfig['background'] = 'white'
  ) {
    const results = []

    for (const emotion of selectedEmotions) {
      try {
        const result = await generateSticker({
          character,
          emotion,
          action: '',
          background
        })
        results.push({ emotion, result })
      } catch (error) {
        console.error(`Failed to generate sticker for ${emotion}`, error)
      }
    }

    toast.success(`成功生成 ${results.length} 个表情包`)
    return results
  }

  return {
    isActive: readonly(isActive),
    preset,
    emotions,
    actions,
    activate,
    deactivate,
    buildPrompt,
    generateSticker,
    generateStickerPack
  }
}
```

**组件 (`app/components/tools/StickerMode.vue`)**

```vue
<!-- app/components/tools/StickerMode.vue -->
<script setup lang="ts">
const {
  isActive,
  emotions,
  actions,
  activate,
  deactivate,
  generateSticker,
  generateStickerPack
} = useStickerMode()

const { state: genState } = useImageGeneration()

// 表单状态
const character = ref('可爱的柴犬')
const selectedEmotion = ref(emotions[0].value)
const selectedAction = ref('')
const background = ref<'transparent' | 'white' | 'custom'>('white')
const selectedEmotions = ref<string[]>([])

// 单个生成
async function handleGenerate() {
  if (!character.value.trim()) {
    useToast().error('请输入角色描述')
    return
  }

  await generateSticker({
    character: character.value,
    emotion: selectedEmotion.value,
    action: selectedAction.value,
    background: background.value
  })
}

// 批量生成
async function handleBatchGenerate() {
  if (!character.value.trim()) {
    useToast().error('请输入角色描述')
    return
  }

  if (selectedEmotions.value.length === 0) {
    useToast().error('请选择至少一个表情')
    return
  }

  await generateStickerPack(
    character.value,
    selectedEmotions.value,
    background.value
  )
}
</script>

<template>
  <div class="sticker-mode">
    <!-- 模式切换 -->
    <div class="mode-header">
      <h3>表情包制作</h3>
      <USwitch
        :model-value="isActive"
        @update:model-value="isActive ? deactivate() : activate()"
      />
    </div>

    <div v-if="isActive" class="sticker-form">
      <!-- 角色描述 -->
      <UFormField label="角色描述">
        <UInput
          v-model="character"
          placeholder="如：可爱的柴犬、圆滚滚的熊猫"
        />
      </UFormField>

      <!-- 表情选择 -->
      <UFormField label="表情">
        <USelectMenu
          v-model="selectedEmotion"
          :items="emotions"
          value-attribute="value"
          option-attribute="label"
        />
      </UFormField>

      <!-- 动作选择 -->
      <UFormField label="动作（可选）">
        <USelectMenu
          v-model="selectedAction"
          :items="[{ label: '无', value: '' }, ...actions]"
          value-attribute="value"
          option-attribute="label"
        />
      </UFormField>

      <!-- 背景选择 -->
      <UFormField label="背景">
        <URadioGroup v-model="background" :items="[
          { label: '白色背景', value: 'white' },
          { label: '透明背景', value: 'transparent' }
        ]" />
      </UFormField>

      <!-- 生成按钮 -->
      <div class="actions">
        <UButton
          @click="handleGenerate"
          :loading="genState.isGenerating"
          color="primary"
        >
          生成表情包
        </UButton>
      </div>

      <!-- 批量生成区域 -->
      <UDivider label="批量生成" />

      <UFormField label="选择多个表情">
        <div class="emotion-grid">
          <UCheckbox
            v-for="emotion in emotions"
            :key="emotion.value"
            :label="emotion.label"
            :model-value="selectedEmotions.includes(emotion.value)"
            @update:model-value="(checked) => {
              if (checked) {
                selectedEmotions.push(emotion.value)
              } else {
                selectedEmotions = selectedEmotions.filter(e => e !== emotion.value)
              }
            }"
          />
        </div>
      </UFormField>

      <UButton
        @click="handleBatchGenerate"
        :loading="genState.isGenerating"
        :disabled="selectedEmotions.length === 0"
        variant="outline"
      >
        批量生成 ({{ selectedEmotions.length }} 个)
      </UButton>
    </div>
  </div>
</template>

<style scoped>
.sticker-mode {
  @apply space-y-4 p-4 border rounded-lg;
}
.mode-header {
  @apply flex justify-between items-center;
}
.sticker-form {
  @apply space-y-4;
}
.actions {
  @apply flex gap-2;
}
.emotion-grid {
  @apply grid grid-cols-2 gap-2;
}
</style>
```

---

### 4.11 工具函数库

#### 4.11.1 原代码分析

根据 PRD 3.12 节，工具函数库包含：
- `escapeHtml` - HTML 特殊字符转义，防止 XSS
- `BlobManager` - Blob URL 生命周期管理
- `downloadImage` - 图片下载功能封装
- `base64ToBlobUrl` - Base64 编码转 Blob URL

#### 4.11.2 完整代码示例

**HTML 转义 (`app/utils/escapeHtml.ts`)**

```typescript
// app/utils/escapeHtml.ts
// Nuxt 会自动导入此函数

const htmlEscapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
}

/**
 * 转义 HTML 特殊字符，防止 XSS 攻击
 * @param str 需要转义的字符串
 * @returns 转义后的安全字符串
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, char => htmlEscapeMap[char])
}

/**
 * 反转义 HTML 字符
 * @param str 需要反转义的字符串
 * @returns 原始字符串
 */
export function unescapeHtml(str: string): string {
  const reverseMap: Record<string, string> = {}
  for (const [key, value] of Object.entries(htmlEscapeMap)) {
    reverseMap[value] = key
  }

  return str.replace(/&(amp|lt|gt|quot|#039|#x2F|#x60|#x3D);/g, entity => {
    return reverseMap[entity] || entity
  })
}
```

**Blob 管理器 (`app/utils/blobManager.ts`)**

```typescript
// app/utils/blobManager.ts
// 管理 Blob URL 的生命周期，防止内存泄漏

class BlobManagerClass {
  private urls: Map<string, { url: string; createdAt: number }> = new Map()
  private maxAge = 5 * 60 * 1000 // 5 分钟过期

  /**
   * 创建 Blob URL 并注册管理
   */
  create(blob: Blob, key?: string): string {
    const url = URL.createObjectURL(blob)
    const id = key || url

    this.urls.set(id, {
      url,
      createdAt: Date.now()
    })

    return url
  }

  /**
   * 从 Base64 创建 Blob URL
   */
  createFromBase64(base64: string, mimeType = 'image/png', key?: string): string {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: mimeType })
    return this.create(blob, key)
  }

  /**
   * 释放指定的 Blob URL
   */
  revoke(keyOrUrl: string): void {
    const entry = this.urls.get(keyOrUrl)
    if (entry) {
      URL.revokeObjectURL(entry.url)
      this.urls.delete(keyOrUrl)
    } else {
      // 直接尝试作为 URL 释放
      URL.revokeObjectURL(keyOrUrl)
    }
  }

  /**
   * 释放所有 Blob URL
   */
  revokeAll(): void {
    for (const [key, entry] of this.urls) {
      URL.revokeObjectURL(entry.url)
    }
    this.urls.clear()
  }

  /**
   * 清理过期的 Blob URL
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.urls) {
      if (now - entry.createdAt > this.maxAge) {
        URL.revokeObjectURL(entry.url)
        this.urls.delete(key)
      }
    }
  }

  /**
   * 获取当前管理的 URL 数量
   */
  get size(): number {
    return this.urls.size
  }
}

// 导出单例
export const BlobManager = new BlobManagerClass()

// 自动清理（每分钟执行一次）
if (typeof window !== 'undefined') {
  setInterval(() => BlobManager.cleanup(), 60 * 1000)
}
```

**图片下载 (`app/utils/downloadImage.ts`)**

```typescript
// app/utils/downloadImage.ts

export interface DownloadOptions {
  filename?: string
  mimeType?: string
}

/**
 * 从 Base64 下载图片
 */
export function downloadImageFromBase64(
  base64: string,
  options: DownloadOptions = {}
): void {
  const { filename = `image_${Date.now()}.png`, mimeType = 'image/png' } = options

  const link = document.createElement('a')
  link.href = `data:${mimeType};base64,${base64}`
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 从 Blob URL 下载图片
 */
export function downloadImageFromBlobUrl(
  blobUrl: string,
  options: DownloadOptions = {}
): void {
  const { filename = `image_${Date.now()}.png` } = options

  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 从 Blob 对象下载图片
 */
export function downloadImageFromBlob(
  blob: Blob,
  options: DownloadOptions = {}
): void {
  const url = URL.createObjectURL(blob)
  downloadImageFromBlobUrl(url, options)
  // 延迟释放，确保下载完成
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 从 Canvas 下载图片
 */
export function downloadImageFromCanvas(
  canvas: HTMLCanvasElement,
  options: DownloadOptions = {}
): void {
  const { filename = `image_${Date.now()}.png`, mimeType = 'image/png' } = options

  canvas.toBlob(blob => {
    if (blob) {
      downloadImageFromBlob(blob, { filename, mimeType })
    }
  }, mimeType)
}

/**
 * 从 URL 下载图片（跨域需服务器支持）
 */
export async function downloadImageFromUrl(
  url: string,
  options: DownloadOptions = {}
): Promise<void> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    downloadImageFromBlob(blob, options)
  } catch (error) {
    console.error('下载图片失败:', error)
    throw error
  }
}
```

**Base64 工具 (`app/utils/base64Utils.ts`)**

```typescript
// app/utils/base64Utils.ts

/**
 * Base64 转 Blob URL
 */
export function base64ToBlobUrl(base64: string, mimeType = 'image/png'): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: mimeType })
  return URL.createObjectURL(blob)
}

/**
 * Base64 转 Blob 对象
 */
export function base64ToBlob(base64: string, mimeType = 'image/png'): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

/**
 * Blob 转 Base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // 移除 data URL 前缀
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 文件转 Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return blobToBase64(file)
}

/**
 * URL 转 Base64（需同源或 CORS 支持）
 */
export async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const blob = await response.blob()
  return blobToBase64(blob)
}

/**
 * 压缩 Base64 图片
 * @param base64 原始 Base64
 * @param quality 质量 0-1
 * @param maxWidth 最大宽度
 */
export async function compressBase64Image(
  base64: string,
  mimeType = 'image/png',
  quality = 0.8,
  maxWidth = 1920
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      // 缩放
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      // 导出
      const outputMime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
      const dataUrl = canvas.toDataURL(outputMime, quality)
      resolve(dataUrl.split(',')[1])
    }
    img.onerror = reject
    img.src = `data:${mimeType};base64,${base64}`
  })
}
```

#### 4.11.3 使用示例

```vue
<!-- 在组件中使用工具函数 -->
<script setup lang="ts">
// 工具函数自动导入，无需 import

// 转义用户输入
const userInput = ref('')
const safeHtml = computed(() => escapeHtml(userInput.value))

// 管理 Blob URL
const imageUrls = ref<string[]>([])

function addImage(base64: string) {
  const url = BlobManager.createFromBase64(base64)
  imageUrls.value.push(url)
}

// 组件卸载时清理
onUnmounted(() => {
  imageUrls.value.forEach(url => BlobManager.revoke(url))
})

// 下载图片
function handleDownload(base64: string, index: number) {
  downloadImageFromBase64(base64, {
    filename: `gemini_${Date.now()}_${index}.png`
  })
}
</script>
```

#### 4.11.4 注意事项

1. **自动导入**: Nuxt 会自动导入 `utils/` 目录下的函数，无需手动 import
2. **内存管理**: 使用 `BlobManager` 统一管理 Blob URL，避免内存泄漏
3. **XSS 防护**: 所有用户输入显示前都应使用 `escapeHtml` 转义
4. **SSR 兼容**: 部分 API（如 `URL.createObjectURL`）仅客户端可用，需使用 `process.client` 检查

---

## 5. 状态管理迁移 (Pinia)

### 5.1 安装配置

```bash
# 安装 Pinia 和持久化插件
pnpm add pinia @pinia/nuxt pinia-plugin-persistedstate
```

**配置 (`nuxt.config.ts`)**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt'
  ],

  pinia: {
    storesDirs: ['./stores/**']
  }
})
```

**持久化插件 (`app/plugins/pinia-persistence.ts`)**

```typescript
// app/plugins/pinia-persistence.ts
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.$pinia.use(piniaPluginPersistedstate)
})
```

### 5.2 Store 设计模式

> 参考: [Pinia 官方文档](https://pinia.vuejs.org/zh/)

**Setup Store 模式（推荐）**

```typescript
// stores/settings.ts
import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const resolution = ref<'1K' | '2K' | '4K'>('2K')
  const aspectRatio = ref('Auto')
  const streamEnabled = ref(true)
  const contextCount = ref(5)
  const autoSaveEnabled = ref(false)

  // 计算属性
  const resolutionLabel = computed(() => {
    const map = { '1K': '1024×1024', '2K': '2048×2048', '4K': '4096×4096' }
    return map[resolution.value]
  })

  // 方法
  function setResolution(value: '1K' | '2K' | '4K') {
    resolution.value = value
  }

  function setAspectRatio(value: string) {
    aspectRatio.value = value
  }

  function toggleStream() {
    streamEnabled.value = !streamEnabled.value
  }

  function setContextCount(count: number) {
    contextCount.value = Math.max(3, Math.min(20, count))
  }

  function toggleAutoSave() {
    autoSaveEnabled.value = !autoSaveEnabled.value
  }

  // 重置所有设置
  function $reset() {
    resolution.value = '2K'
    aspectRatio.value = 'Auto'
    streamEnabled.value = true
    contextCount.value = 5
    autoSaveEnabled.value = false
  }

  return {
    // 状态
    resolution,
    aspectRatio,
    streamEnabled,
    contextCount,
    autoSaveEnabled,
    // 计算属性
    resolutionLabel,
    // 方法
    setResolution,
    setAspectRatio,
    toggleStream,
    setContextCount,
    toggleAutoSave,
    $reset
  }
}, {
  persist: true // 自动持久化所有状态
})
```

### 5.3 Store 组合模式

```typescript
// stores/checkout.ts - 组合多个 Store
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  // 组合其他 stores
  const chatStore = useChatStore()
  const providerStore = useProviderStore()
  const settingsStore = useSettingsStore()

  // 应用级别的计算属性
  const isReady = computed(() => {
    return providerStore.hasProviders && chatStore.currentSessionId
  })

  // 应用初始化
  async function init() {
    await chatStore.init()
    // 其他初始化逻辑
  }

  return {
    isReady,
    init
  }
})
```

---

## 6. API 层迁移

### 6.1 Nuxt Server API

对于需要隐藏 API Key 或处理 CORS 的场景，可以使用 Nuxt Server API 作为代理。

**API 代理 (`server/api/proxy/gemini.post.ts`)**

```typescript
// server/api/proxy/gemini.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = useRuntimeConfig()

  const { provider, payload } = body

  try {
    const response = await $fetch(provider.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: payload
    })

    return response
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'API 请求失败'
    })
  }
})
```

### 6.2 Runtime Config

**配置 (`nuxt.config.ts`)**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // 仅服务端可用
    geminiApiKey: process.env.GEMINI_API_KEY,

    // 客户端和服务端都可用
    public: {
      apiBase: process.env.API_BASE || 'https://generativelanguage.googleapis.com/v1beta'
    }
  }
})
```

**使用 Runtime Config**

```typescript
// 在 Composable 中使用
export function useApi() {
  const config = useRuntimeConfig()

  async function callGeminiAPI(payload: any) {
    return $fetch(`${config.public.apiBase}/models/gemini-2.0-flash-exp:generateContent`, {
      method: 'POST',
      body: payload
    })
  }

  return { callGeminiAPI }
}
```

---

## 7. UI 组件迁移

### 7.1 Nuxt UI 安装

```bash
pnpm add @nuxt/ui
```

**配置 (`nuxt.config.ts`)**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate'
    }
  },

  colorMode: {
    preference: 'system'
  }
})
```

### 7.2 组件映射表

| 原组件/功能 | Nuxt UI v4 组件 |
|------------|-----------------|
| 按钮 | `<UButton>` |
| 输入框 | `<UInput>` |
| 文本域 | `<UTextarea>` |
| 下拉选择 | `<USelect>` or `<USelectMenu>` |
| 开关 | `<USwitch>` (was UToggle) |
| 模态框 | `<UModal>` with `#content` slot |
| 卡片 | `<UCard>` |
| 徽章 | `<UBadge>` |
| 进度条 | `<UProgress>` |
| Toast | `useToast()` |
| 表单字段 | `<UFormField>` (was UFormGroup) |
| 图标 | `<UIcon>` |

### 7.3 Tailwind CSS 配置

**配置 (`tailwind.config.ts`)**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          // ... 其他色阶
          500: '#0ea5e9',
          // ...
        }
      }
    }
  }
}
```

---

## 8. 部署与构建

### 8.1 静态站点生成 (SSG)

```bash
# 生成静态站点
pnpm generate
```

**配置 (`nuxt.config.ts`)**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false, // SPA 模式 (纯前端)

  // 或者使用预渲染
  routeRules: {
    '/': { prerender: true },
    '/xhs': { prerender: true }
  }
})
```

### 8.2 部署到 Vercel

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 部署
vercel
```

### 8.3 部署到 Netlify

**netlify.toml**

```toml
[build]
  command = "pnpm generate"
  publish = ".output/public"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 8.4 部署到 GitHub Pages

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate static files
        run: pnpm generate

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .output/public
```

---

## 9. 常见问题与解决方案

### 9.1 IndexedDB 在 SSR 中的问题

**问题**: IndexedDB 是浏览器 API，在服务端渲染时不可用。

**解决方案**:

```typescript
// 使用 process.client 检查
export function useIndexedDB() {
  if (!process.client) {
    return {
      // 返回空操作的 stub
      getAll: async () => [],
      add: async () => {},
      // ...
    }
  }

  // 正常的 IndexedDB 逻辑
}

// 或者使用 onMounted
onMounted(async () => {
  await db.initDB()
})
```

### 9.2 File System Access API 兼容性

**问题**: 该 API 仅在 Chromium 浏览器中支持。

**解决方案**:

```typescript
const isSupported = computed(() => {
  return process.client && 'showDirectoryPicker' in window
})

// 在模板中
<template>
  <UButton
    v-if="isSupported"
    @click="selectDirectory"
  >
    选择保存目录
  </UButton>
  <p v-else class="text-gray-500">
    当前浏览器不支持自动保存功能
  </p>
</template>
```

### 9.3 Pinia 持久化与 SSR

**问题**: 服务端和客户端状态不一致导致 hydration 错误。

**解决方案**:

```typescript
// 使用 skipHydrate
import { skipHydrate } from 'pinia'

export const useStore = defineStore('store', () => {
  const data = ref([])

  return {
    data: skipHydrate(data) // 跳过 hydration
  }
})

// 或者在 onMounted 中初始化
onMounted(() => {
  store.init()
})
```

### 9.4 大文件 Base64 性能问题

**问题**: 4K 图片的 Base64 字符串很大，影响性能。

**解决方案**:

```typescript
// 使用 Blob URL 替代 Base64
function base64ToBlobUrl(base64: string, mimeType: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: mimeType })
  return URL.createObjectURL(blob)
}

// 记得在组件卸载时释放
onUnmounted(() => {
  blobUrls.forEach(url => URL.revokeObjectURL(url))
})
```

### 9.5 TypeScript 类型报错

**问题**: 某些 Nuxt 自动导入的函数没有类型提示。

**解决方案**:

```typescript
// 手动从 #imports 导入
import { ref, computed, onMounted } from '#imports'

// 或者在 tsconfig.json 中确保包含
{
  "extends": "./.nuxt/tsconfig.json",
  "compilerOptions": {
    "strict": true
  }
}
```

---

## 10. 参考资料

### 官方文档

| 资源 | 链接 |
|------|------|
| Nuxt.js 官方文档 | https://nuxt.com/docs |
| Nuxt 4 升级指南 | https://nuxt.com/docs/getting-started/upgrade |
| Nuxt UI 文档 | https://ui.nuxt.com |
| Pinia 官方文档 | https://pinia.vuejs.org/zh/ |
| VueUse 文档 | https://vueuse.org |
| Tailwind CSS 文档 | https://tailwindcss.com/docs |

### 核心概念

| 概念 | 链接 |
|------|------|
| Nuxt 自动导入 | https://nuxt.com/docs/guide/concepts/auto-imports |
| Composables 目录 | https://nuxt.com/docs/guide/directory-structure/composables |
| Nuxt 目录结构 | https://nuxt.com/docs/guide/directory-structure |
| Pinia Setup Store | https://pinia.vuejs.org/core-concepts/ |
| pinia-plugin-persistedstate | https://prazdevs.github.io/pinia-plugin-persistedstate/ |

### API 参考

| API | 链接 |
|-----|------|
| useFetch | https://nuxt.com/docs/api/composables/use-fetch |
| useRuntimeConfig | https://nuxt.com/docs/api/composables/use-runtime-config |
| useColorMode | https://color-mode.nuxtjs.org |
| File System Access API | https://developer.chrome.com/docs/capabilities/web-apis/file-system-access |

### 示例项目

| 项目 | 链接 |
|------|------|
| Nuxt 官方示例 | https://github.com/nuxt/examples |
| Nuxt UI 示例 | https://github.com/nuxt/ui |
| Pinia + Nuxt 示例 | https://github.com/piniajs/example-nuxt-3 |

---

## 附录：迁移检查清单

- [ ] 项目初始化 (`npx nuxi init`)
- [ ] 安装依赖 (`@nuxt/ui`, `pinia`, `jszip`)
- [ ] 配置 `nuxt.config.ts`
- [ ] 创建目录结构
- [ ] 迁移类型定义到 `types/`
- [ ] 迁移 IndexedDB 逻辑到 Composables
- [ ] 创建 Pinia Stores
- [ ] 迁移 UI 组件
- [ ] 配置主题和样式
- [ ] 测试所有功能
- [ ] 性能优化
- [ ] 部署测试

---

**文档维护者**: Gemini 3 Pro Image Preview Team
**最后更新**: 2026-02-06
