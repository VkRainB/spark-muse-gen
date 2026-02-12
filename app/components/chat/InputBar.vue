<script setup lang="ts">
import { useSettingsStore } from "../../../stores/settings";
import type { AspectRatio, Resolution } from "../../../stores/settings";

const settingsStore = useSettingsStore();
const { generateImage, isGenerating, progress, currentTask, cancelGeneration } =
  useImageGeneration();
const { saveToFileSystem, isEnabled: autoSaveEnabled } = useFileSystem();
const chat = useChat();
const inputBridge = useState<{ prompt: string; send: boolean; resend?: boolean; nonce: number }>(
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
const paramsOpen = ref(false);

const resolutionOptions: Array<{ label: string; value: Resolution }> = [
  { label: "1K", value: "1K" },
  { label: "2K", value: "2K" },
  { label: "4K", value: "4K" },
];

const aspectRatioOptions: Array<{
  label: string;
  value: AspectRatio;
  previewClass: string;
}> = [
  { label: "1:1", value: "1:1", previewClass: "r-1-1" },
  { label: "16:9", value: "16:9", previewClass: "r-16-9" },
  { label: "9:16", value: "9:16", previewClass: "r-9-16" },
  { label: "4:3", value: "4:3", previewClass: "r-4-3" },
  { label: "3:4", value: "3:4", previewClass: "r-3-4" },
];

const toggleParams = () => {
  paramsOpen.value = !paramsOpen.value;
};

const setResolution = (value: Resolution) => {
  settingsStore.setResolution(value);
};

const setAspectRatio = (value: AspectRatio) => {
  settingsStore.setAspectRatio(value);
};

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
  paramsOpen.value = false;
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
  } else if (result.success && result.text) {
    // 文本回复（没有图片）
    chat.addAssistantMessage(result.text);
  }
};

// 重新生成：不添加用户消息，只重新调用图像生成
const resendMessage = async () => {
  if (!prompt.value.trim() && previewImages.value.length === 0) return;

  const userPrompt = prompt.value.trim();
  const refImages = [...previewImages.value];

  // 清空输入
  prompt.value = "";
  previewImages.value = [];
  paramsOpen.value = false;
  adjustTextareaHeight();

  // 不添加用户消息，直接调用图像生成
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

    chat.addAssistantMessage("图像生成完成", generatedImages);

    if (autoSaveEnabled.value) {
      await saveToFileSystem(generatedImages, "generated");
    }

    emit("generated", generatedImages);
  } else if (result.success && result.text) {
    // 文本回复（没有图片）
    chat.addAssistantMessage(result.text);
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
      if (inputBridge.value.resend) {
        await resendMessage();
      } else {
        await sendMessage();
      }
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
    <div class="params-popup" :class="{ open: paramsOpen }">
      <div class="params-header">
        <div class="params-title">
          <UIcon name="i-heroicons-adjustments-horizontal" class="w-4 h-4" />
          <span>绘图参数</span>
        </div>
        <button class="params-close-btn" title="收起参数面板" @click="toggleParams">
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>

      <div class="param-section">
        <span class="section-label">长宽比</span>
        <div class="ratio-grid">
          <button
            v-for="ratio in aspectRatioOptions"
            :key="ratio.value"
            class="ratio-card"
            :class="{ active: settingsStore.aspectRatio === ratio.value }"
            @click="setAspectRatio(ratio.value)"
          >
            <span class="ratio-preview" :class="ratio.previewClass" />
            <span>{{ ratio.label }}</span>
          </button>
        </div>
      </div>

      <div class="param-section">
        <span class="section-label">分辨率</span>
        <div class="res-options">
          <button
            v-for="item in resolutionOptions"
            :key="item.value"
            class="res-btn"
            :class="{ active: settingsStore.resolution === item.value }"
            @click="setResolution(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>

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
      <div class="left-actions">
        <button
          class="action-btn"
          :class="{ active: paramsOpen }"
          title="参数设置"
          @click="toggleParams"
        >
          <UIcon
            :name="paramsOpen ? 'i-heroicons-adjustments-horizontal-solid' : 'i-heroicons-adjustments-horizontal'"
            class="w-5 h-5"
          />
        </button>
        <button
          class="action-btn"
          title="上传参考图"
          :disabled="isGenerating"
          @click="triggerFileInput"
        >
          <UIcon name="i-heroicons-arrow-up-tray" class="w-5 h-5" />
        </button>
      </div>

      <!-- 输入框 -->
      <textarea
        ref="textareaRef"
        v-model="prompt"
        class="chat-input"
        placeholder="描述画面..."
        rows="1"
        :disabled="isGenerating"
        @input="adjustTextareaHeight"
        @keydown="handleKeydown"
      />

      <!-- 发送/取消按钮 -->
      <button
        v-if="!isGenerating"
        class="send-btn"
        title="生成图像"
        :disabled="!prompt.trim() && previewImages.length === 0"
        @click="sendMessage"
      >
        <UIcon name="i-heroicons-paper-airplane" class="w-5 h-5" />
      </button>
      <button
        v-else
        class="send-btn cancel-btn"
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
  border-top: 1px solid color-mix(in srgb, var(--border-color) 74%, transparent);
  background: linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--bg-color) 94%, transparent) 26%);
  padding: 14px 20px 22px;
  position: relative;
}

