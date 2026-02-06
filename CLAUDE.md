# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概述

Gemini 3 Pro Image Preview 是一个基于 Google Gemini 3 Pro 的现代化 AI 图像生成工作台。目前是纯前端应用（无需后端），完全在浏览器中运行。

**当前状态**：`source/` 目录下的原生 JavaScript 单页应用
**计划重构**：迁移到 Nuxt 4 + Vue 3 + Nuxt UI 4 + Tailwind CSS（详见 `doc/Refactor/`）

## 开发命令

```bash
# 启动本地开发服务器（当前原生 JS 版本）
python -m http.server 8000
# 或
npx serve source
# 或
php -S localhost:8000 -t source

# Nuxt 迁移后
pnpm install
pnpm dev
pnpm build
pnpm preview
```

## 架构

### 当前结构（原生 JS）

```
source/
├── index.html      # 单页 HTML，包含所有 UI 组件
├── app.js          # 所有业务逻辑（约 3000+ 行，单体架构）
├── style.css       # 所有样式，使用 CSS 变量支持主题切换
└── README.md       # 用户文档
```

### app.js 核心模块

| 模块 | 职责 |
|------|------|
| `ProviderManager` | 多渠道 API 配置（Gemini 原生接口 / OpenAI 兼容接口） |
| `FileSystemManager` | File System Access API 实现本地自动保存 |
| `XHSCreator` | 小红书内容创作工具 |
| `BananaTool` | 集成 banana-prompt-quicker 提示词库 |
| `CustomPromptTool` | 个人提示词管理 |
| `SlicerTool` | 图片切片/九宫格切图工具 |
| `SmartProgressBar` | 根据分辨率智能估算进度 |
| `LoadingManager` / `ErrorHandler` | UI 反馈系统 |

### 数据存储

- **IndexedDB**：`GeminiProDB`（会话、消息）、`XHSHistoryDB`（创作历史）
- **localStorage**：API 渠道配置、主题、设置、自定义提示词

### 外部依赖（CDN）

- `marked.js` - Markdown 解析
- `JSZip` - 批量下载文件压缩

## 重构上下文

迁移指南位于 `doc/Refactor/`：
- `NUXT_MIGRATION_GUIDE.md` - 第一部分：项目结构、核心模块
- `NUXT_MIGRATION_GUIDE_PART2.md` - 第二部分：组件、状态管理

目标技术栈：**Nuxt 4 + Vue 3 + Nuxt UI 4 + Pinia + Tailwind CSS**

## 关键模式

### API 集成

支持两种接口类型：
1. **Gemini 原生接口**：`generativelanguage.googleapis.com`
2. **OpenAI 兼容接口**：标准 OpenAI API 格式，支持流式传输

### 图像生成流程

```
用户输入 → ProviderManager.getProvider() → API 请求 →
processGeneration() → UI 渲染 → FileSystemManager.autoSave()
```

### 分辨率预设

- 1K：1024x1024（约 15 秒生成）
- 2K：2048x2048（约 30 秒生成）
- 4K：4096x4096（约 60 秒生成）

## 浏览器要求

- Chrome 86+ / Edge 86+（完整功能，包括 File System Access API）
- Firefox / Safari（仅核心功能，不支持自动保存）
