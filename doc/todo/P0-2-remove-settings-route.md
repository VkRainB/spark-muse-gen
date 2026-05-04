# P0-2：删除死路由 `/settings`

## 一、任务上下文

来自 [doc/breezy-bouncing-lantern.md](../breezy-bouncing-lantern.md) 第五节"设置入口处理"。

`app/pages/settings.vue` 仅是 `SettingsPanel` 组件的薄包装（与右侧抽屉用同一个组件实例），违反"唯一真相源"原则。当前侧边栏与所有视图均无任何入口指向 `/settings`，是事实上的死路由。

设置属于"伴随主流程"的全局偏好（命中产品判断准则 C5），右侧抽屉已是最佳形态，独立路由没有必要。

## 二、目标与非目标

### 目标
- 删除 `/settings` 路由文件
- 验证全仓库无残留引用
- 保留右侧抽屉作为唯一设置入口

### 非目标
- 不修改 `SettingsPanel.vue` 组件本身
- 不改右侧抽屉的展示逻辑（`layouts/default.vue` 行 396-406 保持）
- 不引入设置项深链（如未来需要，用 query 参数即可）

## 三、影响文件清单

| 文件 | 操作 |
|------|------|
| `app/pages/settings.vue` | 整文件删除 |
| 全仓库 | grep 验证无 `/settings` 引用 |

## 四、详细步骤（可勾选）

### 步骤 1：引用扫描

- [ ] 全局 grep 字符串 `'/settings'`、`"/settings"`、`navigateTo('/settings'`
- [ ] 全局 grep `<NuxtLink to="/settings"` / `<RouterLink to="/settings"`
- [ ] 全局 grep `to="/settings"`
- [ ] 检查 `app/layouts/default.vue` 是否有指向（已知没有，但需复核）
- [ ] 检查 `nuxt.config.ts` 是否有路由配置或重定向

### 步骤 2：删除文件

- [ ] 删除 `app/pages/settings.vue`
- [ ] 删除后跑 `pnpm dev` 确认编译无错

### 步骤 3：可选——添加重定向（若希望友好兜底）

- [ ] 在 `nuxt.config.ts` 加 `routeRules`：
  ```ts
  routeRules: {
    '/settings': { redirect: '/' }
  }
  ```
- [ ] 这样直接访问 `/settings` 会重定向到主页，避免 404 给老书签用户造成困扰
- [ ] 该步骤为可选，团队可决策是否保留

### 步骤 4：自测

- [ ] 启动 `pnpm dev`，浏览器访问 `http://localhost:3001/settings`
- [ ] 验证：
  - 未加重定向时：返回 Nuxt 默认 404 页面
  - 加了重定向时：跳转回 `/`
- [ ] 验证右侧抽屉设置入口仍正常：右上角齿轮图标 → 弹出抽屉 → 各设置项可正常操作
- [ ] 验证 `localStorage` 持久化的设置不受影响（API 渠道、主题、上下文消息数等）

## 五、验收标准

- [ ] `app/pages/settings.vue` 已不存在
- [ ] 全仓库 grep `/settings` 无除注释、文档外的代码引用
- [ ] 直接访问 `/settings` 返回 404 或重定向到 `/`，控制台无 warning
- [ ] 右侧抽屉设置功能完整可用
- [ ] 各设置项（流式、上下文数、自动保存、渠道）行为正常

## 六、风险与回滚

| 风险 | 影响 | 缓解 |
|------|------|------|
| 用户书签了 `/settings` URL | 极低 | 添加 routeRules 重定向兜底 |
| 文档/注释中残留旧引用 | 极低 | grep 检查时一并清理 |

回滚方式：git revert 即可恢复 settings.vue 文件。

## 七、工时估算

| 子步骤 | 工时 |
|--------|------|
| 引用扫描 | 0.1 天 |
| 删除文件 | 0.05 天 |
| （可选）添加重定向 | 0.05 天 |
| 自测 | 0.05 天 |
| 合计 | 0.25 天（约 2 小时） |

## 八、关联资料

- 原方案 [doc/breezy-bouncing-lantern.md](../breezy-bouncing-lantern.md) 第五节
- 右侧抽屉容器位置：`app/layouts/default.vue:396-406, 774-799`
- 设置组件：`app/components/settings/SettingsPanel.vue`
