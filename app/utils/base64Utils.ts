// 判断是否为 data URL
export function isDataUrl(s: string): boolean {
  return typeof s === 'string' && s.startsWith('data:')
}

// 判断是否为 http(s) URL
export function isHttpUrl(s: string): boolean {
  return typeof s === 'string' && (s.startsWith('http://') || s.startsWith('https://'))
}

/**
 * 将任意来源（base64 纯字符串 / dataURL / http URL）规范化为可直接用于 <img src> 的 dataURL 或 URL。
 * - 已是 dataURL 或 http URL：原样返回
 * - 纯 base64：补全为 `data:${mime};base64,${data}`
 */
export function toDataUrl(data: string, mimeType: string = 'image/png'): string {
  if (!data) return ''
  if (isDataUrl(data) || isHttpUrl(data)) return data
  return `data:${mimeType || 'image/png'};base64,${data}`
}

/** 把 dataURL 中的纯 base64 部分剥出来（如果不是 dataURL 原样返回） */
export function stripDataUrlPrefix(data: string): string {
  if (!isDataUrl(data)) return data
  const idx = data.indexOf('base64,')
  return idx === -1 ? data : data.slice(idx + 7)
}

// Base64 转 Blob URL
export function base64ToBlobUrl(base64: string, mimeType: string = 'image/png'): string {
  const blob = base64ToBlob(base64, mimeType)
  return URL.createObjectURL(blob)
}

// Base64 转 Blob
export function base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] ?? base64 : base64
  const byteCharacters = atob(cleanBase64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

// Blob 转 Base64
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// File 转 Base64
export function fileToBase64(file: File): Promise<string> {
  return blobToBase64(file)
}

// 压缩 Base64 图像
export function compressBase64Image(
  base64: string,
  maxWidth: number = 1024,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = base64.includes(',') ? base64 : `data:image/png;base64,${base64}`
  })
}
