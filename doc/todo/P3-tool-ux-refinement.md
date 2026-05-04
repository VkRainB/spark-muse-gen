# P3 工具体验细化（去遮罩 + 布局重排 + Slicer 重做）

> 状态：待执行
> 依赖：P0/P1/P2 已完成（ToolPanelShell、Banana/Custom 已是 USlideover、Sticker 已页面化）
> 范围：四个相互独立的子任务，可并行排期

---

## Context（背景）

P1-1 把 Banana / Custom 从居中 UModal 改为右侧 USlideover、Slicer 维持 UModal 之后，用户实测出现以下新问题：

1. 工具打开时整屏盖上半透明遮罩，主聊天上下文与输入区被一并遮挡，违背"提示词工具应伴随主流程"的初衷。
2. 提示词快查（Banana）：当前卡片仅渲染 title + prompt + tag，**`useBananaTool` 的数据结构里有 `preview?: string` 字段被完全忽略**。用户希望左文字 / 右示例图并列展示，并把抽屉方向改成"从下往上"以获得更宽的横向空间。
3. 我的提示词（Custom）：抽屉宽度只有 32rem，但 `CustomPromptTool` 的双栏断点写死 `@media (min-width: 1280px)`，永远进不了双栏，导致"新增表单"占满视图，下方列表完全看不见。
4. 图片切片：当前 `useSlicer.ts` 只是 NxN 等分，相对 `source/app.js` 旧版"辅助线模式"（点击/拖拽添加横竖切线 + 1:1 补全 + 高分辨率 + ZIP 下载）属于功能退化，实际不可用。

---

## 一、调研记录（已查实）

### 1.1 USlideover / UModal 当前是否带遮罩

`app/layouts/default.vue` 行 434-443、445-457（USlideover）与 459-465（UModal）均未显式传 `:overlay`，使用 Nuxt UI v4 默认值（带半透明黑色遮罩）。
USlideover 与 UModal 都支持 `:overlay="false"` 关闭遮罩，且支持 `:dismissible` 控制点击外部是否关闭。

### 1.2 Banana 提示词数据有 preview 字段但未渲染

`app/composables/useBananaTool.ts` 行 1-7：

```ts
interface BananaPrompt {
  id: string
  title: string
  prompt: string
  category: string
  preview?: string   // 已定义，未使用
}
```

数据来源：`https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/prompts.json`。
`app/components/tools/BananaTool.vue` 行 88-127 的 `prompt-card` 模板里没有任何 `<img>` 节点。

### 1.3 Custom 双栏断点错配

`app/components/tools/CustomPromptTool.vue` 行 311-323：

```css
.tool-layout {
  grid-template-columns: 1fr;
}
@media (min-width: 1280px) {
  .tool-layout {
    grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  }
}
```

抽屉的 ui = `max-w-lg w-[32rem]`（512px），永远不会触发 1280px 断点 → 永远单栏堆叠。

### 1.4 旧版 Slicer 完整能力（参考实现）

`source/app.js` 行 1413-1585 的 `SlicerTool`：

- `addLine(type, percent)`：在 overlay 上单击或编程添加横/竖切线，存为百分比
- `startDrag` / `onDrag`：每条切线可拖拽调整位置
- `removeLine`：每条切线带 × 删除按钮
- `process()`：按所有切线把图片切成 (h+1) × (v+1) 个矩形
- 1:1 补全：`forceSquareCheckbox` 勾选后取 `Math.max(srcW, srcH)` 作为正方形画布尺寸，用 `bgColorInput.value` 填充背景，再把原图居中绘制
- 2x 高分辨率：`canvas.width = srcW * 2; canvas.height = srcH * 2;` + `imageSmoothingQuality = 'high'`
- 下载：单个 `canvas.toBlob` → 单个保存；批量 `JSZip` 打包成 `slices_<ts>.zip`
- DOM 容器：`source/index.html` 行 551-595；样式：`source/style.css` 行 1820-1857

