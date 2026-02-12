# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Gemini 3 Pro Image Preview — 基于 Google Gemini 3 Pro 的 AI 图像生成工作台。纯前端 SPA（无后端），完全在浏览器中运行。

项目包含两套代码：
- **`source/`** — 旧版原生 JavaScript 单页应用（保留参考，不再主要开发）
- **`app/`** — **当前主代码**，已迁移至 Nuxt 4 + Vue 3 + Nuxt UI 4 + Pinia + Tailwind CSS v4

## 开发命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器 (localhost:3001)
pnpm build            # 生产构建
pnpm preview          # 预览生产构建
pnpm generate         # 静态生成
```

无测试框架、无 lint 配置。

## 架构

### 技术栈

- **Nuxt 4**（`ssr: false` SPA 模式，`future.compatibilityVersion: 4`）
- **Nuxt UI v4** — 组件库（UApp, UModal, USlideover, UIcon, UNotifications 等）
- **Pinia v3** + `pinia-plugin-persistedstate` — 状态管理，数据持久化到 localStorage
- **Tailwind CSS v4** — 通过 `@import "tailwindcss"` 引入
- **@nuxtjs/color-mode** — 主题切换（system/light/dark）
- **@fortaine/fetch-event-source** — SSE 流式传输
- **marked** — Markdown 解析
- **JSZip** — 批量下载压缩

### 目录结构

```
app/
├── api/fetchClient.ts        # API 请求客户端
├── components/
│   ├── chat/                  # 聊天界面（InputArea, InputBar, MessageItem, MessageList, QuickPromptPanel）
│   ├── image/                 # 图像生成（ImageGenerator）
│   ├── settings/              # 设置（ProviderManager, SettingsPanel, ThemeSwitch）
│   ├── tools/                 # 工具（BananaTool, CustomPromptTool, SlicerTool, StickerMode）
│   └── ui/                    # 通用 UI（ConfirmDialog, Lightbox, Loading, SidebarNav, SmartProgressBar）
├── composables/               # 13 个组合式函数（见下方）
├── layouts/default.vue        # 主布局：侧边栏导航 + 设置面板 + 工具模态框
├── pages/                     # 3 个页面路由
│   ├── index.vue              # 主聊天/图像生成页
│   ├── settings.vue           # 设置页
│   └── xhs.vue                # 小红书内容创作页
├── plugins/
│   ├── pinia-persist.client.ts    # Pinia 持久化插件注册
│   └── vue-warn-filter.client.ts  # 过滤 Suspense 实验性警告
└── utils/                     # 工具函数（base64, blob, download, escapeHtml）

stores/                        # Pinia stores（在 app/ 外，通过 nuxt.config pinia.storesDirs 配置）
├── chat.ts                    # 会话和消息管理
├── prompts.ts                 # 自定义提示词
├── provider.ts                # API 渠道配置
├── settings.ts                # 应用设置
└── xhs.ts                     # 小红书相关状态

types/                         # TypeScript 类型定义
├── chat.d.ts, image.d.ts, provider.d.ts, xhs.d.ts, index.d.ts
```

### 关键架构模式

**Composables 分层**：每个业务域对应一个 composable，封装逻辑与状态操作：

| Composable | 职责 |
|------------|------|
| `useChat` | 会话管理、消息收发、流式响应处理 |
| `useImageGeneration` | 图像生成请求、进度追踪 |
| `useProvider` | 多渠道 API 提供者切换与配置 |
| `useFileSystem` | File System Access API 本地自动保存 |
| `useIndexedDB` | IndexedDB 数据库操作封装 |
| `useBananaTool` | banana-prompt-quicker 提示词库集成 |
| `useStickerMode` | 贴纸/表情包创作模式 |
| `useSlicer` | 图片切片/九宫格工具 |
| `useXHS` | 小红书内容创作 |
| `useTheme` | 主题管理 |
| `useLightbox` | 图片灯箱预览 |
| `useToast` | 消息通知 |
| `useDevice` | 设备检测（移动端/桌面端） |

**跨组件通信**：
- `useState("chat-input-bridge")` — 布局与聊天组件间的输入桥接
- `useState("left-sidebar-collapsed")` — 侧边栏折叠状态
- `provide/inject` — 布局向子组件注入侧边栏控制函数

**数据持久化**：
- **Pinia + persistedstate** — stores 自动持久化到 localStorage
- **IndexedDB** — `GeminiProDB`（会话、消息）、`XHSHistoryDB`（创作历史）

### API 集成

支持两种接口类型：
1. **Gemini 原生接口** — `generativelanguage.googleapis.com`
2. **OpenAI 兼容接口** — 标准 OpenAI API 格式，支持 SSE 流式传输

### Nuxt 配置要点

- `ssr: false` — 纯 SPA，无服务端渲染
- `devServer.port: 3001`
- Pinia stores 目录：`./stores/**`（在 `app/` 外部）
- 别名：`~/stores` → `./stores`，`~/types` → `./types`

## 文档

- `doc/PRD.md` — 产品需求文档
- `doc/Api/API_INTEGRATION_GUIDE.md` — API 集成指南
- `doc/Refactor/` — Nuxt 迁移指南（NUXT_MIGRATION_GUIDE.md, NUXT_MIGRATION_GUIDE_PART2.md）

## 旧版代码参考

`source/` 目录保留原生 JS 版本供参考，包含 `app.js`（~3000+ 行单体）、`index.html`、`style.css`。新功能开发应在 `app/` Nuxt 项目中进行。
