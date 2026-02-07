<script setup lang="ts">
const { isOpen, images, currentIndex, closeLightbox } = useLightbox();

const currentImage = computed(() => images.value[currentIndex.value]);

const getImageSrc = (image: { data: string; mimeType?: string }) => {
  if (image.data.startsWith("data:") || image.data.startsWith("http")) {
    return image.data;
  }
  return `data:${image.mimeType || "image/png"};base64,${image.data}`;
};

const prev = () => {
  currentIndex.value =
    (currentIndex.value - 1 + images.value.length) % images.value.length;
};

const next = () => {
  currentIndex.value = (currentIndex.value + 1) % images.value.length;
};

// 键盘导航
const handleKeydown = (e: KeyboardEvent) => {
  if (!isOpen.value) return;

  switch (e.key) {
    case "ArrowLeft":
      prev();
      break;
    case "ArrowRight":
      next();
      break;
    case "Escape":
      closeLightbox();
      break;
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});

// 下载图片
const downloadImage = () => {
  if (!currentImage.value) return;

  const link = document.createElement("a");
  link.href = getImageSrc(currentImage.value);
  link.download = `image-${Date.now()}.png`;
  link.click();
};
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="lightbox-overlay" @click="closeLightbox">
      <!-- 关闭按钮 -->
      <button class="lightbox-close" @click.stop="closeLightbox">×</button>

      <!-- 图片 -->
      <img
        v-if="currentImage"
        :src="getImageSrc(currentImage)"
        class="lightbox-img"
        alt="Preview"
        @click.stop
      />

      <!-- 导航按钮 -->
      <template v-if="images.length > 1">
        <button class="lightbox-nav prev" @click.stop="prev">
          <UIcon name="i-heroicons-chevron-left" class="w-8 h-8" />
        </button>
        <button class="lightbox-nav next" @click.stop="next">
          <UIcon name="i-heroicons-chevron-right" class="w-8 h-8" />
        </button>
      </template>

      <!-- 底部工具栏 -->
      <div class="lightbox-toolbar" @click.stop>
        <button class="toolbar-btn" @click="downloadImage" title="下载">
          <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5" />
        </button>
        <span v-if="images.length > 1" class="toolbar-counter">
          {{ currentIndex + 1 }} / {{ images.length }}
        </span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: zoom-out;
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 32px;
  color: white;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s ease;
  background: none;
  border: none;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-close:hover {
  opacity: 1;
}

.lightbox-img {
  max-width: 95vw;
  max-height: 90vh;
  object-fit: contain;
  cursor: default;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  padding: 12px;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.2);
}

.lightbox-nav.prev {
  left: 20px;
}

.lightbox-nav.next {
  right: 20px;
}

.lightbox-toolbar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 16px;
  border-radius: 24px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.toolbar-counter {
  color: white;
  font-size: 14px;
}
</style>
