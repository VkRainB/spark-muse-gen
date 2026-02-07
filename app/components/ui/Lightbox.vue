<script setup lang="ts">
interface ImageItem {
  data: string
  mimeType?: string
}

const props = defineProps<{
  images: ImageItem[]
  initialIndex?: number
}>()

const open = defineModel<boolean>('open', { default: false })

const currentIndex = ref(props.initialIndex || 0)

const currentImage = computed(() => props.images[currentIndex.value])

const getImageSrc = (image: ImageItem) => {
  if (image.data.startsWith('data:') || image.data.startsWith('http')) {
    return image.data
  }
  return `data:${image.mimeType || 'image/png'};base64,${image.data}`
}

const prev = () => {
  currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length
}

const next = () => {
  currentIndex.value = (currentIndex.value + 1) % props.images.length
}

const close = () => {
  open.value = false
}

// 键盘导航
const handleKeydown = (e: KeyboardEvent) => {
  if (!open.value) return

  switch (e.key) {
    case 'ArrowLeft':
      prev()
      break
    case 'ArrowRight':
      next()
      break
    case 'Escape':
      close()
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(() => props.initialIndex, (val) => {
  if (val !== undefined) currentIndex.value = val
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-5xl' }">
    <template #content>
      <div class="relative bg-black">
        <!-- 关闭按钮 -->
        <button
          @click="close"
          class="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          <UIcon name="i-heroicons-x-mark" class="w-6 h-6 text-white" />
        </button>

        <!-- 图片 -->
        <div class="flex items-center justify-center min-h-[60vh] p-4">
          <img
            v-if="currentImage"
            :src="getImageSrc(currentImage)"
            class="max-w-full max-h-[80vh] object-contain"
            alt="Preview"
          />
        </div>

        <!-- 导航按钮 -->
        <template v-if="images.length > 1">
          <button
            @click="prev"
            class="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <UIcon name="i-heroicons-chevron-left" class="w-8 h-8 text-white" />
          </button>
          <button
            @click="next"
            class="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <UIcon name="i-heroicons-chevron-right" class="w-8 h-8 text-white" />
          </button>
        </template>

        <!-- 指示器 -->
        <div v-if="images.length > 1" class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          <button
            v-for="(_, index) in images"
            :key="index"
            @click="currentIndex = index"
            :class="[
              'w-2 h-2 rounded-full transition',
              index === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
            ]"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
