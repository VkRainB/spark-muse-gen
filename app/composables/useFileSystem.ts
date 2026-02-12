import { useSettingsStore } from '../../stores/settings'

export function useFileSystem() {
  const toast = useAppToast()
  const settingsStore = useSettingsStore()

  const isSupported = ref(false)
  // Use a shared state so every component reads the same selected directory.
  const directoryHandle = useState<FileSystemDirectoryHandle | null>('auto-save-directory-handle', () => null)

  // 检测支持
  onMounted(() => {
    isSupported.value = 'showDirectoryPicker' in window
  })

  const isEnabled = computed(() =>
    isSupported.value && settingsStore.autoSaveEnabled && directoryHandle.value !== null
  )

  const ensureDirectoryPermission = async (): Promise<boolean> => {
    if (!directoryHandle.value) return false

    try {
      const handle = directoryHandle.value as FileSystemDirectoryHandle & {
        queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
        requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
      }

      if (!handle.queryPermission || !handle.requestPermission) {
        return true
      }

      const descriptor = { mode: 'readwrite' as const }
      let permission = await handle.queryPermission(descriptor)
      if (permission !== 'granted') {
        permission = await handle.requestPermission(descriptor)
      }

      return permission === 'granted'
    } catch {
      return false
    }
  }

  // 选择目录
  const selectDirectory = async (): Promise<boolean> => {
    if (!isSupported.value) {
      toast.warning('不支持', '您的浏览器不支持 File System Access API')
      return false
    }

    try {
      const windowWithPicker = window as Window & {
        showDirectoryPicker?: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle>
      }

      if (!windowWithPicker.showDirectoryPicker) {
        toast.warning('不支持', '您的浏览器不支持 File System Access API')
        return false
      }

      directoryHandle.value = await windowWithPicker.showDirectoryPicker({
        mode: 'readwrite'
      })
      settingsStore.setAutoSave(true, directoryHandle.value.name)
      toast.success('目录已选择', directoryHandle.value.name)
      return true
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error('选择失败', err.message)
      }
      return false
    }
  }

  // 保存单张图像
  const saveImage = async (
    data: string,
    filename: string,
    mimeType: string = 'image/png'
  ): Promise<boolean> => {
    if (!directoryHandle.value) {
      return false
    }

    const hasPermission = await ensureDirectoryPermission()
    if (!hasPermission) {
      toast.warning('无法保存', '目录写入权限未授予')
      return false
    }

    try {
      const fileHandle = await directoryHandle.value.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()

      // HTTP/HTTPS URL 直接拉取为 Blob
      if (data.startsWith('http://') || data.startsWith('https://')) {
        const response = await fetch(data)
        if (!response.ok) {
          throw new Error(`Fetch image failed: ${response.status}`)
        }
        const blob = await response.blob()
        await writable.write(blob)
        await writable.close()
        return true
      }

      // Base64 / DataURL 转 Blob
      const cleanData = data.includes(',') ? data.split(',')[1] : data
      if (!cleanData) {
        throw new Error('Invalid base64 data')
      }

      const byteCharacters = atob(cleanData)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: mimeType })

      await writable.write(blob)
      await writable.close()

      return true
    } catch (err: unknown) {
      console.error('Save image failed:', err)
      return false
    }
  }

  // 批量保存
  const saveToFileSystem = async (
    images: Array<{ data: string; mimeType: string }>,
    prefix: string = 'image'
  ): Promise<number> => {
    if (!isEnabled.value) return 0

    let savedCount = 0
    const timestamp = Date.now()

    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      if (!image) continue

      const ext = image.mimeType.split('/')[1] || 'png'
      const filename = `${prefix}_${timestamp}_${i + 1}.${ext}`

      if (await saveImage(image.data, filename, image.mimeType)) {
        savedCount++
      }
    }

    if (savedCount > 0) {
      toast.success('已保存', `${savedCount} 张图像已保存到本地`)
    } else if (images.length > 0) {
      toast.warning('自动保存失败', '请重新选择目录并授予写入权限')
    }

    return savedCount
  }

  // 禁用自动保存
  const disable = () => {
    directoryHandle.value = null
    settingsStore.disableAutoSave()
  }

  return {
    isSupported: readonly(isSupported),
    isEnabled,
    directoryName: computed(() => directoryHandle.value?.name || null),
    selectDirectory,
    saveImage,
    saveToFileSystem,
    disable
  }
}
