/**
 * Lightbox composable - 全局图片预览状态管理
 */
interface LightboxImage {
  data: string
  mimeType?: string
}

const lightboxOpen = ref(false)
const lightboxImages = ref<LightboxImage[]>([])
const lightboxIndex = ref(0)

export function useLightbox() {
  const openLightbox = (imageOrSrc: string | LightboxImage, images?: LightboxImage[], index?: number) => {
    if (typeof imageOrSrc === 'string') {
      // 单张图片
      lightboxImages.value = [{ data: imageOrSrc }]
      lightboxIndex.value = 0
    } else if (images) {
      // 多张图片
      lightboxImages.value = images
      lightboxIndex.value = index ?? 0
    } else {
      lightboxImages.value = [imageOrSrc]
      lightboxIndex.value = 0
    }
    lightboxOpen.value = true
  }

  const closeLightbox = () => {
    lightboxOpen.value = false
  }

  return {
    isOpen: readonly(lightboxOpen),
    images: readonly(lightboxImages),
    currentIndex: lightboxIndex,
    openLightbox,
    closeLightbox
  }
}
