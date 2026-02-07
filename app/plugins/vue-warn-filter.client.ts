export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.dev) return

  const previousWarnHandler = nuxtApp.vueApp.config.warnHandler

  nuxtApp.vueApp.config.warnHandler = (msg, instance, trace) => {
    if (typeof msg === 'string' && msg.includes('<Suspense> is an experimental feature')) {
      return
    }

    previousWarnHandler?.(msg, instance, trace)
  }
})
