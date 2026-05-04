# P1-2：侧栏视觉分组（工作台 / 工具）+ 形态微图标

## 一、任务上下文

来自 [doc/breezy-bouncing-lantern.md](../breezy-bouncing-lantern.md) 第三节"左侧导航 IA 调整"。

当前侧边栏 5 个"创作工具"卡片视觉一致，但点击后行为分裂：1 个跳页面、4 个弹层（其中 2 个会在 P1-1 后变成抽屉）。用户在点击前无法预判"会不会离开主聊天"。

通过两步消解认知摩擦：
1. **视觉分组**：把入口分成"工作台（页面）"与"工具（伴随主聊天）"两组，加分组标题
2. **形态微图标**：卡片右上角加角标 `↗ / ▢ / ◰`，提前表达跳转 / 抽屉 / 弹层语义

## 二、目标与非目标

### 目标
- 侧栏入口按"工作台 / 工具"分组渲染
- 每个工具卡片右上角显示形态角标
- 折叠侧栏状态保持极简（不显示分组标题与角标）

### 非目标
- 不改变工具的实际触发逻辑（仍走 emit 或 NuxtLink）
- 不改最近对话区
- 不动新建对话按钮的位置

### 前置依赖
- **Sticker 跳转项的处理**：
  - 若 P2-1 已完成：sticker 卡片直接走 `<NuxtLink to="/sticker">`，归到"工作台"组
  - 若 P2-1 未完成：sticker 暂时仍走 emit 弹层，归到"工具"组，待 P2-1 后调整
- 本任务支持两种状态，预留切换点

## 三、影响文件清单

| 文件 | 操作 | 涉及行 |
|------|------|--------|
| `app/components/ui/SidebarNav.vue` | 改造 | 行 67-114（toolCards 数组扩展字段）、行 287-305（template 分组渲染） |
| `app/components/ui/SidebarNav.vue` | 改造 | CSS 行 458-690（新增分组标题、形态角标样式） |

## 四、详细步骤（可勾选）

### 步骤 1：扩展 toolCards 数据结构

修改 `app/components/ui/SidebarNav.vue` 行 67-114：

- [ ] 给每个工具卡新增字段：
  ```ts
  interface ToolCard {
    id: string
    title: string
    desc: string
    icon: string
    colorClass: string
    iconClass: string
    group: 'workspace' | 'tool'        // 新增
    formIcon: 'navigate' | 'drawer' | 'modal'  // 新增
    event?: string                     // 仅工具组使用
    to?: string                        // 仅工作台组使用
  }
  ```
- [ ] 数据填充：
  ```ts
  const toolCards: ToolCard[] = [
    { id: 'xhs', title: 'XHS 灵感实验室', desc: '小红书风格内容创作',
      icon: 'i-heroicons-book-open', group: 'workspace', formIcon: 'navigate',
      to: '/xhs', colorClass: 'xhs-nav-card', iconClass: 'xhs-icon' },
    // P2-1 完成后 sticker 改为 workspace + navigate + to: '/sticker'
    { id: 'sticker', title: '表情包工坊', desc: '快速生成表情包',
      icon: 'i-heroicons-face-smile', group: 'tool', formIcon: 'modal',
      event: 'open-sticker', colorClass: 'feature-nav-card', iconClass: 'feature-icon' },
    { id: 'banana', title: '提示词快查', desc: '快速查找优质提示词',
      icon: 'i-heroicons-currency-dollar', group: 'tool', formIcon: 'drawer',
      event: 'open-banana', colorClass: 'banana-nav-card', iconClass: 'banana-icon' },
    { id: 'custom', title: '我的提示词', desc: '管理个人提示词库',
      icon: 'i-heroicons-document-text', group: 'tool', formIcon: 'drawer',
      event: 'open-custom-prompt', colorClass: 'custom-nav-card', iconClass: 'custom-icon' },
    { id: 'slicer', title: '图片切片', desc: '九宫格切图工具',
      icon: 'i-heroicons-scissors', group: 'tool', formIcon: 'modal',
      event: 'open-slicer', colorClass: 'tool-nav-card', iconClass: 'tool-icon' },
  ]
  ```
