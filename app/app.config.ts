/**
 * @nuxt/icon 运行时配置（不影响 Nuxt UI 的 UIcon）
 *
 * - aliases: 给本地 brand 集合 / 高频 Iconify 图标起短别名
 * - size / class: 默认渲染样式（可被 prop 覆盖）
 */
export default defineAppConfig({
  icon: {
    size: '1.25rem',
    class: 'inline-icon',
    aliases: {
      'logo-google': 'brand:google-logo',
      'logo-github': 'mdi:github'
    }
  }
})
