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
          <UIcon name="i-heroicons-list-bullet" class="w-4 h-4" />
          列表
          <span class="tab-count">{{ promptsStore.allPrompts.length }}</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: currentTab === 'edit' }"
          @click="currentTab = 'edit'"
        >
          <UIcon :name="editingId ? 'i-heroicons-pencil-square' : 'i-heroicons-plus'" class="w-4 h-4" />
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
        <UTooltip text="重置筛选">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            size="sm"
            @click="resetFilters"
          />
        </UTooltip>
      </div>

      <div v-if="filteredPrompts.length === 0" class="empty-block">
        <div class="empty-icon-wrapper">
          <UIcon name="i-heroicons-document-text" class="w-10 h-10" />
        </div>
        <h3 class="empty-title">{{ promptsStore.allPrompts.length === 0 ? '暂无提示词' : '暂无匹配结果' }}</h3>
        <p class="empty-desc">{{ promptsStore.allPrompts.length === 0 ? '创建你的第一条提示词，开始高效创作' : '尝试调整搜索关键词或筛选条件' }}</p>
        <UButton
          v-if="promptsStore.allPrompts.length === 0"
          size="sm"
          icon="i-heroicons-plus"
          @click="startCreate"
        >
          创建提示词
        </UButton>
        <UButton
          v-else
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-heroicons-x-mark"
          @click="resetFilters"
        >
          重置筛选
        </UButton>
      </div>

      <ul v-else class="prompt-list">
        <li v-for="item in filteredPrompts" :key="item.id" class="prompt-card">
          <div class="prompt-header">
            <span class="prompt-title" :title="item.title">{{ item.title }}</span>
            <UBadge :label="item.category" color="primary" variant="subtle" size="sm" />
          </div>

          <p class="prompt-content">{{ item.prompt }}</p>

          <div class="prompt-footer">
            <span class="prompt-time">{{ formatTime(item.createdAt) }}</span>
            <div class="prompt-actions">
              <!-- 主要操作 -->
              <UTooltip text="填充到输入框">
                <UButton
                  icon="i-heroicons-arrow-right-circle"
                  size="xs"
                  color="primary"
                  variant="soft"
                  @click="applyPrompt(item.prompt)"
                />
              </UTooltip>
              <UTooltip text="直接发送">
                <UButton
                  icon="i-heroicons-paper-airplane"
                  size="xs"
                  color="info"
                  variant="soft"
                  @click="sendPrompt(item.prompt)"
                />
              </UTooltip>

              <!-- 分隔线 -->
              <div class="action-divider" />

              <!-- 次要操作 -->
              <UTooltip text="复制">
                <UButton
                  icon="i-heroicons-clipboard-document"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="copyPrompt(item.prompt)"
                />
              </UTooltip>
              <UTooltip text="编辑">
                <UButton
                  icon="i-heroicons-pencil"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="startEdit(item.id)"
                />
              </UTooltip>

              <!-- 危险操作 -->
              <UTooltip text="删除">
                <UButton
                  icon="i-heroicons-trash"
                  size="xs"
                  color="error"
                  variant="ghost"
                  @click="requestDelete(item.id)"
                />
              </UTooltip>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- 编辑 Tab -->
    <section v-show="currentTab === 'edit'" class="tab-panel edit-panel">
      <div class="form-section">
        <UFormField label="标题" required>
          <UInput v-model="form.title" placeholder="例如：秋日电影感咖啡馆" />
        </UFormField>
      </div>

      <div class="form-section">
        <UFormField label="分类">
          <UInput v-model="form.category" placeholder="例如：摄影、插画、电商" />
          <div v-if="promptsStore.categories.length > 0" class="category-pills">
            <UBadge
              v-for="category in promptsStore.categories"
              :key="category"
              :label="category"
              color="neutral"
              variant="outline"
              size="sm"
              class="category-pill"
              @click="fillCategory(category)"
            />
          </div>
        </UFormField>
      </div>

      <div class="form-section">
        <UFormField label="提示词内容" required>
          <UTextarea
            v-model="form.prompt"
            :rows="8"
            autoresize
            placeholder="在这里输入完整提示词..."
          />
        </UFormField>
      </div>

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
  border-radius: 10px;
  padding: 4px;
  gap: 2px;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-sub);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: var(--text-main);
  background: color-mix(in srgb, var(--card-bg) 50%, transparent);
}

.tab-btn.active {
  background: var(--card-bg);
  color: var(--text-main);
  box-shadow: var(--shadow-sm);
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-sub);
  background: var(--bg-tertiary);
  border-radius: 10px;
}

.tab-btn.active .tab-count {
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
}

.tab-panel {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 列表 Tab */
.list-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
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
  gap: 10px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.prompt-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 16px;
  background: var(--card-bg);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.prompt-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.prompt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.prompt-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.prompt-content {
  margin: 0 0 10px;
  color: var(--text-sub);
  font-size: 13px;
  line-height: 1.6;
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
  color: var(--text-tertiary);
}

.prompt-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.action-divider {
  width: 1px;
  height: 16px;
  background: var(--border-color);
  margin: 0 4px;
}

.empty-block {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--text-sub);
  gap: 12px;
  padding: 48px 0;
}

.empty-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.empty-desc {
  font-size: 13px;
  color: var(--text-sub);
  margin: 0;
  text-align: center;
  max-width: 240px;
}

/* 编辑 Tab */
.edit-panel {
  overflow-y: auto;
  padding-right: 4px;
  width: 100%;
}

.form-section {
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 100%;
  box-sizing: border-box;
}

.form-section > :deep(*) {
  width: 100%;
  max-width: none;
}

.form-section :deep(input),
.form-section :deep(textarea) {
  width: 100%;
  max-width: none;
}

.form-section :deep(.relative) {
  width: 100%;
  max-width: none;
}

.category-pills {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-pill {
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-pill:hover {
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.form-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}
</style>
