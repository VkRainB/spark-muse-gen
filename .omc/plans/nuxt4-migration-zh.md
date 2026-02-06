# Nuxt 4 迁移计划 - Gemini 3 Pro 图像工作台

**计划版本**: 1.0.0
**创建日期**: 2026-02-06
**分支名称**: ralph/nuxt4-migration
**状态**: 准备就绪，可开始实施

---

## 背景信息

### 原始需求
将「Gemini 3 Pro Image Preview」从原生 JavaScript（app.js 约 3000+ 行）迁移到 Nuxt 4 + Vue 3 + Nuxt UI 4 + Tailwind CSS 技术栈。

### 需求访谈摘要
- **源代码**: 单文件原生 JS 应用（source/app.js）
- **目标**: 模块化、支持 TypeScript 的 Nuxt 4 应用
- **核心模块**: ProviderManager（渠道管理）、FileSystemManager（文件系统）、XHSCreator（小红书创作）、BananaTool（提示词库）、CustomPromptTool（自定义提示词）、SlicerTool（切片工具）、SmartProgressBar（智能进度条）、LoadingManager（加载管理）、ErrorHandler（错误处理）
- **数据存储**: IndexedDB（GeminiProDB、XHSHistoryDB）+ localStorage
- **外部依赖**: marked.js、JSZip（通过 CDN 引入）

### 技术调研结论
- Nuxt 4.3.0+ 稳定版（2025年7月发布）
- Nuxt UI 4 使用语义化颜色（success、error、warning、info）
- Vite 7.x 已内置于 Nuxt 4
- File System Access API 仅支持 Chrome 86+
- 本应用推荐使用 SPA 模式（ssr: false）

---

## 工作目标

### 核心目标
将单体式原生 JavaScript 应用转换为模块化、类型安全、易于维护的 Nuxt 4 代码库，同时保留所有现有功能。

### 交付物
1. 功能完整的 Nuxt 4 应用
2. 完整的 TypeScript 类型定义
3. 支持持久化的 Pinia 状态管理
4. 封装所有业务逻辑的 Vue 3 Composables
5. 集成 Nuxt UI 4 组件库
6. 全部 20 个用户故事通过验收标准

### 完成定义
- [ ] 全部 20 个用户故事通过验收标准
- [ ] TypeScript 编译通过（pnpm build 成功）
- [ ] 运行时无控制台错误
- [ ] 所有功能正常：图像生成、聊天、小红书、工具
- [ ] 数据持久化正常（IndexedDB + localStorage）
- [ ] 主题切换正常
- [ ] 文件自动保存正常（Chrome 浏览器）

---

## 必须做 / 禁止做

### 必须遵守的约束
- 使用 Nuxt 4.3.0+（不是 Nuxt 3）
- 使用 Nuxt UI 4（不是 Nuxt UI 3）
- 使用 Tailwind CSS（不是 UnoCSS）
- 使用 pnpm 作为包管理器
- 使用 SPA 模式（ssr: false）
- 保留所有现有功能

### 禁止事项
- 不使用服务端渲染（纯前端应用）
- 不删除任何功能
- 不引入外部后端依赖
- 不改变 API 集成模式

---

## 阶段概览

| 阶段 | 重点 | 用户故事 | 预估工时 |
|------|------|----------|----------|
| 1 | 项目基础 | US-001、US-002 | 2-3 小时 |
| 2 | 核心基础设施 | US-003、US-004、US-009 | 3-4 小时 |
| 3 | 状态管理 | US-005、US-006、US-019 | 4-5 小时 |
| 4 | 图像生成 | US-007、US-008 | 3-4 小时 |
| 5 | UI 组件 - 核心 | US-010、US-011、US-012 | 4-5 小时 |
| 6 | 设置与渠道 | US-013 | 2-3 小时 |
| 7 | 工具 - 提示词 | US-014 | 2-3 小时 |
| 8 | 工具 - 切片与表情包 | US-015、US-016 | 3-4 小时 |
| 9 | 小红书模块 | US-017 | 4-5 小时 |
| 10 | 布局与页面 | US-018 | 2-3 小时 |
| 11 | 集成与测试 | US-020 | 4-6 小时 |

