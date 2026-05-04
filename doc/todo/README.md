# 任务执行表索引

本目录是 [doc/breezy-bouncing-lantern.md](../breezy-bouncing-lantern.md) 产品设计优化方案拆分而来的可执行任务清单，每份文档对应一个独立工作单元（建议一个 PR 对应一份）。

## 一、任务总览

| 编号 | 任务 | 优先级 | 工时估算 | 状态 | 文档 |
|------|------|--------|----------|------|------|
| P0-1 | 抽 ToolPanelShell 骨架组件，整改 4 个工具的高度规约 | P0 | 1.5-2 天 | 未开始 | [P0-1-tool-panel-shell.md](./P0-1-tool-panel-shell.md) |
| P0-2 | 删除死路由 `/settings` | P0 | 0.25 天 | 未开始 | [P0-2-remove-settings-route.md](./P0-2-remove-settings-route.md) |
| P1-1 | Banana / Custom 由 UModal 改 USlideover 右抽屉 | P1 | 1-1.5 天 | 未开始 | [P1-1-banana-custom-slideover.md](./P1-1-banana-custom-slideover.md) |
| P1-2 | 侧栏视觉分组（工作台 / 工具）+ 形态微图标 | P1 | 0.5-1 天 | 未开始 | [P1-2-sidebar-grouping.md](./P1-2-sidebar-grouping.md) |
| P2-1 | Sticker 提升为独立页面 `/sticker` + 引入历史持久化 | P2 | 3-5 天 | 未开始 | [P2-1-sticker-page.md](./P2-1-sticker-page.md) |

合计：约 6.25-9.75 天工时。

## 二、依赖关系

```
P0-1 (ToolPanelShell)
  ├─> P1-1 (Banana/Custom 改抽屉)         依赖 Shell 已就绪
  └─> P2-1 (Sticker 页面化)               复用 Shell 风格规约

P0-2 (删 /settings)                       独立任务，无依赖

P1-2 (侧栏视觉分组)
  └─> 依赖 P2-1 完成（sticker 改成 NuxtLink 跳转），如 P2-1 未完成，P1-2 暂用 emit 事件
```

**建议执行顺序**：

1. 第 1 周
   - 周一并行：P0-1 + P0-2
   - 周三：P0 验收，开始 P1-1
   - 周五：P1-1 验收
2. 第 2 周
   - 周一：P1-2（含或不含 sticker 跳转占位）
   - 周二起：启动 P2-1 设计稿与开发
3. 第 3-4 周
   - P2-1 开发与联调
   - P1-2 在 P2-1 完成后做最终联动验证

## 三、命名与协作约定

### Git 分支
- `feat/p0-1-tool-panel-shell`
- `chore/p0-2-remove-settings-route`
- `feat/p1-1-banana-custom-slideover`
- `feat/p1-2-sidebar-grouping`
- `feat/p2-1-sticker-page`

### 提交信息
统一前缀：`[P0-1] xxx` / `[P0-2] xxx` / `[P1-1] xxx` 等，便于追踪。

### PR Title
`[P0-1] 抽 ToolPanelShell + 整改工具弹层高度规约`

## 四、整体验收门槛

P0 + P1 全部完成后，运行以下整体验证：

1. 在 1440×900、1920×1080、768×1024、375×667 四种视口下逐一打开每个工具，无显示不全
2. 所有工具弹层/抽屉只有一层滚动条
3. 提示词从 Banana / Custom 抽屉选择后能正常塞回主聊天输入框
4. 侧边栏点击 Chat / XHS 走 NuxtLink 跳转、点击 Banana / Custom / Slicer 走抽屉/弹层，行为与右上角微图标一致
5. 直接访问 `/settings` 返回 404 或重定向到 `/`
6. 折叠侧栏状态下所有图标可点击，无溢出

P2 完成后追加：
7. Sticker 历史关闭浏览器后仍存在
8. Sticker 页面三栏布局在 1280px+ 流畅，<1024px 自动堆叠

## 五、风险全景

| 风险 | 影响范围 | 缓解策略 |
|------|----------|----------|
| Nuxt UI v4 USlideover 与 UModal API 差异 | P1-1 | 提前阅读 Nuxt UI v4 文档（用 context7 MCP），对比 props/slots/events |
| Shell 重构破坏现有 chat-input-bridge 链路 | P0-1 | 在 P0-1 中保留 emit 事件签名不变，仅改容器结构 |
| Sticker 页面化改动量大、与 useStickerMode 耦合 | P2-1 | 先抽 store，再迁移视图，每步保留旧弹层做回退 |
| 侧栏分组改动影响 collapsed 状态 | P1-2 | 单独保留 collapsed 视觉测试，不改 collapsed 时的图标行为 |

## 六、与原方案文档的对应

本目录每份文档第一节"任务上下文"会引用 [breezy-bouncing-lantern.md](../breezy-bouncing-lantern.md) 的相应章节，保证设计意图不丢失。如需追溯产品决策依据，请回到原方案文档的"产品判断准则"与"功能归类最终决策"两节。
