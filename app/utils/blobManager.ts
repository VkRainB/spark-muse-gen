// Blob URL 管理器 - 防止内存泄漏
class BlobManagerClass {
  private urls: Set<string> = new Set()

  create(blob: Blob): string {
    const url = URL.createObjectURL(blob)
    this.urls.add(url)
    return url
  }

  revoke(url: string): void {
    if (this.urls.has(url)) {
      URL.revokeObjectURL(url)
      this.urls.delete(url)
    }
  }

  cleanup(): void {
    this.urls.forEach(url => URL.revokeObjectURL(url))
    this.urls.clear()
  }

  get count(): number {
    return this.urls.size
  }
}

export const BlobManager = new BlobManagerClass()
