import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const pagePath = new URL('../pages/contact-us.vue', import.meta.url)

describe('contact page', () => {
  it('uses the provided image as the contact hero background', async () => {
    const source = await readFile(pagePath, 'utf8')

    expect(source).toContain("url('/background_about_us.jpeg')")
    expect(source).toMatch(/\.contact-hero\s*{[\s\S]*linear-gradient/)
  })

  it('fills the wide hero gap with an integrated thematic accent', async () => {
    const source = await readFile(pagePath, 'utf8')

    expect(source).toContain('class="contact-hero__accent"')
    expect(source).toContain('mdi-message-text-outline')
    expect(source).not.toContain('class="contact-hero__details"')
  })
})
