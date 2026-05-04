# P0-1：抽 ToolPanelShell 骨架组件 + 整改工具高度规约

## 一、任务上下文

来自 [doc/breezy-bouncing-lantern.md](../breezy-bouncing-lantern.md) 第四节"弹层显示不全的修复策略"。

当前 4 个工具弹层（Banana / Custom / Sticker / Slicer）共用 `app/layouts/default.vue` 的 `.tool-modal` 容器，但子组件各自硬编码高度（`max-h-96`、`min-height: 480px`、`max-height: 45vh`），造成"双层滚动 + 内层被截短"。本任务通过抽取统一骨架组件 `ToolPanelShell`，让外层容器单点决定可用高度与滚动位置，子组件用 `flex: 1; min-height: 0` 让出高度。

## 二、目标与非目标

### 目标
- 所有工具弹层/抽屉的 Header / Body / Footer 由统一组件管理
- 子组件移除全部硬编码高度（max-h-* / min-height / max-height）
- 实现"滚动只出现一层"的产品契约

### 非目标
- 不改变工具的业务功能、不改 emit 事件签名（保护 chat-input-bridge 链路）
- 不切换 UModal → USlideover（那是 P1-1 的事）
- 不引入新依赖

## 三、影响文件清单

| 文件 | 操作 | 涉及行 |
|------|------|--------|
| `app/components/ui/ToolPanelShell.vue` | 新建 | 全文件 |
| `app/components/tools/BananaTool.vue` | 改造 | 行 56-135（template）、移除行 90 `max-h-96 overflow-y-auto` |
| `app/components/tools/CustomPromptTool.vue` | 改造 | 行 156-297（template）、行 299-460（style，移除 `min-height: 480px` 与 `max-height: 45vh`） |
| `app/components/tools/StickerMode.vue` | 改造 | 行 70-166（template），把生成按钮组放到 Footer |
| `app/components/tools/SlicerTool.vue` | 改造 | 行 24-105（template），把操作按钮组放到 Footer |
| `app/layouts/default.vue` | 微调 | 行 408-473（4 个 UModal 内的 `.tool-modal` 包装），行 838-892（CSS 收敛或保留） |

## 四、详细步骤（可勾选）

### 步骤 1：设计并新建 ToolPanelShell 组件

- [ ] 创建 `app/components/ui/ToolPanelShell.vue`
- [ ] 定义 props：
  - `title?: string`（标题文本，可选）
  - `loading?: boolean`（顶部 loading 指示器）
  - `bodyPadding?: string`（默认 `'14px 16px'`）
- [ ] 定义 emits：
  - `close`（关闭按钮事件，可选触发，由父级决定是否监听）
- [ ] 定义 slots：
  - `#header`（默认填入 title + 关闭按钮，可被覆盖）
  - `#header-actions`（标题右侧的额外操作按钮槽，关闭按钮永远在最右）
  - `#default` 或 `#body`（主内容区，唯一滚动容器）
  - `#footer`（粘性底部 CTA 区，可选；存在时展示在 Body 下方且不参与 Body 滚动）
- [ ] 模板结构：
  ```
  <div class="tps-root">
    <header class="tps-header">{标题 / 关闭按钮 / 操作槽}</header>
    <div class="tps-body">{主内容}</div>
    <footer v-if="$slots.footer" class="tps-footer">{CTA}</footer>
  </div>
  ```
- [ ] CSS 关键规则：
  - `.tps-root`：`display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden;`
  - `.tps-header`：`flex: 0 0 auto;`，复用 `app/layouts/default.vue` 行 854-868 的样式
  - `.tps-body`：`flex: 1 1 auto; min-height: 0; overflow: auto;`，padding 由 `bodyPadding` prop 控制
  - `.tps-footer`：`flex: 0 0 auto; border-top: 1px solid var(--border-color); padding: 12px 16px; background: var(--card-bg);`
- [ ] 暗色主题适配：复用 `--bg-sidebar`、`--border-color`、`--text-main` 变量

### 步骤 2：layouts/default.vue 适配

- [ ] 检查现有 `.tool-modal` / `.tool-modal-medium` 容器（行 838-852）是否仍需保留外层尺寸约束（width / max-height）
- [ ] 决策：外层 `<UModal>` 仍保留 `.tool-modal` 作为尺寸壳，但内层 header/body 全部由 `<ToolPanelShell>` 接管
- [ ] 4 个 UModal 改造：
  ```
  <UModal v-model:open="bananaToolOpen">
    <template #content>
      <div class="tool-modal">
        <UiToolPanelShell title="提示词快查" @close="bananaToolOpen = false">
          <ToolsBananaTool @apply="handleBananaApply" />
        </UiToolPanelShell>
      </div>
    </template>
  </UModal>
  ```
- [ ] 删除 `.tool-modal-header`、`.tool-modal-body`、`.tool-close-btn` 这三块 CSS（行 854-892），改由 ToolPanelShell 自带
- [ ] 保留 `.tool-modal` 与 `.tool-modal-medium` 的 width / max-height 约束（行 838-852）

### 步骤 3：BananaTool 改造

- [ ] 移除 `template` 行 90 的 `max-h-96 overflow-y-auto` 类
- [ ] 改用 flex 布局：
  - 顶部搜索栏（搜索 + 分类）`flex: 0 0 auto`
  - 列表区 `flex: 1 1 auto; min-height: 0; overflow: auto`