当前 Nuxt 版 `app/composables/useSlicer.ts` 仅 155 行，只有 `rows / cols` 等分逻辑，缺失：辅助线、拖拽、删除、1:1 补全（虽然有 `fillColor` 字段但无补全语义）、2x 高分。

---

## 二、统一判断准则

| 准则 | 适用 |
|---|---|
| 工具属于"伴随主聊天"形态时（Banana / Custom）必须能透看主区域：去遮罩、不阻断点击外部，但保留点击外部关闭语义 | 任务 T1 |
| 提示词类工具的核心信息密度是"文字 + 示意图"两列，所以采用底部抽屉（更宽）而非右侧抽屉（更窄） | 任务 T2 |
| 表单 + 列表型工具优先用 Tab/折叠显式切换，不要赌断点 | 任务 T3 |
| 工具的核心能力不能比 source 旧版退化 | 任务 T4 |

---

## 三、任务列表

### T1 - 去除工具弹层遮罩 + 主区域可继续使用

**动机**：让用户在打开 Banana / Custom 抽屉时仍能看到、滚动、甚至点击主聊天区域，去除"打开工具就被锁死"的体验。Slicer 因为是上传 → 切 → 下载的独立短任务，可以保留遮罩。

**目标**：

- Banana / Custom USlideover：`:overlay="false"`，`:dismissible="true"`，主区域可见可滚动可点击（不阻塞 pointer-events）
- 切换工具不再有"黑屏闪一下"的视觉跳变
- Slicer UModal 维持现状（带遮罩），因为它需要专注

**步骤**：

1. `app/layouts/default.vue` 行 434-443 / 445-457：给两个 USlideover 增加 `:overlay="false"` `:dismissible="true"`
2. 视情况增加 `:modal="false"`（如需）让 reka-ui 不阻断背景 pointer-events
3. 抽屉打开时主区域不再做 `margin-right` 类的挤压（确认现有 CSS 没有这种逻辑，目前主区只在 `settings-open` 时挤压，本次不动）
4. 阴影：USlideover 自带 box-shadow，保留以提示层级

**关键文件**：

- `app/layouts/default.vue`（行 434-465）

**验收**：

1. 打开 Banana / Custom 抽屉时，主聊天区域无黑色蒙层，仍可滚动消息历史
2. 点击主聊天区域不会自动关闭抽屉（除非显式点击侧栏其他工具或 ESC）
3. 抽屉本体仍有可见阴影/边界，不会和背景"糊"在一起
4. Slicer 仍是带遮罩的居中 UModal，不变

---

### T2 - 提示词快查改为底部抽屉 + 文字/预览图双栏

**动机**：

- `BananaPrompt.preview` 字段一直被忽略，若上游 prompts.json 含示例图，用户没机会看到
- 右侧 28rem 抽屉宽度横向空间不够"文字 + 图"
- 用户希望底部上滑形态（更宽 + 更符合"快查"的轻量感）

**目标**：

- 桌面端 USlideover side 由 `right` 改为 `bottom`（保持 mobile 仍是 `bottom`），高度 `min(560px, 65vh)`
- 卡片改为左右双栏：左 60% 文字（title + prompt + tag + actions），右 40% 预览图（`preview` 缺失时回退到首字母色块或图标占位）
- 列表自身保留滚动；外层无双重滚动条
- `<768px` 移动端自动单栏（图片在文字下方），高度 `90vh`

**步骤**：

1. `app/layouts/default.vue` 行 117-130：把 `slideoverSide` 改为常量 `'bottom'`（或保留 mobile 仍 bottom，桌面也 bottom）；`bananaSlideoverUi` 改为：

   ```ts
   const bananaSlideoverUi = computed(() =>
     isMobile.value
       ? { content: 'h-[90vh]' }
       : { content: 'h-[min(560px,65vh)] max-w-none w-full' }
   )
   ```

