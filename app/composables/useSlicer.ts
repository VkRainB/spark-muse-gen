import JSZip from 'jszip'

/**
 * 图片切片 - 辅助线模式
 *
 * 行为：
 * - 上传图片后，用户在图片上点击或预设来添加横/竖切线（百分比 0-100）
 * - 切线可拖拽调整、可单独删除
 * - 切片时把 0/100 加进切线集合并排序，遍历每个矩形单元
 * - 1:1 补全：把矩形画到正方形画布上居中，剩余区域填充背景色
 * - 2x 高清：画布尺寸 ×2，提升导出清晰度
 * - 单张下载 / ZIP 批量下载
 *
 * 移植自 source/app.js 行 1413-1585 的 SlicerTool
 */

export interface SliceResult {
  row: number
  col: number
  width: number
  height: number
  dataUrl: string
}

export function useSlicer() {
  const sourceImage = ref<HTMLImageElement | null>(null)
  const horizontalLines = ref<number[]>([])
  const verticalLines = ref<number[]>([])
  const forceSquare = ref(false)
  const fillColor = ref('#ffffff')
  const highRes = ref(true)
  const slices = ref<SliceResult[]>([])
  const isProcessing = ref(false)

  const sortedHLines = computed(() =>
    [...horizontalLines.value].sort((a, b) => a - b)
  )
  const sortedVLines = computed(() =>
    [...verticalLines.value].sort((a, b) => a - b)
  )

  const cellCount = computed(() =>
    (sortedHLines.value.length + 1) * (sortedVLines.value.length + 1)
  )

  const loadImage = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        sourceImage.value = img
        slices.value = []
        horizontalLines.value = []
        verticalLines.value = []
        resolve()
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = URL.createObjectURL(file)
    })
  }

  const clamp = (n: number) => Math.max(0, Math.min(100, n))

  const addLine = (type: 'h' | 'v', percent: number) => {
    const v = clamp(percent)
    if (type === 'h') horizontalLines.value.push(v)
    else verticalLines.value.push(v)
  }

  const removeLine = (type: 'h' | 'v', index: number) => {
    if (type === 'h') horizontalLines.value.splice(index, 1)
    else verticalLines.value.splice(index, 1)
  }

  const moveLine = (type: 'h' | 'v', index: number, percent: number) => {
    const v = clamp(percent)
    if (type === 'h') {
      if (horizontalLines.value[index] !== undefined) {
        horizontalLines.value[index] = v
      }
    } else {
      if (verticalLines.value[index] !== undefined) {
        verticalLines.value[index] = v
      }
    }
  }

  const clearLines = () => {
    horizontalLines.value = []
    verticalLines.value = []
  }

  const presetNineGrid = () => {
    horizontalLines.value = [100 / 3, (100 / 3) * 2]
    verticalLines.value = [100 / 3, (100 / 3) * 2]
  }

  const presetHorizontal = (n: number) => {
    if (n < 2) return
    horizontalLines.value = []
    for (let i = 1; i < n; i++) {
      horizontalLines.value.push((i / n) * 100)
    }
  }

  const presetVertical = (n: number) => {
    if (n < 2) return
    verticalLines.value = []
    for (let i = 1; i < n; i++) {
      verticalLines.value.push((i / n) * 100)
    }
  }

  const slice = async () => {
    if (!sourceImage.value) return

    isProcessing.value = true
    slices.value = []

    const img = sourceImage.value
    const w = img.naturalWidth
    const h = img.naturalHeight
    const scale = highRes.value ? 2 : 1

    const hCuts = [0, ...sortedHLines.value.map((p) => (p / 100) * h), h]
    const vCuts = [0, ...sortedVLines.value.map((p) => (p / 100) * w), w]

    const results: SliceResult[] = []

    try {
      for (let i = 0; i < hCuts.length - 1; i++) {
        for (let j = 0; j < vCuts.length - 1; j++) {
          const sx = vCuts[j]!
          const sy = hCuts[i]!
          const sw = vCuts[j + 1]! - sx
          const sh = hCuts[i + 1]! - sy

          if (sw < 1 || sh < 1) continue

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { alpha: true })
          if (!ctx) continue

          if (forceSquare.value) {
            const maxDim = Math.max(sw, sh)
            canvas.width = maxDim * scale
            canvas.height = maxDim * scale

            ctx.fillStyle = fillColor.value
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'

            const offsetX = (maxDim - sw) / 2
            const offsetY = (maxDim - sh) / 2
            ctx.drawImage(
              img,
              sx,
              sy,
              sw,
              sh,
              offsetX * scale,
              offsetY * scale,
              sw * scale,
              sh * scale
            )
          } else {
            canvas.width = sw * scale
            canvas.height = sh * scale
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale)
          }

          results.push({
            row: i,
            col: j,
            width: Math.round(canvas.width / scale),
            height: Math.round(canvas.height / scale),
            dataUrl: canvas.toDataURL('image/png', 1.0),
          })
        }
      }

      slices.value = results
    } finally {
      isProcessing.value = false
    }
  }

  const downloadSlice = (index: number, prefix = 'slice') => {
    const item = slices.value[index]
    if (!item) return
    const link = document.createElement('a')
    link.download = `${prefix}_${item.row + 1}_${item.col + 1}.png`
    link.href = item.dataUrl
    link.click()
  }

  const downloadAll = async (prefix = 'slices') => {
    if (slices.value.length === 0) return

    const zip = new JSZip()
    const folder = zip.folder(prefix)
    if (!folder) throw new Error('无法创建 zip 目录')

    for (const item of slices.value) {
      const base64 = item.dataUrl.split(',')[1]
      if (base64) {
        folder.file(
          `slice_${item.row + 1}_${item.col + 1}.png`,
          base64,
          { base64: true }
        )
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.download = `${prefix}_${Date.now()}.zip`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const clear = () => {
    if (sourceImage.value && sourceImage.value.src.startsWith('blob:')) {
      URL.revokeObjectURL(sourceImage.value.src)
    }
    sourceImage.value = null
    horizontalLines.value = []
    verticalLines.value = []
    slices.value = []
  }

  return {
    sourceImage: readonly(sourceImage),
    horizontalLines,
    verticalLines,
    forceSquare,
    fillColor,
    highRes,
    slices: readonly(slices),
    isProcessing: readonly(isProcessing),
    sortedHLines,
    sortedVLines,
    cellCount,
    loadImage,
    addLine,
    removeLine,
    moveLine,
    clearLines,
    presetNineGrid,
    presetHorizontal,
    presetVertical,
    slice,
    downloadSlice,
    downloadAll,
    clear,
  }
}