**总预估工时**: 34-45 小时

---

## 阶段 1: 项目基础（US-001、US-002）

### 目标
初始化 Nuxt 4 项目并完成正确配置，建立类型系统。

### 前置依赖
- 无（起始阶段）

### 任务清单

#### 1.1 项目初始化
**需要创建的文件:**
- `package.json`
- `nuxt.config.ts`
- `tsconfig.json`
- `tailwind.config.ts`
- `.gitignore`
- `.npmrc`

**执行命令:**
```bash
pnpm dlx nuxi@latest init gemini-3-pro-nuxt
cd gemini-3-pro-nuxt
pnpm add @nuxt/ui pinia @pinia/nuxt pinia-plugin-persistedstate jszip
pnpm add -D @nuxt/devtools typescript
```

**nuxt.config.ts 配置示例:**
```typescript
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: true },
  ssr: false, // SPA 模式

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt'
  ],

  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate'
    }
  },

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: ''
  },

  pinia: {
    storesDirs: ['./stores/**']
  },

  app: {
    head: {
      title: 'Gemini 3 Pro Image Preview',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  }
})
```

#### 1.2 目录结构
**需要创建的目录:**
```
app/
  assets/css/
  components/
    chat/
    image/
    settings/
    tools/
    ui/
  composables/
  layouts/
  pages/
  plugins/
  utils/
public/
stores/
types/
```

#### 1.3 类型定义（US-002）
**需要创建的文件:**

**types/image.d.ts（图像相关类型）:**
```typescript
// 图像生成选项
export interface ImageGenerationOptions {
  prompt: string              // 提示词
  resolution: '1K' | '2K' | '4K'  // 分辨率
  aspectRatio: string         // 长宽比
  referenceImage?: string     // 参考图（可选）
  batchSize?: number          // 批量数量（可选）
  stream?: boolean            // 是否流式传输（可选）
}

// 生成的图像
export interface GeneratedImage {
  id: string                  // 唯一标识
  data: string                // Base64 数据
  mimeType: string            // MIME 类型
  createdAt: number           // 创建时间戳
}

// 生成结果
export interface GenerationResult {
  success: boolean            // 是否成功
  images: GeneratedImage[]    // 图像列表
  text?: string               // 文本响应（可选）
  usage?: {                   // Token 使用量（可选）
    promptTokens: number
    completionTokens: number
  }
}

// 生成状态
export interface GenerationState {
  isGenerating: boolean       // 是否正在生成
  progress: number            // 进度百分比
  currentTask: string | null  // 当前任务描述
  error: string | null        // 错误信息
}
```

**types/chat.d.ts（聊天相关类型）:**
```typescript
// 会话
export interface Session {
  id: string                  // 唯一标识
  title: string               // 会话标题
  createdAt: number           // 创建时间戳
  updatedAt: number           // 更新时间戳
}

// 消息
export interface Message {
  id: string                  // 唯一标识
  sessionId: string           // 所属会话 ID
  role: 'user' | 'assistant'  // 角色
  content: string             // 文本内容
  images?: Array<{            // 图像附件（可选）
    data: string
    mimeType: string
  }>
  timestamp: number           // 时间戳
}

// 聊天状态
export interface ChatState {
  sessions: Session[]         // 会话列表
  currentSessionId: string | null  // 当前会话 ID
  messages: Message[]         // 消息列表
  contextCount: number        // 上下文消息数量
}
```

**types/provider.d.ts（渠道相关类型）:**
```typescript
// API 渠道
export interface Provider {
  id: string                  // 唯一标识
  name: string                // 渠道名称
  type: 'gemini' | 'openai'   // 渠道类型
  baseUrl: string             // 基础 URL
  apiKey: string              // API 密钥
  model: string               // 模型名称
  enabled: boolean            // 是否启用
  createdAt: number           // 创建时间戳
}

// 渠道表单数据
export interface ProviderFormData {
  name: string
  type: 'gemini' | 'openai'
  baseUrl: string
  apiKey: string
  model: string
}
```

