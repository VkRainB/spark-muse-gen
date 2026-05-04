# P1-1：Banana / Custom 由 UModal 改 USlideover 右抽屉

## 一、任务上下文

来自 [doc/breezy-bouncing-lantern.md](../breezy-bouncing-lantern.md) 第二节"功能归类最终决策"与第四节"大型工具切换形态"。

提示词类工具（Banana 提示词快查、Custom 我的提示词）的产品定位是"短查询、结果回流主聊天输入框"，应与已有的 `QuickPromptPanel`（`app/pages/index.vue:151-163` 已用 USlideover）形态对齐。当前是居中 UModal，造成两个相似工具走两条形态路径，体感不一致。

改为右侧抽屉后，天然全高，列表型内容不再受弹层 max-height 截断。

## 二、目标与非目标

### 目标
- Banana / Custom 弹出形态改为 USlideover（桌面右抽屉，移动端底部 Sheet）
- 与右侧设置抽屉、快捷提示词抽屉互斥（不叠加）
- 提示词应用回主聊天输入框的链路（`chat-input-bridge`）保持不变

### 非目标
- 不改 BananaTool / CustomPromptTool 的内部业务逻辑
- 不改 SlicerTool / StickerMode（Slicer 维持 UModal，Sticker 在 P2-1 升页面）
- 不改设置抽屉

### 前置依赖
- **建议先完成 P0-1**：BananaTool / CustomPromptTool 已套 ToolPanelShell，骨架统一后再切容器更顺畅
- 若 P0-1 未完成，可并行做，但需在 USlideover 内手动维持 header/body/footer 结构

## 三、影响文件清单

| 文件 | 操作 | 涉及行 |
|------|------|--------|
| `app/layouts/default.vue` | 改造 | 行 408-441（删除 Banana/Custom 两个 UModal，新增两个 USlideover） |
| `app/layouts/default.vue` | 改造 | 行 86-103（toggleSettings / closeAllSidebars 等互斥逻辑要扩展到工具抽屉） |
| `app/components/tools/BananaTool.vue` | 微调 | 适配抽屉宽度下的列表布局（无需改业务） |
| `app/components/tools/CustomPromptTool.vue` | 微调 | 双栏布局在抽屉窄宽下需改为单栏堆叠 |

## 四、详细步骤（可勾选）

### 步骤 1：阅读 Nuxt UI v4 USlideover API

- [ ] 用 context7 MCP 查询 `/nuxtjs/ui` query "USlideover side responsive overlay"
- [ ] 确认 USlideover 的 props：`side`、`overlay`、`dismissible`、`ui` 等
- [ ] 确认 slots：`#header`、`#body`、`#footer`（与现有 `app/pages/index.vue:151-163` 对照）

### 步骤 2：在 layouts/default.vue 中替换 UModal → USlideover

- [ ] 删除现有 Banana UModal（行 408-422）
- [ ] 删除现有 Custom UModal（行 424-441）
- [ ] 新增 Banana USlideover：
  ```vue
  <USlideover
    v-model:open="bananaToolOpen"
    side="right"
    title="提示词快查"
    :ui="{ content: bananaSlideoverWidth }"
  >
    <template #body>
      <ToolsBananaTool @apply="handleBananaApply" />
    </template>
  </USlideover>
  ```
- [ ] 新增 Custom USlideover：
  ```vue
  <USlideover
    v-model:open="customPromptToolOpen"
    side="right"
    title="我的提示词"
    :ui="{ content: customSlideoverWidth }"
  >
    <template #body>
      <ToolsCustomPromptTool
        @apply="handleCustomPromptApply"
        @send="handleCustomPromptSend"
      />
    </template>
  </USlideover>
  ```
- [ ] 抽屉宽度策略：
  - Banana：`max-w-md`（桌面 ~448px，列表型够用）
  - Custom：`max-w-lg`（桌面 ~512px，因为有"表单 + 列表"双栏需要更宽）
  - 移动端：在 `<768px` 自动改为底部 Sheet（用 `useDevice` 切换 `side` prop 或 USlideover 内置响应）

### 步骤 3：响应式 side 切换

- [ ] 引入 `const { isMobile } = useDevice()`
- [ ] 计算属性：
  ```ts
  const slideoverSide = computed<'right' | 'bottom'>(() =>
    isMobile.value ? 'bottom' : 'right'
  )
  ```
- [ ] 应用到两个 USlideover 的 `:side="slideoverSide"`
- [ ] 移动端宽度改为 `:ui="{ content: 'h-[90vh]' }"`（底部抽屉占 90vh 高度）

### 步骤 4：互斥关闭逻辑扩展

当前 `closeAllSidebars()` 只关左右侧栏，需扩展到工具抽屉：

- [ ] 修改 `closeAllSidebars`（行 100-103）：保持原行为
- [ ] 新增统一的 `closeAllPanels()` 函数：
  ```ts
  const closeAllPanels = () => {
    closeAllSidebars()
    closeToolModals()
    promptDrawerOpen.value = false
  }
  ```