- [ ] 移除最外层 `<div class="space-y-4">` 上的标题"提示词库"行 59（与 Shell.header 重复，由 Shell 接管）
- [ ] 把刷新按钮（行 60-66）作为 Shell 的 `#header-actions` slot 内容传入
- [ ] 验证 `@apply` 事件传递路径不变

### 步骤 4：CustomPromptTool 改造

- [ ] 移除 `style` 行 312-317 的 `min-height: 480px`
- [ ] 移除 `style` 行 451-458 的媒体断点 `@media (max-width: 1024px) .prompt-list { max-height: 45vh }`
- [ ] 改造 `.tool-layout`：保持 grid 双栏，但加 `min-height: 0; height: 100%;` 让外层 Shell.body 给出高度
- [ ] 双栏内部各自处理滚动：
  - `.form-panel`：内容自然撑高，溢出时整个 Shell.body 滚动（不在子栏内滚动）
  - `.list-panel`：保持 `display: flex; flex-direction: column; min-height: 0;`，`.prompt-list` 用 `flex: 1; min-height: 0; overflow-y: auto`
- [ ] 移除 `tool-header`（行 158-163）的标题与按钮，"重置筛选"按钮放到 Shell 的 `#header-actions` slot

### 步骤 5：StickerMode 改造

- [ ] template 主体（行 70-153）保留作为 Shell 的 `#default` slot 内容
- [ ] 把"生成单个"和"批量生成"两个按钮（行 137-153）抽到 Shell 的 `#footer` slot
- [ ] 进度条（行 134）放在 Footer 上方或保留在 Body 内（取决于是否阻塞操作，建议放 Footer 上方）
- [ ] 移除原来的 `<h3>表情包制作</h3>` 标题（与 Shell 标题重复）
- [ ] 注：本任务暂不改 generatedStickers 持久化（那是 P2-1）

### 步骤 6：SlicerTool 改造

- [ ] template 主体（行 24-103）保留作为 Shell 的 `#default` slot 内容
- [ ] 把操作按钮组（行 76-87，"开始切片/下载全部/清除"）抽到 Shell 的 `#footer` slot
- [ ] 移除原来的 `<h3>图片切片工具</h3>` 标题
- [ ] 切片结果网格区域用 `flex: 1; min-height: 0; overflow: auto`（在 Shell.body 内滚）

### 步骤 7：自测

- [ ] 启动 `pnpm dev`，逐一打开 4 个工具：
  - 在 1440×900 视口下检查内容是否撑满 Shell.body
  - 在 768×1024 检查移动端布局
  - 浏览器开发者工具检查仅有一层 `overflow: auto` 容器
- [ ] 操作冒烟：
  - Banana：点击"应用"按钮，主聊天输入框是否填入提示词
  - Custom：新增/编辑/删除 一条提示词，验证 CRUD
  - Sticker：填角色描述、选表情、点生成，验证图片出现
  - Slicer：上传图、点切片、点下载 ZIP

## 五、设计要点（重要决策记录）

1. **保留外层 `.tool-modal` 尺寸壳**：不把 width/max-height 移到 ToolPanelShell，保持 Shell 是"内容骨架"，容器尺寸由调用方决定（弹层、抽屉、整页都能复用）。
2. **Footer 是可选 slot**：BananaTool / CustomPromptTool 没有强 CTA（操作按钮在每行），不需要 Footer；StickerMode / SlicerTool 有强 CTA，需要 Footer。
3. **关闭按钮放在 Shell.header**：而不是各个工具自己渲染，避免样式分散。

## 六、验收标准

- [ ] 4 个工具弹层在 4 种视口下打开均无截断、无内容溢出弹层之外
- [ ] 浏览器 DevTools 中每个弹层只能找到一层 `overflow: auto` 元素
- [ ] grep 全仓库无 `max-h-96`、`min-height: 480px`、`max-height: 45vh` 的硬编码（在工具组件内）
- [ ] 4 个工具的业务功能（应用/CRUD/生成/切片）行为完全不变
- [ ] `chat-input-bridge` 路径未受影响（验证：BananaTool/CustomPromptTool 选词后主输入框仍正常填入）

## 七、风险与回滚

| 风险 | 影响 | 缓解 |
|------|------|------|
| Shell 与 Nuxt UI UModal 内部样式冲突 | 中 | 给 Shell 加 `:deep()` 隔离，必要时用 css module |
| 子组件改造遗漏 emit 链 | 高 | 每个工具改造后单独冒烟，对照原文件 emit 列表逐项验证 |
| CSS 变量在不同主题下显示异常 | 低 | 暗色与浅色主题各跑一遍 |

回滚方式：单 PR 改动，如出问题直接 revert 提交即可恢复。

## 八、工时估算

| 子步骤 | 工时 |
|--------|------|
| 设计 + 新建 ToolPanelShell | 0.5 天 |
| layouts/default.vue 适配 | 0.25 天 |
| BananaTool 改造 | 0.25 天 |
| CustomPromptTool 改造 | 0.25 天 |
| StickerMode 改造 | 0.25 天 |
| SlicerTool 改造 | 0.25 天 |
| 自测 + 微调 | 0.25 天 |
| 合计 | 2 天 |

## 九、关联资料

- Nuxt UI v4 UModal 文档（实施前用 context7 MCP 查询：`/nuxtjs/ui` query "UModal slots"）
- 原方案 [doc/breezy-bouncing-lantern.md](../breezy-bouncing-lantern.md) 第四节
- 现有 USlideover 参考：`app/pages/index.vue:151-163`
