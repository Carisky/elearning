import { createError } from 'h3'

export type EnrollmentAccessDto = {
  activatedAt: string
  expiresAt: string | null
  isUnlimited: boolean
  isExpired: boolean
  isActive: boolean
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export const addDays = (base: Date, days: number): Date => {
  return new Date(base.getTime() + days * MS_PER_DAY)
}

export const isEnrollmentExpired = (expiresAt: Date | null, now = new Date()): boolean => {
  return !!expiresAt && expiresAt.getTime() <= now.getTime()
}

export const toEnrollmentAccessDto = (
  enrollment: { activatedAt: Date; expiresAt: Date | null },
  now = new Date(),
): EnrollmentAccessDto => {
  const expiresAt = enrollment.expiresAt ?? null
  const isUnlimited = expiresAt === null
  const isExpired = !isUnlimited && expiresAt.getTime() <= now.getTime()
  return {
    activatedAt: enrollment.activatedAt.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    isUnlimited,
    isExpired,
    isActive: !isExpired,
  }
}

export const computeInitialEnrollmentExpiresAt = (
  now: Date,
  course: { accessDurationDays: number | null },
): Date | null => {
  const days = course.accessDurationDays
  if (days == null) return null
  if (!Number.isFinite(days) || days <= 0) return null
  return addDays(now, Math.floor(days))
}

export const computeExtendedEnrollmentExpiresAt = (
  now: Date,
  enrollment: { expiresAt: Date | null },
  addedDays: number,
): Date | null => {
  if (!Number.isFinite(addedDays) || addedDays <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid renewal duration' })
  }

  if (enrollment.expiresAt === null) {
    // Unlimited access cannot be meaningfully extended.
    return null
  }

  const base = enrollment.expiresAt && enrollment.expiresAt.getTime() > now.getTime()
    ? enrollment.expiresAt
    : now

  return addDays(base, Math.floor(addedDays))
}

export const assertEnrollmentAccessActive = (enrollment: { expiresAt: Date | null }, now = new Date()) => {
  if (isEnrollmentExpired(enrollment.expiresAt, now)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Dostęp do kursu wygasł. Przedłuż dostęp, aby kontynuować.',
    })
  }
}

