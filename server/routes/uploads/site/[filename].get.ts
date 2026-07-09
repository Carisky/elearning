import { createError, getRouterParam, sendStream, setHeader } from 'h3'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { imageMimeByFilename, isSafeSiteImageFilename, siteImageStorageKey } from '../../../utils/siteImages'
import { resolveStoragePath } from '../../../utils/storage'

const existingFilePath = async (paths: string[]) => {
  for (const candidate of paths) {
    const fileStat = await stat(candidate).catch(() => null)
    if (fileStat?.isFile()) return candidate
  }
  return null
}

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')
  if (!filename || !isSafeSiteImageFilename(filename)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image filename' })
  }

  const storagePath = resolveStoragePath(siteImageStorageKey(filename))
  const legacyPublicPath = path.resolve(process.cwd(), 'public', 'uploads', 'site', filename)
  const filePath = await existingFilePath([storagePath, legacyPublicPath])
  if (!filePath) {
    throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  }

  setHeader(event, 'Content-Type', imageMimeByFilename(filename))
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

  return sendStream(event, createReadStream(filePath))
})
