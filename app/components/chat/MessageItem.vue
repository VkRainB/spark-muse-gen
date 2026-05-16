<script setup lang="ts">
import type { Message } from "../../../types";
import { toDataUrl } from "../../utils/base64Utils";

const props = defineProps<{
  message: Message;
}>();

const emit = defineEmits<{
  copy: [message: Message];
  delete: [id: string];
  regenerate: [message: Message];
}>();

const { openLightbox } = useLightbox();

const getImageSrc = (image: { data: string; mimeType: string }) => toDataUrl(image.data, image.mimeType);

const isUser = computed(() => props.message.role === "user");

const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content);
    emit("copy", props.message);
  } catch {
    // 降级处理
    console.error("复制失败");
  }
};

const handleImageClick = (image: { data: string; mimeType: string }) => {
  openLightbox?.(getImageSrc(image));
};
</script>

<template>
  <div class="message-row" :class="{ user: isUser, bot: !isUser }">
    <!-- 机器人头像 -->
    <div v-if="!isUser" class="avatar avatar-bot">
      <Icon name="brand:google-logo" class="avatar-icon" />
    </div>

    <div class="msg-content">
      <!-- 文本内容 -->
      <p v-if="message.content" class="msg-text">{{ message.content }}</p>

      <!-- 图片网格 -->
      <div v-if="message.images?.length" class="generated-images">
        <div
          v-for="(image, index) in message.images"
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

      <!-- 操作按钮 -->
      <div class="msg-actions">
        <button class="action-btn" @click="copyContent" title="复制">
          <UIcon name="i-heroicons-clipboard" class="w-4 h-4" />
        </button>
        <button
          v-if="!isUser"
          class="action-btn"
          @click="$emit('regenerate', message)"
          title="重新生成"
        >
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
        </button>
        <button
          class="action-btn delete"
          @click="$emit('delete', message.id)"
          title="删除"
        >
          <UIcon name="i-heroicons-trash" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 用户头像 -->
    <div v-if="isUser" class="avatar avatar-user">
      <UIcon name="i-heroicons-user-solid" class="avatar-icon-ui" />
    </div>
  </div>
</template>

<style scoped>
.message-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 20px;
  max-width: 100%;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.bot {
  justify-content: flex-start;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
}

.avatar-bot {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
}

.avatar-user {
  background: var(--accent-blue-bg);
  border: 1px solid color-mix(in srgb, var(--accent-blue) 30%, transparent);
  color: var(--accent-blue);
}

.avatar-icon {
  width: 20px;
  height: 20px;
}

.avatar-icon-ui {
  width: 18px;
  height: 18px;
}

.msg-content {
  max-width: 80%;
  position: relative;
  min-width: 0;
}

.msg-text {
  padding: 12px 16px;
  border-radius: 16px;
  line-height: 1.6;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.message-row.user .msg-text {
  background: var(--bg-tertiary);
  color: var(--text-main);
  border-bottom-right-radius: 4px;
}

.message-row.bot .msg-text {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  border-bottom-left-radius: 4px;
}

/* 生成的图片网格 */
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

/* 消息操作按钮 */
.msg-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.msg-content:hover .msg-actions {
  opacity: 1;
}

.message-row.user .msg-actions {
  justify-content: flex-end;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-sub);
  background: transparent;
  border: none;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--hover-color);
  color: var(--primary-color);
}

.action-btn.delete:hover {
  color: #d93025;
}

@media (max-width: 768px) {
  .msg-content {
    max-width: 85%;
  }

  .avatar {
    width: 28px;
    height: 28px;
  }

  .avatar-icon {
    width: 16px;
    height: 16px;
  }

  .avatar-icon-ui {
    width: 15px;
    height: 15px;
  }

  .generated-images {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