**types/xhs.d.ts（小红书相关类型）:**
```typescript
// 小红书历史记录
export interface XHSHistory {
  id: string                  // 唯一标识
  topic: string               // 主题
  content: string             // 文案内容
  storyboard: StoryboardItem[]  // 分镜列表
  images: Array<{ data: string; mimeType: string }>  // 图像列表
  createdAt: number           // 创建时间戳
}

// 分镜项
export interface StoryboardItem {
  id: string                  // 唯一标识
  description: string         // 分镜描述
  imagePrompt: string         // 图像提示词
  image?: { data: string; mimeType: string }  // 生成的图像（可选）
}

// 小红书生成选项
export interface XHSGenerateOptions {
  topic: string               // 主题
  style?: string              // 风格（可选）
  imageCount?: number         // 图片数量（可选）
}
```

### 验收标准（来自 PRD）
- [x] 使用 nuxi 初始化 Nuxt 4 项目
- [x] 安装依赖：@nuxt/ui、pinia、@pinia/nuxt、pinia-plugin-persistedstate、jszip
- [x] 配置 nuxt.config.ts，包含模块和 colorMode
- [x] 创建 tailwind.config.ts 并配置自定义主题
- [x] 正确配置 TypeScript
- [x] 目录结构符合迁移指南（app/、stores/、types/）
- [x] 开发服务器启动无错误
- [x] 创建 types/image.d.ts，包含 ImageGenerationOptions、GeneratedImage、GenerationResult
- [x] 创建 types/chat.d.ts，包含 Session、Message、ChatState
- [x] 创建 types/provider.d.ts，包含 Provider、ProviderFormData
- [x] 创建 types/xhs.d.ts，包含 XHSHistory、StoryboardItem
- [x] 所有类型正确导出
- [x] 类型检查通过

### 验证步骤
```bash
pnpm dev       # 应无错误启动
pnpm typecheck # 应通过
```

---

## 阶段 2: 核心基础设施（US-003、US-004、US-009）

### 目标
迁移工具函数并创建基础 Composables。

### 前置依赖
- 阶段 1 完成

### 任务清单

#### 2.1 工具函数（US-003）
**需要创建的文件:**

**app/utils/escapeHtml.ts（HTML 转义工具）:**
- `escapeHtml(str: string): string` - 转义 HTML 特殊字符
- `unescapeHtml(str: string): string` - 反转义 HTML 特殊字符

**app/utils/blobManager.ts（Blob 管理器）:**
- `BlobManager` 类，包含 create、revoke、cleanup 方法
- 用于管理 Blob URL 的生命周期，防止内存泄漏

**app/utils/downloadImage.ts（图像下载工具）:**
- `downloadImageFromBase64()` - 从 Base64 下载
- `downloadImageFromBlobUrl()` - 从 Blob URL 下载
- `downloadImageFromBlob()` - 从 Blob 对象下载
- `downloadImageFromCanvas()` - 从 Canvas 下载

**app/utils/base64Utils.ts（Base64 工具）:**
- `base64ToBlobUrl()` - Base64 转 Blob URL
- `base64ToBlob()` - Base64 转 Blob 对象
- `blobToBase64()` - Blob 转 Base64
- `fileToBase64()` - File 转 Base64
- `compressBase64Image()` - 压缩 Base64 图像

#### 2.2 IndexedDB Composable（US-004）
**文件:** `app/composables/useIndexedDB.ts`

通用 Composable，支持以下操作:
- `initDB(version, onUpgrade)` - 初始化数据库
- `getAll<T>(): Promise<T[]>` - 获取所有记录
- `get<T>(id): Promise<T | undefined>` - 获取单条记录
- `add<T>(item): Promise<void>` - 添加记录
- `put<T>(item): Promise<void>` - 更新记录
- `remove(id): Promise<void>` - 删除记录
- `clear(): Promise<void>` - 清空存储

必须优雅处理 SSR（仅在客户端执行）。

#### 2.3 主题与 Toast Composables（US-009）
**文件:**

