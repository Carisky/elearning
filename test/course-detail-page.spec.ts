import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const pagePath = new URL('../pages/courses/[slug].vue', import.meta.url)

describe('course detail page', () => {
  it('uses a Udemy-like course hero with a sticky purchase card', async () => {
    const source = await readFile(pagePath, 'utf8')

    expect(source).toContain('class="course-hero"')
    expect(source).toContain('class="course-detail-layout"')
    expect(source).toContain('class="course-purchase-card"')
    expect(source).toContain('class="course-purchase-card__media"')
    expect(source).toContain('class="course-hero__meta"')
  })
})
