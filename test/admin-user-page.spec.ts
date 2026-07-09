import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const pagePath = new URL('../pages/admin/users/[id].vue', import.meta.url)

describe('admin user detail page', () => {
  it('keeps exam status chips from shrinking in the exam column', async () => {
    const source = await readFile(pagePath, 'utf8')

    expect(source).toContain('class="admin-user-exam__status"')
    expect(source).toMatch(/\.admin-user-exam__status\s*{[^}]*flex-shrink:\s*0/s)
  })
})