**app/composables/useTheme.ts（主题管理）:**
- 与 Nuxt Color Mode 集成
- 暴露: `theme`、`isDark`、`toggleTheme()`、`setTheme()`

**app/composables/useToast.ts（Toast 通知）:**
- 封装 Nuxt UI Toast
- 方法: `success()`、`error()`、`warning()`、`info()`
- 使用 Nuxt UI v4 语义化颜色

### 验收标准
- [x] 实现 app/utils/escapeHtml.ts
- [x] 实现 app/utils/blobManager.ts
- [x] 实现 app/utils/downloadImage.ts
- [x] 实现 app/utils/base64Utils.ts
- [x] 所有工具函数被 Nuxt 自动导入
- [x] 实现 app/composables/useIndexedDB.ts
- [x] 支持全部 CRUD 操作
- [x] 优雅处理 SSR（仅客户端）
- [x] 为不同存储类型提供泛型支持
- [x] 实现 app/composables/useTheme.ts
- [x] 实现 app/composables/useToast.ts
- [x] 使用 Nuxt UI v4 语义化颜色
- [x] 主题设置持久化
- [x] 类型检查通过

### 验证步骤
```bash
# 创建测试组件验证工具函数
pnpm dev
# 在浏览器控制台测试
```

---

## 阶段 3: 状态管理（US-005、US-006、US-019）

### 目标
创建 Pinia Store 管理渠道、聊天和设置状态。

### 前置依赖
- 阶段 2 完成（useIndexedDB、useToast）

### 任务清单

#### 3.1 渠道 Store（US-005）
**文件:**

**stores/provider.ts:**
- 状态: `providers: Provider[]`
- 计算属性: `enabledProviders`、`hasProviders`
- 操作: `addProvider()`、`updateProvider()`、`removeProvider()`、`toggleProvider()`、`getRandomProvider()`、`testProvider()`
- 使用 `api_providers` 键持久化到 localStorage

**app/composables/useProvider.ts:**
- 封装 Store，添加 Toast 通知

#### 3.2 聊天 Store（US-006）
**文件:**

**stores/chat.ts:**
- 状态: `sessions`、`currentSessionId`、`messages`、`contextCount`
- 计算属性: `currentSession`、`currentMessages`、`contextMessages`
- 操作: `init()`、`createSession()`、`updateSession()`、`deleteSession()`、`switchSession()`、`addMessage()`、`deleteMessage()`、`clearCurrentMessages()`、`setContextCount()`
- 持久化到 IndexedDB（GeminiProDB）

**app/composables/useChat.ts:**
- 挂载时初始化
- 方法: `sendUserMessage()`、`addAssistantMessage()`

#### 3.3 设置 Store（US-019）
**文件:** `stores/settings.ts`
- 状态: `resolution`、`aspectRatio`、`streamEnabled`、`contextCount`、`autoSaveEnabled`
- 计算属性: `resolutionLabel`
- 操作: setter 和 toggle 方法
- 持久化到 localStorage

### 验收标准
- [x] 使用 Pinia 实现 stores/provider.ts
- [x] 实现 app/composables/useProvider.ts
- [x] 支持添加、更新、删除、切换渠道
- [x] 支持随机渠道选择（负载均衡）
- [x] 支持渠道测试功能
- [x] 持久化到 localStorage
- [x] 使用 Pinia 实现 stores/chat.ts
- [x] 实现 app/composables/useChat.ts
- [x] 支持会话 CRUD 操作
- [x] 支持消息 CRUD 操作
- [x] 支持上下文数量管理
- [x] 持久化到 IndexedDB（GeminiProDB）
- [x] 实现 stores/settings.ts
- [x] 包含分辨率、长宽比、流式传输、上下文数量设置
- [x] 自动保存开关
- [x] 持久化到 localStorage
- [x] 类型检查通过

### 验证步骤
```bash
pnpm dev
# 使用 Vue DevTools 检查 Store
# 刷新页面测试持久化
```

---

## 阶段 4: 图像生成（US-007、US-008）

### 目标
实现图像生成和文件系统 Composables。

### 前置依赖
- 阶段 3 完成（useProvider、useChat、useToast）

