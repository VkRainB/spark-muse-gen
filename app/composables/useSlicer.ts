import JSZip from 'jszip'

interface SlicerConfig {
  rows: number
  cols: number
  gap: number
  fillColor: string
  autoFill: boolean
  highRes: boolean
}

interface SliceResult {
  row: number
  col: number
  canvas: HTMLCanvasElement
  dataUrl: string
}

export function useSlicer() {
  const config = reactive<SlicerConfig>({
    rows: 3,
    cols: 3,
    gap: 0,
    fillColor: '#ffffff',
    autoFill: true,
    highRes: false
  })

  const sourceImage = ref<HTMLImageElement | null>(null)
  const slices = ref<SliceResult[]>([])
  const isProcessing = ref(false)

  // 加载图片
  const loadImage = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        sourceImage.value = img
        resolve()
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  // 设置九宫格预设
  const setNineGrid = () => {
    config.rows = 3
    config.cols = 3
  }

  // 切片
  const slice = async () => {
    if (!sourceImage.value) return

    isProcessing.value = true
    slices.value = []

    const img = sourceImage.value
    const { rows, cols, fillColor, autoFill, highRes } = config

    const scale = highRes ? 2 : 1
    const sliceWidth = Math.floor(img.width / cols) * scale
    const sliceHeight = Math.floor(img.height / rows) * scale

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const canvas = document.createElement('canvas')
        canvas.width = sliceWidth
        canvas.height = sliceHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) continue

        // 填充背景色
        if (autoFill) {
          ctx.fillStyle = fillColor
          ctx.fillRect(0, 0, sliceWidth, sliceHeight)
        }

        // 绘制切片
        const sx = col * (img.width / cols)
        const sy = row * (img.height / rows)
        const sw = img.width / cols
        const sh = img.height / rows

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sliceWidth, sliceHeight)

        slices.value.push({
          row,
          col,
          canvas,
          dataUrl: canvas.toDataURL('image/png')
        })
      }
    }

    isProcessing.value = false
  }

  // 下载单个切片
  const downloadSlice = (index: number, prefix: string = 'slice') => {
    const sliceItem = slices.value[index]
    if (!sliceItem) return

    const link = document.createElement('a')
    link.download = `${prefix}_${sliceItem.row + 1}_${sliceItem.col + 1}.png`
    link.href = sliceItem.dataUrl
    link.click()
  }

  // 批量下载
  const downloadAll = async (prefix: string = 'slices') => {
    if (slices.value.length === 0) return

    const zip = new JSZip()

    for (const sliceItem of slices.value) {
      const base64 = sliceItem.dataUrl.split(',')[1]
      if (base64) {
        zip.file(`${prefix}_${sliceItem.row + 1}_${sliceItem.col + 1}.png`, base64, { base64: true })
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.download = `${prefix}.zip`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // 清除
  const clear = () => {
    if (sourceImage.value) {
      URL.revokeObjectURL(sourceImage.value.src)
    }
    sourceImage.value = null
    slices.value = []
  }

  return {
    config,
    sourceImage: readonly(sourceImage),
    slices: readonly(slices),
    isProcessing: readonly(isProcessing),
    loadImage,
    setNineGrid,
    slice,
    downloadSlice,
    downloadAll,
    clear
  }
}
