<script setup lang="ts">
import type { Message } from "../../../types";

const props = defineProps<{
  messages: Message[];
}>();

const emit = defineEmits<{
  copy: [message: Message];
  delete: [id: string];
  regenerate: [message: Message];
}>();

const { openLightbox } = useLightbox();

// 将内部 Message 格式转换为 UChatMessages 需要的 parts 格式
const chatMessages = computed(() => {
  return props.messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: [
      ...(msg.content ? [{ type: "text" as const, text: msg.content }] : []),
    ],
    // 保留原始数据用于图片展示和操作
    _raw: msg,
  }));
});

const getImageSrc = (image: { data: string; mimeType: string }) => {
  if (image.data.startsWith("data:") || image.data.startsWith("http")) {
    return image.data;
  }
  return `data:${image.mimeType};base64,${image.data}`;
};

const handleImageClick = (image: { data: string; mimeType: string }) => {
  openLightbox?.(getImageSrc(image));
};

const copyContent = async (msg: Message) => {
  try {
    await navigator.clipboard.writeText(msg.content);
    emit("copy", msg);
  } catch {
    console.error("复制失败");
  }
};

const scrollToBottom = () => {
  // UChatMessages handles scrolling via shouldScrollToBottom
};

defineExpose({ scrollToBottom });
</script>

<template>
  <div class="message-list-wrapper">
    <UChatMessages
      :messages="chatMessages"
      should-auto-scroll
      :ui="{
        viewport: 'max-w-[var(--content-max-width,860px)] mx-auto',
        autoScroll: 'right-0',
      }"
      :user="{
        side: 'right',
        variant: 'outline',
      }"
      :assistant="{
        side: 'left',
        variant: 'soft',
        avatar: {
          icon: 'i-heroicons-sparkles',
        },
        actions: [
          {
            label: '复制',
            icon: 'i-heroicons-clipboard',
          },
          {
            label: '重新生成',
            icon: 'i-heroicons-arrow-path',
          },
          {
            label: '删除',
            icon: 'i-heroicons-trash',
            color: 'error' as const,
          },
        ],
      }"
    >
      <template #content="{ message }">
        <!-- 文本内容 -->
        <template
          v-for="(part, index) in message.parts"
          :key="`${message.id}-${part.type}-${index}`"
        >
          <p v-if="part.type === 'text'" class="whitespace-pre-wrap">
            {{ part.text }}
          </p>
        </template>

        <!-- 图片网格 -->
        <div
          v-if="(message as any)._raw?.images?.length"
          class="generated-images"
        >
          <div
            v-for="(image, index) in (message as any)._raw.images"
            :key="index"
            class="generated-image"
            @click="handleImageClick(image)"
          >
            <img :src="getImageSrc(image)" alt="Generated image" />
            <div class="image-actions">
              <button class="tool-btn download" title="下载">
                <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <template #actions="{ message }">
        <div class="msg-actions-row">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-clipboard"
            @click="copyContent((message as any)._raw)"
          />
          <UButton
            v-if="message.role === 'assistant'"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-path"
            @click="emit('regenerate', (message as any)._raw)"
          />
          <UButton
            size="xs"
            color="error"
            variant="ghost"
            icon="i-heroicons-trash"
            @click="emit('delete', message.id)"
          />
        </div>
      </template>
    </UChatMessages>
  </div>
</template>

<style scoped>
.message-list-wrapper {
  width: 100%;
  max-width: var(--content-max-width, 860px);
  margin: 0 auto;
}

/* 图片网格 */
.generated-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.generated-image {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--border-color);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  aspect-ratio: 1;
}

.generated-image:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.generated-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.generated-image:hover .image-actions {
  opacity: 1;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  background: var(--card-bg);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  transition: all 0.15s ease;
}

.tool-btn:hover {
  background: var(--hover-color);
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.tool-btn.download {
  color: var(--primary-color);
}

.msg-actions-row {
  display: flex;
  gap: 2px;
}

@media (max-width: 768px) {
  .generated-images {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