### 任务清单

#### 4.1 图像生成 Composable（US-007）
**文件:** `app/composables/useImageGeneration.ts`

- 状态: `isGenerating`、`progress`、`currentTask`、`error`
- 分辨率映射: 1K/2K/4K 及对应的预估时间
- 方法:
  - `generateImage(options): Promise<GenerationResult>` - 生成图像
  - `buildRequestBody()` - 构建请求体
  - `simulateProgress()` - 使用缓动函数模拟平滑进度
  - `processResponse()` - 处理 Gemini 和 OpenAI 两种响应格式
  - `cancelGeneration()` - 取消生成
- 与 useProvider、useChat、useFileSystem 集成

#### 4.2 文件系统 Composable（US-008）
**文件:** `app/composables/useFileSystem.ts`

- 状态: `isSupported`、`isEnabled`、`directoryHandle`
- 方法:
  - `selectDirectory(): Promise<boolean>` - 选择保存目录
  - `saveImage(data, filename, mimeType): Promise<boolean>` - 保存单张图像
  - `saveToFileSystem(images[], prefix): Promise<number>` - 批量保存
  - `disable()` - 禁用自动保存
- 对不支持的浏览器优雅降级

### 验收标准
- [x] 实现 app/composables/useImageGeneration.ts
- [x] 支持 1K/2K/4K 分辨率
- [x] 支持多种长宽比
- [x] 支持参考图
- [x] 基于分辨率的进度模拟
- [x] 解析 Gemini 和 OpenAI 两种响应格式
- [x] 与 chat 和 file system composables 集成
- [x] 实现 app/composables/useFileSystem.ts
- [x] 集成目录选择器
- [x] 支持自动保存功能
- [x] 支持权限管理
- [x] 对不支持的浏览器优雅降级
- [x] 类型检查通过

### 验证步骤
```bash
pnpm dev
# 使用模拟渠道测试图像生成
# 在 Chrome 中测试文件系统
# 验证进度条动画
```

---

## 阶段 5: UI 组件 - 核心（US-010、US-011、US-012）

### 目标
创建核心 UI 组件和主要交互组件。

### 前置依赖
- 阶段 4 完成

### 任务清单

#### 5.1 核心 UI 组件（US-010）
**文件:**

**app/components/ui/Loading.vue（加载遮罩）:**
- Props: `show`、`text`
- 全屏遮罩配合加载动画

**app/components/ui/SmartProgressBar.vue（智能进度条）:**
- Props: `progress`、`task`、`estimatedTime`
- 显示百分比和剩余时间

**app/components/ui/Lightbox.vue（图片灯箱）:**
- Props: `images`、`initialIndex`
- v-model: `open`
- 支持键盘导航（方向键、Escape）

#### 5.2 图像生成器组件（US-011）
**文件:** `app/components/image/ImageGenerator.vue`

- UTextarea 提示词输入框
- 分辨率选择器（1K/2K/4K）
- 长宽比选择器
- 参考图上传
- 生成/取消按钮
- 集成进度条

#### 5.3 聊天组件（US-012）
**文件:**

**app/components/chat/MessageList.vue（消息列表）:**
- 带滚动的消息展示

**app/components/chat/MessageItem.vue（消息项）:**
- 用户/助手不同样式
- 消息中的图片预览
- 操作按钮: 复制、编辑、删除、重新生成

**app/components/chat/InputArea.vue（输入区域）:**
- 自适应高度的文本框
- 发送按钮
- 图片附件

### 验收标准
- [x] 实现 app/components/ui/Loading.vue
- [x] 实现 app/components/ui/SmartProgressBar.vue
- [x] 实现 app/components/ui/Lightbox.vue
- [x] 使用 Nuxt UI v4 组件
- [x] 响应式设计
- [x] 实现 app/components/image/ImageGenerator.vue
- [x] UTextarea 提示词输入
- [x] 分辨率和长宽比选择器
- [x] 参考图上传
- [x] 生成/取消按钮
- [x] 集成进度条
- [x] 实现 app/components/chat/MessageList.vue
- [x] 实现 app/components/chat/MessageItem.vue
- [x] 实现 app/components/chat/InputArea.vue
- [x] 消息中的图片预览
- [x] 消息操作（复制、编辑、删除、重新生成）
- [x] 类型检查通过