2. `app/components/tools/BananaTool.vue` 卡片模板（行 88-127）：

   - 在 `.prompt-card-row` 之后追加 `.prompt-card-preview`（仅 `item.preview` 真值时渲染 `<img>`）
   - 用 grid 布局：`grid-template-columns: 1fr minmax(96px, 160px)`
   - 没有 `preview` 时不渲染图片列、整卡变单列文字（grid 1fr）
3. 失败/慢加载兜底：`<img>` 加 `loading="lazy"` `decoding="async"` `@error="hidePreview"`
4. 列表 grid：底部抽屉宽度大，可改成 `repeat(auto-fill, minmax(280px, 1fr))` 让卡片自动换列
5. 清掉 `.prompt-card-actions` 的 `opacity:0` 隐藏（底部抽屉空间够，常态显示更直接）；mobile 媒体查询删除（已无 hover 概念）

**关键文件**：

- `app/layouts/default.vue`（行 117-130、434-443）
- `app/components/tools/BananaTool.vue`（行 88-127、179-260）
- `app/composables/useBananaTool.ts`（无需改，已有 preview 字段）

**验收**：

1. 桌面端点击"提示词快查"：抽屉从底部上滑，宽度 100vw，高度约 65vh
2. 上游返回有 `preview` 字段的项，卡片右侧出现示意图；没有的项纯文字
3. 卡片 grid 多列展示，桌面 1080p 至少 3 列、4K 至少 5 列
4. 移动端依然底部、占 90vh，单栏堆叠
5. 复制 / 应用 / 收藏三按钮始终可见

---

### T3 - 我的提示词排版优化

**动机**：当前抽屉里"新增表单"几乎铺满整个视图，列表完全被挤掉看不见，用户必须先关掉表单才能浏览，是反向操作。

**目标**：

- 进入抽屉默认进入"列表浏览"视图，新增/编辑通过点击右上角 + 按钮或某个列表项触发，切换到表单视图
- 二选一信息架构：Tab 模式 或 折叠面板模式（推荐 Tab）
- 不再依赖 `min-width: 1280px` 双栏断点
- 列表卡片更紧凑：title + category 同行；prompt 双行省略；时间 + 操作按钮单行
- 移动端体验同步优化（同样的 Tab，单栏堆叠）

**实施方案（推荐 Tab）**：

1. 顶部加入 `UTabs`：`列表` / `新增`（编辑某条时自动跳到"新增"Tab，标题改为"编辑"）
2. 列表 Tab：
   - 顶栏：搜索 + 分类筛选 + 重置（保留）
   - 列表区一栏到底，卡片样式紧凑化（参考 QuickPromptPanel 行 232-263 的紧凑卡片样式）
   - 每张卡片右下保留 复制 / 应用 / 发送 / 编辑 / 删除 五个按钮，但用 `flex` 紧凑排
3. 新增/编辑 Tab：
   - 标题 + 分类 + 内容三个字段，按现状即可
   - 底部主操作 `保存` + 副操作 `取消（回列表）`
4. 删除 `.tool-layout` 的 grid 双栏样式与 `@media (min-width: 1280px)` 断点（行 311-323），改成单栏 + Tab 切换

**步骤**：

1. `app/components/tools/CustomPromptTool.vue`：
   - script 加入 `currentTab = ref<'list' | 'edit'>('list')`，`startEdit` 时设为 `'edit'`，`savePrompt` 成功后回 `'list'`
   - template 顶部加 `UTabs`，两个 panel 分别是列表和表单
   - 删除 `.tool-layout` 容器与媒体断点
   - 列表卡片样式紧凑：标题与分类同行；内容 2 行省略；底部时间 + 5 个图标按钮
2. 操作按钮位置：
   - 列表 Tab 顶部右侧加 `+ 新增` 按钮（直接跳到 Edit Tab）
   - 编辑 Tab 顶部加 `← 返回列表` 链接

**关键文件**：

- `app/components/tools/CustomPromptTool.vue`（整体重排）

**验收**：

