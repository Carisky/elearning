import { createError, readMultipartFormData } from 'h3'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { requireAdmin } from '../../utils/auth'

const MAX_BYTES = 5 * 1024 * 1024

const safeExt = (filename: string | undefined) => {
  const ext = filename ? path.extname(filename).toLowerCase() : ''
  if (ext && /^[a-z0-9.]+$/.test(ext)) return ext
  return ''
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Multipart form data is required' })
  }

  const file = parts.find((part) => part.name === 'file' && part.filename)
  if (!file?.data || !file.filename) {
    throw createError({ statusCode: 400, statusMessage: 'File is required' })
  }

  const mime = (file.type ?? '').toString()
  if (!mime.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'Only image uploads are allowed' })
  }

  const bytes = Buffer.isBuffer(file.data) ? file.data.byteLength : (file.data as any)?.length ?? 0
  if (!bytes || bytes > MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: `Image is too large (max ${MAX_BYTES} bytes)` })
  }

  const ext = safeExt(file.filename) || '.png'
  const filename = `site-${crypto.randomUUID()}${ext}`
  const relativeDir = path.join('uploads', 'site')
  const absoluteDir = path.join(process.cwd(), 'public', relativeDir)
  await mkdir(absoluteDir, { recursive: true })

  await writeFile(path.join(absoluteDir, filename), file.data)

  return { url: `/${relativeDir.replaceAll(path.sep, '/')}/${filename}` }
})
