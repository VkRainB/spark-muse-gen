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
