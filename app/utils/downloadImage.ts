import { base64ToBlob } from './base64Utils'

// 从 Base64 下载图像
export function downloadImageFromBase64(
  base64: string,
  filename: string,
  mimeType: string = 'image/png'
): void {
  const blob = base64ToBlob(base64, mimeType)
  downloadImageFromBlob(blob, filename)
}

// 从 Blob URL 下载
export function downloadImageFromBlobUrl(blobUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 从 Blob 下载
export function downloadImageFromBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  downloadImageFromBlobUrl(url, filename)
  URL.revokeObjectURL(url)
}

// 从 Canvas 下载
export function downloadImageFromCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  mimeType: string = 'image/png',
  quality: number = 1.0
): void {
  canvas.toBlob(
    (blob) => {
      if (blob) {
        downloadImageFromBlob(blob, filename)
      }
    },
    mimeType,
    quality
  )
}
