# Nuxt 4 视图与组件组织指南

> 整理日期：2026/05/17
> 适用版本：Nuxt 4.x

---

## 一、整体目录结构

Nuxt 4 的核心变化是引入了 `app/` 目录作为主代码区，将应用代码与配置/服务端代码清晰分离。

```
project/
├── app/
│   ├── app.vue              # 应用入口
│   ├── pages/               # 路由页面（视图）
│   ├── layouts/             # 布局
│   ├── components/          # 组件
│   ├── composables/         # 组合式函数
│   ├── middleware/          # 路由中间件
│   ├── plugins/             # 插件
│   ├── assets/              # 构建资源
│   └── utils/               # 工具函数
├── server/                  # 服务端代码
├── shared/                  # app 与 server 共享代码
├── layers/                  # 可复用层（DDD/模块化）
├── modules/                 # 本地模块
└── nuxt.config.ts
```

---

## 二、视图组织（三层模型）

### 1. `app.vue` —— 全局壳层

包含全站通用结构（如全局 header/footer），其中使用 `<NuxtLayout>` 和 `<NuxtPage>`。

### 2. `app/layouts/` —— 布局层

通过 `<slot />` 承载页面内容。

- `default.vue` 为默认布局
- 页面通过 `definePageMeta({ layout: 'xxx' })` 切换
- 也可用 `setPageLayout()` 动态切换

### 3. `app/pages/` —— 路由页面层

文件即路由。

- `pages/index.vue` → `/`
- 支持动态路由 `[id].vue`、嵌套路由
- **路由分组**：用 `(group)/` 括号目录分组但不影响 URL
- **服务端页面**：`.server.vue` 后缀，仅服务端渲染
- 页面必须有单一根元素（支持过渡）

---

## 三、组件组织（全局 vs 局部）

### 默认行为：全部自动导入

`app/components/` 下所有组件默认**自动导入**且**全局可用**（无需 `import`），命名遵循"路径+文件名"规则：

```
components/
├── Base/
│   └── Button.vue           → <BaseButton />
├── User/
│   └── Card.vue             → <UserCard />
└── TheHeader.vue            → <TheHeader />
```

### 区分全局与局部组件

Nuxt 4 提供**目录级**的 `global` 配置（在 `nuxt.config.ts`）：

```ts
export default defineNuxtConfig({
  components: [
    { path: '~/app/components/global', global: true },  // 全局注册
    { path: '~/app/components', global: false },         // 局部按需导入（默认）
  ]
})
```

### 关键区别

| 类型 | 配置 | 打包行为 | 适用场景 |
| --- | --- | --- | --- |
| **全局组件** | `global: true` | 注入到客户端 bundle，所有页面立即可用 | 高频基础组件（Button、Icon、Modal） |
| **局部组件** | `global: false`（默认） | 按需打包，仅在使用的页面/组件 chunk 中加载 | 业务组件、低频组件 |

### 特殊后缀

- **`.client.vue`** —— 仅客户端渲染（如依赖 `window`）
- **`.server.vue`** —— 服务端组件（Island 岛屿组件）
- **`Lazy` 前缀** —— 使用 `<LazyUserCard />` 延迟加载，优化 bundle 体积

---

## 四、完整项目目录树示例（电商应用）