- [ ] 新增计算属性按组拆分：
  ```ts
  const workspaceCards = computed(() => toolCards.filter(t => t.group === 'workspace'))
  const toolCards2 = computed(() => toolCards.filter(t => t.group === 'tool'))
  ```

### 步骤 2：模板分组渲染

修改行 287-305 区域：

- [ ] 在"创作工具"分组标题（行 287）后加分组分支：
  ```vue
  <!-- 工作台分组（页面级） -->
  <div v-if="!props.collapsed && workspaceCards.length > 0" class="nav-section-title">
    工作台
  </div>
  <NuxtLink
    v-for="tool in workspaceCards"
    :key="tool.id"
    :to="tool.to"
    class="nav-card"
    :class="tool.colorClass"
    :title="tool.title"
  >
    <div class="nav-card-icon" :class="tool.iconClass">
      <UIcon :name="tool.icon" class="w-5 h-5" />
    </div>
    <div v-if="!props.collapsed" class="nav-card-content">
      <div class="nav-card-title-row">
        <span class="nav-card-title">{{ tool.title }}</span>
        <FormIcon :type="tool.formIcon" />
      </div>
      <div class="nav-card-desc">{{ tool.desc }}</div>
    </div>
  </NuxtLink>

  <!-- 工具分组（伴随主流程） -->
  <div v-if="!props.collapsed && tools.length > 0" class="nav-section-title">
    工具
  </div>
  <div
    v-for="tool in tools"
    :key="tool.id"
    class="nav-card"
    :class="tool.colorClass"
    :title="tool.title"
    @click="handleToolClick(tool.event!)"
  >
    <!-- 同上结构 -->
  </div>
  ```
- [ ] 注意：工作台组用 NuxtLink，工具组用 div + click。点击工作台后侧栏会自动 NuxtLink 路由切换

### 步骤 3：新增 FormIcon 子组件（或内联实现）

形态角标可作为内联 span，也可抽小组件。推荐内联（避免新增文件）：

- [ ] 添加形态角标渲染（在卡片内）：
  ```vue
  <span class="form-icon" :class="`form-icon-${tool.formIcon}`" :title="formIconTitle(tool.formIcon)">
    <UIcon
      v-if="tool.formIcon === 'navigate'"
      name="i-heroicons-arrow-up-right"
      class="w-3 h-3"
    />
    <UIcon
      v-else-if="tool.formIcon === 'drawer'"
      name="i-heroicons-rectangle-stack"
      class="w-3 h-3"
    />
    <UIcon
      v-else-if="tool.formIcon === 'modal'"
      name="i-heroicons-square-2-stack"
      class="w-3 h-3"
    />
  </span>
  ```
- [ ] 添加 helper：
  ```ts
  const formIconTitle = (type: string) => {
    if (type === 'navigate') return '点击跳转独立页面'
    if (type === 'drawer') return '点击打开右侧抽屉'
    if (type === 'modal') return '点击打开居中弹层'
    return ''
  }
  ```

### 步骤 4：CSS 样式

- [ ] 分组标题（已有 `.nav-section-title` 样式，复用）
- [ ] 形态角标样式：
  ```css
  .nav-card-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .form-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    color: var(--text-tertiary);
    background: color-mix(in srgb, var(--bg-tertiary) 60%, transparent);
    flex-shrink: 0;
  }

  .form-icon-navigate { color: var(--accent-blue); }
  .form-icon-drawer   { color: var(--text-sub); }
  .form-icon-modal    { color: var(--text-sub); }

  /* 折叠状态隐藏 */
  .sidebar-nav-content.collapsed .form-icon { display: none; }
  ```

### 步骤 5：折叠状态处理

- [ ] 验证 `props.collapsed === true` 时：
  - 不显示"工作台" / "工具"分组标题（已用 `v-if="!props.collapsed"`）
  - 不显示形态角标（已用 CSS 隐藏）
  - 卡片仍按 group 顺序显示（工作台先于工具，最近对话仍在底部）
- [ ] 折叠状态下两组之间用一条细分隔线区分：
  ```css
  .sidebar-nav-content.collapsed .group-divider {
    width: 28px;
    height: 1px;
    margin: 8px auto;
    background: color-mix(in srgb, var(--border-color) 60%, transparent);
  }
  ```

### 步骤 6：layouts/default.vue 适配

