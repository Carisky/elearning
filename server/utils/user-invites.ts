import { createError } from 'h3'
import crypto from 'node:crypto'
import { prisma } from './db'
import { sendTemplateMail } from './mailer'

export type UserInviteStatus =
  | 'LINK_SENT'
  | 'DECLINED'
  | 'EXPIRED'
  | 'LINK_ACCEPTED'
  | 'REGISTERED'
  | 'ACCESS_GRANTED'

export type UserInviteListItemDto = {
  id: number
  email: string
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
  declinedAt: string | null
  registeredAt: string | null
  accessGrantedAt: string | null
  status: UserInviteStatus
  courses: Array<{ id: number; title: string }>
}

const normalizeEmail = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email' })
  }

  const email = value.trim().toLowerCase()
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email required' })
  }

  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!ok) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email' })
  }

  return email
}

const normalizeCourseIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    throw createError({ statusCode: 400, statusMessage: 'courseIds must be an array' })
  }

  const ids = value
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)

  const unique = Array.from(new Set(ids))
  if (!unique.length) {
    throw createError({ statusCode: 400, statusMessage: 'Select at least one course' })
  }

  return unique
}

const getInviteExpiryHours = (): number => {
  const raw = process.env.INVITE_EXPIRES_HOURS
  const parsed = raw ? Number(raw) : NaN
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return 24 * 7
}

const getAppUrl = (): string => process.env.APP_URL?.replace(/\/+$/, '') || 'http://localhost:3000'
const getAppName = (): string => process.env.APP_NAME?.trim() || 'E-Learning'

export const buildInviteLink = (token: string): string => `${getAppUrl()}/invite/${encodeURIComponent(token)}`

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const hmacSecret = (): string => process.env.JWT_SECRET ?? 'dev-secret'

export const hashInviteToken = (token: string): string =>
  crypto.createHmac('sha256', hmacSecret()).update(token).digest('hex')

export const createInviteToken = (): string => crypto.randomBytes(32).toString('base64url')

export const computeInviteStatus = (invite: {
  expiresAt: Date
  acceptedAt: Date | null
  declinedAt: Date | null
  registeredAt: Date | null
  accessGrantedAt: Date | null
}): UserInviteStatus => {
  if (invite.declinedAt) return 'DECLINED'
  if (invite.accessGrantedAt) return 'ACCESS_GRANTED'
  if (invite.registeredAt) return 'REGISTERED'
  if (invite.acceptedAt) return 'LINK_ACCEPTED'
  if (invite.expiresAt.getTime() <= Date.now()) return 'EXPIRED'
  return 'LINK_SENT'
}

const assertInviteUsable = (invite: { expiresAt: Date; declinedAt: Date | null; registeredUserId: number | null }) => {
  if (invite.declinedAt) {
    throw createError({ statusCode: 409, statusMessage: 'Invite declined' })
  }
  if (invite.expiresAt.getTime() <= Date.now()) {
    throw createError({ statusCode: 410, statusMessage: 'Invite link expired' })
  }
  if (invite.registeredUserId) {
    throw createError({ statusCode: 409, statusMessage: 'Invite already used' })
  }
}

const toIso = (value: Date | null): string | null => (value ? value.toISOString() : null)

export const createUserInvite = async (createdById: number, input: { email: unknown; courseIds: unknown }) => {
  const email = normalizeEmail(input.email)
  const courseIds = normalizeCourseIds(input.courseIds)
  const now = new Date()

  const existingUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
    select: { id: true },
  })
  if (existingUser) {
    throw createError({ statusCode: 409, statusMessage: 'User already exists' })
  }

  const existingInvite = await prisma.userInvite.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
      declinedAt: null,
      registeredUserId: null,
      expiresAt: { gt: now },
    },
    select: { id: true },
  })
  if (existingInvite) {
    throw createError({ statusCode: 409, statusMessage: 'Active invite already exists' })
  }

  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true },
  })
  const missing = courseIds.filter((id) => !courses.some((c) => c.id === id))
  if (missing.length) {
    throw createError({ statusCode: 404, statusMessage: 'Some courses not found' })
  }

  const token = createInviteToken()
  const tokenHash = hashInviteToken(token)
  const expiresAt = new Date(now.getTime() + getInviteExpiryHours() * 60 * 60 * 1000)

  const invite = await prisma.userInvite.create({
    data: {
      email,
      tokenHash,
      expiresAt,
      createdById,
      courses: {
        create: courseIds.map((courseId) => ({ courseId })),
      },
    },
    select: {
      id: true,
      email: true,
      expiresAt: true,
    },
  })

  const acceptUrl = buildInviteLink(token)
  const coursesHtml =
    `<ul style="margin:0;padding-left:18px;">` +
    courses.map((c) => `<li style="margin:0 0 6px;">${escapeHtml(c.title)}</li>`).join('') +
    `</ul>`

  try {
    const subject = 'Приглашение на курсы'
    const sent = await sendTemplateMail({
      to: email,
      subject,
      template: 'user-invite',
      vars: {
        subject,
        appName: getAppName(),
        email,
        acceptUrl,
        expiresAt: expiresAt.toISOString(),
        coursesHtml,
      },
      rawKeys: ['coursesHtml'],
    })

    if (!sent.skipped) {
      await prisma.userInvite.update({
        where: { id: invite.id },
        data: {
          mailMessageId: sent.messageId ?? null,
          mailLastError: null,
        },
      })
    }
  } catch (error: unknown) {
    await prisma.userInvite.delete({ where: { id: invite.id } }).catch(() => null)
    const message = error instanceof Error ? error.message : 'Failed to send email'
    throw createError({ statusCode: 502, statusMessage: message })
  }

  return {
    id: invite.id,
    email: invite.email,
    expiresAt: invite.expiresAt.toISOString(),
    inviteLink: acceptUrl,
  }
}

