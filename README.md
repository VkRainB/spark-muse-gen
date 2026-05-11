# Gemini 3 Pro Image Preview

基于 Google Gemini 3 Pro 的 AI 图像生成工作台。纯前端 SPA，完全在浏览器中运行，无需后端服务。

## 功能

- **AI 图像生成** — 支持文字描述生成图像，支持参考图上传
- **多渠道 API** — 支持 Gemini 原生接口和 OpenAI 兼容接口，可配置多个渠道并按权重随机优选
- **贴纸/表情包创作** — 角色配置、表情/动作变体选择、批量生成
- **图片切片** — 上传图片后按预设切片，支持九宫格等模式，一键打包下载
- **小红书内容创作** — 面向小红书平台的内容生成工具
- **提示词工具** — banana-prompt-quicker 提示词库集成 + 自定义提示词管理
- **会话管理** — 多会话隔离、消息历史、流式响应
- **主题切换** — 支持 system / light / dark 三种模式
- **响应式布局** — 移动端自适应，侧边栏折叠/抽屉式交互

## 技术栈

- [Nuxt 4](https://nuxt.com/)（SPA 模式）
- [Vue 3](https://vuejs.org/) + Composition API
- [Nuxt UI v4](https://ui.nuxt.com/)
- [Pinia v3](https://pinia.vuejs.org/) + pinia-plugin-persistedstate
- [Tailwind CSS v4](https://tailwindcss.com/)
- TypeScript

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 `http://localhost:3001`

## 其他命令

```bash
pnpm build       # 生产构建
pnpm preview     # 预览生产构建
pnpm generate    # 静态生成
```

## 项目结构

```
app/                  # Nuxt 应用主代码
├── api/              # API 请求客户端
├── components/       # Vue 组件（chat, settings, sticker, tools, ui）
├── composables/      # 组合式函数（13 个业务域）
├── layouts/          # 布局组件
├── pages/            # 页面路由（首页、切片、贴纸、小红书）
├── plugins/          # Nuxt 插件
└── utils/            # 工具函数
stores/               # Pinia 状态管理
types/                # TypeScript 类型定义
source/               # 旧版原生 JS 版本（仅供参考）
```

## 文档

- [产品需求文档](doc/PRD.md)
- [API 集成指南](doc/Api/API_INTEGRATION_GUIDE.md)
- [Nuxt 迁移指南](doc/Refactor/)