- [ ] SidebarNav 的 emit 事件保持不变：仍然 emit `open-banana` / `open-custom-prompt` / `open-sticker` / `open-slicer`
- [ ] `open-xhs` 事件可保留（用作兼容），但实际工作台组改用 NuxtLink 跳转后已不再 emit
- [ ] 检查 `app/layouts/default.vue` 行 285-292 的事件绑定是否还需要 `open-xhs`：
  - 若 sticker 在 P2-1 后改 NuxtLink，`open-sticker` 也可移除
  - 但本任务不改 layout 的事件接口，只在 SidebarNav 内部分组
- [ ] 当前 layout 行 131-138 的 `openXHS` 仍然存在（用 navigateTo），改 NuxtLink 后这个 handler 可弃用，但保留不影响

### 步骤 7：自测

- [ ] 桌面 1440 视口：
  - 看到"工作台"标题下有 XHS（+ Sticker，若 P2-1 完成）
  - 看到"工具"标题下有 提示词快查 / 我的提示词 / 图片切片 + Sticker（若 P2-1 未完成）
  - 每个卡片右上角有微图标，鼠标 hover 有 title 提示
  - 点击 XHS → NuxtLink 跳转 `/xhs`
  - 点击 提示词快查 → 右抽屉打开
  - 点击 图片切片 → 居中弹层打开
- [ ] 折叠侧栏（点折叠按钮）：
  - 不再显示分组标题与微图标
  - 卡片图标按 工作台 → 工具 顺序排列
  - 两组之间有细分隔线
- [ ] 移动端 375 视口：
  - 点汉堡菜单展开侧栏，分组与微图标正常显示
  - 点击各项后侧栏自动关闭并执行对应行为

## 五、设计要点

1. **为什么不用 emoji 做角标？** CLAUDE.md 全局规则禁用 emoji，且角标语义化用 heroicons 更可控（hover 颜色、暗色主题适配）
2. **NuxtLink vs div@click**：工作台组必须用 NuxtLink，得到正确的 `aria-current="page"` 与浏览器前后退；工具组用 div@click 因为它不改变路由
3. **微图标位置**：在卡片"标题行"右侧而非卡片右上角绝对定位，避免与 collapsed 状态布局冲突

## 六、验收标准

- [ ] 桌面/移动端两种视口下分组标题与微图标正确显示
- [ ] 折叠状态下分组标题与角标隐藏，卡片仍按顺序排列
- [ ] 点击 Chat / XHS（/Sticker，若 P2-1 完成）走 NuxtLink 跳转，浏览器地址栏更新
- [ ] 点击 提示词快查 / 我的提示词 / 图片切片 / Sticker（若 P2-1 未完成）走 emit 抽屉/弹层
- [ ] 三种微图标 hover 时 title 提示语义化（"点击跳转/抽屉/弹层"）
- [ ] 颜色与暗色主题适配正常

## 七、风险与回滚

| 风险 | 影响 | 缓解 |
|------|------|------|
| 与 P2-1 的 sticker 改造时序错位 | 中 | 数据驱动设计：把 sticker 的 group / formIcon 字段作为唯一切换点，P2-1 完成后改 1 处即可 |
| NuxtLink 与原 emit 跳转链路差异 | 低 | XHS 已是页面，NuxtLink 替换 emit 仅是去掉中间层 navigateTo 调用 |
| 微图标在窄宽侧栏（移动端 270px）拥挤 | 低 | 微图标 16×16，与标题 ellipsis 同行不冲突 |

回滚方式：单 PR 改动，revert 即可恢复扁平结构。

## 八、工时估算

| 子步骤 | 工时 |
|--------|------|
| toolCards 数据结构扩展 | 0.1 天 |
| 模板分组渲染 | 0.2 天 |
| 形态角标实现 | 0.15 天 |
| CSS 样式（分组标题/角标/折叠） | 0.2 天 |
| 自测（桌面/移动/折叠/暗色） | 0.2 天 |
| 合计 | 0.85 天（约 7 小时） |

## 九、关联资料

- 原方案 [doc/breezy-bouncing-lantern.md](../breezy-bouncing-lantern.md) 第三节
- Heroicons 图标库：https://heroicons.com（确认 `arrow-up-right`、`rectangle-stack`、`square-2-stack` 在 Nuxt UI 内置 icon 集合中可用）
