import path from 'node:path'

const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'])

export const SITE_IMAGE_STORAGE_DIR = 'site'

export const safeImageExtension = (filename: string | undefined) => {
  const ext = filename ? path.extname(filename).toLowerCase() : ''
  if (!allowedImageExtensions.has(ext)) return ''
  return ext
}

export const isSafeSiteImageFilename = (filename: string) => {
  return filename === path.basename(filename) && /^site-[a-f0-9-]+\.[a-z0-9]+$/i.test(filename)
}

export const siteImageStorageKey = (filename: string) => path.join(SITE_IMAGE_STORAGE_DIR, filename)

export const imageMimeByFilename = (filename: string) => {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.avif') return 'image/avif'
  if (ext === '.svg') return 'image/svg+xml'
  return 'application/octet-stream'
}
