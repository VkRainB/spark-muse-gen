<script setup lang="ts">
const { config, sourceImage, slices, isProcessing, loadImage, setNineGrid, slice, downloadSlice, downloadAll, clear } = useSlicer()
const toast = useAppToast()

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    await loadImage(file)
    toast.success('图片已加载')
  } catch {
    toast.error('加载失败', '无法加载图片')
  }
}

const handleSlice = async () => {
  await slice()
  toast.success('切片完成', `生成 ${slices.value.length} 个切片`)
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold">图片切片工具</h3>

    <!-- 上传区域 -->
    <div v-if="!sourceImage" class="border-2 border-dashed rounded-lg p-8 text-center dark:border-gray-700">
      <input
        type="file"
        accept="image/*"
        class="hidden"
        id="slicer-upload"
        @change="handleFileUpload"
      />
      <label for="slicer-upload" class="cursor-pointer">
        <UIcon name="i-heroicons-photo" class="w-12 h-12 mx-auto text-gray-400 mb-2" />
        <p class="text-gray-500">点击选择图片</p>
      </label>
    </div>

    <!-- 预览和设置 -->
    <template v-else>
      <div class="flex gap-4">
        <!-- 原图预览 -->
        <div class="flex-1">
          <img :src="sourceImage.src" class="max-w-full max-h-64 object-contain rounded-lg" alt="Source" />
        </div>

        <!-- 设置 -->
        <div class="w-48 space-y-3">
          <UFormGroup label="行数">
            <UInput v-model.number="config.rows" type="number" min="1" max="10" />
          </UFormGroup>

          <UFormGroup label="列数">
            <UInput v-model.number="config.cols" type="number" min="1" max="10" />
          </UFormGroup>

          <UFormGroup label="填充色">
            <input v-model="config.fillColor" type="color" class="w-full h-8 rounded cursor-pointer" />
          </UFormGroup>

          <div class="flex items-center gap-2">
            <UToggle v-model="config.highRes" />
            <span class="text-sm">2x 高清</span>
          </div>

          <UButton icon="i-heroicons-squares-2x2" variant="outline" size="sm" block @click="setNineGrid">
            九宫格
          </UButton>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-2">
        <UButton :loading="isProcessing" icon="i-heroicons-scissors" @click="handleSlice">
          开始切片
        </UButton>
        <UButton v-if="slices.length > 0" icon="i-heroicons-arrow-down-tray" color="green" @click="downloadAll()">
          下载全部 (ZIP)
        </UButton>
        <UButton color="gray" variant="ghost" icon="i-heroicons-trash" @click="clear">
          清除
        </UButton>
      </div>

      <!-- 切片结果 -->
      <div v-if="slices.length > 0" class="grid grid-cols-3 gap-2">
        <div
          v-for="(s, index) in slices"
          :key="index"
          class="relative group cursor-pointer"
          @click="downloadSlice(index)"
        >
          <img :src="s.dataUrl" class="w-full aspect-square object-cover rounded" :alt="`Slice ${s.row + 1}-${s.col + 1}`" />
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded">
            <UIcon name="i-heroicons-arrow-down-tray" class="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
