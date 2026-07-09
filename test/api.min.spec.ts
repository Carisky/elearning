import { describe, expect, it } from 'vitest'
import { fetch } from '@nuxt/test-utils'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '../server/utils/db'

type CookieJar = { cookie?: string }

const randomEmail = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}@test.local`

const mergeSetCookieIntoJar = (jar: CookieJar, setCookie: string | null) => {
  if (!setCookie) return
  const cookiePair = setCookie.split(';')[0]?.trim()
  if (!cookiePair) return

  const name = cookiePair.split('=')[0]?.trim()
  if (!name) return

  const existing = jar.cookie
    ? jar.cookie.split(/;\s*/).filter(Boolean)
    : []

  jar.cookie = [...existing.filter((c) => !c.startsWith(`${name}=`)), cookiePair].join('; ')
}

const apiJson = async <T>(
  jar: CookieJar,
  path: string,
  options: { method?: string; body?: any } = {}
) => {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (jar.cookie) headers.cookie = jar.cookie

  const res = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  mergeSetCookieIntoJar(jar, res.headers.get('set-cookie'))

  const text = await res.text()
  const data = (text ? JSON.parse(text) : null) as T

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${path}: ${text}`)
  }

  return data
}

const postMultipart = async <T>(jar: CookieJar, requestPath: string, body: FormData) => {
  const headers: Record<string, string> = {}
  if (jar.cookie) headers.cookie = jar.cookie

  const res = await fetch(requestPath, {
    method: 'POST',
    headers,
    body,
  })

  mergeSetCookieIntoJar(jar, res.headers.get('set-cookie'))

  const text = await res.text()
  const data = (text ? JSON.parse(text) : null) as T

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${requestPath}: ${text}`)
  }

  return data
}

describe('Minimal API flows', () => {
  it('auth: register sets cookie and /api/me returns user', async () => {
    const jar: CookieJar = {}
    const email = randomEmail('user')

    const user = await apiJson<{ id: number; email: string; role: string }>(jar, '/api/register', {
      method: 'POST',
      body: { email, password: 'pass12345', name: 'Test User' },
    })

    expect(user.email).toBe(email)
    expect(user.role).toBe('USER')
    expect(jar.cookie).toContain('auth=')

    const me = await apiJson<{ id: number; email: string; role: string }>(jar, '/api/me')
    expect(me.email).toBe(email)
    expect(me.id).toBe(user.id)
  })

  it('admin: can create category and course', async () => {
    const jar: CookieJar = {}
    const email = randomEmail('admin')

    const admin = await apiJson<{ id: number; email: string; role: string }>(jar, '/api/register', {
      method: 'POST',
      body: { email, password: 'pass12345', role: 'ADMIN' },
    })
    expect(admin.role).toBe('ADMIN')

    const category = await apiJson<{ id: number; title: string; slug: string }>(jar, '/api/categories', {
      method: 'POST',
      body: { title: `Cat ${Date.now()}` },
    })
    expect(category.id).toBeTypeOf('number')
    expect(category.slug).toMatch(/[a-z0-9-]+/)

    const subcategory = await apiJson<{ id: number; title: string }>(jar, '/api/subcategories', {
      method: 'POST',
      body: { categoryId: category.id, title: `Subcat ${Date.now()}` },
    })

    const serviceForm = await apiJson<{ id: number; title: string }>(jar, '/api/service-forms', {
      method: 'POST',
      body: { title: `Service ${Date.now()}` },
    })

    const course = await apiJson<{ id: number; title: string; status: string; priceCents: number; currency: string }>(
      jar,
      '/api/courses',
      {
        method: 'POST',
        body: {
          title: `Course ${Date.now()}`,
          categoryId: category.id,
          subcategoryId: subcategory.id,
          serviceFormId: serviceForm.id,
          shortDescription: 'Short description',
          hoursTotal: 8,
          price: 10,
          currency: 'PLN',
          status: 'PUBLISHED',
          isFeatured: false,
          previewImageUrl: null,
          descriptionJson: null,
          programJson: null,
          instructorJson: null,
        },
      }
    )

    expect(course.id).toBeTypeOf('number')
    expect(course.currency).toBe('PLN')
    expect(course.status).toBe('PUBLISHED')
    expect(course.priceCents).toBe(1000)
  })

  it('courses: publishing requires store metadata', async () => {
    const jar: CookieJar = {}
    const email = randomEmail('admin_publish_rules')

    await apiJson(jar, '/api/register', {
      method: 'POST',
      body: { email, password: 'pass12345', role: 'ADMIN' },
    })

    const category = await apiJson<{ id: number }>(jar, '/api/categories', {
      method: 'POST',
      body: { title: `Cat ${Date.now()}` },
    })

    let failed = false
    try {
      await apiJson(jar, '/api/courses', {
        method: 'POST',
        body: { title: `Course ${Date.now()}`, categoryId: category.id, status: 'PUBLISHED' },
      })
    } catch (e: any) {
      failed = true
      expect(String(e?.message ?? e)).toContain('HTTP 400')
    }
    expect(failed).toBe(true)
  })

  it('courses: subcategory must belong to category', async () => {
    const jar: CookieJar = {}
    const email = randomEmail('admin_subcat_rules')

    await apiJson(jar, '/api/register', {
      method: 'POST',
      body: { email, password: 'pass12345', role: 'ADMIN' },
    })

    const categoryA = await apiJson<{ id: number }>(jar, '/api/categories', {
      method: 'POST',
      body: { title: `Cat A ${Date.now()}` },
    })
    const categoryB = await apiJson<{ id: number }>(jar, '/api/categories', {
      method: 'POST',
      body: { title: `Cat B ${Date.now()}` },
    })

    const subcategoryA = await apiJson<{ id: number }>(jar, '/api/subcategories', {
      method: 'POST',
      body: { categoryId: categoryA.id, title: `Subcat ${Date.now()}` },
    })

    const serviceForm = await apiJson<{ id: number }>(jar, '/api/service-forms', {
      method: 'POST',
      body: { title: `Service ${Date.now()}` },
    })

    let failed = false
    try {
      await apiJson(jar, '/api/courses', {
        method: 'POST',
        body: {
          title: `Course ${Date.now()}`,
          categoryId: categoryB.id,
          subcategoryId: subcategoryA.id,
          serviceFormId: serviceForm.id,
          shortDescription: 'Short description',
          hoursTotal: 1,
          status: 'PUBLISHED',
        },
      })
    } catch (e: any) {
      failed = true
      expect(String(e?.message ?? e)).toContain('HTTP 400')
    }
    expect(failed).toBe(true)
  })

  it('purchase: user adds course to cart and checkout creates enrollment', async () => {
    // admin creates a published course
    const adminJar: CookieJar = {}
    const adminEmail = randomEmail('admin2')
    await apiJson(adminJar, '/api/register', {
      method: 'POST',
      body: { email: adminEmail, password: 'pass12345', role: 'ADMIN' },
    })

    const category = await apiJson<{ id: number }>(adminJar, '/api/categories', {
      method: 'POST',
      body: { title: `Cat ${Date.now()}` },
    })

    const subcategory = await apiJson<{ id: number }>(adminJar, '/api/subcategories', {
      method: 'POST',
      body: { categoryId: category.id, title: `Subcat ${Date.now()}` },
    })

    const serviceForm = await apiJson<{ id: number }>(adminJar, '/api/service-forms', {
      method: 'POST',
      body: { title: `Service ${Date.now()}` },
    })

    const course = await apiJson<{ id: number; title: string }>(adminJar, '/api/courses', {
      method: 'POST',
      body: {
        title: `Course ${Date.now()}`,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        serviceFormId: serviceForm.id,
        shortDescription: 'Short description',
        hoursTotal: 12,
        price: 49.99,
        currency: 'PLN',
        status: 'PUBLISHED',
      },
    })

    // user buys it
    const userJar: CookieJar = {}
    const userEmail = randomEmail('buyer')
    await apiJson(userJar, '/api/register', {
      method: 'POST',
      body: { email: userEmail, password: 'pass12345' },
    })

    await apiJson(userJar, '/api/cart/items', {
      method: 'POST',
      body: { courseId: course.id },
    })

    const checkout = await apiJson<{ ok: true; orderId: number }>(userJar, '/api/checkout', {
      method: 'POST',
      body: { mode: 'cart', acceptedTerms: true, customerNote: 'Proszę o fakturę dla firmy TSL.' },
    })
    expect(checkout.ok).toBe(true)
    expect(checkout.orderId).toBeTypeOf('number')

    const order = await prisma.order.findUnique({
      where: { id: checkout.orderId },
      select: { customerNote: true },
    })
    expect(order?.customerNote).toBe('Proszę o fakturę dla firmy TSL.')

    const myCourses = await apiJson<Array<{ course: { id: number; title: string } }>>(userJar, '/api/my-courses')
    expect(myCourses.some((e) => e.course.id === course.id)).toBe(true)
  })

  it('admin: stats endpoint returns dashboard counters', async () => {
    const adminJar: CookieJar = {}
    const adminEmail = randomEmail('admin_stats')
    await apiJson(adminJar, '/api/register', {
      method: 'POST',
      body: { email: adminEmail, password: 'pass12345', role: 'ADMIN' },
    })

    const stats = await apiJson<{
      users: number
      courses: number
      orders: number
      enrollments: number
      revenueCents: number
      pendingReviews: number
      activeInvites: number
    }>(adminJar, '/api/admin/stats')

    expect(stats.users).toBeGreaterThanOrEqual(1)
    expect(stats.courses).toBeGreaterThanOrEqual(0)
    expect(stats.orders).toBeGreaterThanOrEqual(0)
    expect(stats.enrollments).toBeGreaterThanOrEqual(0)
    expect(stats.revenueCents).toBeGreaterThanOrEqual(0)
    expect(stats.pendingReviews).toBeGreaterThanOrEqual(0)
    expect(stats.activeInvites).toBeGreaterThanOrEqual(0)
  })

  it('admin: uploaded site images are served from storage-backed public URLs', async () => {
    const adminJar: CookieJar = {}
    const adminEmail = randomEmail('admin_site_image')
    await apiJson(adminJar, '/api/register', {
      method: 'POST',
      body: { email: adminEmail, password: 'pass12345', role: 'ADMIN' },
    })

    const imageBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ])
    const body = new FormData()
    body.append('file', new Blob([imageBytes], { type: 'image/png' }), 'banner.png')

    const result = await postMultipart<{ url: string }>(adminJar, '/api/uploads/site-image', body)

    expect(result.url).toMatch(/^\/uploads\/site\/site-[a-f0-9-]+\.png$/)

    const filename = path.basename(result.url)
    const storageRoot = process.env.STORAGE
    expect(storageRoot).toBeTruthy()

    const uploaded = await stat(path.join(storageRoot!, 'site', filename)).catch(() => null)
    expect(uploaded?.isFile()).toBe(true)

    const publicResponse = await fetch(result.url)
    expect(publicResponse.status).toBe(200)
    expect(publicResponse.headers.get('content-type')).toContain('image/png')
    expect((await publicResponse.arrayBuffer()).byteLength).toBe(imageBytes.byteLength)
  })

  it('admin: users endpoint returns admin-visible fields without passwords', async () => {
    const adminJar: CookieJar = {}
    const adminEmail = randomEmail('admin_users')
    await apiJson(adminJar, '/api/register', {
      method: 'POST',
      body: { email: adminEmail, password: 'pass12345', role: 'ADMIN' },
    })

    const regularJar: CookieJar = {}
    const regularEmail = randomEmail('listed_user')
    await apiJson(regularJar, '/api/register', {
      method: 'POST',
      body: { email: regularEmail, password: 'pass12345', name: 'Listed User' },
    })

    const users = await apiJson<Array<{
      id: number
      email: string
      name: string | null
      role: string
      createdAt: string
      ordersCount: number
      enrollmentsCount: number
      password?: string
    }>>(adminJar, '/api/users')

    const row = users.find((user) => user.email === regularEmail)
    expect(row).toBeTruthy()
    expect(row?.createdAt).toBeTypeOf('string')
    expect(row?.ordersCount).toBe(0)
    expect(row?.enrollmentsCount).toBe(0)
    expect(row).not.toHaveProperty('password')
  })

  it('access: timed course expires and user can renew', async () => {
    // admin creates a published course with access duration and a renewal option
    const adminJar: CookieJar = {}
    const adminEmail = randomEmail('admin_access')
    await apiJson(adminJar, '/api/register', {
      method: 'POST',
      body: { email: adminEmail, password: 'pass12345', role: 'ADMIN' },
    })

    const category = await apiJson<{ id: number }>(adminJar, '/api/categories', {
      method: 'POST',
      body: { title: `Cat ${Date.now()}` },
    })

    const subcategory = await apiJson<{ id: number }>(adminJar, '/api/subcategories', {
      method: 'POST',
      body: { categoryId: category.id, title: `Subcat ${Date.now()}` },
    })

    const serviceForm = await apiJson<{ id: number }>(adminJar, '/api/service-forms', {
      method: 'POST',
      body: { title: `Service ${Date.now()}` },
    })

    const course = await apiJson<{ id: number; slug: string }>(adminJar, '/api/courses', {
      method: 'POST',
      body: {
        title: `Course ${Date.now()}`,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        serviceFormId: serviceForm.id,
        shortDescription: 'Short description',
        hoursTotal: 6,
        price: 10,
        currency: 'PLN',
        status: 'PUBLISHED',
        accessDurationDays: 14,
      },
    })

    const option = await apiJson<{ id: number; durationDays: number; priceCents: number }>(
      adminJar,
      `/api/courses/${course.id}/renewal-options`,
      {
        method: 'POST',
        body: { title: '7 dni', durationDays: 7, price: 60, isActive: true, sortOrder: 0 },
      }
    )

    // user buys it
    const userJar: CookieJar = {}
    const userEmail = randomEmail('buyer_access')
    const user = await apiJson<{ id: number }>(userJar, '/api/register', {
      method: 'POST',
      body: { email: userEmail, password: 'pass12345' },
    })

    await apiJson(userJar, '/api/cart/items', {
      method: 'POST',
      body: { courseId: course.id },
    })

    await apiJson(userJar, '/api/checkout', {
      method: 'POST',
      body: { mode: 'cart', acceptedTerms: true },
    })

    const myCourses = await apiJson<Array<{ activatedAt: string; expiresAt: string | null; course: { id: number } }>>(
      userJar,
      '/api/my-courses'
    )
    const enrollment = myCourses.find((e) => e.course.id === course.id)
    expect(enrollment).toBeTruthy()
    expect(enrollment!.expiresAt).toBeTruthy()

    const activatedAtMs = new Date(enrollment!.activatedAt).getTime()
    const expiresAtMs = new Date(enrollment!.expiresAt!).getTime()
    expect(expiresAtMs).toBeGreaterThan(activatedAtMs)

    // simulate expiry
    await prisma.enrollment.update({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const locked = await apiJson<any>(userJar, `/api/my-courses/${course.slug}`)
    expect(locked.locked).toBe(true)
    expect(locked.lockedReason).toBe('EXPIRED')
    expect(locked.access?.isExpired).toBe(true)

    const renewed = await apiJson<{ ok: true; orderId: number; access: { isExpired: boolean; expiresAt: string | null } }>(
      userJar,
      `/api/my-courses/${course.slug}/renew`,
      { method: 'POST', body: { optionId: option.id } }
    )
    expect(renewed.ok).toBe(true)
    expect(renewed.access.isExpired).toBe(false)
    expect(renewed.access.expiresAt).toBeTruthy()

    const order = await prisma.order.findUnique({
      where: { id: renewed.orderId },
      select: { id: true, items: { select: { type: true, courseRenewalOptionId: true } } },
    })
    expect(order?.items?.[0]?.type).toBe('COURSE_RENEWAL')
    expect(order?.items?.[0]?.courseRenewalOptionId).toBe(option.id)

    const unlocked = await apiJson<any>(userJar, `/api/my-courses/${course.slug}`)
    expect(unlocked.locked).toBeUndefined()
    expect(unlocked.access?.isExpired).toBe(false)
  })

  it('invites: admin sends invite and user registers to get access', async () => {
    const adminJar: CookieJar = {}
    const adminEmail = randomEmail('admin_invites')
    await apiJson(adminJar, '/api/register', {
      method: 'POST',
      body: { email: adminEmail, password: 'pass12345', role: 'ADMIN' },
    })

    const category = await apiJson<{ id: number }>(adminJar, '/api/categories', {
      method: 'POST',
      body: { title: `Cat ${Date.now()}` },
    })

    const subcategory = await apiJson<{ id: number }>(adminJar, '/api/subcategories', {
      method: 'POST',
      body: { categoryId: category.id, title: `Subcat ${Date.now()}` },
    })

    const serviceForm = await apiJson<{ id: number }>(adminJar, '/api/service-forms', {
      method: 'POST',
      body: { title: `Service ${Date.now()}` },
    })

    const course = await apiJson<{ id: number; title: string }>(adminJar, '/api/courses', {
      method: 'POST',
      body: {
        title: `Course ${Date.now()}`,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        serviceFormId: serviceForm.id,
        shortDescription: 'Short description',
        hoursTotal: 2,
        price: 0,
        currency: 'PLN',
        status: 'PUBLISHED',
      },
    })

    const invitedEmail = randomEmail('invited')

    const invite = await apiJson<{ id: number; email: string; inviteLink: string }>(
      adminJar,
      '/api/admin/user-invites',
      {
        method: 'POST',
        body: { email: invitedEmail, courseIds: [course.id] },
      }
    )

    expect(invite.email).toBe(invitedEmail.toLowerCase())
    expect(invite.inviteLink).toContain('/invite/')

    const token = invite.inviteLink.split('/invite/')[1] ?? ''
    expect(token.length).toBeGreaterThan(10)

    const preview = await apiJson<{ email: string; courses: Array<{ id: number }> }>(
      {},
      `/api/user-invites/preview?token=${encodeURIComponent(token)}`
    )
    expect(preview.email).toBe(invitedEmail.toLowerCase())
    expect(preview.courses.some((c) => c.id === course.id)).toBe(true)

    await apiJson({}, '/api/user-invites/accept', {
      method: 'POST',
      body: { token },
    })

    const invitedJar: CookieJar = {}
    await apiJson(invitedJar, '/api/register', {
      method: 'POST',
      body: { email: invitedEmail, password: 'pass12345', name: 'Invited', inviteToken: token },
    })

    const myCourses = await apiJson<Array<{ course: { id: number } }>>(invitedJar, '/api/my-courses')
    expect(myCourses.some((e) => e.course.id === course.id)).toBe(true)

    const adminInvites = await apiJson<Array<{ id: number; email: string; status: string }>>(
      adminJar,
      '/api/admin/user-invites'
    )
    const row = adminInvites.find((i) => i.id === invite.id)
    expect(row?.status).toBe('ACCESS_GRANTED')
  })

  it('invites: admin must confirm resend for existing email and can delete invite', async () => {
    const adminJar: CookieJar = {}
    const adminEmail = randomEmail('admin_invites_resend')
    await apiJson(adminJar, '/api/register', {
      method: 'POST',
      body: { email: adminEmail, password: 'pass12345', role: 'ADMIN' },
    })

    const category = await apiJson<{ id: number }>(adminJar, '/api/categories', {
      method: 'POST',
      body: { title: `Cat ${Date.now()}` },
    })

    const subcategory = await apiJson<{ id: number }>(adminJar, '/api/subcategories', {
      method: 'POST',
      body: { categoryId: category.id, title: `Subcat ${Date.now()}` },
    })

    const serviceForm = await apiJson<{ id: number }>(adminJar, '/api/service-forms', {
      method: 'POST',
      body: { title: `Service ${Date.now()}` },
    })

    const course = await apiJson<{ id: number }>(adminJar, '/api/courses', {
      method: 'POST',
      body: {
        title: `Course ${Date.now()}`,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        serviceFormId: serviceForm.id,
        shortDescription: 'Short description',
        hoursTotal: 2,
        price: 0,
        currency: 'PLN',
        status: 'PUBLISHED',
      },
    })

    const invitedEmail = randomEmail('invited_resend')

    const firstInvite = await apiJson<{ id: number; email: string; inviteLink: string }>(
      adminJar,
      '/api/admin/user-invites',
      {
        method: 'POST',
        body: { email: invitedEmail, courseIds: [course.id] },
      }
    )

    let resendBlocked = false
    try {
      await apiJson(adminJar, '/api/admin/user-invites', {
        method: 'POST',
        body: { email: invitedEmail, courseIds: [course.id] },
      })
    } catch (error: any) {
      resendBlocked = true
      expect(String(error?.message ?? error)).toContain('HTTP 409')
      expect(String(error?.message ?? error)).toContain('Invite already exists for this email')
    }
    expect(resendBlocked).toBe(true)

    const secondInvite = await apiJson<{ id: number; email: string; inviteLink: string }>(
      adminJar,
      '/api/admin/user-invites',
      {
        method: 'POST',
        body: { email: invitedEmail, courseIds: [course.id], allowResend: true },
      }
    )

    expect(secondInvite.id).not.toBe(firstInvite.id)
    expect(secondInvite.email).toBe(invitedEmail.toLowerCase())
    expect(secondInvite.inviteLink).toContain('/invite/')

    const inviteRowsBeforeDelete = await apiJson<Array<{ id: number; status: string }>>(adminJar, '/api/admin/user-invites')
    const firstRow = inviteRowsBeforeDelete.find((invite) => invite.id === firstInvite.id)
    const secondRow = inviteRowsBeforeDelete.find((invite) => invite.id === secondInvite.id)
    expect(firstRow?.status).toBe('EXPIRED')
    expect(secondRow?.status).toBe('LINK_SENT')

    const deleteResult = await apiJson<{ ok: boolean }>(adminJar, `/api/admin/user-invites/${secondInvite.id}`, {
      method: 'DELETE',
    })
    expect(deleteResult.ok).toBe(true)

    const inviteRowsAfterDelete = await apiJson<Array<{ id: number }>>(adminJar, '/api/admin/user-invites')
    expect(inviteRowsAfterDelete.some((invite) => invite.id === secondInvite.id)).toBe(false)
  })
})