### 验证步骤
```bash
pnpm dev
# 视觉检查组件
# 测试交互
```

---

## 阶段 6: 设置与渠道（US-013）

### 目标
创建设置面板和渠道管理界面。

### 前置依赖
- 阶段 5 完成

### 任务清单

#### 6.1 设置组件（US-013）
**文件:**

**app/components/settings/ProviderManager.vue（渠道管理器）:**
- 渠道列表，带启用/禁用开关
- 添加渠道弹窗（UModal，使用 #content 插槽）
- 测试渠道按钮
- 删除渠道

**app/components/settings/ThemeSwitch.vue（主题切换）:**
- 浅色/深色/跟随系统 切换
- 使用 USwitch

**app/components/settings/SettingsPanel.vue（设置面板）:**
- 默认分辨率
- 默认长宽比
- 流式传输开关
- 上下文数量滑块
- 自动保存开关
- 目录选择器

### 验收标准
- [x] 实现 app/components/settings/ProviderManager.vue
- [x] 实现 app/components/settings/ThemeSwitch.vue
- [x] 实现 app/components/settings/SettingsPanel.vue
- [x] 使用 Nuxt UI v4: UFormField、USwitch、UModal
- [x] 类型检查通过

---

## 阶段 7: 工具 - 提示词（US-014）

### 目标
迁移 BananaTool 和自定义提示词功能。

### 前置依赖
- 阶段 6 完成

### 任务清单

#### 7.1 Banana 提示词工具（US-014）
**文件:**

**app/composables/useBananaTool.ts:**
- 多源加载，带降级策略
- 本地缓存（24小时过期）
- 搜索和筛选

**stores/prompts.ts:**
- 自定义提示词 CRUD
- 持久化到 localStorage

**app/components/tools/BananaTool.vue:**
- 搜索栏
- 分类标签页
- 提示词卡片，包含:
  - 预览图
  - 复制按钮
  - 应用到输入框按钮
  - 保存到自定义提示词

### 验收标准
- [x] 实现 app/composables/useBananaTool.ts，支持多源加载
- [x] 实现 stores/prompts.ts 用于自定义提示词
- [x] 实现 app/components/tools/BananaTool.vue
- [x] 支持搜索、复制、应用、保存功能
- [x] 类型检查通过

---

## 阶段 8: 工具 - 切片与表情包（US-015、US-016）

### 目标
迁移图片切片和表情包制作工具。

### 前置依赖
- 阶段 7 完成

### 任务清单

#### 8.1 切片工具（US-015）
**文件:**

**app/composables/useSlicer.ts:**
- 配置: rows（行）、cols（列）、gap（间隙）、fillColor（填充色）、autoFill（自动填充）、highRes（高清）
- 方法: loadImage、slice、setNineGrid、downloadAll、downloadSlice

**app/components/tools/SlicerTool.vue:**
- 图片上传
- 网格配置
- 预览网格
- 下载按钮（单个 + 批量 ZIP）

#### 8.2 表情包制作模式（US-016）
**文件:**

**app/composables/useStickerMode.ts:**
- 预设: emotions（表情）、actions（动作）
- LINE 风格提示词模板
- 方法: generateSticker、generateStickerPack

**app/components/tools/StickerMode.vue:**
- 角色输入
- 表情/动作选择器
- 背景选项（白色/透明）
- 单个/批量生成按钮

### 验收标准
- [x] 实现 app/composables/useSlicer.ts
- [x] 实现 app/components/tools/SlicerTool.vue
- [x] 可配置行/列/间隙
- [x] 九宫格预设
- [x] 2x 高清输出选项
- [x] JSZip 批量下载
- [x] 实现 app/composables/useStickerMode.ts
- [x] 实现 app/components/tools/StickerMode.vue
- [x] 预设表情和动作
- [x] 背景选项（白色/透明）
- [x] 支持批量生成
- [x] 类型检查通过