```
my-shop/
├── app/
│   ├── app.vue                          # 全站壳：<NuxtLayout><NuxtPage/></NuxtLayout>
│   │
│   ├── layouts/                         # 布局层（视图骨架）
│   │   ├── default.vue                  # 默认布局：Header + slot + Footer
│   │   ├── admin.vue                    # 后台布局：侧边栏 + slot
│   │   └── blank.vue                    # 空白布局（登录/注册页用）
│   │
│   ├── pages/                           # 路由页面 = 视图（文件即路由）
│   │   ├── index.vue                    # /
│   │   ├── about.vue                    # /about
│   │   ├── login.vue                    # /login（definePageMeta layout:'blank'）
│   │   │
│   │   ├── products/                    # /products/*
│   │   │   ├── index.vue                # /products            列表页
│   │   │   ├── [id].vue                 # /products/:id        详情页
│   │   │   └── [id]/
│   │   │       └── reviews.vue          # /products/:id/reviews
│   │   │
│   │   ├── (shop)/                      # 路由分组（括号不出现在 URL）
│   │   │   ├── cart.vue                 # /cart
│   │   │   └── checkout.vue             # /checkout
│   │   │
│   │   ├── user/
│   │   │   ├── profile.vue              # /user/profile
│   │   │   └── orders.server.vue        # 服务端组件页面
│   │   │
│   │   └── admin/                       # 后台页面（layout:'admin'）
│   │       ├── index.vue
│   │       ├── products.vue
│   │       └── orders.vue
│   │
│   ├── components/                      # 组件
│   │   ├── global/                      # ★ 全局组件（nuxt.config 配 global:true）
│   │   │   ├── BaseButton.vue           # <BaseButton />   全站可用
│   │   │   ├── BaseInput.vue            # <BaseInput />
│   │   │   ├── BaseModal.vue            # <BaseModal />
│   │   │   └── BaseIcon.vue             # <BaseIcon />
│   │   │
│   │   ├── ui/                          # 通用 UI 组件（局部按需导入）
│   │   │   ├── Card.vue                 # <UiCard />
│   │   │   ├── Skeleton.vue             # <UiSkeleton />
│   │   │   └── Pagination.vue           # <UiPagination />
│   │   │
│   │   ├── layout/                      # 布局相关组件
│   │   │   ├── TheHeader.vue            # <LayoutTheHeader />
│   │   │   ├── TheFooter.vue            # <LayoutTheFooter />
│   │   │   └── TheSidebar.vue           # <LayoutTheSidebar />
│   │   │
│   │   ├── product/                     # 业务组件 - 商品域
│   │   │   ├── Card.vue                 # <ProductCard />
│   │   │   ├── List.vue                 # <ProductList />
│   │   │   ├── Detail.vue               # <ProductDetail />
│   │   │   └── PriceTag.vue             # <ProductPriceTag />
│   │   │
│   │   ├── cart/                        # 业务组件 - 购物车域
│   │   │   ├── Drawer.vue               # <CartDrawer />
│   │   │   ├── Item.vue                 # <CartItem />
│   │   │   └── Summary.vue              # <CartSummary />
│   │   │
│   │   ├── ChatWidget.client.vue        # 仅客户端组件（依赖 window）
│   │   ├── CommentList.server.vue       # 岛屿组件（仅服务端渲染）
│   │   └── HeavyChart.vue               # 配合 <LazyHeavyChart /> 懒加载
│   │
│   ├── composables/                     # 自动导入的组合式函数
│   │   ├── useCart.ts                   # const cart = useCart()
│   │   ├── useAuth.ts
│   │   └── useProduct.ts
│   │
│   ├── middleware/                      # 路由中间件
│   │   ├── auth.ts                      # 命名中间件（页面手动启用）
│   │   └── analytics.global.ts          # .global 后缀：全局中间件
│   │
│   ├── plugins/                         # 插件（自动注册）
│   │   ├── pinia.ts
│   │   └── i18n.ts
│   │
│   ├── assets/                          # 需构建处理的资源
│   │   ├── css/
│   │   │   └── main.css
│   │   └── images/
│   │       └── logo.svg
│   │
│   └── utils/                           # 自动导入的工具函数
│       ├── format.ts                    # formatPrice(...)
│       └── validate.ts
│
├── server/                              # 服务端
│   ├── api/
│   │   ├── products.get.ts              # GET  /api/products
│   │   └── orders/
│   │       └── [id].get.ts              # GET  /api/orders/:id
│   ├── middleware/
│   │   └── cors.ts
│   └── utils/
│       └── db.ts                        # 自动导入到 server 端
│
├── shared/                              # app 与 server 共享
│   ├── types/
│   │   └── product.ts                   # 类型定义（自动导入）
│   └── utils/
│       └── constants.ts
│
├── layers/                              # 领域分层（可选，大项目）
│   ├── 1.base/                          # 基础层（优先级最低）
│   │   ├── components/
│   │   ├── composables/
│   │   └── nuxt.config.ts
│   ├── 2.shop/                          # 商城领域
│   │   ├── pages/
│   │   ├── components/
│   │   └── nuxt.config.ts
│   └── 3.admin/                         # 后台领域（优先级最高）
│       ├── pages/
│       ├── components/
│       └── nuxt.config.ts
│
├── public/                              # 静态资源（直接拷贝，不构建）
│   ├── favicon.ico
│   └── robots.txt
│
├── modules/                             # 本地 Nuxt 模块
│   └── my-module/
│       └── index.ts
│
├── nuxt.config.ts                       # 核心配置
├── app.config.ts                        # 应用级响应式配置
├── package.json
└── tsconfig.json
```