@media (max-width: 768px) {
  .input-container-outer {
    padding: 12px 12px 16px;
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
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
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

.params-popup {
  width: 100%;
  max-width: var(--content-max-width, 860px);
  margin: 0 auto;
  background: var(--card-bg);
  border: 1px solid transparent;
  border-radius: 12px;
  box-shadow: none;
  overflow: hidden;
  max-height: 0;
  padding: 0 14px;
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  pointer-events: none;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.params-popup.open {
  margin-bottom: 12px;
  border-color: var(--border-color);
  box-shadow: var(--shadow-popup);
  max-height: 420px;
  padding: 14px;
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.params-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.params-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
}

.params-close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.params-close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-main);
}

.param-section + .param-section {
  margin-top: 12px;
}

.section-label {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

.ratio-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.ratio-card {
  height: 68px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-sub);
  font-size: 12px;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ratio-card:hover {
  border-color: var(--text-tertiary);
  color: var(--text-main);
}

.ratio-card.active {
  border-color: var(--accent-blue);
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
}

.ratio-preview {
  border: 2px solid currentColor;
  border-radius: 2px;
}

.r-1-1 {
  width: 14px;
  height: 14px;
}

.r-16-9 {
  width: 18px;
  height: 10px;
}

.r-9-16 {
  width: 10px;
  height: 18px;
}

.r-4-3 {
  width: 16px;
  height: 12px;
}

.r-3-4 {
  width: 12px;
  height: 16px;
}

.res-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.res-btn {
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-sub);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.res-btn:hover {
  border-color: var(--text-tertiary);
  color: var(--text-main);
}

.res-btn.active {
  border-color: var(--accent-blue);
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-input-area);
  border-radius: 28px;
  padding: 8px 10px 8px 18px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
  max-width: var(--content-max-width, 860px);
  margin: 0 auto;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.05);
}

.input-wrapper:focus-within {
  border-color: color-mix(in srgb, var(--primary-color) 35%, var(--border-color));
  background: var(--card-bg);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
}

.left-actions {
  display: flex;
  align-items: center;
  border-right: 1px solid color-mix(in srgb, var(--border-color) 85%, transparent);
  padding-right: 12px;
  margin-right: 2px;
}

.action-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.action-btn:hover:not(:disabled) {
  background: var(--card-bg);
  color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.action-btn.active {
  background: var(--card-bg);
  color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.chat-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  line-height: 24px;
  padding: 8px 0;
  box-sizing: border-box;
  resize: none;
  max-height: 150px;
  min-height: 24px;
  color: var(--text-main);
  font-family: inherit;
}

.chat-input::placeholder {
  color: var(--text-sub);
}

.chat-input:disabled {
  opacity: 0.6;
}

.send-btn {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 3px 10px rgba(16, 185, 129, 0.35);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 6px 14px rgba(16, 185, 129, 0.38);
}

.send-btn:disabled {
  box-shadow: none;
  background: var(--border-color);
  color: var(--text-sub);
  cursor: not-allowed;
}

.cancel-btn {
  background: #ef4444;
  box-shadow: 0 3px 10px rgba(239, 68, 68, 0.28);
}

.cancel-btn:hover {
  background: #dc2626;
  box-shadow: 0 6px 14px rgba(239, 68, 68, 0.35);
}

.hidden {
  display: none;
}

@media (max-width: 768px) {
  .params-popup.open {
    padding: 12px;
  }

  .ratio-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .res-options {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