1. 打开"我的提示词"抽屉默认看到的是列表视图，列表占满整个抽屉高度
2. 点击 `+ 新增` 切到表单 Tab；保存后自动回列表
3. 点击列表中某条的"编辑"按钮，跳转到表单 Tab 并预填字段
4. 列表卡片高度收敛（80-100px 量级），3-4 张可见
5. 移动端（底部抽屉 90vh）下 Tab 与列表同样可用、不溢出

---

### T4 - 图片切片：移植 source 旧版"辅助线"模式

**动机**：当前 NxN 等分用例覆盖太窄，无法应对常见的"小红书九宫格 + 不规则占位"等场景。旧版 `source/app.js` 的辅助线模式可灵活定义任意横竖切线，是必须保留的能力。

**目标**：

- `useSlicer.ts` 重构：增加 `horizontalLines: Ref<number[]>` 与 `verticalLines: Ref<number[]>`（百分比 0-100），保留旧的 NxN 作为"快速预设"
- UI 提供：上传 → 在图片上点击添加切线（横/竖切换） → 拖拽调整位置 → × 删除 → 一键预设（九宫格 / 横分 3 / 竖分 3） → 1:1 补全 + 背景色 + 高分辨率切片 → 单个/ZIP 下载
- 切片产物渲染为画廊：单击单个下载、`下载全部 ZIP` 按钮
- 维持当前 `useSlicer` 的 ZIP 下载（已有 JSZip 引用）

**实施方案**：

1. `app/composables/useSlicer.ts`：

   ```ts
   const horizontalLines = ref<number[]>([])  // 单位 %
   const verticalLines = ref<number[]>([])    // 单位 %
   const forceSquare = ref(false)
   const fillColor = ref('#ffffff')
   const highRes = ref(true)

   function addLine(type: 'h' | 'v', percent: number) { ... }
   function removeLine(type: 'h' | 'v', index: number) { ... }
   function moveLine(type: 'h' | 'v', index: number, percent: number) { ... }
   function presetNineGrid() { /* 写两条 33.33 / 66.67 横线 + 两条同位置竖线 */ }
   function presetHorizontal(n: number) { ... }
   function presetVertical(n: number) { ... }

   async function slice() {
     // 把 0/100 加进 hCuts / vCuts，按百分比 -> 原图像素
     // 逐 (i, j) 切矩形，按 forceSquare / highRes 决定 canvas 尺寸
     // canvas.toDataURL('image/png') -> slices.value
   }
   ```

2. `app/components/tools/SlicerTool.vue`：
   - 上传后图片用 `position: relative` 容器；其上叠一层 `<div class="slicer-overlay">` 接收点击 / 触摸事件
   - 切线渲染为绝对定位的细线 `<div class="split-line h" :style="{ top: percent + '%' }">`，line 上挂 × 删除按钮
   - 拖拽：`pointermove` 事件根据容器 `getBoundingClientRect()` 把鼠标位置转换为百分比
   - 工具栏：模式切换（横线 / 竖线）+ 预设按钮（九宫格 / 横3 / 竖3）+ 1:1 补全 + 背景色 + 高清开关 + 清空切线 + 开始切片
   - 结果画廊：与现有保持一致（hover 显示下载图标 + 单击下载）
3. 删除 `useSlicer.ts` 旧的 `rows/cols/setNineGrid` 公共 API 但保留 `presetNineGrid` 行为等价

**关键文件**：

- `app/composables/useSlicer.ts`（整体重构）
- `app/components/tools/SlicerTool.vue`（整体重构）
- 参考实现：`source/app.js` 行 1413-1585，`source/index.html` 行 551-595，`source/style.css` 行 1820-1857

**注意点**：

- crossorigin：图片若来自外链（虽然当前是 File 上传，但未来可能从聊天结果导入），需要 `img.crossOrigin = 'anonymous'`，否则 canvas tainted 无法 `toDataURL`
- 触摸事件：需同时绑 `mousedown/mousemove/mouseup` 与 `touchstart/touchmove/touchend`，并在 touchmove 上 `preventDefault()` 避免页面滚动
- 性能：切片用 `await Promise.all` 并行 `canvas.toBlob`，结果按行列顺序追加；超过 30 个切片要给提示

