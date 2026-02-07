<script setup lang="ts">
import { usePromptsStore } from "../../../stores/prompts";

const promptsStore = usePromptsStore();
const toast = useAppToast();

const emit = defineEmits<{
  apply: [prompt: string];
  send: [prompt: string];
}>();

const searchQuery = ref("");
const selectedCategory = ref("all");
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);

const form = reactive({
  title: "",
  prompt: "",
  category: "",
});

const allPrompts = computed(() => {
  return [...promptsStore.allPrompts].sort((a, b) => b.createdAt - a.createdAt);
});

const categoryOptions = computed(() => {
  const options = ["all", ...promptsStore.categories.filter(Boolean)];
  return options.map((value) => ({
    label: value === "all" ? "全部" : value,
    value,
  }));
});

const filteredPrompts = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();

  return allPrompts.value.filter((item) => {
    const matchedCategory =
      selectedCategory.value === "all" || item.category === selectedCategory.value;

    if (!matchedCategory) return false;
    if (!keyword) return true;

    return (
      item.title.toLowerCase().includes(keyword) ||
      item.prompt.toLowerCase().includes(keyword) ||
      item.category.toLowerCase().includes(keyword)
    );
  });
});

const isDeleteModalOpen = computed({
  get: () => deletingId.value !== null,
  set: (value: boolean) => {
    if (!value) {
      deletingId.value = null;
    }
  },
});

const resetForm = () => {
  editingId.value = null;
  form.title = "";
  form.prompt = "";
  form.category = "";
};

const resetFilters = () => {
  searchQuery.value = "";
  selectedCategory.value = "all";
};

const savePrompt = () => {
  const title = form.title.trim();
  const prompt = form.prompt.trim();
  const category = form.category.trim() || "未分类";

  if (!title) {
    toast.warning("请填写标题");
    return;
  }

  if (!prompt) {
    toast.warning("请填写提示词内容");
    return;
  }

  if (editingId.value) {
    promptsStore.updatePrompt(editingId.value, {
      title,
      prompt,
      category,
    });
    toast.success("提示词已更新");
  } else {
    promptsStore.addPrompt({
      title,
      prompt,
      category,
    });
    toast.success("提示词已保存");
  }

  resetForm();
};

const startEdit = (id: string) => {
  const promptItem = promptsStore.allPrompts.find((item) => item.id === id);
  if (!promptItem) return;

  editingId.value = promptItem.id;
  form.title = promptItem.title;
  form.prompt = promptItem.prompt;
  form.category = promptItem.category;
};

const requestDelete = (id: string) => {
  deletingId.value = id;
};

const confirmDelete = () => {
  if (!deletingId.value) return;

  promptsStore.removePrompt(deletingId.value);
  if (editingId.value === deletingId.value) {
    resetForm();
  }

  deletingId.value = null;
  toast.info("提示词已删除");
};

const copyPrompt = (prompt: string) => {
  navigator.clipboard.writeText(prompt);
  toast.success("已复制提示词");
};

const applyPrompt = (prompt: string) => {
  emit("apply", prompt);
};

const sendPrompt = (prompt: string) => {
  emit("send", prompt);
};

const fillCategory = (category: string) => {
  form.category = category;
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString("zh-CN", { hour12: false });
};
</script>

