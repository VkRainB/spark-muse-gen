# P2-1：Sticker 提升为独立页面 `/sticker` + 引入历史持久化

## 一、任务上下文

来自 [doc/breezy-bouncing-lantern.md](../breezy-bouncing-lantern.md) 第二节"功能归类最终决策"。

当前 `app/components/tools/StickerMode.vue` 行 9 的 `generatedStickers` 仅存在组件 ref 内，关闭弹层即丢失。批量生成属于"独立产物 + 长工作流"，命中产品判断准则 C1（终态）+ C2（>2min）+ C3（需持久化）+ C4（需多区并列），应升级为独立工作台页面。

页面化后需要：
- 新增 `stores/sticker.ts` 持久化历史
- 新建 `app/pages/sticker.vue` 三栏页面（参照 XHS 的工作台模式）
- 业务逻辑解耦：useStickerMode composable 保留，结果存储改走 store

## 二、目标与非目标

### 目标
- 创建 `/sticker` 路由，承载完整工作台
- 历史批次（每次批量生成结果）持久化到 localStorage
- 可查看、删除、批量下载历史
- 取消原 UModal 弹层入口
- 侧栏入口走 NuxtLink 跳转

### 非目标
- 不改 `useStickerMode.ts` 的 `generateSticker` / `generateStickerPack` 业务方法
- 不改 `useImageGeneration` API 集成
- 不改其他工具

### 前置依赖
- 建议在 P0-1 / P1-1 / P1-2 完成后执行（独立排期）
- 与 P1-2 配合：P2-1 完成后修改 P1-2 中的 sticker 卡片为 `group: 'workspace'` + `to: '/sticker'`

## 三、影响文件清单

| 文件 | 操作 |
|------|------|
| `stores/sticker.ts` | 新建 |
| `types/sticker.d.ts` | 新建（或扩展 `types/index.d.ts`） |
| `app/pages/sticker.vue` | 新建 |
| `app/components/sticker/StickerCharacterPanel.vue` | 新建（角色配置） |
| `app/components/sticker/StickerVariantPicker.vue` | 新建（表情/动作选择） |
| `app/components/sticker/StickerHistoryPanel.vue` | 新建（历史记录管理） |
| `app/components/sticker/StickerResultGrid.vue` | 新建（结果网格展示） |
| `app/composables/useStickerMode.ts` | 改造（接入 store） |
| `app/components/tools/StickerMode.vue` | 删除（被页面取代） |
| `app/components/ui/SidebarNav.vue` | 改造（sticker 改为 NuxtLink） |
| `app/layouts/default.vue` | 改造（移除 stickerToolOpen 状态与 UModal） |

## 四、详细步骤（可勾选）

### 阶段 A：UX 设计稿（启动前必做）

- [ ] 与产品/UI 一起绘制三栏布局原型：
  - 左栏：历史记录（批次列表 + 单批次预览图缩略 + 删除）
  - 中栏：角色配置（描述输入 + 背景选择）+ 表情/动作选择面板
  - 右栏：结果队列（单次/批量生成进度 + 当前批次的图片网格）
- [ ] 响应式断点：
  - ≥1280px：三栏并列（3-5-4 grid，参考 xhs.vue 行 68）
  - 768-1279px：左栏改顶部历史抽屉，中栏 + 右栏并列
  - <768px：单栏堆叠，历史用 USlideover

### 阶段 B：数据层（store + types）

- [ ] 新建 `types/sticker.d.ts`：
  ```ts
  export interface StickerImage {
    id: string
    data: string         // base64 或 data url
    mimeType: string
    createdAt: number
  }

  export interface StickerBatch {
    id: string
    character: string
    background: 'white' | 'transparent'
    emotions: string[]   // ids
    actions: string[]    // ids
    images: StickerImage[]
    createdAt: number
  }
  ```
- [ ] 新建 `stores/sticker.ts`：
  ```ts
  import { defineStore } from 'pinia'
  import type { StickerBatch, StickerImage } from '~/types/sticker'

  export const useStickerStore = defineStore('sticker', {
    state: () => ({
      batches: [] as StickerBatch[],
      currentBatchId: null as string | null,
    }),
    getters: {
      currentBatch: (s) => s.batches.find(b => b.id === s.currentBatchId) ?? null,
      totalImages: (s) => s.batches.reduce((acc, b) => acc + b.images.length, 0),
    },
    actions: {
      createBatch(payload: Omit<StickerBatch, 'id' | 'images' | 'createdAt'>) { /* ... */ },
      addImagesToBatch(batchId: string, images: StickerImage[]) { /* ... */ },
      deleteBatch(batchId: string) { /* ... */ },
      switchBatch(batchId: string) { /* ... */ },
      clearAll() { /* ... */ },
    },
    persist: true,
  })
  ```
