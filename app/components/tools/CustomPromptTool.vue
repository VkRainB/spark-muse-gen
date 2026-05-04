<script setup lang="ts">
/**
 * 我的提示词
 * 视图模式：列表 / 编辑（含新增）
 * 进入默认是列表视图，点 + 新增 或某条的"编辑"按钮才切到编辑视图
 * 删除永远触发不到的 1280px 双栏断点，改 Tab 显式切换
 */

import { usePromptsStore } from "../../../stores/prompts";

const promptsStore = usePromptsStore();
const toast = useAppToast();

const emit = defineEmits<{
  apply: [prompt: string];
  send: [prompt: string];
}>();

type TabKey = "list" | "edit";
const currentTab = ref<TabKey>("list");

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

const editTabLabel = computed(() => (editingId.value ? "编辑" : "新增"));

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

const startCreate = () => {
  resetForm();
  currentTab.value = "edit";
};

const startEdit = (id: string) => {
  const promptItem = promptsStore.allPrompts.find((item) => item.id === id);
  if (!promptItem) return;

  editingId.value = promptItem.id;
  form.title = promptItem.title;
  form.prompt = promptItem.prompt;
  form.category = promptItem.category;
  currentTab.value = "edit";
};

const backToList = () => {
  resetForm();
  currentTab.value = "list";
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
  currentTab.value = "list";
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
    <!-- 顶部 Tab 栏 -->
    <div class="tab-bar">
      <div class="tab-list">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: currentTab === 'list' }"
          @click="currentTab = 'list'"
        >
          列表
          <span class="tab-count">{{ promptsStore.allPrompts.length }}</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: currentTab === 'edit' }"
          @click="currentTab = 'edit'"
        >
          {{ editTabLabel }}
        </button>
      </div>

      <UButton
        v-if="currentTab === 'list'"
        icon="i-heroicons-plus"
        size="sm"
        @click="startCreate"
      >
        新增
      </UButton>
      <UButton
        v-else
        icon="i-heroicons-arrow-left"
        size="sm"
        color="neutral"
        variant="ghost"
        @click="backToList"
      >
        返回列表
      </UButton>
    </div>

    <!-- 列表 Tab -->
    <section v-show="currentTab === 'list'" class="tab-panel list-panel">
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
          class="list-filter"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          title="重置筛选"
          @click="resetFilters"
        >
          重置
        </UButton>
      </div>

      <div v-if="filteredPrompts.length === 0" class="empty-block">
        <UIcon name="i-heroicons-document-text" class="w-10 h-10 opacity-30" />
        <p>暂无匹配的提示词</p>
        <UButton
          v-if="promptsStore.allPrompts.length === 0"
          size="sm"
          variant="outline"
          icon="i-heroicons-plus"
          @click="startCreate"
        >
          创建第一条提示词
        </UButton>
      </div>

      <ul v-else class="prompt-list">
        <li v-for="item in filteredPrompts" :key="item.id" class="prompt-card">
          <div class="prompt-header">
            <span class="prompt-title" :title="item.title">{{ item.title }}</span>
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
        </li>
      </ul>
    </section>

    <!-- 编辑 Tab -->
    <section v-show="currentTab === 'edit'" class="tab-panel edit-panel">
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
          :rows="8"
          autoresize
          placeholder="在这里输入完整提示词..."
        />
      </UFormField>

      <div class="form-actions">
        <UButton icon="i-heroicons-check" @click="savePrompt">
          {{ editingId ? "保存修改" : "保存提示词" }}
        </UButton>
        <UButton color="neutral" variant="outline" @click="backToList">
          取消
        </UButton>
      </div>
    </section>

    <UiConfirmDialog
      v-model:open="isDeleteModalOpen"
      title="删除提示词？"
      description="删除后无法恢复。"
      confirm-text="确认删除"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.custom-prompt-tool {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

/* Tab 栏 */
.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
}

.tab-list {
  display: inline-flex;
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-sub);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--text-main);
}

.tab-btn.active {
  background: var(--card-bg);
  color: var(--text-main);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-sub);
  background: var(--bg-secondary);
  border-radius: 9px;
}

.tab-btn.active .tab-count {
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
}

.tab-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 列表 Tab */
.list-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 0 0 auto;
}

.list-filter {
  width: 110px;
  flex-shrink: 0;
}

.prompt-list {
  list-style: none;
  margin: 0;
  padding: 0 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.prompt-card {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--bg-secondary);
  transition: border-color 0.15s ease;
}

.prompt-card:hover {
  border-color: var(--accent-blue);
}

.prompt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.prompt-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.prompt-category {
  border-radius: 999px;
  font-size: 10px;
  line-height: 1;
  color: var(--primary-color);
  border: 1px solid rgba(26, 115, 232, 0.3);
  background: rgba(26, 115, 232, 0.08);
  padding: 3px 7px;
  flex-shrink: 0;
}

.prompt-content {
  margin: 0 0 6px;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
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
  gap: 0;
}

.empty-block {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--text-sub);
  gap: 10px;
  padding: 32px 0;
}

.empty-block p {
  margin: 0;
  font-size: 13px;
}

/* 编辑 Tab */
.edit-panel {
  overflow-y: auto;
  padding-right: 4px;
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
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}
</style>
