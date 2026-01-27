import { createError, getQuery, getHeader, setHeader, setResponseStatus, sendStream } from 'h3'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '../../utils/db'
import { requireAuth } from '../../utils/auth'
import { resolveStoragePath } from '../../utils/storage'

const guessMimeByExt = (ext: string): string => {
  const e = ext.toLowerCase()
  if (e === '.pdf') return 'application/pdf'
  if (e === '.mp4') return 'video/mp4'
  if (e === '.pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (e === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (e === '.doc') return 'application/msword'
  return 'application/octet-stream'
}

const contentDispositionHeader = (disposition: 'inline' | 'attachment', filename: string) => {
  const safe = filename.replaceAll('"', '').replaceAll('\r', '').replaceAll('\n', '').trim() || 'file'
  const encoded = encodeURIComponent(safe)
  return `${disposition}; filename="${safe}"; filename*=UTF-8''${encoded}`
}

const parseRange = (rangeHeader: string, size: number): { start: number; end: number } | null => {
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/i)
  if (!match) return null
  const startRaw = match[1]
  const endRaw = match[2]

  let start: number
  let end: number

  if (startRaw) {
    start = Number(startRaw)
    if (!Number.isFinite(start) || start < 0) return null
    end = endRaw ? Number(endRaw) : size - 1
    if (!Number.isFinite(end) || end < start) return null
  } else if (endRaw) {
    const suffix = Number(endRaw)
    if (!Number.isFinite(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    return null
  }

  if (start >= size) return null
  end = Math.min(end, size - 1)
  return { start, end }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = Number(event.context.params?.id)
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const material = await prisma.material.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      type: true,
      url: true,
      storageKey: true,
      originalFilename: true,
      mimeType: true,
    },
  })

  if (!material) throw createError({ statusCode: 404, statusMessage: 'Material not found' })
  if (!material.storageKey) throw createError({ statusCode: 404, statusMessage: 'Material file not found' })

  if (user.role !== 'ADMIN') {
    const access = await prisma.courseMaterial.findFirst({
      where: {
        materialId: id,
        course: { enrollments: { some: { userId: user.id } } },
      },
      select: { courseId: true },
    })
    if (!access) throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  const absPath = resolveStoragePath(material.storageKey)
  const st = await stat(absPath).catch(() => null)
  if (!st?.isFile()) throw createError({ statusCode: 404, statusMessage: 'File missing on server' })

  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'Pragma', 'no-cache')

  const ext = path.extname(material.storageKey)
  const contentType = material.mimeType?.trim() || guessMimeByExt(ext)
  setHeader(event, 'Content-Type', contentType)

  const query = getQuery(event)
  const forceDownload = query.download === '1' || query.download === 'true'

  const filenameBase = (material.originalFilename?.trim() || '').replaceAll(path.sep, ' ')
  const fallbackFilename = `${material.title || 'Material'}${ext || ''}`
  const filename = filenameBase || fallbackFilename

  const disposition: 'inline' | 'attachment' =
    forceDownload ? 'attachment' : material.type === 'VIDEO' ? 'inline' : 'attachment'
  setHeader(event, 'Content-Disposition', contentDispositionHeader(disposition, filename))

  setHeader(event, 'Accept-Ranges', 'bytes')

  const size = st.size
  const rangeHeader = getHeader(event, 'range')
  const range = typeof rangeHeader === 'string' ? parseRange(rangeHeader, size) : null

  if (range) {
    const { start, end } = range
    setResponseStatus(event, 206)
    setHeader(event, 'Content-Range', `bytes ${start}-${end}/${size}`)
    setHeader(event, 'Content-Length', String(end - start + 1))
    return sendStream(event, createReadStream(absPath, { start, end }))
  }

  setHeader(event, 'Content-Length', String(size))
  return sendStream(event, createReadStream(absPath))
})

