import path from 'node:path'
import { mkdir } from 'node:fs/promises'

export const getStorageRoot = () => {
  const raw = (process.env.STORAGE ?? './storage').toString().trim() || './storage'
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw)
}

export const ensureStorageRoot = async () => {
  const root = getStorageRoot()
  await mkdir(root, { recursive: true })
  return root
}

export const resolveStoragePath = (storageKey: string) => {
  const root = getStorageRoot()
  const abs = path.resolve(root, storageKey)
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep
  if (abs !== root && !abs.startsWith(rootWithSep)) {
    throw new Error('Invalid storage key')
  }
  return abs
}

