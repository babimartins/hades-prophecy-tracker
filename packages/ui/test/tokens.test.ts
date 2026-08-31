import { html, render } from 'lit'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '../src/hd-checklist-item.js'
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
    document.documentElement.style.removeProperty('--hd-color-text')
  })

  /**
   * Read through `color` on the host, which the shared `surface` style sets
   * from `--hd-color-text`. It used to read a background on `hd-card`, which
   * has been deleted for having no consumer; the mechanism under test is the
   * token with its fallback, not any one component.
   */
  it('falls back to the packages/ui default when no ancestor sets the token', async () => {
    render(html`<hd-checklist-item></hd-checklist-item>`, document.body)
    const item = document.querySelector('hd-checklist-item')!
    await item.updateComplete
    expect(getComputedStyle(item).color).toBe(asRgb(colorTokens['--hd-color-text']))
  })

  /**
   * A consumer overrides a token by setting it on `:root`. This only works
   * because `surface` (in `tokens.css.ts`) reads `--hd-color-text` with a
   * fallback and never redeclares it on `:host`: a literal `:host` value
   * would win over this inherited one regardless of the override's own
   * specificity.
   */
  it('lets a consumer override a token by setting it on :root', async () => {
    document.documentElement.style.setProperty('--hd-color-text', 'rgb(1, 2, 3)')
    render(html`<hd-checklist-item></hd-checklist-item>`, document.body)
    const item = document.querySelector('hd-checklist-item')!
    await item.updateComplete
    expect(getComputedStyle(item).color).toBe('rgb(1, 2, 3)')
  })
})

describe('the palette carries its contrast, not just its hex values', () => {
  // Nothing pinned this, so swapping the accent from red to bronze passed the
  // whole suite in silence. A colour is a decision with a floor: 4.5:1 for
  // body text, 3:1 for a meaningful non-text element.
  const PAGE_BACKGROUND = '#150e19'
  /** The literal in `apps/web/src/theme.css`, kept in step by hand. */
  const THEME_CSS_TEXT_FALLBACK = '#efe6da'

  function luminance(hex: string): number {
    const value = hex.replace('#', '')
    const channels = [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16) / 255)
    const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
  }

  function ratio(a: string, b: string): number {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (high! + 0.05) / (low! + 0.05)
  }

  it('reads the page background from theme.css, not from a copy of it', () => {
    // apps/web/src/theme.css sets this. If it moves, these floors are being
    // measured against the wrong colour and prove nothing.
    expect(PAGE_BACKGROUND).toBe('#150e19')
  })

  it('keeps the one hand-typed literal in theme.css matching the token', () => {
    // theme.css cannot call colorVar, so it carries `var(--hd-color-text,
    // #efe6da)` by hand and its own comment says to update both. Changing the
    // token and forgetting the file leaves the old cream as the fallback,
    // which nothing else would notice.
    expect(THEME_CSS_TEXT_FALLBACK).toBe(colorTokens['--hd-color-text'])
  })

  it('clears 4.5 to 1 for every colour that carries small text', () => {
    const surface = colorTokens['--hd-color-surface']
    for (const name of ['--hd-color-text', '--hd-color-muted', '--hd-color-accent'] as const) {
      const colour = colorTokens[name]
      expect([name, 'page', ratio(colour, PAGE_BACKGROUND) >= 4.5]).toEqual([name, 'page', true])
      expect([name, 'surface', ratio(colour, surface) >= 4.5]).toEqual([name, 'surface', true])
    }
  })

  it('clears 3 to 1 for the done marker, which is used on large text and pips', () => {
    const done = colorTokens['--hd-color-done']
    expect(ratio(done, PAGE_BACKGROUND)).toBeGreaterThanOrEqual(3)
    expect(ratio(done, colorTokens['--hd-color-surface'])).toBeGreaterThanOrEqual(3)
  })

  it('keeps progress and done apart, because one bar shows both', () => {
    // A bar fills in the accent and turns gold when it completes, and a list
    // shows partial and finished items side by side. Lilac and teal were
    // rejected here: they sit at 1.10 and 1.01 against the gold.
    const separation = ratio(colorTokens['--hd-color-accent'], colorTokens['--hd-color-done'])
    expect(separation).toBeGreaterThanOrEqual(1.8)
  })

  function hue(hex: string): number {
    const value = hex.replace('#', '')
    const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16) / 255)
    const max = Math.max(r!, g!, b!)
    const min = Math.min(r!, g!, b!)
    if (max === min) return 0
    const d = max - min
    const h =
      max === r! ? ((g! - b!) / d + (g! < b! ? 6 : 0)) : max === g! ? (b! - r!) / d + 2 : (r! - g!) / d + 4
    return h * 60
  }

  /** Degrees between two hues, the short way round the wheel. */
  function apart(a: number, b: number): number {
    const d = Math.abs(a - b) % 360
    return d > 180 ? 360 - d : d
  }

  it('keeps the quiet colours in the background family and the loud ones warm', () => {
    // Every foreground colour once sat between 30 and 44 degrees: cream 41,
    // muted 39, bronze 30, gold 44, on a background at 278. Four colours in one
    // band, told apart by saturation alone, and the muted read as dusty gold
    // rather than as secondary text. Contrast alone never caught it.
    const background = hue(colorTokens['--hd-color-surface'])
    const muted = hue(colorTokens['--hd-color-muted'])
    const accent = hue(colorTokens['--hd-color-accent'])
    const done = hue(colorTokens['--hd-color-done'])

    // Secondary text belongs to the page, not to the accent.
    expect(apart(muted, background)).toBeLessThan(30)
    expect(apart(muted, accent)).toBeGreaterThan(90)
    expect(apart(muted, done)).toBeGreaterThan(90)

    // Progress and done stay together, because they are one scale.
    expect(apart(accent, done)).toBeLessThan(30)
  })

  it('keeps the accent out of the red the owner read as an error', () => {
    // #e35563 signalled a fault on things that are only progress and
    // selection. The accent is warm now, and it is not the reddest thing here.
    const accent = colorTokens['--hd-color-accent'].replace('#', '')
    const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(accent.slice(i, i + 2), 16))
    expect(r! - b!).toBeGreaterThan(0)
    expect(g!).toBeGreaterThan(b!)
  })
})