<template>
  <div class="custom-prompt-tool">
    <div class="tool-header">
      <h3 class="text-lg font-semibold">我的提示词</h3>
      <UButton color="neutral" variant="ghost" size="xs" @click="resetFilters">
        重置筛选
      </UButton>
    </div>

    <div class="tool-layout">
      <section class="tool-panel form-panel">
        <div class="panel-title">
          {{ editingId ? "编辑提示词" : "新增提示词" }}
        </div>

        <UFormField label="标题" required>
          <UInput v-model="form.title" placeholder="例如：秋日电影感咖啡馆" />
        </UFormField>

        <UFormField label="分类">
          <UInput v-model="form.category" placeholder="例如：摄影、插画、电商" />
          <div v-if="promptsStore.categories.length > 0" class="category-pills">
            <button
              v-for="category in promptsStore.categories"
              :key="category"
              type="button"
              class="category-pill"
              @click="fillCategory(category)"
            >
              {{ category }}
            </button>
          </div>
        </UFormField>

        <UFormField label="提示词内容" required>
          <UTextarea
            v-model="form.prompt"
            :rows="7"
            autoresize
            placeholder="在这里输入完整提示词..."
          />
        </UFormField>

        <div class="form-actions">
          <UButton icon="i-heroicons-check" @click="savePrompt">
            {{ editingId ? "保存修改" : "保存提示词" }}
          </UButton>
          <UButton color="neutral" variant="outline" @click="resetForm">
            清空
          </UButton>
        </div>
      </section>

      <section class="tool-panel list-panel">
        <div class="list-toolbar">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="搜索标题、分类、内容..."
            class="flex-1"
          />
          <USelectMenu
            v-model="selectedCategory"
            :items="categoryOptions"
            value-key="value"
            class="w-32"
          />
        </div>

        <div v-if="filteredPrompts.length === 0" class="empty-block">
          <UIcon name="i-heroicons-document-text" class="w-10 h-10 opacity-30" />
          <p>暂无匹配的提示词</p>
        </div>

        <div v-else class="prompt-list">
          <article v-for="item in filteredPrompts" :key="item.id" class="prompt-card">
            <div class="prompt-header">
              <div class="prompt-title">{{ item.title }}</div>
              <span class="prompt-category">{{ item.category }}</span>
            </div>

            <p class="prompt-content">{{ item.prompt }}</p>

            <div class="prompt-footer">
              <span class="prompt-time">{{ formatTime(item.createdAt) }}</span>
              <div class="prompt-actions">
                <UButton
                  icon="i-heroicons-clipboard-document"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  title="复制"
                  @click="copyPrompt(item.prompt)"
                />
                <UButton
                  icon="i-heroicons-pencil-square"
                  size="xs"
                  color="primary"
                  variant="ghost"
                  title="填充到输入框"
                  @click="applyPrompt(item.prompt)"
                />
                <UButton
                  icon="i-heroicons-paper-airplane"
                  size="xs"
                  color="info"
                  variant="ghost"
                  title="直接发送"
                  @click="sendPrompt(item.prompt)"
                />
                <UButton
                  icon="i-heroicons-pencil"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  title="编辑"
                  @click="startEdit(item.id)"
                />
                <UButton
                  icon="i-heroicons-trash"
                  size="xs"
                  color="error"
                  variant="ghost"
                  title="删除"
                  @click="requestDelete(item.id)"
                />
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <div class="delete-modal">
          <div class="delete-title">删除提示词？</div>
          <div class="delete-desc">删除后无法恢复。</div>
          <div class="delete-actions">
            <UButton color="neutral" variant="ghost" @click="deletingId = null">
              取消
            </UButton>
            <UButton color="error" @click="confirmDelete">
              确认删除
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.custom-prompt-tool {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tool-layout {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 12px;
  min-height: 480px;
}

.tool-panel {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  padding: 12px;
}

.panel-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
}

.category-pills {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-pill {
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-sub);
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-pill:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.form-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.list-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.list-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.prompt-list {
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  display: grid;
  gap: 8px;
  padding-right: 4px;
}

.prompt-card {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px;
  background: var(--bg-secondary);
}

.prompt-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.prompt-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.prompt-category {
  border-radius: 999px;
  font-size: 11px;
  line-height: 1;
  color: var(--primary-color);
  border: 1px solid rgba(26, 115, 232, 0.3);
  background: rgba(26, 115, 232, 0.08);
  padding: 4px 8px;
  flex-shrink: 0;
}

.prompt-content {
  margin: 8px 0;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.prompt-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.prompt-time {
  font-size: 11px;
  color: var(--text-sub);
}

.prompt-actions {
  display: flex;
  gap: 2px;
}

.empty-block {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--text-sub);
  gap: 8px;
}

.delete-modal {
  padding: 20px;
}

.delete-title {
  font-size: 16px;
  font-weight: 600;
}

.delete-desc {
  margin-top: 8px;
  color: var(--text-sub);
}

.delete-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1024px) {
  .tool-layout {
    grid-template-columns: 1fr;
  }

  .prompt-list {
    max-height: 45vh;
  }
}
</style>
