<script setup lang="ts">
import { useSettingsStore } from "../../../stores/settings";

const settingsStore = useSettingsStore();
const { generateImage, isGenerating, progress, currentTask, cancelGeneration } =
  useImageGeneration();
const { saveToFileSystem, isEnabled: autoSaveEnabled } = useFileSystem();
const chat = useChat();
const inputBridge = useState<{ prompt: string; send: boolean; nonce: number }>(
  "chat-input-bridge",
  () => ({
    prompt: "",
    send: false,
    nonce: 0,
  }),
);

const emit = defineEmits<{
  generated: [images: Array<{ data: string; mimeType: string }>];
}>();

const prompt = ref("");
const previewImages = ref<Array<{ data: string; mimeType: string }>>([]);
const textareaRef = ref<HTMLTextAreaElement>();

// 自动调整 textarea 高度
const adjustTextareaHeight = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto";
    textareaRef.value.style.height =
      Math.min(textareaRef.value.scrollHeight, 150) + "px";
  }
};

// 处理文件上传
const handleFiles = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (!files) return;

  Array.from(files).forEach((file) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImages.value.push({
        data: e.target?.result as string,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  });

  input.value = "";
};

// 移除预览图片
const removePreviewImage = (index: number) => {
  previewImages.value.splice(index, 1);
};

// 发送消息并生成图像
const sendMessage = async () => {
  if (!prompt.value.trim() && previewImages.value.length === 0) return;

  const userPrompt = prompt.value.trim();
  const refImages = [...previewImages.value];

  // 清空输入
  prompt.value = "";
  previewImages.value = [];
  adjustTextareaHeight();

  // 添加用户消息
  chat.sendUserMessage(
    userPrompt,
    refImages.length > 0 ? refImages : undefined,
  );

  // 调用图像生成
  const result = await generateImage({
    prompt: userPrompt,
    resolution: settingsStore.resolution,
    aspectRatio: settingsStore.aspectRatio,
    referenceImage: refImages[0]?.data,
    contextMessages: chat.contextMessages.value,
    stream: settingsStore.streamEnabled,
  });

  if (result.success && result.images.length > 0) {
    const generatedImages = result.images.map((img) => ({
      data: img.data,
      mimeType: img.mimeType,
    }));

    // 添加助理消息
    chat.addAssistantMessage("图像生成完成", generatedImages);

    // 自动保存
    if (autoSaveEnabled.value) {
      await saveToFileSystem(generatedImages, "generated");
    }

    emit("generated", generatedImages);
  }
};

// 处理键盘事件
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

const fileInputRef = ref<HTMLInputElement>();

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

watch(
  () => inputBridge.value.nonce,
  async (nonce, previousNonce) => {
    if (!nonce || nonce === previousNonce) return;

    prompt.value = inputBridge.value.prompt || "";
    await nextTick();
    adjustTextareaHeight();
    textareaRef.value?.focus();

    if (inputBridge.value.send && prompt.value.trim()) {
      await sendMessage();
    }
  },
);
</script>

<template>
  <div class="input-container-outer">
    <!-- 预览区域 -->
    <div v-if="previewImages.length > 0" class="preview-area">
      <div
        v-for="(image, index) in previewImages"
        :key="index"
        class="preview-item"
      >
        <img :src="image.data" alt="Preview" />
        <button class="preview-close" @click="removePreviewImage(index)">
          ×
        </button>
      </div>
    </div>

    <!-- 进度条 -->
    <UiSmartProgressBar
      v-if="isGenerating"
      :progress="progress"
      :task="currentTask"
      class="mb-3"
    />

    <!-- 输入包装器 -->
    <div class="input-wrapper">
      <!-- 上传按钮 -->
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        multiple
        @change="handleFiles"
        class="hidden"
      />
      <button
        class="icon-btn"
        title="上传参考图"
        :disabled="isGenerating"
        @click="triggerFileInput"
      >
        <UIcon name="i-heroicons-arrow-up-tray" class="w-5 h-5" />
      </button>

      <!-- 输入框 -->
      <textarea
        ref="textareaRef"
        v-model="prompt"
        placeholder="描述画面..."
        rows="1"
        :disabled="isGenerating"
        @input="adjustTextareaHeight"
        @keydown="handleKeydown"
      />

      <!-- 发送/取消按钮 -->
      <button
        v-if="!isGenerating"
        class="icon-btn send-btn"
        title="生成图像"
        :disabled="!prompt.trim() && previewImages.length === 0"
        @click="sendMessage"
      >
        <UIcon name="i-heroicons-paper-airplane" class="w-5 h-5" />
      </button>
      <button
        v-else
        class="icon-btn cancel-btn"
        title="取消生成"
        @click="cancelGeneration"
      >
        <UIcon name="i-heroicons-stop" class="w-5 h-5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.input-container-outer {
  border-top: 1px solid var(--border-color);
  background: var(--bg-color);
  padding: 16px 20px 20px;
}

@media (max-width: 768px) {
  .input-container-outer {
    padding: 12px 16px 16px;
  }
}

.preview-area {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.preview-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-close {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  border: none;
  line-height: 1;
}

.preview-close:hover {
  background: rgba(0, 0, 0, 0.8);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--input-bg);
  border-radius: 24px;
  padding: 8px 8px 8px 16px;
  border: 1px solid var(--border-color);
  transition: border-color 0.2s ease;
  max-width: var(--content-max-width, 860px);
  margin: 0 auto;
}

.input-wrapper:focus-within {
  border-color: var(--primary-color);
}

.input-wrapper textarea {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  line-height: 24px;
  padding: 8px 0;
  box-sizing: border-box;
  resize: none;
  max-height: 150px;
  min-height: 40px;
  color: var(--text-main);
  font-family: inherit;
}

.input-wrapper textarea::placeholder {
  color: var(--text-sub);
}

.input-wrapper textarea:disabled {
  opacity: 0.6;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-sub);
  transition: all 0.2s ease;
  flex-shrink: 0;
  background: transparent;
  border: none;
}

.icon-btn:hover:not(:disabled) {
  background: var(--hover-color);
  color: var(--text-main);
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  background: var(--primary-color);
  color: white;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
  background: var(--primary-color);
  color: white;
}

.send-btn:disabled {
  background: var(--border-color);
  color: var(--text-sub);
}

.cancel-btn {
  background: #d93025;
  color: white;
}

.cancel-btn:hover {
  opacity: 0.9;
  background: #d93025;
  color: white;
}

.hidden {
  display: none;
}
</style>