export const listUserInvitesForAdmin = async (): Promise<UserInviteListItemDto[]> => {
  const invites = await prisma.userInvite.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      courses: {
        include: {
          course: { select: { id: true, title: true } },
        },
      },
    },
  })

  return invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    createdAt: invite.createdAt.toISOString(),
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: toIso(invite.acceptedAt),
    declinedAt: toIso(invite.declinedAt),
    registeredAt: toIso(invite.registeredAt),
    accessGrantedAt: toIso(invite.accessGrantedAt),
    status: computeInviteStatus(invite),
    courses: invite.courses.map((c) => c.course),
  }))
}

export const previewInvite = async (token: string) => {
  const tokenHash = hashInviteToken(token)
  const invite = await prisma.userInvite.findUnique({
    where: { tokenHash },
    include: { courses: { include: { course: { select: { id: true, title: true } } } } },
  })
  if (!invite) {
    throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  }

  return {
    email: invite.email,
    expiresAt: invite.expiresAt.toISOString(),
    status: computeInviteStatus(invite),
    courses: invite.courses.map((c) => c.course),
  }
}

export const acceptInvite = async (token: string) => {
  const tokenHash = hashInviteToken(token)
  const invite = await prisma.userInvite.findUnique({
    where: { tokenHash },
    select: { id: true, expiresAt: true, declinedAt: true, registeredUserId: true, acceptedAt: true },
  })
  if (!invite) {
    throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  }

  assertInviteUsable(invite)

  if (!invite.acceptedAt) {
    await prisma.userInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    })
  }

  return { ok: true }
}

export const declineInvite = async (token: string) => {
  const tokenHash = hashInviteToken(token)
  const invite = await prisma.userInvite.findUnique({
    where: { tokenHash },
    select: { id: true, expiresAt: true, declinedAt: true, registeredUserId: true },
  })
  if (!invite) {
    throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  }

  assertInviteUsable(invite)

  await prisma.userInvite.update({
    where: { id: invite.id },
    data: { declinedAt: new Date() },
  })

  return { ok: true }
}

export const redeemInviteForUser = async (tx: typeof prisma, token: string, user: { id: number; email: string }) => {
  const tokenHash = hashInviteToken(token)
  const invite = await tx.userInvite.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      email: true,
      expiresAt: true,
      declinedAt: true,
      acceptedAt: true,
      registeredUserId: true,
      courses: { select: { courseId: true } },
    },
  })
  if (!invite) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid invite token' })
  }

  if (invite.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
    throw createError({ statusCode: 400, statusMessage: 'Invite email mismatch' })
  }

  assertInviteUsable(invite)

  const now = new Date()
  const acceptedAt = invite.acceptedAt ?? now
  const courseIds = invite.courses.map((c) => c.courseId)

  await tx.userInvite.update({
    where: { id: invite.id },
    data: {
      acceptedAt,
      registeredAt: now,
      registeredUserId: user.id,
    },
  })

  if (courseIds.length) {
    await tx.enrollment.createMany({
      data: courseIds.map((courseId) => ({
        userId: user.id,
        courseId,
        source: 'INVITE',
      })),
      skipDuplicates: true,
    })
  }

  await tx.userInvite.update({
    where: { id: invite.id },
    data: { accessGrantedAt: now },
  })
}
