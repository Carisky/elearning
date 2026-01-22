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

  const courseIdRaw = parts.find((p) => p.name === 'courseId')?.data?.toString?.('utf8') ?? ''
  const courseId = Number(courseIdRaw)
  if (!Number.isFinite(courseId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid courseId' })
  }

  const file = parts.find((p) => p.name === 'file' && p.filename)
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
  const filename = `preview-${crypto.randomUUID()}${ext}`
  const relativeDir = path.join('uploads', 'courses', String(courseId))
  const absoluteDir = path.join(process.cwd(), 'public', relativeDir)
  await mkdir(absoluteDir, { recursive: true })

  const absolutePath = path.join(absoluteDir, filename)
  await writeFile(absolutePath, file.data)

  return { url: `/${relativeDir.replaceAll(path.sep, '/')}/${filename}` }
})

