import { createError } from 'h3'
import { createWriteStream } from 'node:fs'
import { rename, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import Busboy from 'busboy'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'
import { ensureStorageRoot } from '../../utils/storage'

const MAX_BYTES = 2 * 1024 * 1024 * 1024 // 2GB

const clampString = (value: unknown, maxLen: number) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed
}

const safeExt = (filename: string | undefined) => {
  const ext = filename ? path.extname(filename).toLowerCase() : ''
  if (!ext) return ''
  if (!/^\.[a-z0-9]+$/.test(ext)) return ''
  return ext
}

const titleFromFilename = (filename: string) => {
  const base = path.basename(filename, path.extname(filename)).trim()
  return base || 'Material'
}

const normalizeDurationSec = (value: string | undefined): number | null => {
  if (!value) return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  const rounded = Math.round(num)
  if (rounded <= 0) return null
  return rounded
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const req = event.node.req
  const contentType = req.headers['content-type'] ?? ''
  if (typeof contentType !== 'string' || !contentType.toLowerCase().includes('multipart/form-data')) {
    throw createError({ statusCode: 400, statusMessage: 'Multipart form data is required' })
  }

  const storageRoot = await ensureStorageRoot()
  const materialsDir = path.join(storageRoot, 'materials')
  await mkdir(materialsDir, { recursive: true })

  const fields: Record<string, string> = {}
  let uploaded: {
    tmpPath: string
    finalKey: string
    finalPath: string
    originalFilename: string
    mimeType: string
    sizeBytes: number
    ext: string
  } | null = null
  let fileWriteDone: Promise<void> | null = null

  const busboy = Busboy({
    headers: req.headers,
    limits: { files: 1, fileSize: MAX_BYTES, fields: 20, fieldSize: 2000 },
  })

  const uploadPromise = new Promise<void>((resolve, reject) => {
    busboy.on('field', (name, value) => {
      fields[name] = value
    })

    busboy.on('file', (name, file, info) => {
      if (name !== 'file') {
        file.resume()
        return
      }

      const originalFilename = (info.filename ?? '').toString()
      const ext = safeExt(originalFilename)
      const allowed = new Set(['.pdf', '.mp4', '.pptx', '.docx', '.doc'])
      if (!ext || !allowed.has(ext)) {
        file.resume()
        reject(createError({ statusCode: 400, statusMessage: 'Unsupported file type (allowed: pdf, mp4, pptx, docx, doc)' }))
        return
      }

      const uuid = crypto.randomUUID()
      const finalName = `${uuid}${ext}`
      const finalKey = path.join('materials', finalName)
      const finalPath = path.join(materialsDir, finalName)

      const tmpPath = `${finalPath}.uploading`
      const out = createWriteStream(tmpPath)
      let sizeBytes = 0
      fileWriteDone = new Promise<void>((resolveWrite, rejectWrite) => {
        out.on('close', resolveWrite)
        out.on('error', rejectWrite)
      })

      file.on('data', (chunk) => {
        sizeBytes += Buffer.byteLength(chunk)
      })

      file.on('limit', () => {
        reject(createError({ statusCode: 400, statusMessage: `File is too large (max ${MAX_BYTES} bytes)` }))
      })

      file.on('error', reject)
      out.on('error', reject)

      file.pipe(out)

      file.on('end', () => {
        uploaded = {
          tmpPath,
          finalKey: finalKey.replaceAll(path.sep, '/'),
          finalPath,
          originalFilename,
          mimeType: (info.mimeType ?? '').toString(),
          sizeBytes,
          ext,
        }
      })
    })

    busboy.on('error', reject)
    busboy.on('finish', async () => {
      try {
        if (fileWriteDone) await fileWriteDone
        resolve()
      } catch (e) {
        reject(e)
      }
    })
    req.pipe(busboy)
  })

  try {
    await uploadPromise
  } catch (error) {
    if (uploaded?.tmpPath) await unlink(uploaded.tmpPath).catch(() => {})
    throw error
  }

  if (!uploaded) {
    throw createError({ statusCode: 400, statusMessage: 'File is required' })
  }

  if (!uploaded.sizeBytes) {
    await unlink(uploaded.tmpPath).catch(() => {})
    throw createError({ statusCode: 400, statusMessage: 'Uploaded file is empty' })
  }

  await rename(uploaded.tmpPath, uploaded.finalPath)

  const title = clampString(fields.title, 160) || titleFromFilename(uploaded.originalFilename)
  const description = clampString(fields.description, 2000) || null
  const thumbnailUrl = clampString(fields.thumbnailUrl, 2048) || null
  const durationSec = normalizeDurationSec(fields.durationSec)

  const type =
    uploaded.ext === '.mp4'
      ? 'VIDEO'
      : uploaded.ext === '.pdf'
        ? 'PDF'
        : 'FILE'

  const created = await prisma.material.create({
    data: {
      title,
      type,
      url: 'pending',
      description,
      thumbnailUrl,
      durationSec: type === 'VIDEO' ? durationSec : null,
      storageKey: uploaded.finalKey,
      originalFilename: clampString(uploaded.originalFilename, 255) || null,
      mimeType: clampString(uploaded.mimeType, 255) || null,
      sizeBytes: uploaded.sizeBytes,
    },
    select: {
      id: true,
      title: true,
      type: true,
      url: true,
      description: true,
      thumbnailUrl: true,
      durationSec: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const updated = await prisma.material.update({
    where: { id: created.id },
    data: { url: `/api/material-files/${created.id}` },
    select: {
      id: true,
      title: true,
      type: true,
      url: true,
      description: true,
      thumbnailUrl: true,
      durationSec: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return updated
})