---

## 阶段 9: 小红书模块（US-017）

### 目标
完成小红书（XHS）内容创作模块。

### 前置依赖
- 阶段 8 完成

### 任务清单

#### 9.1 小红书 Store 与 Composable
**文件:**

**stores/xhs.ts:**
- 状态: history、currentTopic、currentContent、currentStoryboard、isGenerating
- IndexedDB 持久化（XHSHistoryDB）
- 方法: init、generateContent、generateStoryboardImage、generateAllStoryboardImages、saveToHistory、loadHistory、deleteHistory、clearCurrent

**app/composables/useXHS.ts:**
- 轻量封装，添加 Toast 通知

#### 9.2 小红书页面
**文件:** `app/pages/xhs.vue`

- 三栏布局:
  - 左侧: 设置与历史记录
  - 中间: 主题输入与文案内容
  - 右侧: 分镜墙
- 主题输入框带生成按钮
- 文案展示带复制按钮
- 分镜卡片支持单个/批量生成
- 保存到历史记录

### 验收标准
- [x] 实现 stores/xhs.ts，持久化到 IndexedDB
- [x] 实现 app/composables/useXHS.ts
- [x] 实现 app/pages/xhs.vue，三栏布局
- [x] 主题输入和内容生成
- [x] 分镜规划
- [x] 批量图片生成
- [x] 历史记录管理
- [x] 类型检查通过

---

## 阶段 10: 布局与页面（US-018）

### 目标
创建布局和页面结构。

### 前置依赖
- 阶段 9 完成

### 任务清单

#### 10.1 布局
**文件:**

**app/layouts/default.vue:**
- 顶部导航栏: Logo、导航链接、主题切换
- 主内容区域
- 侧边栏放置工具（可折叠）

#### 10.2 页面
**文件:**

**app/app.vue:**
- NuxtLayout 包装器
- UNotifications 用于 Toast

**app/pages/index.vue:**
- 主聊天/生成页面
- 左侧边栏: 会话列表
- 中间: 聊天 + 生成器
- 右侧: 工具面板

**app/pages/settings.vue（可选）:**
- 完整设置页面

### 验收标准
- [x] 实现 app/layouts/default.vue
- [x] 实现 app/pages/index.vue（主聊天/生成页面）
- [x] 实现 app/pages/xhs.vue
- [x] 配置 app/app.vue
- [x] 类型检查通过

---

## 阶段 11: 集成与测试（US-020）

### 目标
最终集成、测试和完善。

### 前置依赖
- 所有前置阶段完成

### 任务清单

#### 11.1 集成
- 连接所有 Composables 和 Stores
- 验证组件间数据流
- 测试所有用户交互

#### 11.2 测试清单
- [ ] 图像生成流程端到端
- [ ] 聊天持久化（刷新后保留）
- [ ] 会话管理（创建、切换、删除）
- [ ] 渠道管理（添加、测试、切换、删除）
- [ ] 小红书模块完整流程
- [ ] 主题切换
- [ ] 文件自动保存（Chrome）
- [ ] Banana 提示词工具
- [ ] 自定义提示词
- [ ] 切片工具
- [ ] 表情包制作模式

#### 11.3 构建验证
```bash
pnpm typecheck  # 无 TypeScript 错误
pnpm build      # 构建成功
pnpm preview    # 测试生产构建
```

### 验收标准
- [x] 所有 Composables 和 Stores 连接完成
- [x] 所有组件正确渲染
- [x] 图像生成流程端到端工作
- [x] 聊天持久化工作
- [x] 小红书模块工作
- [x] 主题切换工作
- [x] 无控制台错误
- [x] 类型检查通过
- [x] 构建成功（pnpm build）

---

## 提交策略

### 分支结构
```
main
  └── ralph/nuxt4-migration
        ├── phase-1-foundation
        ├── phase-2-infrastructure
        ├── phase-3-state
        ├── phase-4-generation
        ├── phase-5-components
        ├── phase-6-settings
        ├── phase-7-prompts
        ├── phase-8-tools
        ├── phase-9-xhs
        ├── phase-10-layouts
        └── phase-11-integration
```

