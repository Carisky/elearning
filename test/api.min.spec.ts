import { describe, expect, it } from 'vitest'
import { fetch } from '@nuxt/test-utils'

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

    const course = await apiJson<{ id: number; title: string; status: string; priceCents: number; currency: string }>(
      jar,
      '/api/courses',
      {
        method: 'POST',
        body: {
          title: `Course ${Date.now()}`,
          categoryId: category.id,
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

    const course = await apiJson<{ id: number; title: string }>(adminJar, '/api/courses', {
      method: 'POST',
      body: {
        title: `Course ${Date.now()}`,
        categoryId: category.id,
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
      body: { mode: 'cart', acceptedTerms: true },
    })
    expect(checkout.ok).toBe(true)
    expect(checkout.orderId).toBeTypeOf('number')

    const myCourses = await apiJson<Array<{ course: { id: number; title: string } }>>(userJar, '/api/my-courses')
    expect(myCourses.some((e) => e.course.id === course.id)).toBe(true)
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

    const course = await apiJson<{ id: number; title: string }>(adminJar, '/api/courses', {
      method: 'POST',
      body: {
        title: `Course ${Date.now()}`,
        categoryId: category.id,
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
})