---

## 五、配套配置示例

### `nuxt.config.ts` 关键配置

```ts
export default defineNuxtConfig({
  components: [
    // 全局组件目录：路径下所有组件全局注册
    {
      path: '~/app/components/global',
      global: true,
      pathPrefix: false,                  // 不加路径前缀，直接用 <BaseButton />
    },
    // 局部组件目录：按需打包（默认）
    {
      path: '~/app/components',
      global: false,
    },
  ],
})
```

### 页面调用示例：`app/pages/products/[id].vue`

```vue
<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()
const { data: product } = await useFetch(`/api/products/${route.params.id}`)
</script>

<template>
  <div>
    <!-- 全局组件：直接用，无需导入 -->
    <BaseButton @click="addToCart">加入购物车</BaseButton>

    <!-- 局部组件：自动导入，命名 = 路径+文件名 -->
    <ProductDetail :product="product" />
    <ProductPriceTag :price="product.price" />

    <!-- 懒加载组件 -->
    <LazyHeavyChart v-if="showChart" :data="product.stats" />

    <!-- 仅客户端组件 -->
    <ChatWidget />
  </div>
</template>
```

---

## 六、命名规则速查表

| 文件路径 | 自动生成的组件名 |
| --- | --- |
| `components/global/BaseButton.vue` | `<BaseButton />` |
| `components/product/Card.vue` | `<ProductCard />` |
| `components/cart/Drawer.vue` | `<CartDrawer />` |
| `components/layout/TheHeader.vue` | `<LayoutTheHeader />` |
| `components/ProductCard.vue` | `<ProductCard />`（同名段会去重） |

---

## 七、layers/ 大型项目方案

复杂项目推荐使用 `layers/` 做领域分层。

### 特性

- 每个 layer 拥有完整 Nuxt 目录结构（含 `nuxt.config.ts`）
- 可通过 `#layers/base/...` 别名引用（Nuxt 3.16+）
- 优先级按字母顺序，可用数字前缀控制（`1.base/` < `2.features/` < `3.admin/`）
- 高优先级 layer 可覆盖低优先级的同名资源

### 适用场景

- 大型代码库 DDD（领域驱动设计）组织
- 可复用 UI 库或主题
- 跨项目共享配置预设
- 关注点分离（如管理后台、功能模块）

---

## 八、最佳实践建议

| 场景 | 推荐方案 |
| --- | --- |
| 单一布局应用 | 用 `app.vue + <NuxtPage>`，不建 `layouts/` |
| 基础原子组件（Button/Input） | 放 `components/global/`，设 `global: true` |
| 业务组件 | 默认局部导入，按业务分子目录 |
| 跨页共享逻辑 | `composables/` 自动导入 |
| 多团队/多模块大项目 | 使用 `layers/` 做域隔离 |
| 客户端依赖组件 | `.client.vue` 后缀 |
| 重型可选组件 | 配合 `Lazy` 前缀懒加载 |

---

## 九、一句话总结

- **视图三层**：`app.vue`（壳）→ `layouts/`（骨架）→ `pages/`（内容）
- **全局组件**：放 `components/global/`，配 `global: true`，全站直接用
- **局部组件**：放 `components/<域>/`，按业务分目录，自动按需打包
- **跨域共享**：小项目用 `components/ui/`，大项目用 `layers/`

---

## 参考资料

- [Nuxt 4 Directory Structure](https://nuxt.com/docs/4.x/directory-structure)
- [components · Nuxt 4](https://nuxt.com/docs/4.x/directory-structure/app/components)
- [pages · Nuxt 4](https://nuxt.com/docs/4.x/directory-structure/app/pages)
- [layouts · Nuxt 4](https://nuxt.com/docs/4.x/directory-structure/app/layouts)
- [app.vue · Nuxt 4](https://nuxt.com/docs/4.x/directory-structure/app/app)
- [Views · Get Started with Nuxt 4](https://nuxt.com/docs/4.x/getting-started/views)
- [Auto-imports · Nuxt 4](https://nuxt.com/docs/4.x/guide/concepts/auto-imports)
- [layers · Nuxt 4](https://nuxt.com/docs/4.x/directory-structure/layers)
