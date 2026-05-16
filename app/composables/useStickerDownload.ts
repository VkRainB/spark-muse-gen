/**
 * 贴纸下载逻辑收敛：单图下载 + 批量 ZIP 下载。
 * UI 组件不再各自实现 JSZip 流程。
 */
import JSZip from 'jszip'
import type { StickerImage } from '../../types/sticker'
import { downloadImageFromBase64, downloadImageFromBlob } from '../utils/downloadImage'
import { stripDataUrlPrefix } from '../utils/base64Utils'

export function useStickerDownload() {
  const toast = useAppToast()
  const isZipping = ref(false)

  const downloadOne = (img: StickerImage, filename: string) => {
    try {
      const base64 = stripDataUrlPrefix(img.data)
      downloadImageFromBase64(base64, filename, img.mimeType || 'image/png')
    } catch (err) {
      console.error(err)
      toast.error('下载失败')
    }
  }

  const downloadBatchAsZip = async (
    images: StickerImage[],
    zipName: string,
    fileBaseName: string,
  ) => {
    if (images.length === 0) return
    if (isZipping.value) return

    isZipping.value = true
    try {
      const zip = new JSZip()
      const folder = zip.folder(zipName)
      if (!folder) throw new Error('无法创建 zip 目录')

      images.forEach((img, idx) => {
        const base64 = stripDataUrlPrefix(img.data)
        folder.file(`${fileBaseName}-${idx + 1}.png`, base64, { base64: true })
      })

      const blob = await zip.generateAsync({ type: 'blob' })
      downloadImageFromBlob(blob, `${zipName}.zip`)
      toast.success('已打包', `共 ${images.length} 张`)
    } catch (err) {
      console.error(err)
      toast.error('打包失败')
    } finally {
      isZipping.value = false
    }
  }

  return {
    isZipping: readonly(isZipping),
    downloadOne,
    downloadBatchAsZip,
  }
}