**验收**：

1. 上传图片 → 默认无切线（或一键九宫格预设后即可看到 2 横 2 竖切线）
2. 选"横线"模式后单击图片任意位置 → 出现一条可拖拽的横切线 + 右侧 × 删除按钮
3. 选"竖线"模式后单击图片 → 同理出现竖切线
4. 点 × 删除按钮 → 切线消失
5. 拖拽切线 → 跟随鼠标移动，松手位置稳定
6. 勾选"1:1 补全" + 选背景色 → 切片结果是正方形，短边居中、长边补背景色
7. 勾选"2x 高分辨率" → 切片像素是源像素的 2 倍
8. 点"开始切片"：右侧画廊渲染所有矩形 (hCuts.length × vCuts.length 个)
9. 单击切片下载单张 PNG；"下载全部 ZIP" 打包成 `slices_<ts>.zip`
10. 移动端可触摸拖拽（不连带滚动页面）

---

## 四、依赖与执行节奏

| 任务 | 依赖 | 估时 | 优先级 |
|---|---|---|---|
| T1 去遮罩 + 布局微调 | 无 | 0.5 天 | 高 |
| T2 Banana 底部双栏 | T1 完成（避免改两次 USlideover 配置） | 1 天 | 高 |
| T3 Custom 排版优化 | 无（与 T2 独立） | 1 天 | 高 |
| T4 Slicer 重做 | 无 | 2 天 | 中 |

建议节奏：

- 第 1 天：T1 + T3 并行（两人或同一人先后完成）
- 第 2 天：T2
- 第 3-4 天：T4

---

## 五、统一验证清单（所有任务完成后）

- [ ] 桌面 1440x900：Banana 抽屉从底部上滑、显示文字 + 预览图双栏；Custom 默认列表 Tab、+新增切换表单 Tab；Slicer 居中弹层带遮罩、可加切线
- [ ] 主区域在 Banana / Custom 抽屉打开时仍可见、可滚动、可点击；Slicer 打开时主区域被遮罩
- [ ] 移动 375x667：三种工具都能用，单栏堆叠、底部抽屉 90vh、可触摸拖拽切线
- [ ] 切片功能：上传 → 加切线 → 1:1 补全 → 高清切片 → ZIP 下载，端到端无报错
- [ ] 控制台无 Vue warning、无 reka-ui dialog warning、无 canvas tainted error

---

## 六、不在本次范围

- Banana 上游 prompts.json 不含 preview 字段时是否要内置一组示意图（属于内容运营，单独排期）
- Slicer 切片后直接发送回主聊天的能力（属于跨工具集成，本次保留为单独工具）
- Custom 提示词的导入/导出 JSON（属于增量功能）
- 旧版 `source/` 的同步（按 CLAUDE.md 仅在 `app/` 下推进）

---

## 七、关键文件速查

| 关注点 | 文件 | 行号 |
|---|---|---|
| USlideover 配置（去遮罩） | `app/layouts/default.vue` | 117-130、434-457 |
| Banana 卡片模板（加预览图） | `app/components/tools/BananaTool.vue` | 88-127 |
| Banana 数据接口（已有 preview 字段） | `app/composables/useBananaTool.ts` | 1-7 |
| Custom 双栏断点（待删） | `app/components/tools/CustomPromptTool.vue` | 311-323 |
| Custom 列表卡片样式 | `app/components/tools/CustomPromptTool.vue` | 401-458 |
| Slicer 当前 composable | `app/composables/useSlicer.ts` | 全文 |
| Slicer 当前 UI | `app/components/tools/SlicerTool.vue` | 全文 |
| 旧版 Slicer 实现（参考） | `source/app.js` | 1413-1585 |
| 旧版 Slicer DOM 结构（参考） | `source/index.html` | 551-595 |
| 旧版 Slicer 样式（参考） | `source/style.css` | 1820-1857 |