- [ ] 持久化策略：
  - 历史最多保留 30 个批次（超出自动淘汰最旧的）
  - 单批次最多保留 24 张图（防止 localStorage 爆容）
  - 单图 base64 长度超过 200KB 时降级为提示"图片过大未持久化，仅当前会话可用"

### 阶段 C：composable 改造

- [ ] 修改 `app/composables/useStickerMode.ts`：
  - 仍保留 `EMOTIONS` / `ACTIONS` 常量与 `buildStickerPrompt` / `generateSticker` / `generateStickerPack` 业务方法
  - 在 `generateStickerPack` 内部把结果写入 store：
    ```ts
    const stickerStore = useStickerStore()
    const batchId = stickerStore.createBatch({ character, background, emotions, actions })
    stickerStore.switchBatch(batchId)
    // 边生成边 stickerStore.addImagesToBatch(batchId, [newImage])
    ```
  - 保持函数签名不变，只是内部多了 store 写入

### 阶段 D：组件拆分

- [ ] `StickerCharacterPanel.vue`：角色描述输入 + 背景选择，emit `change`
- [ ] `StickerVariantPicker.vue`：表情/动作多选，props 接收当前选中，emit `update`
- [ ] `StickerHistoryPanel.vue`：列表展示历史批次，emit `select` / `delete`
- [ ] `StickerResultGrid.vue`：网格展示当前批次图片，支持点击灯箱、单图下载、批量 ZIP 下载

### 阶段 E：页面装配

- [ ] 新建 `app/pages/sticker.vue`：
  ```vue
  <script setup lang="ts">
  const stickerStore = useStickerStore()
  const { generateStickerPack, emotions, actions } = useStickerMode()
  // 角色与选择状态
  const character = ref('')
  const background = ref<'white' | 'transparent'>('white')
  const selectedEmotions = ref<string[]>([])
  const selectedActions = ref<string[]>([])

  const handleGenerate = async () => {
    await generateStickerPack(character.value, selectedEmotions.value, selectedActions.value, background.value)
  }
  </script>

  <template>
    <div class="sticker-page">
      <div class="sticker-grid">
        <aside class="col-history"><StickerHistoryPanel /></aside>
        <section class="col-config">
          <StickerCharacterPanel v-model:character="character" v-model:background="background" />
          <StickerVariantPicker
            :emotions="emotions" :actions="actions"
            v-model:selected-emotions="selectedEmotions"
            v-model:selected-actions="selectedActions"
          />
          <UButton @click="handleGenerate">批量生成</UButton>
        </section>
        <section class="col-result"><StickerResultGrid /></section>
      </div>
    </div>
  </template>
  ```
- [ ] 网格响应式（参考 xhs.vue 三栏）：
  ```css
  .sticker-grid {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr) minmax(360px, 480px);
    gap: 16px;
  }
  @media (max-width: 1279px) {
    .sticker-grid { grid-template-columns: minmax(0, 1fr) minmax(360px, 480px); }
    .col-history { display: none; /* 改为顶部按钮触发抽屉 */ }
  }
  @media (max-width: 767px) {
    .sticker-grid { grid-template-columns: 1fr; }
  }
  ```
- [ ] 结果网格：
  - 桌面 ≥lg：`grid-cols-4`
  - md-lg：`grid-cols-3`
  - <md：`grid-cols-2`

### 阶段 F：移除旧弹层入口

- [ ] 修改 `app/components/ui/SidebarNav.vue`：
  - sticker 卡片 `group` 改为 `'workspace'`
  - `formIcon` 改为 `'navigate'`
  - 移除 `event: 'open-sticker'`，新增 `to: '/sticker'`
- [ ] 修改 `app/layouts/default.vue`：
  - 移除 `stickerToolOpen` ref（行 42）
  - 移除 `openStickerTool` 函数（行 148-150）
  - 移除 sticker 的 emit 监听 `@open-sticker="openStickerTool"`（行 290）
  - 移除 sticker 的 UModal 块（行 443-457）
  - 移除 `openToolModal('sticker')` 分支
- [ ] 删除 `app/components/tools/StickerMode.vue`

### 阶段 G：历史管理 UI

- [ ] StickerHistoryPanel 功能：
  - 显示批次列表（按时间倒序），每项展示：角色名、表情/动作数量、首张图缩略、创建时间
  - 点击切换当前批次
  - 单批次右上角"删除"按钮（带确认）
  - 顶部"清空历史"按钮（带确认）
