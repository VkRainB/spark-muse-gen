/**
 * Sticker 图片二进制持久化层 —— IndexedDB 封装。
 *
 * - store 中只保留 StickerImageRef（id + 元信息）
 * - 完整 base64 data 写入这里
 * - 调用方在批次删除 / clearAll / 创建时触发的容量淘汰中负责清理对应 id
 */
import type { StickerImage, StickerImageRef } from '../../types/sticker'

const DB_NAME = 'StickerImageDB'
const STORE_NAME = 'images'

let dbPromise: Promise<IDBDatabase> | null = null

const openDB = (): Promise<IDBDatabase> => {
  if (!import.meta.client) {
    return Promise.reject(new Error('IndexedDB is only available in browser'))
  }
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
  return dbPromise
}

export function useStickerImageDB() {
  /** 批量写入：一个事务内 put 全部，事务失败整批回滚 */
  const putMany = async (images: StickerImage[]): Promise<void> => {
    if (images.length === 0) return
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      for (const img of images) {
        store.put(img)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }

  /** 按 id 取单张完整图（含 data） */
  const get = async (id: string): Promise<StickerImage | undefined> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(id)
      req.onsuccess = () => resolve(req.result as StickerImage | undefined)
      req.onerror = () => reject(req.error)
    })
  }

  /** 按 ref 数组批量取，保持原顺序；缺失项跳过 */
  const getMany = async (refs: StickerImageRef[]): Promise<StickerImage[]> => {
    if (refs.length === 0) return []
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const result: (StickerImage | undefined)[] = new Array(refs.length)
      let pending = refs.length

      refs.forEach((ref, idx) => {
        const req = store.get(ref.id)
        req.onsuccess = () => {
          result[idx] = req.result as StickerImage | undefined
          if (--pending === 0) {
            resolve(result.filter((x): x is StickerImage => !!x))
          }
        }
        req.onerror = () => reject(req.error)
      })
    })
  }

  /** 按 id 列表批量删除 */
  const removeMany = async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      for (const id of ids) {
        store.delete(id)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /** 清空全部图片（用于 clearAll） */
  const clearAll = async (): Promise<void> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  return {
    putMany,
    get,
    getMany,
    removeMany,
    clearAll,
  }
}
