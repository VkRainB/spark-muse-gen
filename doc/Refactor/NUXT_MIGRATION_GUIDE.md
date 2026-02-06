# Gemini 3 Pro Image Preview - Nuxt.js 迁移指南

**版本**: v2.0.0 (Nuxt 4 + Nuxt UI 4)
**日期**: 2026-02-06
**目标框架**: Nuxt 4 + Vue 3 + Nuxt UI 4 + Tailwind CSS

---

## 目录

1. [概述与迁移目标](#1-概述与迁移目标)
2. [技术栈对比](#2-技术栈对比)
3. [项目结构规划](#3-项目结构规划)
4. [核心模块迁移指南](#4-核心模块迁移指南)
   - 4.1 [图像生成模块](#41-图像生成模块)
   - 4.2 [对话管理模块](#42-对话管理模块)
   - 4.3 [API 渠道管理模块](#43-api-渠道管理模块)
   - 4.4 [XHS 灵感实验室模块](#44-xhs-灵感实验室模块)
   - 4.5 [提示词工具模块](#45-提示词工具模块)
   - 4.6 [图片切片工具](#46-图片切片工具)
   - 4.7 [文件系统管理器](#47-文件系统管理器)
   - 4.8 [主题切换模块](#48-主题切换模块)
   - 4.9 [UI 反馈系统](#49-ui-反馈系统)
5. [状态管理迁移 (Pinia)](#5-状态管理迁移-pinia)
6. [API 层迁移](#6-api-层迁移)
7. [UI 组件迁移](#7-ui-组件迁移)
8. [部署与构建](#8-部署与构建)
9. [常见问题与解决方案](#9-常见问题与解决方案)
10. [参考资料](#10-参考资料)

---

## 1. 概述与迁移目标

### 1.1 项目背景

Gemini 3 Pro Image Preview 是一款基于 Google Gemini 3 Pro 模型的现代化图像生成工作台。当前项目采用原生 JavaScript 开发，无框架依赖。为了提升开发效率、代码可维护性和用户体验，计划迁移至 Nuxt.js 框架。

### 1.2 迁移目标

| 目标 | 描述 |
|------|------|
| **模块化架构** | 从单文件 `app.js` 迁移到 Nuxt 模块化结构 |
| **类型安全** | 引入 TypeScript 提升代码质量 |
| **状态管理** | 使用 Pinia 替代散落的状态逻辑 |
| **组件复用** | Vue 组件化提升代码复用率 |
| **SSR/SSG 支持** | 支持服务端渲染和静态站点生成 |
| **开发体验** | 热更新、自动导入、DevTools 支持 |

### 1.3 迁移范围

```
原项目模块                    →  Nuxt.js 目标结构
─────────────────────────────────────────────────────
app.js (单体文件)            →  composables/ + stores/ + components/
index.html                   →  app.vue + layouts/
CSS Variables                →  Nuxt UI + Tailwind CSS
IndexedDB (GeminiProDB)      →  Pinia Store + IndexedDB Composable
IndexedDB (XHSHistoryDB)     →  Pinia Store + IndexedDB Composable
localStorage                 →  pinia-plugin-persistedstate
```

---

## 2. 技术栈对比

### 2.1 框架与工具对比

| 层级 | 原技术 | 迁移目标 | 说明 |
|------|--------|----------|------|
| **前端框架** | 原生 JavaScript | Nuxt 4 + Vue 3 | 全特性框架 |
| **构建工具** | 无 | Vite 7.x | Nuxt 4 内置，高性能构建 |
| **类型系统** | 无 | TypeScript | 类型安全 |
| **样式方案** | CSS3 + CSS Variables | Tailwind CSS + Nuxt UI 4 | 工具类 CSS |
| **状态管理** | 全局变量 + localStorage | Pinia | 响应式状态 |
| **本地存储** | IndexedDB (手动) | VueUse useIndexedDB + Pinia | 封装 Composable |
| **文件系统** | File System Access API | VueUse useFileSystemAccess | 封装 Composable |
| **Markdown** | marked.js | @nuxtjs/mdc 或 marked | Nuxt 模块 |
| **压缩工具** | JSZip | JSZip (保持) | 无需变更 |
| **HTTP 请求** | fetch | useFetch / $fetch | Nuxt 内置 |
| **路由** | 无 (单页) | Nuxt Pages | 文件路由 |

### 2.2 版本要求

| 依赖 | 最低版本 | 推荐版本 | 说明 |
|------|---------|---------|------|
| **Node.js** | 18.x | 20.x LTS | Nuxt 4 要求 |
| **Nuxt** | 4.0.0 | 4.3.0+ | 2025年7月稳定版发布 |
| **Nuxt UI** | 4.0.0 | 最新版 | 要求 Nuxt 4 |
| **Vite** | 7.x | 7.3.x | Nuxt 4 内置，无需单独安装 |
| **Vue** | 3.4+ | 3.5+ | Nuxt 4 内置 |
| **Tailwind CSS** | 4.x | 最新版 | Nuxt UI 4 依赖 |
| **Pinia** | 2.x | 最新版 | 状态管理 |

> **注意**: Vite 5.x 和 6.x 仅接收安全补丁，建议使用 Vite 7.x。Nuxt 3 将维护至 2026年7月底。

### 2.3 开发体验对比

| 特性 | 原项目 | Nuxt 4 |
|------|--------|---------|
| 热更新 | 手动刷新 | Vite HMR 自动更新 |
| 模块导入 | 手动 script 标签 | 自动导入 |
| 类型提示 | 无 | 完整 TypeScript 支持 |
| 调试工具 | 浏览器 Console | Vue DevTools + Nuxt DevTools |
| 代码分割 | 无 | Vite 自动按路由分割 |
| 构建优化 | 无 | Vite 7 + Rollup 自动优化 |
| 开发服务器 | 手动启动 | Vite Dev Server (毫秒级启动) |

---

## 3. 项目结构规划

### 3.1 Nuxt 4 推荐目录结构

> 参考: [Nuxt 4 Directory Structure](https://nuxt.com/docs/4.x/getting-started/upgrade)

```
gemini-3-pro-nuxt/
├── .nuxt/                      # Nuxt 构建目录 (自动生成)
├── .output/                    # 生产构建输出
├── app/                        # 应用主目录 (Nuxt 4 新结构)
│   ├── assets/                 # 静态资源 (需编译)
│   │   ├── css/
│   │   │   └── main.css
│   │   └── images/
│   ├── components/             # Vue 组件 (自动导入)
│   │   ├── chat/
│   │   │   ├── MessageList.vue
│   │   │   ├── MessageItem.vue
│   │   │   └── InputArea.vue
│   │   ├── image/
│   │   │   ├── ImageGenerator.vue
│   │   │   ├── ImagePreview.vue
│   │   │   └── SmartProgressBar.vue
│   │   ├── tools/
│   │   │   ├── BananaTool.vue
│   │   │   ├── SlicerTool.vue
│   │   │   └── XHSCreator.vue
│   │   ├── settings/
│   │   │   ├── ProviderManager.vue
│   │   │   ├── ThemeSwitch.vue
│   │   │   └── SettingsPanel.vue
│   │   └── ui/
│   │       ├── Toast.vue
│   │       ├── Loading.vue
│   │       ├── Lightbox.vue
│   │       └── ProgressBar.vue
│   ├── composables/            # 可组合函数 (自动导入)
│   │   ├── useImageGeneration.ts
│   │   ├── useChat.ts
│   │   ├── useProvider.ts
│   │   ├── useXHS.ts
│   │   ├── useBananaTool.ts
│   │   ├── useCustomPrompts.ts
│   │   ├── useSlicer.ts
│   │   ├── useFileSystem.ts
│   │   ├── useTheme.ts
│   │   ├── useToast.ts
│   │   └── useIndexedDB.ts
│   ├── layouts/                # 布局组件
│   │   ├── default.vue
│   │   └── fullscreen.vue
│   ├── middleware/             # 路由中间件
│   │   └── auth.ts
│   ├── pages/                  # 页面路由
│   │   ├── index.vue           # 主页面 (图像生成)
│   │   ├── xhs.vue             # XHS 灵感实验室
│   │   └── settings.vue        # 设置页面
│   ├── plugins/                # 插件
│   │   └── pinia-persistence.ts
│   ├── utils/                  # 工具函数 (自动导入)
│   │   ├── escapeHtml.ts
│   │   ├── blobManager.ts
│   │   ├── downloadImage.ts
│   │   └── base64Utils.ts
│   ├── app.config.ts           # 应用配置
│   ├── app.vue                 # 根组件
│   └── error.vue               # 错误页面
├── public/                     # 静态文件 (不编译)
│   ├── favicon.ico
│   └── og-image.png
├── server/                     # 服务端 API
│   ├── api/
│   │   └── proxy/
│   │       └── gemini.ts       # API 代理 (可选)
│   └── utils/
├── stores/                     # Pinia 状态仓库
│   ├── chat.ts
│   ├── provider.ts
│   ├── xhs.ts
│   ├── prompts.ts
│   ├── settings.ts
│   └── ui.ts
├── types/                      # TypeScript 类型定义
│   ├── chat.d.ts
│   ├── provider.d.ts
│   ├── image.d.ts
│   └── xhs.d.ts
├── nuxt.config.ts              # Nuxt 配置
├── tailwind.config.ts          # Tailwind 配置
├── tsconfig.json               # TypeScript 配置
└── package.json
```

### 3.2 模块与目录映射

| 原模块 | Nuxt 目录 | 文件 |
|--------|-----------|------|
| 图像生成模块 | `composables/` | `useImageGeneration.ts` |
| 对话管理模块 | `composables/` + `stores/` | `useChat.ts`, `stores/chat.ts` |
| ProviderManager | `composables/` + `stores/` | `useProvider.ts`, `stores/provider.ts` |
| XHSCreator | `composables/` + `components/` | `useXHS.ts`, `XHSCreator.vue` |
| BananaTool | `composables/` + `components/` | `useBananaTool.ts`, `BananaTool.vue` |
| CustomPromptTool | `stores/` | `stores/prompts.ts` |
| SlicerTool | `composables/` + `components/` | `useSlicer.ts`, `SlicerTool.vue` |
| FileSystemManager | `composables/` | `useFileSystem.ts` |
| 主题切换 | `composables/` | `useTheme.ts` |
| UI 反馈系统 | `composables/` + `components/` | `useToast.ts`, `Toast.vue` 等 |

---

## 4. 核心模块迁移指南

### 4.1 图像生成模块

#### 4.1.1 原代码分析

原项目中，图像生成逻辑集中在 `app.js` 的 `sendMessage` 函数中：

```javascript
// 原代码示意 (app.js)
async function sendMessage(prompt, options) {
    // 1. 构建请求参数
    const params = {
        prompt,
        resolution: options.resolution,
        aspectRatio: options.aspectRatio,
        referenceImage: options.referenceImage
    };

    // 2. 选择 API 渠道
    const provider = getRandomProvider();

    // 3. 发送请求
    const response = await fetch(provider.baseUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${provider.apiKey}` },
        body: JSON.stringify(params)
    });

    // 4. 处理响应
    const data = await response.json();
    processGeneration(data);
}
```

#### 4.1.2 迁移方案

使用 Nuxt Composable 封装图像生成逻辑，结合 Pinia 管理状态。

#### 4.1.3 完整代码示例

**类型定义 (`types/image.d.ts`)**

```typescript
// types/image.d.ts
export interface ImageGenerationOptions {
  prompt: string
  resolution: '1K' | '2K' | '4K'
  aspectRatio: string
  referenceImage?: string
  batchSize?: number
  stream?: boolean
}

export interface GeneratedImage {
  id: string
  data: string          // Base64
  mimeType: string
  createdAt: number
}

export interface GenerationResult {
  success: boolean
  images: GeneratedImage[]
  text?: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

export interface GenerationState {
  isGenerating: boolean
  progress: number
  currentTask: string | null
  error: string | null
}
```

**Composable (`app/composables/useImageGeneration.ts`)**

```typescript
// app/composables/useImageGeneration.ts
import type { ImageGenerationOptions, GenerationResult, GenerationState } from '~/types/image'

export function useImageGeneration() {
  // 状态 - 使用 Nuxt 自动导入的 ref
  const state = reactive<GenerationState>({
    isGenerating: false,
    progress: 0,
    currentTask: null,
    error: null
  })

  // 依赖其他 composables
  const { getRandomProvider } = useProvider()
  const { addMessage } = useChat()
  const { saveToFileSystem } = useFileSystem()
  const toast = useToast()

  // 分辨率映射
  const resolutionMap = {
    '1K': { width: 1024, height: 1024, estimatedTime: 15000 },
    '2K': { width: 2048, height: 2048, estimatedTime: 30000 },
    '4K': { width: 4096, height: 4096, estimatedTime: 60000 }
  }

  // 生成图像
  async function generateImage(options: ImageGenerationOptions): Promise<GenerationResult> {
    const { prompt, resolution, aspectRatio, referenceImage, batchSize = 1, stream = false } = options

    state.isGenerating = true
    state.progress = 0
    state.error = null
    state.currentTask = `生成 ${resolution} 图像...`

    try {
      // 获取随机 API 渠道
      const provider = getRandomProvider()
      if (!provider) {
        throw new Error('没有可用的 API 渠道，请先配置')
      }

      // 构建请求体
      const requestBody = buildRequestBody(prompt, resolution, aspectRatio, referenceImage, batchSize)

      // 启动进度模拟
      const progressInterval = simulateProgress(resolution)

      // 发送请求 - 使用 Nuxt 的 $fetch
      const response = await $fetch<any>(provider.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: requestBody
      })

      clearInterval(progressInterval)
      state.progress = 100

      // 处理响应
      const result = processResponse(response, provider.type)

      // 保存到对话历史
      if (result.success && result.images.length > 0) {
        await addMessage({
          role: 'assistant',
          content: result.text || '',
          images: result.images
        })

        // 自动保存到文件系统
        await saveToFileSystem(result.images)

        toast.add({
          title: '成功',
          description: `成功生成 ${result.images.length} 张图片`,
          color: 'success',
          icon: 'i-lucide-check'
        })
      }

      return result
    } catch (error: any) {
      state.error = error.message || '生成失败'
      toast.add({
        title: '生成失败',
        description: state.error,
        color: 'error',
        icon: 'i-lucide-x'
      })
      throw error
    } finally {
      state.isGenerating = false
      state.currentTask = null
    }
  }

  // 构建请求体
  function buildRequestBody(
    prompt: string,
    resolution: string,
    aspectRatio: string,
    referenceImage?: string,
    batchSize?: number
  ) {
    const res = resolutionMap[resolution as keyof typeof resolutionMap]

    return {
      contents: [
        {
          parts: [
            { text: prompt },
            ...(referenceImage ? [{ inlineData: { mimeType: 'image/png', data: referenceImage } }] : [])
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'image/png',
        responseModalities: ['TEXT', 'IMAGE'],
        ...(aspectRatio !== 'Auto' && { aspectRatio }),
        candidateCount: batchSize
      }
    }
  }

  // 模拟进度
  function simulateProgress(resolution: string): NodeJS.Timeout {
    const estimatedTime = resolutionMap[resolution as keyof typeof resolutionMap]?.estimatedTime || 30000
    const interval = 100
    const increment = (100 / estimatedTime) * interval * 0.9 // 90% 进度由模拟完成

    return setInterval(() => {
      if (state.progress < 90) {
        state.progress += increment
      }
    }, interval)
  }

  // 处理响应
  function processResponse(response: any, providerType: 'gemini' | 'openai'): GenerationResult {
    const images: GeneratedImage[] = []
    let text = ''

    if (providerType === 'gemini') {
      const candidates = response.candidates || []
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || []
        for (const part of parts) {
          if (part.inlineData) {
            images.push({
              id: crypto.randomUUID(),
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType,
              createdAt: Date.now()
            })
          }
          if (part.text) {
            text += part.text
          }
        }
      }
    } else {
      // OpenAI 兼容格式
      const choices = response.choices || []
      for (const choice of choices) {
        if (choice.message?.content) {
          // 解析 content 中的图片
          const content = choice.message.content
          if (Array.isArray(content)) {
            for (const item of content) {
              if (item.type === 'image_url') {
                images.push({
                  id: crypto.randomUUID(),
                  data: item.image_url.url.replace(/^data:image\/\w+;base64,/, ''),
                  mimeType: 'image/png',
                  createdAt: Date.now()
                })
              }
              if (item.type === 'text') {
                text += item.text
              }
            }
          }
        }
      }
    }

    return {
      success: images.length > 0,
      images,
      text,
      usage: response.usageMetadata
    }
  }

  // 取消生成
  function cancelGeneration() {
    state.isGenerating = false
    state.progress = 0
    state.currentTask = null
    toast.add({
      title: '已取消',
      description: '已取消生成',
      color: 'info',
      icon: 'i-lucide-info'
    })
  }

  return {
    // 状态
    state: readonly(state),
    isGenerating: computed(() => state.isGenerating),
    progress: computed(() => state.progress),

    // 方法
    generateImage,
    cancelGeneration
  }
}
```

**使用示例 (`app/components/image/ImageGenerator.vue`)**

```vue
<!-- app/components/image/ImageGenerator.vue -->
<script setup lang="ts">
const { state, generateImage, cancelGeneration } = useImageGeneration()

// 表单状态
const prompt = ref('')
const resolution = ref<'1K' | '2K' | '4K'>('2K')
const aspectRatio = ref('Auto')
const referenceImage = ref<string>()

// 长宽比选项
const aspectRatios = [
  { label: 'Auto', value: 'Auto' },
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' }
]

// 处理生成
async function handleGenerate() {
  if (!prompt.value.trim()) return

  await generateImage({
    prompt: prompt.value,
    resolution: resolution.value,
    aspectRatio: aspectRatio.value,
    referenceImage: referenceImage.value
  })
}

// 处理参考图上传
function handleReferenceUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    referenceImage.value = (e.target?.result as string).split(',')[1]
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <div class="image-generator">
    <!-- 提示词输入 -->
    <UTextarea
      v-model="prompt"
      placeholder="描述你想生成的图像..."
      :rows="3"
      :disabled="state.isGenerating"
    />

    <!-- 设置选项 -->
    <div class="options-row">
      <USelectMenu
        v-model="resolution"
        :items="['1K', '2K', '4K']"
        label="分辨率"
      />
      <USelectMenu
        v-model="aspectRatio"
        :items="aspectRatios"
        option-attribute="label"
        value-attribute="value"
        label="长宽比"
      />
    </div>

    <!-- 参考图上传 -->
    <div class="reference-upload">
      <input
        type="file"
        accept="image/*"
        @change="handleReferenceUpload"
        :disabled="state.isGenerating"
      />
      <img
        v-if="referenceImage"
        :src="`data:image/png;base64,${referenceImage}`"
        class="reference-preview"
      />
    </div>

    <!-- 生成按钮 -->
    <div class="actions">
      <UButton
        v-if="!state.isGenerating"
        @click="handleGenerate"
        :disabled="!prompt.trim()"
        color="primary"
      >
        生成图像
      </UButton>
      <UButton
        v-else
        @click="cancelGeneration"
        color="error"
      >
        取消生成
      </UButton>
    </div>

    <!-- 进度条 -->
    <SmartProgressBar
      v-if="state.isGenerating"
      :progress="state.progress"
      :task="state.currentTask"
    />
  </div>
</template>

<style scoped>
.image-generator {
  @apply flex flex-col gap-4 p-4;
}
.options-row {
  @apply flex gap-4;
}
.reference-preview {
  @apply w-24 h-24 object-cover rounded mt-2;
}
.actions {
  @apply flex gap-2;
}
</style>
```

#### 4.1.4 注意事项

1. **响应式状态**: 使用 `reactive` 而非多个 `ref`，便于统一管理
2. **错误处理**: 统一使用 `toast` 提示用户
3. **类型安全**: 所有接口都有明确的 TypeScript 类型定义
4. **Composable 组合**: 通过调用其他 Composable 实现功能复用

---

### 4.2 对话管理模块

#### 4.2.1 原代码分析

原项目使用 IndexedDB 存储会话和消息：

```javascript
// 原代码示意 - IndexedDB 操作
const dbName = 'GeminiProDB';
const dbVersion = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore('sessions', { keyPath: 'id' });
            db.createObjectStore('messages', { keyPath: 'id' });
        };
    });
}
```

#### 4.2.2 迁移方案

使用 Pinia Store 管理状态，VueUse 的 `useIndexedDB` 或自定义 Composable 处理持久化。

#### 4.2.3 完整代码示例

**类型定义 (`types/chat.d.ts`)**

```typescript
// types/chat.d.ts
export interface Session {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  images?: Array<{
    data: string
    mimeType: string
  }>
  timestamp: number
}

export interface ChatState {
  sessions: Session[]
  currentSessionId: string | null
  messages: Message[]
  contextCount: number
}
```

**IndexedDB Composable (`app/composables/useIndexedDB.ts`)**

```typescript
// app/composables/useIndexedDB.ts
export function useIndexedDB<T>(dbName: string, storeName: string) {
  const db = ref<IDBDatabase | null>(null)
  const isReady = ref(false)
  const error = ref<Error | null>(null)

  // 初始化数据库
  async function initDB(version = 1, onUpgrade?: (db: IDBDatabase) => void) {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, version)

      request.onerror = () => {
        error.value = request.error
        reject(request.error)
      }

      request.onsuccess = () => {
        db.value = request.result
        isReady.value = true
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result
        if (onUpgrade) {
          onUpgrade(database)
        } else if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: 'id' })
        }
      }
    })
  }

  // 获取所有记录
  async function getAll(): Promise<T[]> {
    if (!db.value) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = db.value!.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 获取单条记录
  async function get(id: string): Promise<T | undefined> {
    if (!db.value) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = db.value!.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 添加记录
  async function add(item: T): Promise<void> {
    if (!db.value) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = db.value!.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(item)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 更新记录
  async function put(item: T): Promise<void> {
    if (!db.value) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = db.value!.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(item)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 删除记录
  async function remove(id: string): Promise<void> {
    if (!db.value) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = db.value!.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 清空所有记录
  async function clear(): Promise<void> {
    if (!db.value) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = db.value!.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  return {
    db: readonly(db),
    isReady: readonly(isReady),
    error: readonly(error),
    initDB,
    getAll,
    get,
    add,
    put,
    remove,
    clear
  }
}
```

**Pinia Store (`stores/chat.ts`)**

```typescript
// stores/chat.ts
import { defineStore } from 'pinia'
import type { Session, Message, ChatState } from '~/types/chat'

export const useChatStore = defineStore('chat', () => {
  // 状态
  const sessions = ref<Session[]>([])
  const currentSessionId = ref<string | null>(null)
  const messages = ref<Message[]>([])
  const contextCount = ref(5)

  // IndexedDB 实例
  const sessionsDB = useIndexedDB<Session>('GeminiProDB', 'sessions')
  const messagesDB = useIndexedDB<Message>('GeminiProDB', 'messages')

  // 计算属性
  const currentSession = computed(() =>
    sessions.value.find(s => s.id === currentSessionId.value)
  )

  const currentMessages = computed(() =>
    messages.value
      .filter(m => m.sessionId === currentSessionId.value)
      .sort((a, b) => a.timestamp - b.timestamp)
  )

  const contextMessages = computed(() => {
    const msgs = currentMessages.value
    return msgs.slice(-contextCount.value)
  })

  // 初始化
  async function init() {
    await sessionsDB.initDB(1, (db) => {
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' })
        store.createIndex('sessionId', 'sessionId', { unique: false })
      }
    })

    await messagesDB.initDB(1)

    // 加载数据
    sessions.value = await sessionsDB.getAll()
    messages.value = await messagesDB.getAll()

    // 如果没有会话，创建一个
    if (sessions.value.length === 0) {
      await createSession()
    } else {
      currentSessionId.value = sessions.value[0].id
    }
  }

  // 创建会话
  async function createSession(title?: string): Promise<Session> {
    const session: Session = {
      id: crypto.randomUUID(),
      title: title || `新对话 ${sessions.value.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    await sessionsDB.add(session)
    sessions.value.push(session)
    currentSessionId.value = session.id

    return session
  }

  // 更新会话
  async function updateSession(id: string, updates: Partial<Session>) {
    const index = sessions.value.findIndex(s => s.id === id)
    if (index === -1) return

    const updated = {
      ...sessions.value[index],
      ...updates,
      updatedAt: Date.now()
    }

    await sessionsDB.put(updated)
    sessions.value[index] = updated
  }

  // 删除会话
  async function deleteSession(id: string) {
    await sessionsDB.remove(id)
    sessions.value = sessions.value.filter(s => s.id !== id)

    // 删除关联消息
    const relatedMessages = messages.value.filter(m => m.sessionId === id)
    for (const msg of relatedMessages) {
      await messagesDB.remove(msg.id)
    }
    messages.value = messages.value.filter(m => m.sessionId !== id)

    // 切换到其他会话
    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0]?.id || null
      if (!currentSessionId.value) {
        await createSession()
      }
    }
  }

  // 切换会话
  function switchSession(id: string) {
    if (sessions.value.some(s => s.id === id)) {
      currentSessionId.value = id
    }
  }

  // 添加消息
  async function addMessage(data: Omit<Message, 'id' | 'sessionId' | 'timestamp'>): Promise<Message> {
    if (!currentSessionId.value) {
      await createSession()
    }

    const message: Message = {
      id: crypto.randomUUID(),
      sessionId: currentSessionId.value!,
      timestamp: Date.now(),
      ...data
    }

    await messagesDB.add(message)
    messages.value.push(message)

    // 更新会话时间
    await updateSession(currentSessionId.value!, {})

    return message
  }

  // 删除消息
  async function deleteMessage(id: string) {
    await messagesDB.remove(id)
    messages.value = messages.value.filter(m => m.id !== id)
  }

  // 清空当前会话消息
  async function clearCurrentMessages() {
    if (!currentSessionId.value) return

    const toDelete = messages.value.filter(m => m.sessionId === currentSessionId.value)
    for (const msg of toDelete) {
      await messagesDB.remove(msg.id)
    }
    messages.value = messages.value.filter(m => m.sessionId !== currentSessionId.value)
  }

  // 设置上下文数量
  function setContextCount(count: number) {
    contextCount.value = count
  }

  return {
    // 状态
    sessions,
    currentSessionId,
    messages,
    contextCount,

    // 计算属性
    currentSession,
    currentMessages,
    contextMessages,

    // 方法
    init,
    createSession,
    updateSession,
    deleteSession,
    switchSession,
    addMessage,
    deleteMessage,
    clearCurrentMessages,
    setContextCount
  }
})
```

**Chat Composable (`app/composables/useChat.ts`)**

```typescript
// app/composables/useChat.ts
export function useChat() {
  const store = useChatStore()
  const toast = useToast()

  // 初始化
  onMounted(async () => {
    try {
      await store.init()
    } catch (error) {
      toast.add({
        title: '加载失败',
        description: '加载对话历史失败',
        color: 'error',
        icon: 'i-lucide-x'
      })
      console.error(error)
    }
  })

  // 发送用户消息
  async function sendUserMessage(content: string, images?: Array<{ data: string; mimeType: string }>) {
    return store.addMessage({
      role: 'user',
      content,
      images
    })
  }

  // 添加助手消息
  async function addAssistantMessage(content: string, images?: Array<{ data: string; mimeType: string }>) {
    return store.addMessage({
      role: 'assistant',
      content,
      images
    })
  }

  return {
    // 状态 (从 store 导出)
    sessions: computed(() => store.sessions),
    currentSession: computed(() => store.currentSession),
    currentMessages: computed(() => store.currentMessages),
    contextMessages: computed(() => store.contextMessages),
    contextCount: computed(() => store.contextCount),

    // 方法
    createSession: store.createSession,
    updateSession: store.updateSession,
    deleteSession: store.deleteSession,
    switchSession: store.switchSession,
    sendUserMessage,
    addMessage: addAssistantMessage,
    deleteMessage: store.deleteMessage,
    clearCurrentMessages: store.clearCurrentMessages,
    setContextCount: store.setContextCount
  }
}
```

#### 4.2.4 注意事项

1. **IndexedDB 初始化**: 在应用启动时调用 `init()` 方法
2. **响应式绑定**: Store 中的数据需要使用 `computed` 包装后导出
3. **事务管理**: IndexedDB 操作需要正确处理事务
4. **数据同步**: 内存状态和 IndexedDB 保持同步

---

### 4.3 API 渠道管理模块

#### 4.3.1 原代码分析

```javascript
// 原代码示意 - ProviderManager
class ProviderManager {
    constructor() {
        this.providers = JSON.parse(localStorage.getItem('api_providers') || '[]');
        this.currentIndex = 0;
    }

    addProvider(config) {
        this.providers.push(config);
        this.save();
    }

    getRandomProvider() {
        const index = Math.floor(Math.random() * this.providers.length);
        return this.providers[index];
    }

    save() {
        localStorage.setItem('api_providers', JSON.stringify(this.providers));
    }
}
```

#### 4.3.2 完整代码示例

**类型定义 (`types/provider.d.ts`)**

```typescript
// types/provider.d.ts
export interface Provider {
  id: string
  name: string
  type: 'gemini' | 'openai'
  baseUrl: string
  apiKey: string
  model: string
  enabled: boolean
  createdAt: number
}

export interface ProviderFormData {
  name: string
  type: 'gemini' | 'openai'
  baseUrl: string
  apiKey: string
  model: string
}
```

**Pinia Store (`stores/provider.ts`)**

```typescript
// stores/provider.ts
import { defineStore } from 'pinia'
import type { Provider, ProviderFormData } from '~/types/provider'

export const useProviderStore = defineStore('provider', () => {
  // 状态
  const providers = ref<Provider[]>([])

  // 计算属性
  const enabledProviders = computed(() =>
    providers.value.filter(p => p.enabled)
  )

  const hasProviders = computed(() => providers.value.length > 0)

  // 添加渠道
  function addProvider(data: ProviderFormData): Provider {
    const provider: Provider = {
      id: crypto.randomUUID(),
      ...data,
      enabled: true,
      createdAt: Date.now()
    }

    providers.value.push(provider)
    return provider
  }

  // 更新渠道
  function updateProvider(id: string, data: Partial<ProviderFormData>) {
    const index = providers.value.findIndex(p => p.id === id)
    if (index !== -1) {
      providers.value[index] = {
        ...providers.value[index],
        ...data
      }
    }
  }

  // 删除渠道
  function removeProvider(id: string) {
    providers.value = providers.value.filter(p => p.id !== id)
  }

  // 切换启用状态
  function toggleProvider(id: string) {
    const provider = providers.value.find(p => p.id === id)
    if (provider) {
      provider.enabled = !provider.enabled
    }
  }

  // 随机获取渠道
  function getRandomProvider(): Provider | null {
    const enabled = enabledProviders.value
    if (enabled.length === 0) return null

    const index = Math.floor(Math.random() * enabled.length)
    return enabled[index]
  }

  // 测试渠道连通性
  async function testProvider(id: string): Promise<{ success: boolean; message: string }> {
    const provider = providers.value.find(p => p.id === id)
    if (!provider) {
      return { success: false, message: '渠道不存在' }
    }

    try {
      const response = await $fetch(provider.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: {
          contents: [{ parts: [{ text: 'test' }] }]
        },
        timeout: 10000
      })

      return { success: true, message: '连接成功' }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '连接失败'
      }
    }
  }

  return {
    providers,
    enabledProviders,
    hasProviders,
    addProvider,
    updateProvider,
    removeProvider,
    toggleProvider,
    getRandomProvider,
    testProvider
  }
}, {
  // 使用 pinia-plugin-persistedstate 持久化
  persist: {
    key: 'api_providers',
    storage: localStorage,
    pick: ['providers']
  }
})
```

**Composable (`app/composables/useProvider.ts`)**

```typescript
// app/composables/useProvider.ts
export function useProvider() {
  const store = useProviderStore()
  const toast = useToast()

  // 添加渠道并提示
  function addProvider(data: ProviderFormData) {
    const provider = store.addProvider(data)
    toast.add({
      title: '添加成功',
      description: `渠道 "${provider.name}" 添加成功`,
      color: 'success',
      icon: 'i-lucide-check'
    })
    return provider
  }

  // 删除渠道并提示
  function removeProvider(id: string) {
    const provider = store.providers.find(p => p.id === id)
    store.removeProvider(id)
    if (provider) {
      toast.add({
        title: '删除成功',
        description: `渠道 "${provider.name}" 已删除`,
        color: 'success',
        icon: 'i-lucide-check'
      })
    }
  }

  // 测试渠道并提示
  async function testProvider(id: string) {
    const result = await store.testProvider(id)
    if (result.success) {
      toast.add({
        title: '连接成功',
        description: result.message,
        color: 'success',
        icon: 'i-lucide-check'
      })
    } else {
      toast.add({
        title: '连接失败',
        description: result.message,
        color: 'error',
        icon: 'i-lucide-x'
      })
    }
    return result
  }

  return {
    providers: computed(() => store.providers),
    enabledProviders: computed(() => store.enabledProviders),
    hasProviders: computed(() => store.hasProviders),
    addProvider,
    updateProvider: store.updateProvider,
    removeProvider,
    toggleProvider: store.toggleProvider,
    getRandomProvider: store.getRandomProvider,
    testProvider
  }
}
```

**组件 (`app/components/settings/ProviderManager.vue`)**

```vue
<!-- app/components/settings/ProviderManager.vue -->
<script setup lang="ts">
import type { ProviderFormData } from '~/types/provider'

const {
  providers,
  addProvider,
  removeProvider,
  toggleProvider,
  testProvider
} = useProvider()

// 表单状态
const isFormOpen = ref(false)
const testingId = ref<string | null>(null)
const formData = ref<ProviderFormData>({
  name: '',
  type: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  apiKey: '',
  model: 'gemini-2.0-flash-exp-image-generation'
})

// 预设 URL
const presetUrls = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  openai: 'https://api.openai.com/v1/chat/completions'
}

// 切换类型时更新 URL
watch(() => formData.value.type, (type) => {
  formData.value.baseUrl = presetUrls[type]
})

// 提交表单
function handleSubmit() {
  if (!formData.value.name || !formData.value.apiKey) return

  addProvider(formData.value)

  // 重置表单
  formData.value = {
    name: '',
    type: 'gemini',
    baseUrl: presetUrls.gemini,
    apiKey: '',
    model: 'gemini-2.0-flash-exp-image-generation'
  }
  isFormOpen.value = false
}

// 测试渠道
async function handleTest(id: string) {
  testingId.value = id
  await testProvider(id)
  testingId.value = null
}
</script>

<template>
  <div class="provider-manager">
    <div class="header">
      <h3>API 渠道管理</h3>
    </div>

    <!-- 渠道列表 -->
    <div class="provider-list">
      <div
        v-for="provider in providers"
        :key="provider.id"
        class="provider-card"
        :class="{ disabled: !provider.enabled }"
      >
        <div class="provider-info">
          <span class="name">{{ provider.name }}</span>
          <UBadge :color="provider.type === 'gemini' ? 'info' : 'success'">
            {{ provider.type }}
          </UBadge>
        </div>

        <div class="provider-actions">
          <UToggle
            :model-value="provider.enabled"
            @update:model-value="toggleProvider(provider.id)"
          />
          <UButton
            variant="ghost"
            icon="i-heroicons-play"
            :loading="testingId === provider.id"
            @click="handleTest(provider.id)"
          />
          <UButton
            variant="ghost"
            color="error"
            icon="i-heroicons-trash"
            @click="removeProvider(provider.id)"
          />
        </div>
      </div>

      <div v-if="providers.length === 0" class="empty-state">
        暂无 API 渠道，请添加
      </div>
    </div>

    <!-- 添加表单 Modal (Nuxt UI v4) -->
    <UModal v-model:open="isFormOpen">
      <UButton label="添加渠道" icon="i-heroicons-plus" />
      <template #content>
        <UCard>
          <template #header>
            <h4>添加 API 渠道</h4>
          </template>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <UFormField label="渠道名称">
              <UInput v-model="formData.name" placeholder="我的 Gemini" />
            </UFormField>

            <UFormField label="接口类型">
              <USelectMenu
                v-model="formData.type"
                :items="[
                  { label: 'Gemini 原生', value: 'gemini' },
                  { label: 'OpenAI 兼容', value: 'openai' }
                ]"
                value-attribute="value"
                option-attribute="label"
              />
            </UFormField>

            <UFormField label="API Base URL">
              <UInput v-model="formData.baseUrl" />
            </UFormField>

            <UFormField label="API Key">
              <UInput v-model="formData.apiKey" type="password" />
            </UFormField>

            <UFormField label="模型名称">
              <UInput v-model="formData.model" />
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton variant="ghost" @click="isFormOpen = false">
                取消
              </UButton>
              <UButton type="submit" color="primary">
                添加
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.provider-manager {
  @apply space-y-4;
}
.header {
  @apply flex justify-between items-center;
}
.provider-list {
  @apply space-y-2;
}
.provider-card {
  @apply flex justify-between items-center p-4 rounded-lg border bg-white dark:bg-neutral-800;
}
.provider-card.disabled {
  @apply opacity-50;
}
.provider-info {
  @apply flex items-center gap-2;
}
.name {
  @apply font-medium;
}
.provider-actions {
  @apply flex items-center gap-2;
}
.empty-state {
  @apply text-center py-8 text-neutral-500;
}
</style>
```

---

### 4.4 XHS 灵感实验室模块

#### 4.4.1 迁移方案

XHS 模块采用独立页面 + 专用 Store 的方式迁移。

#### 4.4.2 完整代码示例

**类型定义 (`types/xhs.d.ts`)**

```typescript
// types/xhs.d.ts
export interface XHSHistory {
  id: string
  topic: string
  content: string
  storyboard: StoryboardItem[]
  images: Array<{ data: string; mimeType: string }>
  createdAt: number
}

export interface StoryboardItem {
  id: string
  description: string
  imagePrompt: string
  image?: { data: string; mimeType: string }
}

export interface XHSGenerateOptions {
  topic: string
  style?: string
  imageCount?: number
}
```

**Pinia Store (`stores/xhs.ts`)**

```typescript
// stores/xhs.ts
import { defineStore } from 'pinia'
import type { XHSHistory, StoryboardItem } from '~/types/xhs'

export const useXHSStore = defineStore('xhs', () => {
  // 状态
  const history = ref<XHSHistory[]>([])
  const currentTopic = ref('')
  const currentContent = ref('')
  const currentStoryboard = ref<StoryboardItem[]>([])
  const isGenerating = ref(false)

  // IndexedDB
  const db = useIndexedDB<XHSHistory>('XHSHistoryDB', 'history')

  // 初始化
  async function init() {
    await db.initDB()
    history.value = await db.getAll()
  }

  // 生成文案
  async function generateContent(topic: string): Promise<string> {
    isGenerating.value = true
    currentTopic.value = topic

    try {
      const { getRandomProvider } = useProvider()
      const provider = getRandomProvider()

      if (!provider) throw new Error('没有可用的 API 渠道')

      const prompt = `你是一个小红书内容创作专家。请根据主题"${topic}"生成一篇小红书风格的文案，包含：
1. 吸引人的标题
2. 正文内容（使用 emoji 和小红书风格的语言）
3. 话题标签

同时，请规划 4-6 张配图的分镜描述，每个分镜包含：
- 画面描述
- 图片生成提示词（英文）

请以 JSON 格式返回：
{
  "title": "标题",
  "content": "正文",
  "tags": ["标签1", "标签2"],
  "storyboard": [
    { "description": "画面描述", "imagePrompt": "prompt" }
  ]
}`

      const response = await $fetch<any>(provider.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        }
      })

      // 解析响应
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text
      const data = JSON.parse(text)

      currentContent.value = `${data.title}\n\n${data.content}\n\n${data.tags.map((t: string) => `#${t}`).join(' ')}`
      currentStoryboard.value = data.storyboard.map((item: any, index: number) => ({
        id: `storyboard-${index}`,
        description: item.description,
        imagePrompt: item.imagePrompt
      }))

      return currentContent.value
    } finally {
      isGenerating.value = false
    }
  }

  // 生成分镜图片
  async function generateStoryboardImage(storyboardId: string) {
    const item = currentStoryboard.value.find(s => s.id === storyboardId)
    if (!item) return

    const { generateImage } = useImageGeneration()

    const result = await generateImage({
      prompt: item.imagePrompt,
      resolution: '2K',
      aspectRatio: '3:4' // 小红书竖图
    })

    if (result.success && result.images[0]) {
      item.image = {
        data: result.images[0].data,
        mimeType: result.images[0].mimeType
      }
    }
  }

  // 批量生成所有分镜
  async function generateAllStoryboardImages() {
    for (const item of currentStoryboard.value) {
      if (!item.image) {
        await generateStoryboardImage(item.id)
      }
    }
  }

  // 保存到历史
  async function saveToHistory(): Promise<XHSHistory> {
    const record: XHSHistory = {
      id: crypto.randomUUID(),
      topic: currentTopic.value,
      content: currentContent.value,
      storyboard: currentStoryboard.value,
      images: currentStoryboard.value
        .filter(s => s.image)
        .map(s => s.image!),
      createdAt: Date.now()
    }

    await db.add(record)
    history.value.unshift(record)

    return record
  }

  // 加载历史记录
  function loadHistory(id: string) {
    const record = history.value.find(h => h.id === id)
    if (record) {
      currentTopic.value = record.topic
      currentContent.value = record.content
      currentStoryboard.value = record.storyboard
    }
  }

  // 删除历史
  async function deleteHistory(id: string) {
    await db.remove(id)
    history.value = history.value.filter(h => h.id !== id)
  }

  // 清空当前内容
  function clearCurrent() {
    currentTopic.value = ''
    currentContent.value = ''
    currentStoryboard.value = []
  }

  return {
    history,
    currentTopic,
    currentContent,
    currentStoryboard,
    isGenerating,
    init,
    generateContent,
    generateStoryboardImage,
    generateAllStoryboardImages,
    saveToHistory,
    loadHistory,
    deleteHistory,
    clearCurrent
  }
})
```

**页面组件 (`app/pages/xhs.vue`)**

```vue
<!-- app/pages/xhs.vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'default',
  title: 'XHS 灵感实验室'
})

const store = useXHSStore()
const toast = useToast()

// 初始化
onMounted(() => {
  store.init()
})

// 表单
const topicInput = ref('')

// 生成文案
async function handleGenerate() {
  if (!topicInput.value.trim()) {
    toast.add({
      title: '提示',
      description: '请输入创作主题',
      color: 'warning',
      icon: 'i-lucide-alert-triangle'
    })
    return
  }

  try {
    await store.generateContent(topicInput.value)
    toast.add({
      title: '成功',
      description: '文案生成成功',
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (error: any) {
    toast.add({
      title: '生成失败',
      description: error.message || '生成失败',
      color: 'error',
      icon: 'i-lucide-x'
    })
  }
}

// 批量生成图片
async function handleGenerateAllImages() {
  try {
    await store.generateAllStoryboardImages()
    toast.add({
      title: '成功',
      description: '所有图片生成完成',
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (error: any) {
    toast.add({
      title: '生成失败',
      description: error.message || '生成失败',
      color: 'error',
      icon: 'i-lucide-x'
    })
  }
}

// 保存
async function handleSave() {
  try {
    await store.saveToHistory()
    toast.add({
      title: '成功',
      description: '已保存到历史记录',
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (error: any) {
    toast.add({
      title: '保存失败',
      description: '保存失败',
      color: 'error',
      icon: 'i-lucide-x'
    })
  }
}

// 复制文案
async function handleCopyContent() {
  await navigator.clipboard.writeText(store.currentContent)
  toast.add({
    title: '成功',
    description: '已复制到剪贴板',
    color: 'success',
    icon: 'i-lucide-clipboard-check'
  })
}
</script>

<template>
  <div class="xhs-page">
    <!-- 左栏：设置与历史 -->
    <aside class="sidebar">
      <div class="section">
        <h3>历史记录</h3>
        <div class="history-list">
          <div
            v-for="item in store.history"
            :key="item.id"
            class="history-item"
            @click="store.loadHistory(item.id)"
          >
            <span class="topic">{{ item.topic }}</span>
            <span class="date">{{ new Date(item.createdAt).toLocaleDateString() }}</span>
            <UButton
              variant="ghost"
              size="xs"
              icon="i-heroicons-trash"
              @click.stop="store.deleteHistory(item.id)"
            />
          </div>
        </div>
      </div>
    </aside>

    <!-- 中栏：主题输入与文案 -->
    <main class="content">
      <div class="input-section">
        <UInput
          v-model="topicInput"
          placeholder="输入创作主题，如：秋日森系穿搭"
          size="lg"
          :disabled="store.isGenerating"
        />
        <UButton
          @click="handleGenerate"
          :loading="store.isGenerating"
          color="primary"
        >
          生成文案
        </UButton>
      </div>

      <div v-if="store.currentContent" class="content-section">
        <div class="content-header">
          <h3>生成的文案</h3>
          <UButton variant="ghost" icon="i-heroicons-clipboard" @click="handleCopyContent">
            复制
          </UButton>
        </div>
        <div class="content-text">
          {{ store.currentContent }}
        </div>
      </div>
    </main>

    <!-- 右栏：分镜墙 -->
    <aside class="storyboard">
      <div class="storyboard-header">
        <h3>分镜规划</h3>
        <UButton
          v-if="store.currentStoryboard.length > 0"
          @click="handleGenerateAllImages"
          size="sm"
        >
          一键生成图片
        </UButton>
      </div>

      <div class="storyboard-grid">
        <div
          v-for="item in store.currentStoryboard"
          :key="item.id"
          class="storyboard-item"
        >
          <div
            class="image-placeholder"
            :class="{ 'has-image': item.image }"
          >
            <img
              v-if="item.image"
              :src="`data:${item.image.mimeType};base64,${item.image.data}`"
            />
            <UButton
              v-else
              variant="ghost"
              icon="i-heroicons-photo"
              @click="store.generateStoryboardImage(item.id)"
            >
              生成
            </UButton>
          </div>
          <p class="description">{{ item.description }}</p>
        </div>
      </div>

      <div v-if="store.currentContent" class="actions">
        <UButton @click="handleSave" color="primary">
          保存到历史
        </UButton>
        <UButton variant="outline" @click="store.clearCurrent">
          清空
        </UButton>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.xhs-page {
  @apply flex h-screen;
}

.sidebar {
  @apply w-64 border-r p-4 overflow-y-auto;
}

.content {
  @apply flex-1 p-6 overflow-y-auto;
}

.storyboard {
  @apply w-80 border-l p-4 overflow-y-auto;
}

.input-section {
  @apply flex gap-4 mb-6;
}

.content-section {
  @apply bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4;
}

.content-header {
  @apply flex justify-between items-center mb-4;
}

.content-text {
  @apply whitespace-pre-wrap;
}

.storyboard-header {
  @apply flex justify-between items-center mb-4;
}

.storyboard-grid {
  @apply grid gap-4;
}

.storyboard-item {
  @apply bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3;
}

.image-placeholder {
  @apply aspect-[3/4] bg-neutral-200 dark:bg-neutral-700 rounded flex items-center justify-center mb-2;
}

.image-placeholder.has-image img {
  @apply w-full h-full object-cover rounded;
}

.description {
  @apply text-sm text-neutral-600 dark:text-neutral-400;
}

.history-item {
  @apply flex items-center gap-2 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer;
}

.topic {
  @apply flex-1 truncate;
}

.date {
  @apply text-xs text-neutral-500;
}

.actions {
  @apply flex gap-2 mt-4;
}
</style>
```

---

*文档过长，将在第二部分继续...*