- [ ] StickerResultGrid 功能：
  - 显示 `currentBatch.images` 的 4 列网格（响应式）
  - 单图 hover 显示下载按钮
  - 顶部"下载全部 ZIP"按钮（复用 `app/utils/download.ts` 与 JSZip）
  - 点击图片弹出 `UiLightbox` 大图预览（已有组件）
- [ ] 空态处理：
  - 无历史时 history 面板显示引导文案
  - 无当前批次时 result 区域显示 "选择角色与表情/动作开始生成"

### 阶段 H：自测

- [ ] 桌面 1440 视口：
  - 访问 `/sticker`，三栏布局正常
  - 输入角色"一只橙色的小猫"，选 3 个表情 + 2 个动作 → 点批量生成
  - 5 张图陆续出现在右栏，左栏出现历史批次
  - 刷新页面，历史仍在
  - 切换历史批次，右栏内容更新
- [ ] 平板 1024：
  - 三栏自动堆叠为两栏，历史面板由按钮触发抽屉
- [ ] 移动 375：
  - 单栏堆叠，操作流畅
- [ ] localStorage 配额测试：
  - 生成 30+ 批次（超过保留上限），验证最旧的被淘汰
  - 单批次 24+ 张图，验证不爆容

## 五、设计要点

1. **为什么 sticker 升页面而 slicer 不升？**
   - sticker 是批量产物（C1 终态 + C3 需持久化），slicer 是单次工具（生成 9 张图后用户立即下载，无持久化需求）
2. **historyl 30 批次 + 单批次 24 张的上限怎么定的？**
   - 单图 base64 约 100-200KB，30 × 24 × 200KB = 144MB，超过 localStorage 5MB 上限
   - 实际策略：仅持久化批次元数据（角色/表情/动作/时间），图片单独走 IndexedDB（参考已有 `useIndexedDB`）
   - 简化版：先用 localStorage 仅存元数据 + 图片 base64 截断到 100KB 以内（缩略图）
3. **是否复用 useIndexedDB？**
   - 项目已有 `GeminiProDB`（chat 用），可新增 `StickerImagesDB` 单独存储图片，store 仅持久化批次结构
   - 这部分技术方案在阶段 A 设计稿环节明确

## 六、验收标准

- [ ] 访问 `/sticker` 能进入完整工作台页面
- [ ] 批量生成的图片自动归入新批次并展示在结果区
- [ ] 关闭浏览器标签后重开，历史批次仍可访问
- [ ] 单批次最多 24 张图、最多保留 30 批次的策略生效
- [ ] 三栏布局响应式正常（桌面/平板/移动）
- [ ] 侧栏 sticker 卡片改为 NuxtLink 跳转，弹层入口完全移除
- [ ] `app/components/tools/StickerMode.vue` 已删除
- [ ] 历史 / 结果网格的删除/下载/灯箱功能可用

## 七、风险与回滚

| 风险 | 影响 | 缓解 |
|------|------|------|
| localStorage 容量爆 | 高 | 用 IndexedDB 存图片，store 仅存元数据；保留上限策略 |
| 拆 4 个子组件后状态同步复杂 | 中 | 全部状态走 store，子组件只通过 `useStickerStore()` 访问 |
| 与 P1-2 时序冲突（P1-2 已 deploy 但 P2-1 未完成） | 低 | P1-2 中 sticker 暂留 `group: 'tool'`，P2-1 完成后切换为 `'workspace'`（一行改动） |
| 旧用户的内存态生成结果丢失 | 极低 | 当前状态本来就丢，无回归 |

回滚方式：删除新增文件 + 恢复 SidebarNav 与 layouts/default.vue 的 4 行改动 + 恢复 StickerMode.vue。

## 八、工时估算

| 阶段 | 工时 |
|------|------|
| A. UX 设计稿（产品 + UI 协同） | 1 天 |
| B. 数据层（store + types） | 0.5 天 |
| C. composable 改造 | 0.25 天 |
| D. 组件拆分（4 个子组件） | 1 天 |
| E. 页面装配 | 0.5 天 |
| F. 移除旧弹层入口 | 0.25 天 |
| G. 历史管理 UI | 0.75 天 |
| H. 自测（含容量与响应式） | 0.5 天 |
| 合计 | 4.75 天（约 1 周） |

## 九、关联资料

- 原方案 [doc/breezy-bouncing-lantern.md](../breezy-bouncing-lantern.md) 第二节
- 现有页面参考：`app/pages/xhs.vue`（三栏工作台范式）
- 现有 store 参考：`stores/xhs.ts`（含历史持久化）
- 现有 IndexedDB 封装：`app/composables/useIndexedDB.ts`
- 灯箱组件：`app/components/ui/Lightbox.vue` + `app/composables/useLightbox.ts`
- Pinia 持久化插件：`app/plugins/pinia-persist.client.ts`