### 提交规范
```
feat(phase-N): 描述

- 变更要点
- 关联用户故事: US-XXX
```

### 合并策略
- 每个阶段分支使用 Squash Merge
- 在阶段分支中保留详细提交历史

---

## 风险缓解

### 风险 1: File System API 浏览器支持
**风险**: 该功能仅在 Chromium 浏览器中有效。
**缓解措施**:
- 优雅降级并提供清晰提示
- 在显示 UI 前进行特性检测
- 为不支持的浏览器提供备用下载按钮

### 风险 2: Nuxt UI v4 破坏性变更
**风险**: Nuxt UI v4 的 API 与 v3 不同。
**缓解措施**:
- 使用语义化颜色（success、error、warning、info）
- 使用 UFormField（不是 UFormGroup）
- 使用 USwitch（不是 UToggle）
- 使用 UModal 的 #content 插槽
- 参考 Nuxt UI v4 官方文档

### 风险 3: 大尺寸 Base64 性能
**风险**: 4K 图像会生成非常大的 Base64 字符串。
**缓解措施**:
- 使用 Blob URL 进行显示
- 使用 BlobManager 管理生命周期
- 尽可能压缩图像
- 列表中使用图片懒加载

### 风险 4: SSR 兼容性
**风险**: 仅浏览器可用的 API（IndexedDB、FileSystem）会破坏 SSR。
**缓解措施**:
- 在 nuxt.config.ts 中使用 `ssr: false`
- 在 `process.client` 检查中包装浏览器 API
- 使用 `onMounted` 进行初始化

---

## 成功标准

### 功能性
- 全部 20 个用户故事通过验收标准
- 与原生 JavaScript 版本功能对等
- 全新数据结构设计合理

### 技术性
- TypeScript 编译通过
- 无运行时错误
- 构建成功
- 打包大小合理（gzip 后 < 500KB）

### 用户体验
- 页面加载 < 3 秒
- 交互流畅（60fps）
- 移动端响应式
- 清晰的错误提示

---

## 执行注意事项

1. **从头开始**: 创建新的 Nuxt 项目，不要尝试改造现有项目
2. **增量迁移**: 逐个功能迁移，每个都要验证
3. **类型优先**: 先定义类型再实现功能
4. **频繁测试**: 经常运行 `pnpm dev` 和 `pnpm typecheck`
5. **全新开始**: 使用全新的数据库结构，无需考虑旧数据兼容

---

## 用户故事覆盖矩阵

| 用户故事 | 阶段 | 优先级 | 描述 |
|----------|------|--------|------|
| US-001 | 1 | 1 | 项目脚手架与配置 |
| US-002 | 1 | 2 | 类型定义 |
| US-003 | 2 | 3 | 工具函数迁移 |
| US-004 | 2 | 4 | IndexedDB Composable |
| US-005 | 3 | 5 | Provider Store 与 Composable |
| US-006 | 3 | 6 | Chat Store 与 Composable |
| US-007 | 4 | 7 | 图像生成 Composable |
| US-008 | 4 | 8 | 文件系统 Composable |
| US-009 | 2 | 9 | 主题与 Toast Composables |
| US-010 | 5 | 10 | UI 组件 - 核心 |
| US-011 | 5 | 11 | 图像生成器组件 |
| US-012 | 5 | 12 | 聊天组件 |
| US-013 | 6 | 13 | 设置组件 |
| US-014 | 7 | 14 | BananaTool 与自定义提示词 |
| US-015 | 8 | 15 | 切片工具 |
| US-016 | 8 | 16 | 表情包制作模式 |
| US-017 | 9 | 17 | XHS 灵感实验室模块 |
| US-018 | 10 | 18 | 布局与页面 |
| US-019 | 3 | 19 | 设置 Store |
| US-020 | 11 | 20 | 最终集成与测试 |

---

**计划作者**: Prometheus（规划代理）
**审核就绪**: 是

PLAN_READY: .omc/plans/nuxt4-migration-zh.md
