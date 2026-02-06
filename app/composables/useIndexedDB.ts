interface UseIndexedDBOptions {
  dbName: string
  storeName: string
  version?: number
  keyPath?: string
}

export function useIndexedDB<T extends { id: string }>(options: UseIndexedDBOptions) {
  const { dbName, storeName, version = 1, keyPath = 'id' } = options

  let db: IDBDatabase | null = null

  const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (!import.meta.client) {
        reject(new Error('IndexedDB is only available in browser'))
        return
      }

      if (db) {
        resolve(db)
        return
      }

      const request = indexedDB.open(dbName, version)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        db = request.result
        resolve(db)
      }

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath })
        }
      }
    })
  }

  const getAll = async (): Promise<T[]> => {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  const get = async (id: string): Promise<T | undefined> => {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  const add = async (item: T): Promise<void> => {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  const put = async (item: T): Promise<void> => {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  const remove = async (id: string): Promise<void> => {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  const clear = async (): Promise<void> => {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  return {
    initDB,
    getAll,
    get,
    add,
    put,
    remove,
    clear
  }
}