- [ ] 调用点替换：
  - `toggleSettings` 打开右侧栏前调用 `closeToolModals()` 与 `promptDrawerOpen.value = false`
  - `togglePromptDrawer` 打开前关闭工具抽屉与设置
  - `openToolModal` 打开工具前关闭快捷提示词抽屉与设置
- [ ] 验证：同时只有一个抽屉是 open 状态

### 步骤 5：CustomPromptTool 双栏适配

抽屉宽度（512px）下，CustomPromptTool 的双栏 `grid-template-columns: minmax(280px, 340px) minmax(0, 1fr)` 会非常拥挤。

- [ ] 在 `app/components/tools/CustomPromptTool.vue` 行 312-317 修改：
  ```css
  .tool-layout {
    display: grid;
    grid-template-columns: 1fr;  /* 抽屉内默认单栏堆叠 */
    gap: 12px;
  }

  @media (min-width: 1280px) {
    /* 仅当未来用在更宽的容器时才切双栏 */
    .tool-layout {
      grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
    }
  }
  ```
- [ ] 注意：P0-1 已移除 `min-height: 480px` 与 `max-height: 45vh`，本步骤只调整 grid

### 步骤 6：BananaTool 抽屉适配

Banana 是单栏列表，无需特别适配。但要确认：

- [ ] 搜索框 + 分类下拉（行 70-83）在窄宽下不被截断（用 `flex-wrap`）
- [ ] 列表卡片右侧的操作按钮（行 104-126，"复制/应用/收藏"）在 hover 显示，窄宽下也能容纳

### 步骤 7：自测

- [ ] 桌面 1440×900：
  - 点击侧栏"提示词快查"卡片 → 右抽屉 442px 宽，全高，列表正常滚动
  - 点击"应用" → 抽屉关闭，主聊天输入框填入提示词
  - 同时打开"我的提示词" → 前一个抽屉自动关闭
  - 同时打开"设置" → 工具抽屉自动关闭
- [ ] 移动端 375×667：
  - 点击工具卡 → 底部 Sheet 弹出，占 90vh
  - 顶部应有可见关闭/拖拽指示
- [ ] 在 Custom 抽屉中：
  - 新增提示词 → 列表更新
  - 编辑/删除 → 行为正常
  - 点击"填充到输入框" → 抽屉关闭，输入框填入
  - 点击"直接发送" → 抽屉关闭，自动发送

## 五、设计要点

1. **为什么 Banana 用 max-w-md，Custom 用 max-w-lg？** Custom 有表单 + 列表，比纯列表的 Banana 需要更多横向空间。
2. **移动端为什么用 bottom 而不是 right？** 右侧抽屉在 375px 屏宽下占满后视觉与全屏 Modal 几乎无差异，底部 Sheet 是移动端"伴随抽屉"的标准范式。
3. **互斥的产品语义**：用户同一时刻心智只能聚焦一件事，抽屉叠加是反模式。

## 六、验收标准

- [ ] 桌面端打开 Banana / Custom 是右侧抽屉，宽度合理
- [ ] 移动端打开是底部 Sheet，占 90vh
- [ ] 设置抽屉、快捷提示词抽屉、工具抽屉两两之间互斥
- [ ] 提示词应用/发送链路完全正常（`chat-input-bridge` 生效）
- [ ] 抽屉内容有滚动需要时只有一层滚动
- [ ] 与 P0-1 的 ToolPanelShell 协同正常（如已合并 P0-1）

## 七、风险与回滚

| 风险 | 影响 | 缓解 |
|------|------|------|
| Nuxt UI v4 USlideover 在 v4 中可能有 API 变更 | 中 | 先用 context7 MCP 查文档对照实施 |
| Custom 双栏改单栏后老用户不适应 | 低 | 在抽屉内单栏体验仍好，且本来双栏在弹层里也很挤 |
| 互斥逻辑遗漏导致抽屉叠加 | 中 | 自测覆盖 6 种两两组合 |

回滚方式：单 PR 改动，revert 即可恢复 UModal 形态。

## 八、工时估算

| 子步骤 | 工时 |
|--------|------|
| 阅读 Nuxt UI v4 USlideover API | 0.1 天 |
| layouts/default.vue 替换两个容器 | 0.3 天 |
| 响应式 side 切换 | 0.15 天 |
| 互斥逻辑扩展 | 0.2 天 |
| CustomPromptTool 双栏适配 | 0.2 天 |
| 自测（桌面 + 移动 + 互斥） | 0.3 天 |
| 合计 | 1.25 天 |

## 九、关联资料

- 原方案 [doc/breezy-bouncing-lantern.md](../breezy-bouncing-lantern.md) 第二、四节
- 现有 USlideover 参考：`app/pages/index.vue:151-163`
- Nuxt UI v4 文档：用 `mcp__context7__query-docs` 查 `/nuxtjs/ui` query "USlideover side responsive"
- useDevice composable：`app/composables/useDevice.ts`
