<script setup lang="ts">
const { emotions, actions, generateSticker, generateStickerPack } = useStickerMode()
const { isGenerating, progress } = useImageGeneration()

const character = ref('')
const selectedEmotions = ref<string[]>([])
const selectedActions = ref<string[]>([])
const background = ref<'white' | 'transparent'>('white')
const generatedStickers = ref<Array<{ data: string; mimeType: string }>>([])

const toggleEmotion = (id: string) => {
  const index = selectedEmotions.value.indexOf(id)
  if (index === -1) {
    selectedEmotions.value.push(id)
  } else {
    selectedEmotions.value.splice(index, 1)
  }
}

const toggleAction = (id: string) => {
  const index = selectedActions.value.indexOf(id)
  if (index === -1) {
    selectedActions.value.push(id)
  } else {
    selectedActions.value.splice(index, 1)
  }
}

const handleGenerateSingle = async () => {
  if (!character.value.trim()) return

  const emotion = selectedEmotions.value[0]
  const action = selectedActions.value[0]

  const result = await generateSticker({
    character: character.value,
    emotion,
    action,
    background: background.value
  })

  if (result.success && result.images.length > 0) {
    generatedStickers.value.push(...result.images.map(img => ({
      data: img.data,
      mimeType: img.mimeType
    })))
  }
}

const handleGeneratePack = async () => {
  if (!character.value.trim()) return
  if (selectedEmotions.value.length === 0 && selectedActions.value.length === 0) return

  const results = await generateStickerPack(
    character.value,
    selectedEmotions.value,
    selectedActions.value,
    background.value
  )

  for (const result of results) {
    generatedStickers.value.push(...result.images.map(img => ({
      data: img.data,
      mimeType: img.mimeType
    })))
  }
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold">表情包制作</h3>

    <!-- 角色输入 -->
    <UFormGroup label="角色描述" required>
      <UInput v-model="character" placeholder="例如：一只橙色的小猫" />
    </UFormGroup>

    <!-- 表情选择 -->
    <div class="space-y-2">
      <label class="text-sm font-medium">表情</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="emotion in emotions"
          :key="emotion.id"
          :class="[
            'px-3 py-1.5 rounded-full text-sm border transition',
            selectedEmotions.includes(emotion.id)
              ? 'bg-primary text-white border-primary'
              : 'border-gray-200 dark:border-gray-700 hover:border-primary'
          ]"
          @click="toggleEmotion(emotion.id)"
        >
          {{ emotion.emoji }} {{ emotion.label }}
        </button>
      </div>
    </div>

    <!-- 动作选择 -->
    <div class="space-y-2">
      <label class="text-sm font-medium">动作</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="action in actions"
          :key="action.id"
          :class="[
            'px-3 py-1.5 rounded-full text-sm border transition',
            selectedActions.includes(action.id)
              ? 'bg-primary text-white border-primary'
              : 'border-gray-200 dark:border-gray-700 hover:border-primary'
          ]"
          @click="toggleAction(action.id)"
        >
          {{ action.emoji }} {{ action.label }}
        </button>
      </div>
    </div>

    <!-- 背景选择 -->
    <UFormGroup label="背景">
      <div class="flex gap-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="background" type="radio" value="white" class="text-primary" />
          <span>白色背景</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="background" type="radio" value="transparent" class="text-primary" />
          <span>透明背景</span>
        </label>
      </div>
    </UFormGroup>

    <!-- 进度 -->
    <SmartProgressBar v-if="isGenerating" :progress="progress" task="生成表情包中..." />

    <!-- 操作按钮 -->
    <div class="flex gap-2">
      <UButton
        :disabled="!character.trim() || isGenerating"
        icon="i-heroicons-sparkles"
        @click="handleGenerateSingle"
      >
        生成单个
      </UButton>
      <UButton
        :disabled="!character.trim() || (selectedEmotions.length === 0 && selectedActions.length === 0) || isGenerating"
        icon="i-heroicons-squares-2x2"
        color="green"
        @click="handleGeneratePack"
      >
        批量生成
      </UButton>
    </div>

    <!-- 生成结果 -->
    <div v-if="generatedStickers.length > 0" class="grid grid-cols-4 gap-2">
      <img
        v-for="(sticker, index) in generatedStickers"
        :key="index"
        :src="`data:${sticker.mimeType};base64,${sticker.data}`"
        class="w-full aspect-square object-contain bg-gray-100 dark:bg-gray-800 rounded-lg"
        alt="Sticker"
      />
    </div>
  </div>
</template>
