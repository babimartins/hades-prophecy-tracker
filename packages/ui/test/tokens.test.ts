import { html, render } from 'lit'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '../src/hd-card.js'
import { colorTokens } from '../src/tokens.css.js'

/** `#rrggbb` as the `rgb(r, g, b)` string `getComputedStyle` returns. */
function asRgb(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgb(${r}, ${g}, ${b})`
}

describe('design tokens', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  afterEach(() => {
    document.documentElement.style.removeProperty('--hd-color-surface')
  })

  it('falls back to the packages/ui default when no ancestor sets the token', async () => {
    render(html`<hd-card></hd-card>`, document.body)
    const card = document.querySelector('hd-card')!
    await card.updateComplete
    const section = card.shadowRoot!.querySelector('section')!
    expect(getComputedStyle(section).backgroundColor).toBe(asRgb(colorTokens['--hd-color-surface']))
  })

  /**
   * A consumer overrides a token by setting it on `:root`. This only works
   * because `surface` (in `tokens.css.ts`) reads `--hd-color-surface` with a
   * fallback and never redeclares it on `:host`: a literal `:host` value
   * would win over this inherited one regardless of the override's own
   * specificity.
   */
  it('lets a consumer override a token by setting it on :root', async () => {
    document.documentElement.style.setProperty('--hd-color-surface', 'rgb(1, 2, 3)')
    render(html`<hd-card></hd-card>`, document.body)
    const card = document.querySelector('hd-card')!
    await card.updateComplete
    const section = card.shadowRoot!.querySelector('section')!
    expect(getComputedStyle(section).backgroundColor).toBe('rgb(1, 2, 3)')
  })
})
